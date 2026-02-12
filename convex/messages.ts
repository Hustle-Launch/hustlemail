import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get messages for a mailbox with real-time subscription
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

// Get a single message
export const get = query({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get thread messages
export const getThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

// Search messages
export const search = query({
  args: {
    mailboxId: v.id("mailboxes"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_messages", (q) =>
        q.search("subject", args.query).eq("mailboxId", args.mailboxId)
      )
      .take(args.limit ?? 20);

    return results;
  },
});

// Create a new message (called by SMTP ingress)
export const create = mutation({
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

// Mark message as read/unread
export const markRead = mutation({
  args: {
    id: v.id("messages"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: args.isRead });
  },
});

// Toggle star
export const toggleStar = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.id);
    if (message) {
      await ctx.db.patch(args.id, { isStarred: !message.isStarred });
    }
  },
});

// Archive message
export const archive = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isArchived: true });
  },
});

// Move to trash
export const trash = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isTrashed: true });
  },
});

// Mark as spam
export const markSpam = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isSpam: true });
  },
});

// Add/remove label
export const updateLabels = mutation({
  args: {
    id: v.id("messages"),
    labels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { labels: args.labels });
  },
});

// Get unread count for mailbox
export const unreadCount = query({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_mailbox_unread", (q) =>
        q.eq("mailboxId", args.mailboxId).eq("isRead", false)
      )
      .collect();

    return messages.filter((m) => !m.isArchived && !m.isSpam && !m.isTrashed).length;
  },
});
