/**
 * Internal functions for SMTP HTTP actions.
 * These are internal queries/mutations called by the HTTP actions.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Gets a domain by name (internal query for SMTP ingress).
 * @param name - The domain name to look up.
 * @returns The domain or null if not found.
 */
export const getDomainByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const domain = await ctx.db
      .query("domains")
      .withIndex("by_name", (q) => q.eq("name", args.name.toLowerCase()))
      .first();
    
    return domain;
  },
});

/**
 * Gets a mailbox by domain and name (internal query for SMTP ingress).
 * @param domainId - The domain ID as a string.
 * @param name - The mailbox name (local part of email).
 * @returns The mailbox or null if not found.
 */
export const getMailboxByName = internalQuery({
  args: {
    domainId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Convert string ID to Convex ID
    const domainId = ctx.db.normalizeId("domains", args.domainId);
    if (!domainId) return null;
    
    const mailbox = await ctx.db
      .query("mailboxes")
      .withIndex("by_domain_name", (q) =>
        q.eq("domainId", domainId).eq("name", args.name.toLowerCase())
      )
      .first();
    
    return mailbox;
  },
});

/**
 * Stores an inbound message (internal mutation for SMTP ingress).
 * @param domainId - The domain ID as a string.
 * @param mailboxId - The mailbox ID as a string.
 * @param messageId - The RFC 5322 Message-ID.
 * @param from - Sender address object.
 * @param to - Array of recipient address objects.
 * @param subject - Email subject.
 * @param bodyText - Plain text body.
 * @param bodyHtml - HTML body.
 * @param attachments - Array of attachment metadata.
 * @param date - Email date timestamp.
 * @param isSpam - Whether the message was flagged as spam.
 * @returns The ID of the stored message.
 */
export const storeMessage = internalMutation({
  args: {
    domainId: v.string(),
    mailboxId: v.string(),
    messageId: v.string(),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    from: v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }),
    to: v.array(
      v.object({
        name: v.optional(v.string()),
        address: v.string(),
      })
    ),
    cc: v.optional(
      v.array(
        v.object({
          name: v.optional(v.string()),
          address: v.string(),
        })
      )
    ),
    replyTo: v.optional(
      v.object({
        name: v.optional(v.string()),
        address: v.string(),
      })
    ),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    attachments: v.array(
      v.object({
        filename: v.string(),
        contentType: v.string(),
        size: v.number(),
        storageId: v.optional(v.string()),
        externalUrl: v.optional(v.string()),
      })
    ),
    date: v.number(),
    isSpam: v.boolean(),
    spamScore: v.optional(v.number()),
    spamReason: v.optional(v.string()),
    // Sender authentication results (SPF/DKIM)
    spfResult: v.optional(v.string()),
    dkimResult: v.optional(v.string()),
    authHeaders: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Convert string IDs to Convex IDs
    const domainId = ctx.db.normalizeId("domains", args.domainId);
    const mailboxId = ctx.db.normalizeId("mailboxes", args.mailboxId);
    
    if (!domainId || !mailboxId) {
      throw new Error("Invalid domain or mailbox ID");
    }

    // Generate snippet from body
    const snippet = (args.bodyText || args.bodyHtml || "")
      .replace(/<[^>]*>/g, "") // Strip HTML
      .slice(0, 150)
      .trim();

    // Determine thread ID from references or in-reply-to
    let threadId = args.messageId;
    if (args.inReplyTo) {
      const original = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("messageId"), args.inReplyTo))
        .first();
      if (original?.threadId) {
        threadId = original.threadId;
      }
    }

    // Convert attachment storageIds to proper format
    const attachments = args.attachments.map((att) => ({
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      storageId: att.storageId
        ? (ctx.db.normalizeId("_storage", att.storageId) ?? undefined)
        : undefined,
      externalUrl: att.externalUrl,
    }));

    const id = await ctx.db.insert("messages", {
      domainId,
      mailboxId,
      messageId: args.messageId,
      inReplyTo: args.inReplyTo,
      references: args.references,
      threadId,
      from: args.from,
      to: args.to,
      cc: args.cc,
      replyTo: args.replyTo,
      subject: args.subject,
      bodyText: args.bodyText,
      bodyHtml: args.bodyHtml,
      snippet,
      attachments,
      labels: [],
      isRead: false,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      isSent: false,
      isSpam: args.isSpam,
      isTrashed: false,
      spamScore: args.spamScore,
      spamReason: args.spamReason,
      spfResult: args.spfResult,
      dkimResult: args.dkimResult,
      authHeaders: args.authHeaders,
      date: args.date,
      receivedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Logs a spam evaluation result (internal mutation for analytics).
 * @param messageId - The message ID as a string.
 * @param isSpam - Whether the message was classified as spam.
 * @param score - The spam score (0-100).
 * @param category - The spam category (ham, spam, phishing, scam).
 * @param reason - The reason for the classification.
 * @param model - The AI model used for evaluation.
 */
export const logSpamEvaluation = internalMutation({
  args: {
    messageId: v.string(),
    isSpam: v.boolean(),
    score: v.number(),
    category: v.string(),
    reason: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = ctx.db.normalizeId("messages", args.messageId);
    if (!messageId) {
      throw new Error("Invalid message ID");
    }

    await ctx.db.insert("spamEvaluations", {
      messageId,
      isSpam: args.isSpam,
      score: args.score,
      category: args.category,
      reason: args.reason,
      model: args.model,
      evaluatedAt: Date.now(),
    });
  },
});
