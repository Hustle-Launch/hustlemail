import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Auth, UserIdentity } from "convex/server";
import type { Id } from "./_generated/dataModel";

export async function identityFor(ctx: { auth: Auth }): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in to access your mail.");
  return identity;
}
const authenticated = customCtx(async (ctx: { auth: Auth }) => ({ identity: await identityFor(ctx) }));
export const authenticatedQuery = customQuery(query, authenticated);
export const authenticatedMutation = customMutation(mutation, authenticated);

export async function currentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await identityFor(ctx);
  const user = await ctx.db.query("users").withIndex("by_tokenIdentifier", q => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  if (!user) throw new Error("Finish account setup before opening mail.");
  return user;
}
export async function mailboxAccess(ctx: QueryCtx | MutationCtx, mailboxId: Id<"mailboxes">, write = false) {
  const user = await currentUser(ctx);
  const access = await ctx.db.query("mailboxAccess").withIndex("by_user_mailbox", q => q.eq("userId", user._id).eq("mailboxId", mailboxId)).unique();
  if (!access || (write && access.role === "readonly")) throw new Error("You do not have access to this mailbox.");
  const mailbox = await ctx.db.get(mailboxId);
  if (!mailbox) throw new Error("Mailbox not found.");
  return { user, access, mailbox };
}
export async function messageAccess(ctx: QueryCtx | MutationCtx, id: Id<"messages">, write = false) {
  const message = await ctx.db.get(id);
  if (!message) throw new Error("Message not found.");
  return { ...(await mailboxAccess(ctx, message.mailboxId, write)), message };
}
export function isPilotOwner(identity: UserIdentity) {
  const token = process.env.HUSTLEMAIL_OWNER_TOKEN_IDENTIFIER;
  if (token) return token === identity.tokenIdentifier;
  const email = process.env.HUSTLEMAIL_OWNER_EMAIL?.toLowerCase();
  return Boolean(email && identity.emailVerified === true && identity.email?.toLowerCase() === email);
}
