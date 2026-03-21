/**
 * Message-specific queries and mutations.
 * Real-time message operations with filtering and threading support.
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import {
  requireMailboxAccess,
  requireMessageAccess,
} from "./lib/auth";

/**
 * Lists messages for a mailbox with real-time subscription.
 * @param mailboxId - The mailbox to fetch messages from.
 * @param limit - Maximum number of messages to return.
 * @param cursor - Optional cursor for pagination.
 * @param filter - Filter type (all, unread, starred, archived, spam, trash).
 * @returns Array of filtered messages sorted by date descending.
 */
export const list = query({
  args: {
    mailboxId: v.id("mailboxes"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
    filter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("unread"),
        v.literal("starred"),
        v.literal("archived"),
        v.literal("spam"),
        v.literal("trash")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this mailbox
    await requireMailboxAccess(ctx, args.mailboxId);

    const limit = args.limit ?? 50;
    const filter = args.filter ?? "all";

    let q = ctx.db
      .query("messages")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.mailboxId))
      .order("desc");

    // Apply filters
    const messages = await q.collect();
    
    let filtered = messages;
    switch (filter) {
      case "unread":
        filtered = messages.filter((m) => !m.isRead && !m.isArchived && !m.isSpam && !m.isTrashed);
        break;
      case "starred":
        filtered = messages.filter((m) => m.isStarred && !m.isTrashed);
        break;
      case "archived":
        filtered = messages.filter((m) => m.isArchived && !m.isTrashed);
        break;
      case "spam":
        filtered = messages.filter((m) => m.isSpam && !m.isTrashed);
        break;
      case "trash":
        filtered = messages.filter((m) => m.isTrashed);
        break;
      default:
        filtered = messages.filter((m) => !m.isArchived && !m.isSpam && !m.isTrashed);
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Retrieves a single message by ID.
 * @param id - The message ID.
 * @returns The message or null if not found.
 * @throws Error if user doesn't have access to the message's mailbox.
 */
export const get = query({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    // Verify user has access to this message's mailbox
    const { message } = await requireMessageAccess(ctx, args.id);
    return message;
  },
});

/**
 * Retrieves all messages in a thread.
 * @param threadId - The thread ID to fetch messages for.
 * @param mailboxId - The mailbox to verify access for.
 * @returns Array of messages in the thread sorted by date ascending.
 */
export const getThread = query({
  args: {
    threadId: v.string(),
    mailboxId: v.id("mailboxes"),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this mailbox
    await requireMailboxAccess(ctx, args.mailboxId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    // Only return messages from the specified mailbox
    return messages.filter((m) => m.mailboxId === args.mailboxId);
  },
});

/**
 * Searches messages by subject within a mailbox.
 * @param mailboxId - The mailbox to search in.
 * @param query - The search query string.
 * @param limit - Maximum number of results.
 * @returns Array of matching messages.
 */
export const search = query({
  args: {
    mailboxId: v.id("mailboxes"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this mailbox
    await requireMailboxAccess(ctx, args.mailboxId);

    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_messages", (q) =>
        q.search("subject", args.query).eq("mailboxId", args.mailboxId)
      )
      .take(args.limit ?? 20);

    return results;
  },
});

/**
 * Creates a new message (called by SMTP ingress).
 * This is an internal mutation - not callable by users directly.
 * @param domainId - The domain ID.
 * @param mailboxId - The destination mailbox ID.
 * @param messageId - RFC 5322 Message-ID.
 * @param from - Sender address object.
 * @param to - Array of recipient address objects.
 * @param subject - Email subject.
 * @param bodyText - Plain text body.
 * @param bodyHtml - HTML body.
 * @param attachments - Array of attachment metadata.
 * @param date - Email date timestamp.
 * @param isSpam - Whether the message was flagged as spam.
 * @returns The ID of the created message.
 */
export const create = internalMutation({
  args: {
    domainId: v.id("domains"),
    mailboxId: v.id("mailboxes"),
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
        storageId: v.optional(v.id("_storage")),
        externalUrl: v.optional(v.string()),
      })
    ),
    date: v.number(),
    isSpam: v.boolean(),
    spamScore: v.optional(v.number()),
    spamReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Generate snippet from body
    const snippet = (args.bodyText || args.bodyHtml || "")
      .replace(/<[^>]*>/g, "") // Strip HTML
      .slice(0, 150)
      .trim();

    // Determine thread ID from references or in-reply-to
    let threadId = args.messageId;
    if (args.inReplyTo) {
      // Find the original message's thread
      const original = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("messageId"), args.inReplyTo))
        .first();
      if (original?.threadId) {
        threadId = original.threadId;
      }
    }

    const messageId = await ctx.db.insert("messages", {
      domainId: args.domainId,
      mailboxId: args.mailboxId,
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
      attachments: args.attachments,
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
      date: args.date,
      receivedAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Marks a message as read or unread.
 * @param id - The message ID.
 * @param isRead - Whether the message is read.
 */
export const markRead = mutation({
  args: {
    id: v.id("messages"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this message (readonly is fine for marking read)
    await requireMessageAccess(ctx, args.id);
    await ctx.db.patch(args.id, { isRead: args.isRead });
  },
});

/**
 * Toggles the starred status of a message.
 * @param id - The message ID.
 */
export const toggleStar = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    // Verify user has access (member or owner for modifications)
    const { message } = await requireMessageAccess(ctx, args.id, "member");
    await ctx.db.patch(args.id, { isStarred: !message.isStarred });
  },
});

/**
 * Archives a message.
 * @param id - The message ID.
 */
export const archive = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    // Verify user has member access
    await requireMessageAccess(ctx, args.id, "member");
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

/**
 * Moves a message to trash.
 * @param id - The message ID.
 */
export const trash = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    // Verify user has member access
    await requireMessageAccess(ctx, args.id, "member");
    await ctx.db.patch(args.id, { isTrashed: true });
  },
});

/**
 * Marks a message as spam.
 * @param id - The message ID.
 */
export const markSpam = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    // Verify user has member access
    await requireMessageAccess(ctx, args.id, "member");
    await ctx.db.patch(args.id, { isSpam: true });
  },
});

/**
 * Updates the labels on a message.
 * @param id - The message ID.
 * @param labels - Array of label strings to set.
 */
export const updateLabels = mutation({
  args: {
    id: v.id("messages"),
    labels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has member access
    await requireMessageAccess(ctx, args.id, "member");
    await ctx.db.patch(args.id, { labels: args.labels });
  },
});

/**
 * Gets the unread message count for a mailbox.
 * @param mailboxId - The mailbox ID.
 * @returns The count of unread, non-archived, non-spam, non-trashed messages.
 */
export const unreadCount = query({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    // Verify user has access to this mailbox
    await requireMailboxAccess(ctx, args.mailboxId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_mailbox_unread", (q) =>
        q.eq("mailboxId", args.mailboxId).eq("isRead", false)
      )
      .collect();

    return messages.filter((m) => !m.isArchived && !m.isSpam && !m.isTrashed).length;
  },
});
