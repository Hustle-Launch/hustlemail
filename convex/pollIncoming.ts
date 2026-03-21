/**
 * Poll for incoming emails from Resend.
 * Runs periodically to fetch and store new incoming emails.
 * @module convex/pollIncoming
 */

import { v } from "convex/values";
import { action, internalAction, mutation, internalMutation } from "./_generated/server";
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
 * Poll Resend for incoming emails.
 * This action should be called periodically (e.g., via cron or scheduled function).
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
      // Call Resend API to get incoming emails
      // Note: This uses the Resend receiving API which may require additional setup
      const response = await fetch(
        `https://api.resend.com/emails/receiving?domain=${args.domainName}&limit=${limit}`,
        {
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

      for (const email of emails) {
        try {
          // Parse recipient to find the mailbox
          const toAddress = email.to?.[0]?.toLowerCase() || "";
          const [localPart] = toAddress.split("@");

          // TODO: Look up mailbox by local part and domain
          // For now, we'd need to query the database

          processed++;
        } catch (e) {
          errors.push(`Failed to process email ${email.id}: ${e}`);
        }
      }

      return { processed, errors };
    } catch (e) {
      return {
        processed: 0,
        errors: [`Failed to poll Resend: ${e}`],
      };
    }
  },
});

/**
 * Trigger manual poll for a specific domain.
 * Can be called from the client to force a poll.
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
