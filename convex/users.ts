/**
 * User management queries and mutations.
 * Handles user CRUD operations and Clerk synchronization.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Retrieves a user by their Clerk ID.
 * @param clerkId - The Clerk user ID.
 * @returns The user or null if not found.
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Retrieves a user by their email address.
 * @param email - The user's email address.
 * @returns The user or null if not found.
 */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * Retrieves a user by their ID.
 * @param id - The user ID.
 * @returns The user or null if not found.
 */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Creates or updates a user (upsert on Clerk sign-in).
 * @param clerkId - The Clerk user ID.
 * @param email - User's email address.
 * @param name - User's display name.
 * @param avatarUrl - Optional avatar URL.
 * @returns The user ID.
 */
export const upsert = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    // Create new user
    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
  },
});

/**
 * Updates a user's profile information.
 * @param id - The user ID to update.
 * @param name - Optional new name.
 * @param avatarUrl - Optional new avatar URL.
 */
export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

/**
 * Deletes a user and revokes all mailbox access.
 * @param id - The user ID to delete.
 */
export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    // Revoke all mailbox access
    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user", (q) => q.eq("userId", args.id))
      .collect();

    for (const a of access) {
      await ctx.db.delete(a._id);
    }

    // Delete user
    await ctx.db.delete(args.id);
  },
});
