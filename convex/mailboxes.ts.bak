/**
 * Mailbox management queries and mutations.
 * Handles CRUD operations for email addresses within domains.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireCurrentUser,
  requireMailboxAccess,
  requireDomainOwnership,
} from "./lib/auth";

/**
 * Lists all mailboxes for a domain.
 * @param domainId - The domain ID to list mailboxes for.
 * @returns Array of mailboxes.
 */
export const listByDomain = query({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    // Verify user owns this domain
    await requireDomainOwnership(ctx, args.domainId);

    return await ctx.db
      .query("mailboxes")
      .withIndex("by_domain", (q) => q.eq("domainId", args.domainId))
      .collect();
  },
});

/**
 * Retrieves a mailbox by name within a domain.
 * @param domainId - The domain ID.
 * @param name - The mailbox name (local part of email).
 * @returns The mailbox or null if not found.
 */
export const getByName = query({
  args: {
    domainId: v.id("domains"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user owns this domain
    await requireDomainOwnership(ctx, args.domainId);

    return await ctx.db
      .query("mailboxes")
      .withIndex("by_domain_name", (q) =>
        q.eq("domainId", args.domainId).eq("name", args.name)
      )
      .first();
  },
});

/**
 * Retrieves a mailbox by ID.
 * @param id - The mailbox ID.
 * @returns The mailbox or null if not found.
 */
export const get = query({
  args: { id: v.id("mailboxes") },
  handler: async (ctx, args) => {
    // Verify user has access to this mailbox
    await requireMailboxAccess(ctx, args.id);

    return await ctx.db.get(args.id);
  },
});

/**
 * Lists all mailboxes the current user has access to.
 * @returns Array of mailboxes with access roles.
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    // Get current authenticated user
    const user = await requireCurrentUser(ctx);

    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

/**
 * Creates a new mailbox within a domain.
 * @param domainId - The domain ID.
 * @param name - The mailbox name (local part of email).
 * @param displayName - Optional display name.
 * @param type - The mailbox type (personal, shared, alias).
 * @param forwardTo - Optional array of forwarding addresses for aliases.
 * @returns The ID of the newly created mailbox.
 */
export const create = mutation({
  args: {
    domainId: v.id("domains"),
    name: v.string(),
    displayName: v.optional(v.string()),
    type: v.union(v.literal("personal"), v.literal("shared"), v.literal("alias")),
    forwardTo: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify user owns this domain
    const { user } = await requireDomainOwnership(ctx, args.domainId);

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

    const mailboxId = await ctx.db.insert("mailboxes", {
      domainId: args.domainId,
      name: args.name,
      displayName: args.displayName,
      type: args.type,
      forwardTo: args.forwardTo,
      createdAt: Date.now(),
    });

    // Grant owner access to the creator
    if (user) {
      await ctx.db.insert("mailboxAccess", {
        mailboxId,
        userId: user._id,
        role: "owner",
        createdAt: Date.now(),
      });
    }

    return mailboxId;
  },
});

/**
 * Updates mailbox properties.
 * @param id - The mailbox ID to update.
 * @param displayName - Optional new display name.
 * @param type - Optional new type.
 * @param forwardTo - Optional new forwarding addresses.
 */
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
    // Verify user has owner access
    await requireMailboxAccess(ctx, args.id, "owner");

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

/**
 * Deletes a mailbox and all associated messages and access records.
 * @param id - The mailbox ID to delete.
 */
export const remove = mutation({
  args: { id: v.id("mailboxes") },
  handler: async (ctx, args) => {
    // Verify user has owner access
    await requireMailboxAccess(ctx, args.id, "owner");

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

/**
 * Grants a user access to a mailbox.
 * @param mailboxId - The mailbox ID.
 * @param userId - The user ID to grant access to.
 * @param role - The access role (owner, member, readonly).
 * @returns The access record ID.
 */
export const grantAccess = mutation({
  args: {
    mailboxId: v.id("mailboxes"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member"), v.literal("readonly")),
  },
  handler: async (ctx, args) => {
    // Verify current user has owner access
    await requireMailboxAccess(ctx, args.mailboxId, "owner");

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

/**
 * Revokes a user's access to a mailbox.
 * @param mailboxId - The mailbox ID.
 * @param userId - The user ID to revoke access from.
 */
export const revokeAccess = mutation({
  args: {
    mailboxId: v.id("mailboxes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify current user has owner access
    await requireMailboxAccess(ctx, args.mailboxId, "owner");

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
