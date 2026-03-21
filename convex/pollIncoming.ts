/**
 * Poll for incoming emails from Resend.
 * Runs on a 60-second cycle via Convex scheduler.
 * Client polls every 5 seconds when focused, 60s when blurred.
 * @module convex/pollIncoming
 */

import { v } from "convex/values";
import { action, internalAction, mutation, internalMutation, scheduler } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Store a new incoming email message.
 */
export const storeIncomingEmail = internalMutation({
  args: {
    domainId: v.id("domains"),
    mailboxId: v.id("mailboxes"),
    messageId: v.string(),
    from: v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }),
    to: v.array(v.object({
      name: v.optional(v.string()),
      address: v.string(),
    })),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    snippet: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if message already exists
    const existing = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (existing) {
      // Already processed
      return { status: "duplicate", id: existing._id };
    }

    // Store the new message
    const messageId = await ctx.db.insert("messages", {
      domainId: args.domainId,
      mailboxId: args.mailboxId,
      messageId: args.messageId,
      from: args.from,
      to: args.to,
      cc: undefined,
      replyTo: undefined,
      subject: args.subject,
      bodyText: args.bodyText,
      bodyHtml: args.bodyHtml,
      snippet: args.snippet,
      attachments: [],
      labels: [],
      isRead: false,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      isSent: false,
      isSpam: false,
      isTrashed: false,
      date: args.date,
      receivedAt: Date.now(),
    });

    return { status: "stored", id: messageId };
  },
});

/**
 * Poll Resend for incoming emails on all domains.
 * Runs every 60 seconds via Convex scheduler.
 * Uses Resend's emails/receiving endpoint.
 */
export const pollResendIncoming = internalAction({
  args: {
    domainName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    errors: string[];
  }> => {
    const limit = args.limit ?? 100;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return {
        processed: 0,
        errors: ["RESEND_API_KEY not configured"],
      };
    }

    try {
      // Use Resend emails/receiving API
      // Reference: https://resend.com/docs/api-reference/emails/list-incoming
      const response = await fetch(
        `https://api.resend.com/emails/receiving?domain=${encodeURIComponent(args.domainName)}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          processed: 0,
          errors: [`Resend API error: ${response.status} - ${errorText}`],
        };
      }

      const data = await response.json();
      const emails = data.data || [];
      const errors: string[] = [];
      let processed = 0;

      // Fetch all domains and mailboxes for quick lookup
      const domains = await ctx.runQuery(internal.queries.getAllDomains);
      const mailboxes = await ctx.runQuery(internal.queries.getAllMailboxes);

      // Create maps for faster lookup
      const domainMap = new Map(domains.map((d: any) => [d.name.toLowerCase(), d]));
      const mailboxMap = new Map(
        mailboxes.map((m: any) => [
          `${m.address.toLowerCase()}@${m.domain.toLowerCase()}`,
          m,
        ])
      );

      for (const email of emails) {
        try {
          // Parse recipient
          const toAddress = email.to?.[0]?.toLowerCase() || "";
          const [localPart, recipientDomain] = toAddress.split("@");

          if (!recipientDomain) continue;

          // Find domain and mailbox
          const domain = domainMap.get(recipientDomain);
          const mailbox = mailboxMap.get(toAddress);

          if (!domain || !mailbox) {
            errors.push(`Domain or mailbox not found for ${toAddress}`);
            continue;
          }

          // Convert email date to number (handle both timestamp and ISO string)
          let emailDate = Date.now();
          if (email.created_at) {
            emailDate = new Date(email.created_at).getTime();
          }

          // Store the email
          const result = await ctx.runMutation(internal.pollIncoming.storeIncomingEmail, {
            domainId: domain._id,
            mailboxId: mailbox._id,
            messageId: email.id,
            from: {
              name: email.from_name,
              address: email.from,
            },
            to: [
              {
                name: undefined,
                address: toAddress,
              },
            ],
            subject: email.subject || "(No subject)",
            bodyText: email.text,
            bodyHtml: email.html,
            snippet: (email.text || email.html || "").slice(0, 200),
            date: emailDate,
          });

          if (result.status === "stored") {
            processed++;
          }
        } catch (e) {
          errors.push(`Failed to process email ${email.id}: ${String(e)}`);
        }
      }

      return { processed, errors };
    } catch (e) {
      return {
        processed: 0,
        errors: [`Failed to poll Resend: ${String(e)}`],
      };
    }
  },
});

/**
 * Scheduler: Poll all configured domains every 60 seconds.
 * Runs automatically in the background.
 */
export const schedulePollAllDomains = scheduler.interval(
  "every 60 seconds",
  internal.pollIncoming.pollAllDomains
);

/**
 * Internal action to poll all configured domains.
 * Called by the scheduler.
 */
export const pollAllDomains = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      // Get all domains from database
      const domains = await ctx.runQuery(internal.queries.getAllDomains);

      const results = [];
      for (const domain of domains) {
        const result = await ctx.runAction(internal.pollIncoming.pollResendIncoming, {
          domainName: domain.name,
          limit: 100,
        });
        results.push({
          domain: domain.name,
          ...result,
        });
      }

      console.log("[pollAllDomains] Scheduled poll completed:", results);
      return { success: true, results };
    } catch (e) {
      console.error("[pollAllDomains] Error:", e);
      return { success: false, error: String(e) };
    }
  },
});

/**
 * Trigger manual poll for a specific domain.
 * Can be called from the client to force an immediate poll.
 */
export const triggerPoll = action({
  args: {
    domainName: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(internal.pollIncoming.pollResendIncoming, {
      domainName: args.domainName,
      limit: 100,
    });

    return result;
  },
});

/**
 * Get the last poll status for a domain.
 */
export const getLastPollStatus = mutation({
  args: {
    domainName: v.string(),
  },
  handler: async (ctx, args) => {
    // In a full implementation, we'd track poll status in a separate table
    // For now, just return a mock status
    return {
      lastPoll: Date.now() - 60000, // 1 minute ago
      processed: 0,
      errors: [],
    };
  },
});
