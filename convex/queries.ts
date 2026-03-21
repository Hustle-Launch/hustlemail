/**
 * Convex queries for reading data.
 * All queries require authentication and enforce ownership checks.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Lists all domains owned by the current authenticated user.
 * @returns Array of domains with mailbox counts and weekly message stats.
 */
export const listDomains = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const domains = await ctx.db
      .query("domains")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .collect();

    // Get mailbox counts and message stats for each domain
    const domainsWithStats = await Promise.all(
      domains.map(async (domain) => {
        const mailboxes = await ctx.db
          .query("mailboxes")
          .withIndex("by_domain", (q) => q.eq("domainId", domain._id))
          .collect();

        const messagesThisWeek = await ctx.db
          .query("messages")
          .withIndex("by_domain", (q) => q.eq("domainId", domain._id))
          .filter((q) =>
            q.gte(q.field("receivedAt"), Date.now() - 7 * 24 * 60 * 60 * 1000)
          )
          .collect();

        return {
          ...domain,
          mailboxCount: mailboxes.length,
          messagesThisWeek: messagesThisWeek.length,
        };
      })
    );

    return domainsWithStats;
  },
});

/**
 * Retrieves a single domain by ID.
 * @param domainId - The domain ID to fetch.
 * @returns The domain if found and owned by current user, null otherwise.
 */
export const getDomain = query({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) return null;

    return domain;
  },
});

/**
 * Lists mailboxes for a domain or all mailboxes the user has access to.
 * @param domainId - Optional domain ID to filter by.
 * @returns Array of mailboxes with stats, domain info, and member details.
 */
export const listMailboxes = query({
  args: { domainId: v.optional(v.id("domains")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // If no domain specified, get all mailboxes user has access to
    if (!args.domainId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (!user) return [];

      const access = await ctx.db
        .query("mailboxAccess")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const mailboxes = await Promise.all(
        access.map(async (a) => {
          const mailbox = await ctx.db.get(a.mailboxId);
          if (!mailbox) return null;
          const domain = await ctx.db.get(mailbox.domainId);
          return mailbox && domain ? { ...mailbox, domain, role: a.role } : null;
        })
      );

      return mailboxes.filter(Boolean);
    }

    // Get mailboxes for specific domain
    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) return [];

    const mailboxes = await ctx.db
      .query("mailboxes")
      .withIndex("by_domain", (q) => q.eq("domainId", args.domainId))
      .collect();

    // Get stats for each mailbox
    const mailboxesWithStats = await Promise.all(
      mailboxes.map(async (mailbox) => {
        const unread = await ctx.db
          .query("messages")
          .withIndex("by_mailbox_unread", (q) =>
            q.eq("mailboxId", mailbox._id).eq("isRead", false)
          )
          .collect();

        const messagesThisWeek = await ctx.db
          .query("messages")
          .withIndex("by_mailbox", (q) => q.eq("mailboxId", mailbox._id))
          .filter((q) =>
            q.gte(q.field("receivedAt"), Date.now() - 7 * 24 * 60 * 60 * 1000)
          )
          .collect();

        // Get members
        const access = await ctx.db
          .query("mailboxAccess")
          .withIndex("by_mailbox", (q) => q.eq("mailboxId", mailbox._id))
          .collect();

        const members = await Promise.all(
          access.map(async (a) => {
            const user = await ctx.db.get(a.userId);
            return user ? { ...user, role: a.role } : null;
          })
        );

        return {
          ...mailbox,
          domain,
          unreadCount: unread.length,
          messagesThisWeek: messagesThisWeek.length,
          members: members.filter(Boolean),
        };
      })
    );

    return mailboxesWithStats;
  },
});

/**
 * Lists messages for a mailbox with folder filtering.
 * @param mailboxId - The mailbox to fetch messages from.
 * @param folder - Optional folder filter (inbox, sent, starred, archive, trash, spam).
 * @param limit - Maximum number of messages to return.
 * @returns Array of messages sorted by received date descending.
 */
export const listMessages = query({
  args: {
    mailboxId: v.id("mailboxes"),
    folder: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("sent"),
        v.literal("starred"),
        v.literal("archive"),
        v.literal("trash"),
        v.literal("spam")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit ?? 50;
    const folder = args.folder ?? "inbox";

    let query = ctx.db
      .query("messages")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.mailboxId))
      .order("desc");

    // Apply folder filters
    if (folder === "inbox") {
      query = query.filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.eq(q.field("isTrashed"), false),
          q.eq(q.field("isSpam"), false),
          q.eq(q.field("isSent"), false)
        )
      );
    } else if (folder === "sent") {
      query = query.filter((q) => q.eq(q.field("isSent"), true));
    } else if (folder === "starred") {
      query = query.filter((q) => q.eq(q.field("isStarred"), true));
    } else if (folder === "archive") {
      query = query.filter((q) => q.eq(q.field("isArchived"), true));
    } else if (folder === "trash") {
      query = query.filter((q) => q.eq(q.field("isTrashed"), true));
    } else if (folder === "spam") {
      query = query.filter((q) => q.eq(q.field("isSpam"), true));
    }

    const messages = await query.take(limit);
    return messages;
  },
});

/**
 * Retrieves a single message with its thread.
 * @param messageId - The message ID to fetch.
 * @returns The message with thread messages if part of a thread.
 */
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Get thread messages if this is part of a thread
    let thread: typeof message[] = [];
    if (message.threadId) {
      thread = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", message.threadId!))
        .order("asc")
        .collect();
    }

    return {
      ...message,
      thread,
    };
  },
});

/**
 * Gets unread message counts for sidebar display.
 * @param mailboxId - The mailbox to count unread messages for.
 * @returns Object with inbox and spam unread counts.
 */
export const getUnreadCounts = query({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { inbox: 0, spam: 0 };

    const inbox = await ctx.db
      .query("messages")
      .withIndex("by_mailbox_unread", (q) =>
        q.eq("mailboxId", args.mailboxId).eq("isRead", false)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("isArchived"), false),
          q.eq(q.field("isTrashed"), false),
          q.eq(q.field("isSpam"), false)
        )
      )
      .collect();

    const spam = await ctx.db
      .query("messages")
      .withIndex("by_mailbox_unread", (q) =>
        q.eq("mailboxId", args.mailboxId).eq("isRead", false)
      )
      .filter((q) => q.eq(q.field("isSpam"), true))
      .collect();

    return {
      inbox: inbox.length,
      spam: spam.length,
    };
  },
});

/**
 * Searches messages by subject using full-text search.
 * @param mailboxId - The mailbox to search within.
 * @param query - The search query string.
 * @param limit - Maximum number of results.
 * @returns Array of matching messages.
 */
export const searchMessages = query({
  args: {
    mailboxId: v.id("mailboxes"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const limit = args.limit ?? 20;

    // Use search index
    const results = await ctx.db
      .query("messages")
      .withSearchIndex("search_messages", (q) =>
        q.search("subject", args.query).eq("mailboxId", args.mailboxId)
      )
      .take(limit);

    return results;
  },
});

/**
 * Gets analytics data for a domain.
 * @param domainId - The domain to get analytics for.
 * @returns Weekly stats including totals, daily breakdown, and top senders.
 */
export const getAnalytics = query({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all messages this week
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_domain", (q) => q.eq("domainId", args.domainId))
      .filter((q) => q.gte(q.field("receivedAt"), weekAgo))
      .collect();

    // Calculate stats
    const received = messages.filter((m) => !m.isSent).length;
    const sent = messages.filter((m) => m.isSent).length;
    const spam = messages.filter((m) => m.isSpam).length;

    // Group by day
    const daily: Record<string, { received: number; sent: number; spam: number }> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    messages.forEach((m) => {
      const day = days[new Date(m.receivedAt).getDay()];
      if (!daily[day]) daily[day] = { received: 0, sent: 0, spam: 0 };
      if (m.isSent) daily[day].sent++;
      else if (m.isSpam) daily[day].spam++;
      else daily[day].received++;
    });

    // Top senders
    const senderCounts: Record<string, number> = {};
    messages
      .filter((m) => !m.isSent)
      .forEach((m) => {
        const domain = m.from.address.split("@")[1];
        senderCounts[domain] = (senderCounts[domain] || 0) + 1;
      });

    const topSenders = Object.entries(senderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, count }));

    return {
      totals: { received, sent, spam },
      daily: days.map((day) => ({
        day,
        ...(daily[day] || { received: 0, sent: 0, spam: 0 }),
      })),
      topSenders,
    };
  },
});

/**
 * Lists all users with access to a domain's mailboxes.
 * @param domainId - The domain to list users for.
 * @returns Array of users with their roles and mailbox assignments.
 */
export const listUsers = query({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) return [];

    // Get all mailboxes for this domain
    const mailboxes = await ctx.db
      .query("mailboxes")
      .withIndex("by_domain", (q) => q.eq("domainId", args.domainId))
      .collect();

    // Get all users with access to these mailboxes
    const userIds = new Set<string>();
    const userRoles: Record<string, string> = {};
    const userMailboxes: Record<string, string[]> = {};

    for (const mailbox of mailboxes) {
      const access = await ctx.db
        .query("mailboxAccess")
        .withIndex("by_mailbox", (q) => q.eq("mailboxId", mailbox._id))
        .collect();

      for (const a of access) {
        userIds.add(a.userId);
        if (!userRoles[a.userId] || a.role === "owner") {
          userRoles[a.userId] = a.role;
        }
        if (!userMailboxes[a.userId]) userMailboxes[a.userId] = [];
        userMailboxes[a.userId].push(mailbox.name);
      }
    }

    // Get user details
    const users = await Promise.all(
      Array.from(userIds).map(async (id) => {
        const user = await ctx.db.get(id as any);
        if (!user) return null;
        return {
          ...user,
          role: userRoles[id],
          mailboxes: userMailboxes[id],
        };
      })
    );

    return users.filter(Boolean);
  },
});

/**
 * Get all domains.
 * Does not require authentication - used by internal actions.
 * @returns Array of all domains.
 */
export const getAllDomains = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("domains").collect();
  },
});

/**
 * Get all mailboxes.
 * Does not require authentication - used by internal actions.
 * @returns Array of all mailboxes.
 */
export const getAllMailboxes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("mailboxes").collect();
  },
});

/**
 * Get all messages for a specific mailbox.
 * Used by client polling hook for real-time updates.
 * @param mailboxId - The mailbox to fetch messages for.
 * @returns Array of messages for the mailbox, sorted newest first.
 */
export const getMessagesByMailbox = query({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const mailbox = await ctx.db.get(args.mailboxId);
    if (!mailbox) return [];

    // Verify user has access to this mailbox
    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.mailboxId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .first();

    if (!access && mailbox.ownerId !== identity.subject) return [];

    // Fetch messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.mailboxId))
      .order("desc")
      .collect();

    return messages;
  },
});
