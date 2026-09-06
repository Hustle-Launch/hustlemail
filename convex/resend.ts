"use node";

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

const API = "https://api.resend.com";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_POLL_MS = 120_000;
type JsonObject = Record<string, unknown>;
class ProviderError extends Error {
  constructor(message: string, readonly retryable = true, readonly retryAfterMs = 0, readonly rateLimited = false, readonly httpStatus = 0) { super(message); }
}
function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProviderError("Invalid object returned by Resend.");
  return value as JsonObject;
}
function string(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function stringArray(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === "string") return [value];
  if (!Array.isArray(value) || value.some(x => typeof x !== "string")) throw new ProviderError("Invalid address list returned by Resend.");
  return value as string[];
}
function page(value: unknown) {
  const row = object(value);
  if (!Array.isArray(row.data) || typeof row.has_more !== "boolean") throw new ProviderError("Invalid list returned by Resend.");
  return { data: row.data.map(object), hasMore: row.has_more };
}
function address(raw: string) {
  const match = raw.match(/^(.*?)<([^<>]+)>$/);
  return match ? { name: match[1].trim().replace(/^"|"$/g, ""), address: match[2].trim().toLowerCase() } : { address: raw.trim().toLowerCase() };
}
async function request(ctx: ActionCtx, path: string, options: RequestInit = {}) {
  const account = process.env.RESEND_ACCOUNT_ID ?? "primary";
  const at = await ctx.runMutation(internal.resendState.reserveRequest, { account, now: Date.now() });
  const delay = at - Date.now();
  if (delay > 30_000) throw new ProviderError("Resend requests are waiting for provider backoff.", true, delay, true);
  if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  const response = await fetch(`${API}${path}`, { ...options, headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", ...options.headers }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    // Provider response bodies can contain addresses or payloads; persist only the status.
    const retryable = response.status === 429 || response.status === 408 || response.status >= 500;
    const retryHeader = response.headers.get("retry-after");
    const retryAfterMs = retryHeader ? (Number.isFinite(Number(retryHeader)) ? Number(retryHeader) * 1000 : Math.max(0, Date.parse(retryHeader) - Date.now())) : 0;
    if (response.status === 429) await ctx.runMutation(internal.resendState.deferRequests, { account, until: Date.now() + Math.max(1000, Number.isFinite(retryAfterMs) ? retryAfterMs : 0) });
    throw new ProviderError(`Resend request failed (HTTP ${response.status}).`, retryable, Number.isFinite(retryAfterMs) ? retryAfterMs : 0, response.status === 429, response.status);
  }
  return await response.json() as unknown;
}
async function download(url: string): Promise<Blob> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || /^(localhost|127\.|\[::1\])/.test(parsed.hostname)) throw new ProviderError("Invalid Resend attachment URL.");
  let response: Response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(20_000) }); }
  catch (error) {
    // Only the origin is useful for transport diagnosis; signed query strings are secrets.
    console.error("Attachment download transport failed", parsed.origin);
    const code = (error as { cause?: { code?: unknown } })?.cause?.code;
    throw new ProviderError(`Attachment transfer failed${typeof code === "string" && /^[A-Z_0-9]{1,80}$/.test(code) ? ` (${code})` : ""}; stored content will retry.`);
  }
  if (!response.ok || !response.body) throw new ProviderError("Could not download a received attachment.");
  if (Number(response.headers.get("content-length") ?? 0) > MAX_FILE_BYTES) throw new ProviderError("Received attachment exceeds the 25 MiB import limit; its message is held for recovery.", false);
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_FILE_BYTES) throw new ProviderError("Received attachment exceeds the 25 MiB import limit; its message is held for recovery.", false);
      chunks.push(new Uint8Array(next.value));
    }
  } finally { await reader.cancel(); }
  return new Blob(chunks, { type: response.headers.get("content-type") ?? "application/octet-stream" });
}
function checkBudget(started: number, budgetMs = MAX_POLL_MS) {
  if (Date.now() - started > budgetMs) throw new ProviderError("Attachment import paused at its time budget; stored progress will resume.");
}
function receivedContent(email: JsonObject, staging: Doc<"receivedImports">, id: string, listed?: JsonObject) {
  const text = string(email.text), html = string(email.html);
  const rawHeaders = email.headers && typeof email.headers === "object" ? object(email.headers) : {};
  const headers = Object.fromEntries(Object.entries(rawHeaders).map(([key, value]) => [key.toLowerCase(), value]));
  const references = string(headers.references).match(/<[^>]+>/g) ?? [];
  const inlineBody = Buffer.byteLength(text + html, "utf8") <= 300_000;
  const date = Date.parse(string(email.created_at, string(listed?.created_at)));
  return {
    messageId: string(email.message_id, id), from: address(string(email.from)), to: stringArray(email.to).map(address), cc: stringArray(email.cc).map(address), bcc: stringArray(email.bcc).map(address), replyTo: stringArray(email.reply_to)[0] ? address(stringArray(email.reply_to)[0]) : undefined,
    subject: string(email.subject, "(no subject)").slice(0, 998), bodyText: inlineBody ? text : undefined, bodyHtml: inlineBody ? html : undefined, bodyStorageId: staging.bodyStorageId!, snippet: (text || html.replace(/<[^>]*>/g, " ")).slice(0, 150), date: Number.isFinite(date) ? date : Date.now(), attachments: staging.attachments.map(({ providerId: _providerId, ...file }) => file), inReplyTo: string(headers["in-reply-to"]) || undefined, references: references.slice(0, 100),
  };
}
async function importMessage(ctx: ActionCtx, account: string, id: string, started: number, listed?: JsonObject, budgetMs = MAX_POLL_MS): Promise<boolean> {
  if (await ctx.runQuery(internal.resendState.hasReceived, { account, providerId: id })) return false;
  let staging: Doc<"receivedImports"> | null = await ctx.runQuery(internal.resendState.getImport, { account, providerId: id });
  if (staging && staging.retryAt > Date.now()) return false;
  let step = "loading received content";
  let email: JsonObject | undefined;
  try {
    checkBudget(started, budgetMs);
    if (staging?.bodyStorageId) {
      const stored = await ctx.storage.get(staging.bodyStorageId);
      if (!stored) throw new ProviderError("Stored received content is unavailable; recovery is required.", false);
      email = object(JSON.parse(await stored.text()));
    } else {
      email = object(await request(ctx, `/emails/receiving/${encodeURIComponent(id)}`));
      const bodyStorageId = await ctx.storage.store(new Blob([JSON.stringify(email)], { type: "application/json" }));
      // Keep a blob after attempting this mutation, even if its response is lost.
      staging = await ctx.runMutation(internal.resendState.stageImport, { account, providerId: id, bodyStorageId });
    }
    await ctx.runMutation(internal.resendState.showPartialImport, { account, providerId: id, payload: receivedContent(email, staging!, id, listed) });
    while (!staging!.attachmentsComplete) {
      checkBudget(started, budgetMs);
      step = "listing attachments";
      const cursor: string | undefined = staging!.attachmentCursor;
      const files = page(await request(ctx, `/emails/receiving/${encodeURIComponent(id)}/attachments?limit=100${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`));
      for (const file of files.data) {
        const providerId = string(file.id);
        if (!providerId) throw new ProviderError("Resend returned an attachment without an ID.");
        if (staging!.attachments.some(a => a.providerId === providerId)) continue;
        checkBudget(started, budgetMs);
        step = "storing an attachment";
        if (staging!.attachments.length >= 100) throw new ProviderError("Received email exceeds the 100 attachment import limit; its message is held for recovery.", false);
        let data: Blob;
        try { data = await download(string(file.download_url)); }
        catch (originalError) {
          // The individual endpoint refreshes an expired or obsolete signed URL.
          const fresh = object(await request(ctx, `/emails/receiving/${encodeURIComponent(id)}/attachments/${encodeURIComponent(providerId)}`));
          const refreshedUrl = string(fresh.download_url);
          if (!refreshedUrl || refreshedUrl === string(file.download_url)) throw originalError;
          if (new URL(refreshedUrl).origin !== new URL(string(file.download_url)).origin) console.info("Attachment URL refreshed", new URL(refreshedUrl).origin);
          data = await download(refreshedUrl);
        }
        const storageId = await ctx.storage.store(data);
        staging = await ctx.runMutation(internal.resendState.stageImport, { account, providerId: id, attachment: { providerId, filename: string(file.filename, "attachment").slice(0, 255), contentType: string(file.content_type, "application/octet-stream").slice(0, 120), size: data.size, storageId } });
      }
      const nextCursor = string(files.data.at(-1)?.id);
      if (files.hasMore && (!nextCursor || nextCursor === cursor)) throw new ProviderError("Attachment pagination did not advance.");
      step = "checkpointing attachments";
      staging = await ctx.runMutation(internal.resendState.stageImport, { account, providerId: id, attachmentCursor: files.hasMore ? nextCursor : undefined, attachmentsComplete: !files.hasMore });
    }
    step = "routing stored content";
    const result = await ctx.runMutation(internal.resendState.ingest, { account, providerId: id, payload: receivedContent(email, staging!, id, listed) });
    return result.inserted;
  } catch (error) {
    if (!(error instanceof ProviderError) && error instanceof Error) {
      const cause = (error as Error & { cause?: { code?: unknown } }).cause;
      const safeMessage = /^[A-Za-z :.-]{1,120}$/.test(error.message) ? error.message : "runtime error";
      const safeCause = typeof cause?.code === "string" && /^[A-Z_0-9]{1,80}$/.test(cause.code) ? cause.code : "";
      console.error("Received import interrupted", step, error.name, safeMessage, safeCause, error.stack?.split("\n").slice(1, 4).join("\n"));
    }
    const providerError = error instanceof ProviderError ? error : new ProviderError(`Mail import was interrupted while ${step} (${error instanceof Error ? error.name : "unknown error"}); its stored progress will retry.`);
    await ctx.runMutation(internal.resendState.failImport, { account, providerId: id, error: providerError.message, retryable: providerError.retryable, retryAfterMs: providerError.retryAfterMs, now: Date.now() });
    if (email && staging?.bodyStorageId) await ctx.runMutation(internal.resendState.showPartialImport, { account, providerId: id, payload: receivedContent(email, staging, id, listed), error: providerError.message });
    if (providerError.rateLimited) throw providerError;
    return false;
  }
}

export const poll = internalAction({
  args: {}, returns: v.object({ configured: v.boolean(), imported: v.number(), skipped: v.boolean() }),
  handler: async (ctx): Promise<{ configured: boolean; imported: number; skipped: boolean }> => {
    if (!process.env.RESEND_API_KEY) return { configured: false, imported: 0, skipped: true };
    const account = process.env.RESEND_ACCOUNT_ID ?? "primary";
    const token = crypto.randomUUID();
    const started = Date.now();
    const state = await ctx.runMutation(internal.resendState.acquirePoll, { account, token, now: started });
    if (!state) return { configured: true, imported: 0, skipped: true };
    let imported = 0;
    try {
      // Recovery has its own durable queue, so a problematic message cannot block newer mail.
      const retry = await ctx.runQuery(internal.resendState.dueImport, { account, now: Date.now() });
      if (retry && await importMessage(ctx, account, retry.providerId, started, undefined, 30_000)) imported++;
      checkBudget(started);
      const list = page(await request(ctx, `/emails/receiving?limit=10${state.cursor ? `&after=${encodeURIComponent(state.cursor)}` : ""}`));
      if (list.data.length === 0 && list.hasMore) throw new ProviderError("Resend returned an empty page with more pages pending.");
      const scanHead: string | null = state.scanHead ?? (list.data[0] ? string(list.data[0].id) : null);
      let reachedHead = false, partial = false, lastProcessed: string | null = null;
      for (const listed of list.data) {
        const id = string(listed.id);
        if (!id) throw new ProviderError("Resend returned a message without an ID.");
        if (id === state.completedHead) { reachedHead = true; break; }
        if (Date.now() - started > MAX_POLL_MS) { partial = true; break; }
        if (await importMessage(ctx, account, id, started, listed)) imported++;
        // Advancement requires a complete receipt or a durable, visible recovery entry.
        lastProcessed = id;
      }
      const done = reachedHead || (!partial && !list.hasMore);
      const cursor = done ? null : lastProcessed;
      if (!done && (!cursor || cursor === state.cursor)) throw new ProviderError("Import paused; the next poll resumes the unfinished page.");
      await ctx.runMutation(internal.resendState.checkpoint, { account, token, cursor, scanHead, done, now: Date.now() });
    } catch (error) {
      if (state.cursor && error instanceof ProviderError && [400, 404].includes(error.httpStatus)) await ctx.runMutation(internal.resendState.restartScan, { account, token, now: Date.now() });
      else await ctx.runMutation(internal.resendState.pollFailed, { account, token, now: Date.now(), error: error instanceof ProviderError ? error.message : "Mail import was interrupted. A later poll will retry the unfinished page.", retryAfterMs: error instanceof ProviderError ? error.retryAfterMs : undefined });
    }
    return { configured: true, imported, skipped: false };
  },
});

export const sendQueued = internalAction({
  args: { id: v.id("outboundQueue") }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!process.env.RESEND_API_KEY) return null;
    const token = crypto.randomUUID();
    const item = await ctx.runMutation(internal.resendState.claimSend, { id: args.id, token, now: Date.now() });
    if (!item) return null;
    try {
      const attachments = [];
      for (const file of item.attachments) {
        const blob = await ctx.storage.get(file.storageId);
        if (!blob) throw new ProviderError("An outbound attachment is no longer available.", false);
        attachments.push({ filename: file.filename, content_type: file.contentType, content: Buffer.from(await blob.arrayBuffer()).toString("base64") });
      }
      // Immutable snapshots and a stable key make an ambiguous provider acknowledgement safe to retry.
      const result = object(await request(ctx, "/emails", { method: "POST", headers: { "Idempotency-Key": `hustlemail-send-${item.id}` }, body: JSON.stringify({ from: item.from, to: item.to, cc: item.cc, bcc: item.bcc, subject: item.subject || "(no subject)", text: item.text || (!item.html ? "\n" : undefined), html: item.html || undefined, headers: { ...(item.inReplyTo ? { "In-Reply-To": item.inReplyTo } : {}), ...(item.references?.length ? { References: item.references.join(" ") } : {}) }, attachments }) }));
      const providerId = string(result.id);
      if (!providerId) throw new ProviderError("Resend did not return the sent message ID.");
      await ctx.runMutation(internal.resendState.finishSend, { id: args.id, token, providerId, retryable: false, now: Date.now() });
    } catch (error) {
      await ctx.runMutation(internal.resendState.finishSend, { id: args.id, token, error: error instanceof ProviderError ? error.message : "Sending was interrupted; retrying with the same provider key.", retryable: error instanceof ProviderError ? error.retryable : true, retryAfterMs: error instanceof ProviderError ? error.retryAfterMs : undefined, now: Date.now() });
    }
    return null;
  },
});
export const refreshSentMetadata = internalAction({
  args: { id: v.id("outboundQueue") }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!process.env.RESEND_API_KEY) return null;
    const providerId = await ctx.runMutation(internal.resendState.claimSentMetadata, { id: args.id, now: Date.now() });
    if (!providerId) return null;
    try {
      const result = object(await request(ctx, `/emails/${encodeURIComponent(providerId)}`));
      const messageId = string(result.message_id);
      if (!messageId) throw new ProviderError("Resend has not exposed the sent Message-ID yet.");
      await ctx.runMutation(internal.resendState.saveSentMetadata, { id: args.id, messageId, now: Date.now() });
    } catch (error) {
      await ctx.runMutation(internal.resendState.saveSentMetadata, { id: args.id, error: error instanceof ProviderError ? error.message : "Sent metadata lookup was interrupted; accepted mail will not be resent.", retryAfterMs: error instanceof ProviderError ? error.retryAfterMs : undefined, now: Date.now() });
    }
    return null;
  },
});
