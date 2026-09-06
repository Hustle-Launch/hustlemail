import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { receivedPayload, receivedImport, stagedAttachment } from "./mailValidators";
import { folderFor, searchTextFor } from "./mail";
import type { Doc, Id } from "./_generated/dataModel";

const syncClaim = v.object({ cursor: v.union(v.string(), v.null()), completedHead: v.union(v.string(), v.null()), scanHead: v.union(v.string(), v.null()) });
export const acquirePoll = internalMutation({
  args: { account: v.string(), token: v.string(), now: v.number() }, returns: v.union(syncClaim, v.null()),
  handler: async (ctx, args) => {
    let sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", args.account)).unique();
    if (sync && ((sync.leaseUntil ?? 0) > args.now || (sync.retryAt ?? 0) > args.now)) return null;
    if (!sync) {
      const id = await ctx.db.insert("mailSync", { account: args.account, failures: 0 });
      sync = (await ctx.db.get(id))!;
    }
    await ctx.db.patch(sync._id, { leaseToken: args.token, leaseUntil: args.now + 180_000, lastPollAt: args.now });
    return { cursor: sync.cursor ?? null, completedHead: sync.completedHead ?? null, scanHead: sync.scanHead ?? null };
  },
});
export const checkpoint = internalMutation({
  args: { account: v.string(), token: v.string(), cursor: v.union(v.string(), v.null()), scanHead: v.union(v.string(), v.null()), done: v.boolean(), now: v.number() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", args.account)).unique();
    if (!sync || sync.leaseToken !== args.token) return false;
    await ctx.db.patch(sync._id, { cursor: args.done ? undefined : args.cursor ?? undefined, scanHead: args.done ? undefined : args.scanHead ?? undefined, completedHead: args.done ? args.scanHead ?? sync.completedHead : sync.completedHead, lastSuccessAt: args.now, lastError: undefined, failures: 0, retryAt: undefined, leaseUntil: undefined, leaseToken: undefined });
    return true;
  },
});
export const pollFailed = internalMutation({
  args: { account: v.string(), token: v.string(), error: v.string(), retryAfterMs: v.optional(v.number()), now: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", args.account)).unique();
    if (sync?.leaseToken === args.token) await ctx.db.patch(sync._id, { lastError: args.error.slice(0, 300), failures: sync.failures + 1, retryAt: args.now + Math.max(Math.min(args.retryAfterMs ?? 0, 3_600_000), Math.min(300_000, 10_000 * 2 ** Math.min(sync.failures, 5))), leaseUntil: undefined, leaseToken: undefined });
    return null;
  },
});
export const restartScan = internalMutation({
  args: { account: v.string(), token: v.string(), now: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", args.account)).unique();
    if (sync?.leaseToken === args.token) await ctx.db.patch(sync._id, { cursor: undefined, scanHead: undefined, leaseToken: undefined, leaseUntil: undefined, retryAt: args.now + 10_000, lastError: "The saved provider cursor is unavailable. Restarting the scan using durable message deduplication." });
    return null;
  },
});
export const hasReceived = internalQuery({ args: { account: v.string(), providerId: v.string() }, returns: v.boolean(), handler: async (ctx, args) => Boolean(await ctx.db.query("receivedEmails").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique()) });

async function routePayload(ctx: MutationCtx, account: string, providerId: string, payload: NonNullable<Doc<"receivedEmails">["payload"]>, previous: Id<"messages">[] = [], complete = true, error?: string) {
  const recipients = [...payload.to, ...(payload.cc ?? []), ...(payload.bcc ?? [])];
  if (recipients.length > 200) throw new Error("Received email has more than 200 routing recipients.");
  const boxes = new Set<Id<"mailboxes">>();
  const messageIds = [...previous];
  for (const { address } of recipients) {
    const separator = address.lastIndexOf("@");
    if (separator < 1) continue;
    const domainName = address.slice(separator + 1).toLowerCase();
    const name = address.slice(0, separator).toLowerCase();
    const domain = await ctx.db.query("domains").withIndex("by_name", q => q.eq("name", domainName)).unique();
    if (!domain || domain.status === "suspended") continue;
    let box = await ctx.db.query("mailboxes").withIndex("by_domain_name", q => q.eq("domainId", domain._id).eq("name", name)).unique();
    if (!box && domain.config.catchAllMailbox) box = await ctx.db.query("mailboxes").withIndex("by_domain_name", q => q.eq("domainId", domain._id).eq("name", domain.config.catchAllMailbox!)).unique();
    if (!box || boxes.has(box._id)) continue;
    boxes.add(box._id);
    const existing = await ctx.db.query("messages").withIndex("by_provider_mailbox", q => q.eq("providerAccount", account).eq("providerId", providerId).eq("mailboxId", box._id)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...payload, searchText: searchTextFor(payload), attachmentsPending: !complete, attachmentError: error });
      if (!messageIds.includes(existing._id)) messageIds.push(existing._id);
      continue;
    }
    messageIds.push(await ctx.db.insert("messages", { ...payload, attachmentsPending: !complete, attachmentError: error, searchText: searchTextFor(payload), providerAccount: account, providerId, domainId: domain._id, mailboxId: box._id, threadId: payload.references?.[0] ?? payload.inReplyTo ?? payload.messageId, isRead: false, isStarred: false, isArchived: false, isDraft: false, isSent: false, isSpam: false, isTrashed: false, labels: [], folder: "inbox", receivedAt: Date.now() }));
  }
  return messageIds;
}
export const showPartialImport = internalMutation({
  args: { account: v.string(), providerId: v.string(), payload: receivedPayload, error: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    if (await ctx.db.query("receivedEmails").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique()) return null;
    await routePayload(ctx, args.account, args.providerId, args.payload, [], false, args.error?.slice(0, 300));
    return null;
  },
});
export const ingest = internalMutation({
  args: { account: v.string(), providerId: v.string(), payload: receivedPayload }, returns: v.object({ inserted: v.boolean(), messageIds: v.array(v.id("messages")) }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("receivedEmails").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique();
    if (existing) {
      const staging = await ctx.db.query("receivedImports").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique();
      if (staging) await ctx.db.delete(staging._id);
      return { inserted: false, messageIds: existing.messageIds };
    }
    const messageIds = await routePayload(ctx, args.account, args.providerId, args.payload);
    // Unrouted content is retained, then idempotently materialized when mailbox setup runs.
    await ctx.db.insert("receivedEmails", { ...args, messageIds, receivedAt: Date.now() });
    const staging = await ctx.db.query("receivedImports").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique();
    if (staging) await ctx.db.delete(staging._id);
    return { inserted: true, messageIds };
  },
});
export const rerouteArchived = internalMutation({
  args: { account: v.string(), cursor: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("receivedEmails").withIndex("by_account_providerId", q => q.eq("account", args.account)).paginate({ numItems: 5, cursor: args.cursor });
    for (const receipt of page.page) if (receipt.payload) await ctx.db.patch(receipt._id, { messageIds: await routePayload(ctx, args.account, receipt.providerId, receipt.payload, receipt.messageIds) });
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.resendState.rerouteArchived, { account: args.account, cursor: page.continueCursor });
    return null;
  },
});
export const reserveRequest = internalMutation({
  args: { account: v.string(), now: v.number() }, returns: v.number(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", args.account)).unique();
    const at = Math.max(args.now, sync?.nextRequestAt ?? args.now);
    if (sync) await ctx.db.patch(sync._id, { nextRequestAt: at + 550 });
    else await ctx.db.insert("mailSync", { account: args.account, failures: 0, nextRequestAt: at + 550 });
    return at;
  },
});
export const deferRequests = internalMutation({
  args: { account: v.string(), until: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const sync = await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", args.account)).unique();
    if (sync) await ctx.db.patch(sync._id, { nextRequestAt: Math.max(sync.nextRequestAt ?? 0, args.until) });
    return null;
  },
});
export const getImport = internalQuery({ args: { account: v.string(), providerId: v.string() }, returns: v.union(receivedImport, v.null()), handler: async (ctx, args) => await ctx.db.query("receivedImports").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique() });
export const dueImport = internalQuery({ args: { account: v.string(), now: v.number() }, returns: v.union(receivedImport, v.null()), handler: async (ctx, args) => await ctx.db.query("receivedImports").withIndex("by_account_retryAt", q => q.eq("account", args.account).lte("retryAt", args.now)).first() });
export const stageImport = internalMutation({
  args: { account: v.string(), providerId: v.string(), bodyStorageId: v.optional(v.id("_storage")), attachment: v.optional(stagedAttachment), attachmentCursor: v.optional(v.string()), attachmentsComplete: v.optional(v.boolean()) }, returns: receivedImport,
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("receivedImports").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique();
    if (!existing) {
      const id = await ctx.db.insert("receivedImports", { account: args.account, providerId: args.providerId, bodyStorageId: args.bodyStorageId, attachments: args.attachment ? [args.attachment] : [], attachmentCursor: args.attachmentCursor, attachmentsComplete: args.attachmentsComplete ?? false, attempts: 0, retryAt: Date.now(), updatedAt: Date.now() });
      return (await ctx.db.get(id))!;
    }
    const attachments = args.attachment && !existing.attachments.some(a => a.providerId === args.attachment!.providerId) ? [...existing.attachments, args.attachment] : existing.attachments;
    if (attachments.length > 100) throw new Error("Attachment staging limit exceeded.");
    await ctx.db.patch(existing._id, { bodyStorageId: args.bodyStorageId ?? existing.bodyStorageId, attachments, attachmentCursor: args.attachmentCursor ?? existing.attachmentCursor, attachmentsComplete: args.attachmentsComplete ?? existing.attachmentsComplete, updatedAt: Date.now() });
    return (await ctx.db.get(existing._id))!;
  },
});
export const failImport = internalMutation({
  args: { account: v.string(), providerId: v.string(), error: v.string(), retryable: v.boolean(), retryAfterMs: v.optional(v.number()), now: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    // A commit can succeed even when its acknowledgement is interrupted.
    if (await ctx.db.query("receivedEmails").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique()) return null;
    const existing = await ctx.db.query("receivedImports").withIndex("by_account_providerId", q => q.eq("account", args.account).eq("providerId", args.providerId)).unique();
    const attempts = (existing?.attempts ?? 0) + 1;
    const delay = Math.max(Math.min(args.retryAfterMs ?? 0, 3_600_000), args.retryable ? Math.min(3_600_000, 10_000 * 2 ** Math.min(attempts - 1, 9)) : 3_600_000);
    const fields = { attempts, retryAt: args.now + delay, error: args.error.slice(0, 300), updatedAt: args.now };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("receivedImports", { account: args.account, providerId: args.providerId, attachments: [], attachmentsComplete: false, ...fields });
    return null;
  },
});

const sendClaim = v.object({ id: v.id("outboundQueue"), from: v.string(), to: v.array(v.string()), cc: v.optional(v.array(v.string())), bcc: v.optional(v.array(v.string())), subject: v.string(), text: v.optional(v.string()), html: v.optional(v.string()), inReplyTo: v.optional(v.string()), references: v.optional(v.array(v.string())), attempts: v.number(), firstAttemptAt: v.number(), attachments: v.array(v.object({ filename: v.string(), contentType: v.string(), storageId: v.id("_storage") })) });
export const claimSend = internalMutation({
  args: { id: v.id("outboundQueue"), token: v.string(), now: v.number() }, returns: v.union(sendClaim, v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.status === "sent" || item.status === "failed" || (item.status === "sending" && (item.leaseUntil ?? 0) > args.now) || (item.nextAttemptAt ?? 0) > args.now) return null;
    if (!item.from || !item.idempotencyKey || !item.draftId) return null; // Never dispatch legacy prototype rows.
    const firstAttemptAt = item.firstAttemptAt ?? args.now;
    if (args.now - firstAttemptAt > 23 * 60 * 60 * 1000 || (item.attempts ?? 0) >= 8) {
      await ctx.db.patch(item._id, { status: "failed", error: "Automatic retry limit reached; verify delivery before retrying." });
      await ctx.db.patch(item.draftId, { deliveryStatus: "failed", deliveryError: "Automatic retry limit reached; verify delivery before retrying." });
      return null;
    }
    const attempts = (item.attempts ?? 0) + 1;
    await ctx.db.patch(item._id, { status: "sending", attempts, firstAttemptAt, leaseToken: args.token, leaseUntil: args.now + 180_000, error: undefined });
    await ctx.db.patch(item.draftId, { deliveryStatus: "sending", deliveryError: undefined });
    return { id: item._id, from: item.from, to: item.to, cc: item.cc, bcc: item.bcc, subject: item.subject, text: item.bodyText, html: item.bodyHtml, inReplyTo: item.inReplyTo, references: item.references, attachments: item.attachments, attempts, firstAttemptAt };
  },
});
export const finishSend = internalMutation({
  args: { id: v.id("outboundQueue"), token: v.string(), providerId: v.optional(v.string()), error: v.optional(v.string()), retryable: v.boolean(), retryAfterMs: v.optional(v.number()), now: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.leaseToken !== args.token || item.status !== "sending") return null;
    if (args.providerId) {
      await ctx.db.patch(item._id, { status: "sent", resendId: args.providerId, sentAt: args.now, error: undefined, leaseUntil: undefined, leaseToken: undefined, metadataNextAt: args.now + 1000 });
      if (item.draftId) await ctx.db.patch(item.draftId, { isSent: true, isDraft: false, deliveryStatus: "sent", deliveryError: undefined, providerId: args.providerId, date: args.now, receivedAt: args.now });
      await ctx.scheduler.runAfter(1000, internal.resend.refreshSentMetadata, { id: item._id });
    } else {
      const retry = args.retryable && (item.attempts ?? 0) < 8 && args.now - (item.firstAttemptAt ?? args.now) < 23 * 60 * 60 * 1000;
      const delay = Math.max(Math.min(args.retryAfterMs ?? 0, 3_600_000), Math.min(900_000, 15_000 * 2 ** Math.min((item.attempts ?? 1) - 1, 6)));
      const error = (args.error ?? "Provider request failed.").slice(0, 300);
      await ctx.db.patch(item._id, { status: retry ? "pending" : "failed", error, nextAttemptAt: retry ? args.now + delay : undefined, leaseUntil: undefined, leaseToken: undefined });
      if (item.draftId) await ctx.db.patch(item.draftId, { deliveryStatus: retry ? "pending" : "failed", deliveryError: error });
      if (retry) await ctx.scheduler.runAfter(delay, internal.resend.sendQueued, { id: item._id });
    }
    return null;
  },
});
export const claimSentMetadata = internalMutation({
  args: { id: v.id("outboundQueue"), now: v.number() }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.status !== "sent" || !item.resendId || item.smtpMessageId || (item.metadataNextAt ?? 0) > args.now) return null;
    await ctx.db.patch(item._id, { metadataNextAt: args.now + 180_000, metadataAttempts: (item.metadataAttempts ?? 0) + 1 });
    return item.resendId;
  },
});
export const saveSentMetadata = internalMutation({
  args: { id: v.id("outboundQueue"), messageId: v.optional(v.string()), error: v.optional(v.string()), retryAfterMs: v.optional(v.number()), now: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.status !== "sent" || item.smtpMessageId) return null;
    if (args.messageId) {
      await ctx.db.patch(item._id, { smtpMessageId: args.messageId, metadataNextAt: undefined, metadataError: undefined });
      const message = item.draftId ? await ctx.db.get(item.draftId) : null;
      if (message) await ctx.db.patch(message._id, { messageId: args.messageId, threadId: message.threadId ?? args.messageId });
    } else {
      const delay = Math.max(Math.min(args.retryAfterMs ?? 0, 3_600_000), Math.min(3_600_000, 5000 * 2 ** Math.min(item.metadataAttempts ?? 1, 10)));
      await ctx.db.patch(item._id, { metadataError: (args.error ?? "Sent message metadata is pending.").slice(0, 300), metadataNextAt: args.now + delay });
      // GET recovery never resends accepted mail, even after the send idempotency window.
      await ctx.scheduler.runAfter(delay, internal.resend.refreshSentMetadata, { id: item._id });
    }
    return null;
  },
});
export const recoverSendsAndSnoozes = internalMutation({
  args: {}, returns: v.null(), handler: async ctx => {
    const now = Date.now();
    const pending = await ctx.db.query("outboundQueue").withIndex("by_transport_status_nextAttemptAt", q => q.eq("transport", "resend").eq("status", "pending").lte("nextAttemptAt", now)).take(10);
    const expired = await ctx.db.query("outboundQueue").withIndex("by_transport_status_leaseUntil", q => q.eq("transport", "resend").eq("status", "sending").lte("leaseUntil", now)).take(10);
    for (const item of [...pending, ...expired]) if (item.draftId && item.idempotencyKey) await ctx.scheduler.runAfter(0, internal.resend.sendQueued, { id: item._id });
    const metadata = await ctx.db.query("outboundQueue").withIndex("by_transport_status_metadataNextAt", q => q.eq("transport", "resend").eq("status", "sent").gt("metadataNextAt", 0).lte("metadataNextAt", now)).take(10);
    for (const item of metadata) await ctx.scheduler.runAfter(0, internal.resend.refreshSentMetadata, { id: item._id });
    const snoozed = await ctx.db.query("messages").withIndex("by_snoozedUntil", q => q.gt("snoozedUntil", 0).lte("snoozedUntil", now)).take(100);
    for (const message of snoozed) await ctx.db.patch(message._id, { snoozedUntil: undefined, folder: folderFor({ ...message, snoozedUntil: undefined }) });
    return null;
  },
});
