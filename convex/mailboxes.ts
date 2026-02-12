import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all mailboxes for a domain
export const listByDomain = query({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mailboxes")
      .withIndex("by_domain", (q) => q.eq("domainId", args.domainId))
      .collect();
  },
});

// Get mailbox by name within a domain
export const getByName = query({
  args: {
    domainId: v.id("domains"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mailboxes")
      .withIndex("by_domain_name", (q) =>
        q.eq("domainId", args.domainId).eq("name", args.name)
      )
      .first();
  },
});

// Get mailbox by ID
export const get = query({
  args: { id: v.id("mailboxes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get mailboxes a user has access to
export const listForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const mailboxes = await Promise.all(
      access.map(async (a) => {
        const mailbox = await ctx.db.get(a.mailboxId);
        return mailbox ? { ...mailbox, role: a.role } : null;
      })
    );

    return mailboxes.filter(Boolean);
  },
});

// Create a new mailbox
export const create = mutation({
  args: {
    domainId: v.id("domains"),
    name: v.string(),
    displayName: v.optional(v.string()),
    type: v.union(v.literal("personal"), v.literal("shared"), v.literal("alias")),
    forwardTo: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if mailbox already exists
    const existing = await ctx.db
      .query("mailboxes")
      .withIndex("by_domain_name", (q) =>
        q.eq("domainId", args.domainId).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error(`Mailbox ${args.name} already exists`);
    }

    return await ctx.db.insert("mailboxes", {
      domainId: args.domainId,
      name: args.name,
      displayName: args.displayName,
      type: args.type,
      forwardTo: args.forwardTo,
      createdAt: Date.now(),
    });
  },
});

// Update mailbox
export const update = mutation({
  args: {
    id: v.id("mailboxes"),
    displayName: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal("personal"), v.literal("shared"), v.literal("alias"))
    ),
    forwardTo: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Delete mailbox
export const remove = mutation({
  args: { id: v.id("mailboxes") },
  handler: async (ctx, args) => {
    // Delete all messages in mailbox
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete access records
    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.id))
      .collect();

    for (const a of access) {
      await ctx.db.delete(a._id);
    }

    // Delete mailbox
    await ctx.db.delete(args.id);
  },
});

// Grant user access to mailbox
export const grantAccess = mutation({
  args: {
    mailboxId: v.id("mailboxes"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member"), v.literal("readonly")),
  },
  handler: async (ctx, args) => {
    // Check if access already exists
    const existing = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user_mailbox", (q) =>
        q.eq("userId", args.userId).eq("mailboxId", args.mailboxId)
      )
      .first();

    if (existing) {
      // Update existing access
      await ctx.db.patch(existing._id, { role: args.role });
      return existing._id;
    }

    return await ctx.db.insert("mailboxAccess", {
      mailboxId: args.mailboxId,
      userId: args.userId,
      role: args.role,
      createdAt: Date.now(),
    });
  },
});

// Revoke user access
export const revokeAccess = mutation({
  args: {
    mailboxId: v.id("mailboxes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user_mailbox", (q) =>
        q.eq("userId", args.userId).eq("mailboxId", args.mailboxId)
      )
      .first();

    if (access) {
      await ctx.db.delete(access._id);
    }
  },
});
