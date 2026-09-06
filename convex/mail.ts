import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { action, internalMutation, internalQuery, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { authenticatedMutation, authenticatedQuery, currentUser, identityFor, isPilotOwner, mailboxAccess, messageAccess } from "./mailAuth";
import * as validators from "./mailValidators";

export function messageSummary(m: Doc<"messages">) {
  const { _id, mailboxId, from, to, subject, snippet, date, receivedAt, isRead, isStarred, isArchived, isTrashed, isSpam, isSent, isDraft, labels, attachments, snoozedUntil, deliveryStatus, deliveryError, queueId, threadId, clientDraftId } = m;
  return { _id, mailboxId, from, to, subject, snippet, date, receivedAt, isRead, isStarred, isArchived, isTrashed, isSpam, isSent, isDraft, labels, attachments, snoozedUntil, deliveryStatus, deliveryError, queueId, threadId, clientDraftId, attachmentsPending: m.attachmentsPending, attachmentError: m.attachmentError };
}
export function folderFor(m: { isTrashed: boolean; isSpam: boolean; isDraft: boolean; isSent: boolean; isArchived: boolean; snoozedUntil?: number; queueId?: Id<"outboundQueue"> }) {
  return m.isTrashed ? "trash" : m.isSpam ? "spam" : m.isDraft ? "drafts" : m.snoozedUntil ? "snoozed" : m.isArchived ? "archive" : (m.isSent || m.queueId) ? "sent" : "inbox";
}
export function searchTextFor(m: { subject: string; from: { name?: string; address: string }; to: Array<{ name?: string; address: string }>; bodyText?: string; bodyHtml?: string; snippet: string }) {
  const text = [m.subject, m.from.name, m.from.address, ...m.to.flatMap(a => [a.name, a.address]), m.bodyText || m.bodyHtml?.replace(/<[^>]*>/g, " ") || m.snippet].filter(Boolean).join(" ");
  return new TextDecoder().decode(new TextEncoder().encode(text).slice(0, 100_000));
}
async function ownedMailboxes(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const accesses = await ctx.db.query("mailboxAccess").withIndex("by_user", q => q.eq("userId", userId)).take(100);
  const result = [];
  for (const access of accesses) {
    const box = await ctx.db.get(access.mailboxId);
    if (!box) continue;
    const domain = await ctx.db.get(box.domainId);
    if (!domain) continue;
    result.push({ _id: box._id, name: box.name, address: `${box.name}@${domain.name}`, displayName: box.displayName ?? box.name, role: access.role });
  }
  return result;
}
export const session = query({
  args: {},
  returns: v.object({ authenticated: v.boolean(), user: v.union(v.null(), v.object({ id: v.id("users"), name: v.string(), email: v.string() })), mailboxes: v.array(validators.mailbox), configured: v.boolean(), bootstrapAllowed: v.boolean() }),
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { authenticated: false, user: null, mailboxes: [], configured: Boolean(process.env.RESEND_API_KEY), bootstrapAllowed: false };
    const user = await ctx.db.query("users").withIndex("by_tokenIdentifier", q => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    return { authenticated: true, user: user ? { id: user._id, name: user.name, email: user.email } : null, mailboxes: user ? await ownedMailboxes(ctx, user._id) : [], configured: Boolean(process.env.RESEND_API_KEY), bootstrapAllowed: isPilotOwner(identity) };
  },
});
export const ensureUser = authenticatedMutation({
  args: {}, returns: v.id("users"),
  handler: async ctx => {
    const existing = await ctx.db.query("users").withIndex("by_tokenIdentifier", q => q.eq("tokenIdentifier", ctx.identity.tokenIdentifier)).unique();
    if (existing) return existing._id;
    return await ctx.db.insert("users", { tokenIdentifier: ctx.identity.tokenIdentifier, clerkId: ctx.identity.subject, email: ctx.identity.email ?? "", name: ctx.identity.name ?? "Hustlemail user", createdAt: Date.now() });
  },
});
export const bootstrap = authenticatedMutation({
  args: {}, returns: v.object({ mailboxId: v.id("mailboxes") }),
  handler: async ctx => {
    if (!isPilotOwner(ctx.identity)) throw new Error("Pilot setup is restricted to the configured account owner. Set HUSTLEMAIL_OWNER_TOKEN_IDENTIFIER or HUSTLEMAIL_OWNER_EMAIL on the backend.");
    let user = await ctx.db.query("users").withIndex("by_tokenIdentifier", q => q.eq("tokenIdentifier", ctx.identity.tokenIdentifier)).unique();
    if (!user) {
      const id = await ctx.db.insert("users", { tokenIdentifier: ctx.identity.tokenIdentifier, clerkId: ctx.identity.subject, email: ctx.identity.email ?? "", name: ctx.identity.name ?? "Hustlemail owner", createdAt: Date.now() });
      user = (await ctx.db.get(id))!;
    }
    let domain = await ctx.db.query("domains").withIndex("by_name", q => q.eq("name", "uncap.us")).unique();
    if (domain && (domain.ownerTokenIdentifier ? domain.ownerTokenIdentifier !== ctx.identity.tokenIdentifier : domain.ownerId !== ctx.identity.subject)) throw new Error("The pilot domain belongs to another account.");
    if (!domain) {
      const id = await ctx.db.insert("domains", { name: "uncap.us", ownerId: ctx.identity.subject, ownerTokenIdentifier: ctx.identity.tokenIdentifier, status: "pending", dkimSelector: "resend", dkimPublicKey: "", dkimPrivateKey: "", spfRecord: "", dmarcRecord: "", config: { spamThreshold: 1, largeFileStrategy: "store", maxAttachmentSize: 25 * 1024 * 1024 }, createdAt: Date.now() });
      domain = (await ctx.db.get(id))!;
    }
    let box = await ctx.db.query("mailboxes").withIndex("by_domain_name", q => q.eq("domainId", domain!._id).eq("name", "notify")).unique();
    if (!box) {
      const id = await ctx.db.insert("mailboxes", { domainId: domain._id, name: "notify", displayName: "Notifications", type: "personal", createdAt: Date.now() });
      box = (await ctx.db.get(id))!;
    }
    const access = await ctx.db.query("mailboxAccess").withIndex("by_user_mailbox", q => q.eq("userId", user!._id).eq("mailboxId", box!._id)).unique();
    if (!access) {
      await ctx.db.insert("mailboxAccess", { userId: user._id, mailboxId: box._id, role: "owner", createdAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.resendState.rerouteArchived, { account: process.env.RESEND_ACCOUNT_ID ?? "primary", cursor: null });
    }
    return { mailboxId: box._id };
  },
});
export const mailboxes = authenticatedQuery({ args: {}, returns: v.array(validators.mailbox), handler: async ctx => ownedMailboxes(ctx, (await currentUser(ctx))._id) });
export const messages = authenticatedQuery({
  args: { mailboxId: v.id("mailboxes"), folder: validators.folder, search: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(validators.summary), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    await mailboxAccess(ctx, args.mailboxId);
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100) throw new Error("Choose a page size from 1 to 100.");
    const search = args.search?.trim().slice(0, 200);
    const pagination = { ...args.paginationOpts, maximumBytesRead: 2 * 1024 * 1024, maximumRowsRead: 100 };
    const result = search
      ? await ctx.db.query("messages").withSearchIndex("search_mail", q => {
        const scoped = q.search("searchText", search).eq("mailboxId", args.mailboxId);
        return args.folder === "starred" ? scoped : scoped.eq("folder", args.folder);
      }).paginate(pagination)
      : args.folder === "starred"
        ? await ctx.db.query("messages").withIndex("by_mailbox_isStarred_receivedAt", q => q.eq("mailboxId", args.mailboxId).eq("isStarred", true)).order("desc").paginate(pagination)
        : await ctx.db.query("messages").withIndex("by_mailbox_folder_receivedAt", q => q.eq("mailboxId", args.mailboxId).eq("folder", args.folder)).order("desc").paginate(pagination);
    return { page: result.page.filter(m => args.folder !== "starred" || (m.isStarred && !m.isTrashed)).map(messageSummary), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const details = authenticatedQuery({
  args: { id: v.id("messages") }, returns: v.union(validators.detail, v.null()),
  handler: async (ctx, args) => {
    const { message: m, mailbox } = await messageAccess(ctx, args.id);
    const domain = await ctx.db.get(mailbox.domainId);
    const attachments = await Promise.all(m.attachments.map(async a => ({ ...a, url: a.storageId ? await ctx.storage.getUrl(a.storageId) : null })));
    return { ...messageSummary(m), attachments, bodyText: m.bodyText, bodyHtml: m.bodyHtml, bodyUrl: m.bodyStorageId ? await ctx.storage.getUrl(m.bodyStorageId) : null, cc: m.cc, bcc: m.bcc, replyTo: m.replyTo, inReplyTo: m.inReplyTo, references: m.references, mailboxAddress: `${mailbox.name}@${domain?.name ?? ""}` };
  },
});
async function patchMessage(ctx: MutationCtx, id: Id<"messages">, patch: { isRead?: boolean; isStarred?: boolean; isArchived?: boolean; isTrashed?: boolean; isSpam?: boolean; labels?: string[]; snoozedUntil?: number | null }) {
  const { message } = await messageAccess(ctx, id, true);
  if (patch.labels && (patch.labels.length > 20 || patch.labels.some(s => s.length > 60))) throw new Error("Use at most 20 labels of 60 characters.");
  const snoozedUntil = patch.snoozedUntil === null ? undefined : patch.snoozedUntil;
  if (snoozedUntil !== undefined && (!Number.isFinite(snoozedUntil) || snoozedUntil <= Date.now())) throw new Error("Choose a future snooze time.");
  const { snoozedUntil: _snooze, ...flags } = patch;
  const changes = { ...flags, ...(patch.snoozedUntil !== undefined ? { snoozedUntil } : {}) };
  await ctx.db.patch(id, { ...changes, folder: folderFor({ ...message, ...changes, snoozedUntil: patch.snoozedUntil !== undefined ? snoozedUntil : message.snoozedUntil }) });
}
export const update = authenticatedMutation({ args: { id: v.id("messages"), patch: validators.patch }, returns: v.null(), handler: async (ctx, args) => { await patchMessage(ctx, args.id, args.patch); return null; } });
export const bulk = authenticatedMutation({ args: { ids: v.array(v.id("messages")), patch: validators.patch }, returns: v.null(), handler: async (ctx, args) => { if (args.ids.length > 100) throw new Error("Update at most 100 messages together."); for (const id of new Set(args.ids)) await patchMessage(ctx, id, args.patch); return null; } });
export const drafts = authenticatedQuery({ args: { mailboxId: v.id("mailboxes") }, returns: v.array(validators.summary), handler: async (ctx, args) => { await mailboxAccess(ctx, args.mailboxId); return (await ctx.db.query("messages").withIndex("by_mailbox_folder_receivedAt", q => q.eq("mailboxId", args.mailboxId).eq("folder", "drafts")).order("desc").take(100)).map(messageSummary); } });

function addresses(values: string[]) {
  if (values.length > 50) throw new Error("Use at most 50 recipients.");
  return values.map(raw => { const address = raw.trim().toLowerCase(); if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address) || address.length > 254) throw new Error(`Invalid recipient: ${raw.slice(0, 80)}`); return { address }; });
}
export const saveDraft = authenticatedMutation({
  args: { id: v.optional(v.id("messages")), clientDraftId: v.optional(v.string()), inReplyTo: v.optional(v.id("messages")), mailboxId: v.id("mailboxes"), to: v.array(v.string()), cc: v.optional(v.array(v.string())), bcc: v.optional(v.array(v.string())), subject: v.string(), text: v.string(), html: v.optional(v.string()), attachments: v.optional(v.array(validators.upload)) },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const { user, mailbox } = await mailboxAccess(ctx, args.mailboxId, true);
    if (args.subject.length > 998 || new TextEncoder().encode(args.text + (args.html ?? "")).byteLength > 400_000 || (args.clientDraftId?.length ?? 0) > 120) throw new Error("Draft exceeds the supported size (400 KB of text and HTML combined).");
    const attachments = args.attachments ?? [];
    if (attachments.length > 20 || attachments.reduce((sum, a) => sum + a.size, 0) > 25 * 1024 * 1024) throw new Error("Attachments must total at most 25 MiB across 20 files.");
    for (const file of attachments) {
      const stored = await ctx.db.query("mailUploads").withIndex("by_storageId", q => q.eq("storageId", file.storageId)).unique();
      if (!stored || stored.userId !== user._id || stored.mailboxId !== args.mailboxId || stored.size !== file.size || stored.filename !== file.filename || stored.contentType !== file.contentType) throw new Error("Attachment is not owned by this mailbox.");
    }
    let existing = args.id ? (await messageAccess(ctx, args.id, true)).message : null;
    if (!existing && args.clientDraftId) existing = await ctx.db.query("messages").withIndex("by_author_clientDraftId", q => q.eq("authorId", user._id).eq("clientDraftId", args.clientDraftId)).unique();
    if (existing?.queueId && existing.clientDraftId === args.clientDraftId && args.clientDraftId && existing.mailboxId === args.mailboxId) {
      const same = existing.subject === args.subject && existing.bodyText === args.text && (existing.bodyHtml ?? "") === (args.html ?? "") && JSON.stringify(existing.to) === JSON.stringify(addresses(args.to)) && JSON.stringify(existing.cc ?? []) === JSON.stringify(addresses(args.cc ?? [])) && JSON.stringify(existing.bcc ?? []) === JSON.stringify(addresses(args.bcc ?? [])) && JSON.stringify(existing.attachments) === JSON.stringify(attachments);
      if (same) return existing._id; // Replay after an ambiguous queue acknowledgement.
    }
    if (existing && (existing.mailboxId !== args.mailboxId || !existing.isDraft || existing.queueId)) throw new Error("This draft has already been queued or belongs to another mailbox.");
    const domain = await ctx.db.get(mailbox.domainId);
    if (!domain) throw new Error("Domain not found.");
    const original = args.inReplyTo ? (await messageAccess(ctx, args.inReplyTo)).message : null;
    const content = { to: addresses(args.to), cc: addresses(args.cc ?? []), bcc: addresses(args.bcc ?? []), subject: args.subject, bodyText: args.text, bodyHtml: args.html, snippet: args.text.slice(0, 150), attachments, receivedAt: Date.now(), inReplyTo: original?.messageId ?? existing?.inReplyTo, references: original ? [...(original.references ?? []).slice(-98), original.messageId] : existing?.references, threadId: original?.threadId ?? original?.messageId ?? existing?.threadId };
    const from = existing?.from ?? { address: `${mailbox.name}@${domain.name}` };
    const searchText = searchTextFor({ ...content, from });
    if (existing) { await ctx.db.patch(existing._id, { ...content, searchText }); return existing._id; }
    return await ctx.db.insert("messages", { ...content, searchText, domainId: mailbox.domainId, mailboxId: args.mailboxId, authorId: user._id, clientDraftId: args.clientDraftId, messageId: `draft-${`${Date.now()}-${Math.random().toString(36).slice(2)}`}`, from, date: Date.now(), isDraft: true, isSent: false, isRead: true, isStarred: false, isArchived: false, isTrashed: false, isSpam: false, labels: [], folder: "drafts" });
  },
});
export const discardDraft = authenticatedMutation({ args: { id: v.id("messages") }, returns: v.null(), handler: async (ctx, args) => { const { message } = await messageAccess(ctx, args.id, true); if (!message.isDraft || message.queueId) throw new Error("Only unsent drafts can be discarded."); await ctx.db.delete(args.id); return null; } });
export const send = authenticatedMutation({
  args: { draftId: v.id("messages"), idempotencyKey: v.string() }, returns: v.id("outboundQueue"),
  handler: async (ctx, args) => {
    const { user, message } = await messageAccess(ctx, args.draftId, true);
    if (!process.env.RESEND_API_KEY) throw new Error("Sending is not configured. Add RESEND_API_KEY to the backend.");
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(args.idempotencyKey)) throw new Error("A stable send idempotency key is required.");
    const existing = await ctx.db.query("outboundQueue").withIndex("by_user_idempotencyKey", q => q.eq("userId", user._id).eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) { if (existing.draftId !== args.draftId) throw new Error("Send key is already used for another draft."); return existing._id; }
    if (message.queueId) return message.queueId;
    if (!message.isDraft || message.to.length === 0) throw new Error("Choose at least one recipient for this draft.");
    const attachments = message.attachments.map(a => { if (!a.storageId) throw new Error("An attachment has not finished uploading."); return { filename: a.filename, contentType: a.contentType, storageId: a.storageId }; });
    const queueId = await ctx.db.insert("outboundQueue", { transport: "resend", domainId: message.domainId, mailboxId: message.mailboxId, userId: user._id, draftId: message._id, idempotencyKey: args.idempotencyKey, from: message.from.address, to: message.to.map(a => a.address), cc: message.cc?.map(a => a.address), bcc: message.bcc?.map(a => a.address), subject: message.subject, bodyText: message.bodyText, bodyHtml: message.bodyHtml, inReplyTo: message.inReplyTo, references: message.references, attachments, status: "pending", attempts: 0, nextAttemptAt: Date.now(), createdAt: Date.now() });
    await ctx.db.patch(message._id, { queueId, deliveryStatus: "pending", isDraft: false, folder: "sent" });
    await ctx.scheduler.runAfter(0, internal.resend.sendQueued, { id: queueId });
    return queueId;
  },
});
export const retrySend = authenticatedMutation({ args: { id: v.id("outboundQueue") }, returns: v.null(), handler: async (ctx, args) => {
  const item = await ctx.db.get(args.id);
  if (!item) throw new Error("Send not found.");
  await mailboxAccess(ctx, item.mailboxId, true);
  if (item.status !== "failed") throw new Error("Only failed sends can be retried.");
  if (item.firstAttemptAt && Date.now() - item.firstAttemptAt > 23 * 60 * 60 * 1000) throw new Error("This send is too old to safely retry. Check provider delivery status and create a new draft if needed.");
  await ctx.db.patch(item._id, { status: "pending", attempts: 0, nextAttemptAt: Date.now(), error: undefined });
  if (item.draftId) await ctx.db.patch(item.draftId, { deliveryStatus: "pending", deliveryError: undefined });
  await ctx.scheduler.runAfter(0, internal.resend.sendQueued, { id: item._id });
  return null;
} });
export const status = authenticatedQuery({ args: {}, returns: v.object({ configured: v.boolean(), pollIntervalSeconds: v.number(), lastPollAt: v.union(v.number(), v.null()), lastSuccessAt: v.union(v.number(), v.null()), lastError: v.union(v.string(), v.null()), pendingOutbound: v.number(), failedOutbound: v.number(), failedInbound: v.number(), inboundError: v.union(v.string(), v.null()) }), handler: async ctx => {
  const user = await currentUser(ctx);
  const boxes = await ownedMailboxes(ctx, user._id);
  const sync = boxes.length ? await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", process.env.RESEND_ACCOUNT_ID ?? "primary")).unique() : null;
  let pendingOutbound = 0, failedOutbound = 0;
  for (const box of boxes) {
    pendingOutbound += (await ctx.db.query("outboundQueue").withIndex("by_mailbox_status", q => q.eq("mailboxId", box._id).eq("status", "pending")).take(100)).length;
    failedOutbound += (await ctx.db.query("outboundQueue").withIndex("by_mailbox_status", q => q.eq("mailboxId", box._id).eq("status", "failed")).take(100)).length;
  }
  const imports = boxes.length ? await ctx.db.query("receivedImports").withIndex("by_account_retryAt", q => q.eq("account", process.env.RESEND_ACCOUNT_ID ?? "primary")).take(100) : [];
  return { failedInbound: imports.length, inboundError: imports.find(item => item.error)?.error ?? null, configured: Boolean(process.env.RESEND_API_KEY), pollIntervalSeconds: 10, lastPollAt: sync?.lastPollAt ?? null, lastSuccessAt: sync?.lastSuccessAt ?? null, lastError: sync?.lastError ?? null, pendingOutbound, failedOutbound };
} });
export const retryInbound = authenticatedMutation({ args: {}, returns: v.null(), handler: async ctx => {
  if (!isPilotOwner(ctx.identity)) throw new Error("Only the configured account owner can retry provider imports.");
  const account = process.env.RESEND_ACCOUNT_ID ?? "primary";
  const imports = await ctx.db.query("receivedImports").withIndex("by_account_retryAt", q => q.eq("account", account)).take(100);
  for (const item of imports) await ctx.db.patch(item._id, { retryAt: Date.now() });
  const sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", account)).unique();
  if (sync) await ctx.db.patch(sync._id, { retryAt: undefined });
  await ctx.scheduler.runAfter(0, internal.resend.poll, {});
  return null;
} });

export const uploadAccess = internalQuery({ args: { mailboxId: v.id("mailboxes") }, returns: v.object({ userId: v.id("users") }), handler: async (ctx, args) => ({ userId: (await mailboxAccess(ctx, args.mailboxId, true)).user._id }) });
export const recordUpload = internalMutation({ args: { userId: v.id("users"), mailboxId: v.id("mailboxes"), storageId: v.id("_storage"), filename: v.string(), contentType: v.string(), size: v.number() }, returns: v.null(), handler: async (ctx, args) => { await ctx.db.insert("mailUploads", args); return null; } });
export const uploadAttachment = action({ args: { mailboxId: v.id("mailboxes"), filename: v.string(), contentType: v.string(), data: v.bytes() }, returns: validators.upload, handler: async (ctx, args): Promise<{ storageId: Id<"_storage">; filename: string; contentType: string; size: number }> => {
  await identityFor(ctx);
  if (args.data.byteLength > 8 * 1024 * 1024 || args.filename.length > 255 || args.contentType.length > 120 || !args.filename.trim()) throw new Error("Use a named attachment no larger than 8 MiB.");
  const { userId } = await ctx.runQuery(internal.mail.uploadAccess, { mailboxId: args.mailboxId });
  const storageId = await ctx.storage.store(new Blob([args.data], { type: args.contentType }));
  const result = { storageId, filename: args.filename, contentType: args.contentType, size: args.data.byteLength };
  await ctx.runMutation(internal.mail.recordUpload, { ...result, mailboxId: args.mailboxId, userId });
  return result;
} });
