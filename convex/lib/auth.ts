/**
 * Authentication helpers for Convex mutations and queries.
 * Provides user identity verification and access control.
 */

import {
  QueryCtx,
  MutationCtx,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Gets the current user's Convex user record from Clerk identity.
 * @throws Error if not authenticated or user not found.
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Must be logged in");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("Unauthorized: User not found");
  }

  return user;
}

/**
 * Verifies the current user has access to a mailbox.
 * @returns The user and their access record.
 * @throws Error if no access or not authenticated.
 */
export async function requireMailboxAccess(
  ctx: QueryCtx | MutationCtx,
  mailboxId: Id<"mailboxes">,
  requiredRole?: "owner" | "member" | "readonly"
) {
  const user = await requireCurrentUser(ctx);

  const access = await ctx.db
    .query("mailboxAccess")
    .withIndex("by_user_mailbox", (q) =>
      q.eq("userId", user._id).eq("mailboxId", mailboxId)
    )
    .first();

  if (!access) {
    throw new Error("Unauthorized: No access to this mailbox");
  }

  // Role hierarchy: owner > member > readonly
  if (requiredRole === "owner" && access.role !== "owner") {
    throw new Error("Unauthorized: Owner access required");
  }

  if (
    requiredRole === "member" &&
    access.role !== "owner" &&
    access.role !== "member"
  ) {
    throw new Error("Unauthorized: Member access required");
  }

  return { user, access };
}

/**
 * Verifies the current user has access to a message via its mailbox.
 * @returns The user, message, and mailbox access record.
 * @throws Error if message not found or no access.
 */
export async function requireMessageAccess(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<"messages">,
  requiredRole?: "owner" | "member" | "readonly"
) {
  const user = await requireCurrentUser(ctx);

  const message = await ctx.db.get(messageId);
  if (!message) {
    throw new Error("Message not found");
  }

  const { access } = await requireMailboxAccess(ctx, message.mailboxId, requiredRole);

  return { user, message, access };
}

/**
 * Verifies the current user owns a domain.
 * @returns The user and domain.
 * @throws Error if domain not found or not owned.
 */
export async function requireDomainOwnership(
  ctx: QueryCtx | MutationCtx,
  domainId: Id<"domains">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Must be logged in");
  }

  const domain = await ctx.db.get(domainId);
  if (!domain) {
    throw new Error("Domain not found");
  }

  if (domain.ownerId !== identity.subject) {
    throw new Error("Unauthorized: Must be domain owner");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return { user, domain };
}
