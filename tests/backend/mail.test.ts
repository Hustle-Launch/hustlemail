import { setImmediate as nextTurn } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
const ownerIdentity = { subject: "owner", issuer: "https://auth.test", tokenIdentifier: "https://auth.test|owner", name: "Michael", email: "notify@uncap.us", emailVerified: true };
const otherIdentity = { subject: "other", issuer: "https://auth.test", tokenIdentifier: "https://auth.test|other", email: "other@example.com", emailVerified: true };
const json = (data: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
const message = (id: string, to = ["notify@uncap.us"]) => ({ id, message_id: `<${id}@external.test>`, from: "Sender <sender@external.test>", to, cc: [], bcc: [], reply_to: [], subject: `Message ${id}`, text: `Full message body ${id}`, html: `<p>Full message body ${id}</p>`, created_at: "2026-09-06T05:00:00.000Z", headers: {} });

async function runPoll(t: ReturnType<typeof convexTest>) {
  let settled = false;
  const result = t.action(internal.resend.poll, {}).finally(() => { settled = true; });
  for (let tick = 0; tick < 1000 && !settled; tick++) {
    await nextTurn();
    if (vi.getTimerCount()) await vi.advanceTimersToNextTimerAsync();
  }
  return await result;
}

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(ownerIdentity);
  const { mailboxId } = await owner.mutation(api.mail.bootstrap, {});
  return { t, owner, mailboxId };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T06:00:00Z"));
  vi.stubEnv("HUSTLEMAIL_OWNER_TOKEN_IDENTIFIER", ownerIdentity.tokenIdentifier);
  vi.stubEnv("RESEND_API_KEY", "test-only-never-real");
  vi.stubEnv("RESEND_ACCOUNT_ID", "test-account");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request in test"); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("authenticated mailbox API", () => {
  it("rejects anonymous and cross-user access and prevents pilot takeover", async () => {
    const { t, owner, mailboxId } = await setup();
    const id = await owner.mutation(api.mail.saveDraft, { mailboxId, clientDraftId: "draft-1", to: [], subject: "Private", text: "Secret" });
    await expect(t.query(api.mail.mailboxes, {})).rejects.toThrow("Sign in");
    const other = t.withIdentity(otherIdentity);
    await other.mutation(api.mail.ensureUser, {});
    await expect(other.query(api.mail.details, { id })).rejects.toThrow("access");
    await expect(other.mutation(api.mail.update, { id, patch: { isTrashed: true } })).rejects.toThrow("access");
    await expect(other.mutation(api.mail.bootstrap, {})).rejects.toThrow("restricted");
    expect((await other.query(api.mail.mailboxes, {}))).toEqual([]);
  });

  it("bootstrap and draft creation are idempotent and preserve later settings", async () => {
    const { t, owner, mailboxId } = await setup();
    await t.run(async ctx => { await ctx.db.patch(mailboxId, { displayName: "My notification inbox" }); });
    expect(await owner.mutation(api.mail.bootstrap, {})).toEqual({ mailboxId });
    expect((await owner.query(api.mail.mailboxes, {}))[0].displayName).toBe("My notification inbox");
    const input = { mailboxId, clientDraftId: "offline-draft-1", to: [], subject: "Saved", text: "Offline body" };
    expect(await owner.mutation(api.mail.saveDraft, input)).toEqual(await owner.mutation(api.mail.saveDraft, input));
    expect(await owner.query(api.mail.drafts, { mailboxId })).toHaveLength(1);
  });

  it("checks upload ownership and persists drafts, folder changes, and snooze wake", async () => {
    const { t, owner, mailboxId } = await setup();
    const attachment = await owner.action(api.mail.uploadAttachment, { mailboxId, filename: "note.txt", contentType: "text/plain", data: new TextEncoder().encode("owned").buffer });
    const draftId = await owner.mutation(api.mail.saveDraft, { mailboxId, to: [], subject: "With attachment", text: "Body", attachments: [attachment] });
    expect((await owner.query(api.mail.details, { id: draftId }))?.attachments[0].url).toBeTruthy();
    const stolenId = await t.run(ctx => ctx.storage.store(new Blob(["unowned"])));
    await expect(owner.mutation(api.mail.saveDraft, { mailboxId, to: [], subject: "Bad", text: "Body", attachments: [{ ...attachment, storageId: stolenId }] })).rejects.toThrow("not owned");
    await owner.mutation(api.mail.update, { id: draftId, patch: { isTrashed: true } });
    expect((await owner.query(api.mail.messages, { mailboxId, folder: "trash", paginationOpts: { numItems: 20, cursor: null } })).page).toHaveLength(1);
    await t.run(ctx => ctx.db.patch(draftId, { isDraft: false, isTrashed: false, folder: "inbox" }));
    await owner.mutation(api.mail.update, { id: draftId, patch: { snoozedUntil: Date.now() + 10_000 } });
    expect((await owner.query(api.mail.messages, { mailboxId, folder: "inbox", paginationOpts: { numItems: 20, cursor: null } })).page).toHaveLength(0);
    vi.setSystemTime(Date.now() + 11_000);
    await t.mutation(internal.resendState.recoverSendsAndSnoozes, {});
    expect((await owner.query(api.mail.messages, { mailboxId, folder: "inbox", paginationOpts: { numItems: 20, cursor: null } })).page).toHaveLength(1);
  });
});

describe("Resend polling", () => {
  it("does nothing without a credential", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const t = convexTest(schema, modules);
    expect(await runPoll(t)).toEqual({ configured: false, imported: 0, skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("backfills, stores complete content and attachments, routes every recipient, and deduplicates replays", async () => {
    const { t, owner, mailboxId } = await setup();
    const secondBox = await t.run(async ctx => {
      const box = (await ctx.db.get(mailboxId))!;
      return await ctx.db.insert("mailboxes", { domainId: box.domainId, name: "other", type: "personal", createdAt: Date.now() });
    });
    const incoming = message("in-1", ["notify@uncap.us", "other@uncap.us", "notify@uncap.us"]);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/attachments?")) return json({ data: [{ id: "a1", filename: "proof.txt", content_type: "text/plain", download_url: "https://files.resend.com/proof" }], has_more: false });
      if (url === "https://files.resend.com/proof") return new Response("durable attachment", { headers: { "Content-Type": "text/plain" } });
      if (url.includes("/receiving?")) return json({ data: [incoming], has_more: false });
      if (url.endsWith("/in-1")) return json(incoming);
      throw new Error(`Unexpected test URL ${url}`);
    }));
    expect((await runPoll(t)).imported).toBe(1);
    expect((await runPoll(t)).imported).toBe(0);
    const first = await owner.query(api.mail.messages, { mailboxId, folder: "inbox", paginationOpts: { numItems: 20, cursor: null } });
    expect(first.page).toHaveLength(1);
    const detail = await owner.query(api.mail.details, { id: first.page[0]._id });
    expect(detail?.bodyText).toBe(incoming.text);
    expect(detail?.attachments[0].storageId).toBeTruthy();
    const stored = await t.run(async ctx => ({ messages: await ctx.db.query("messages").take(10), receipts: await ctx.db.query("receivedEmails").take(10), content: await (await ctx.storage.get(detail!.attachments[0].storageId!))!.text() }));
    expect(stored.messages.map(m => m.mailboxId).sort()).toEqual([mailboxId, secondBox].sort());
    expect(stored.receipts).toHaveLength(1);
    expect(stored.content).toBe("durable attachment");
  });

  it("retains an interrupted message for retry while advancing other pages", async () => {
    const { t } = await setup();
    let failSecond = true;
    const seenUrls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      seenUrls.push(url);
      if (url.includes("/attachments?")) return json({ data: [], has_more: false });
      if (url.includes("after=two")) return json({ data: [message("old")], has_more: false });
      if (url.includes("/receiving?")) return json({ data: [message("one"), message("two")], has_more: true });
      if (url.endsWith("/two") && failSecond) return json({ error: "temporary" }, 503);
      const id = url.split("/").at(-1)!;
      return json(message(id));
    }));
    expect((await runPoll(t)).imported).toBe(1);
    let state = await t.run(async ctx => (await ctx.db.query("mailSync").take(1))[0]);
    expect(state.cursor).toBe("two");
    expect(state.completedHead).toBeUndefined();
    expect((await t.run(ctx => ctx.db.query("receivedImports").take(10)))[0].error).toContain("503");
    failSecond = false;
    vi.setSystemTime(Date.now() + 11_000);
    expect((await runPoll(t)).imported).toBe(2);
    expect((await runPoll(t)).imported).toBe(0);
    state = await t.run(async ctx => (await ctx.db.query("mailSync").take(1))[0]);
    expect(state.cursor).toBeUndefined();
    expect(state.completedHead).toBe("one");
    expect(await t.run(ctx => ctx.db.query("receivedEmails").take(10))).toHaveLength(3);
    expect(seenUrls.some(url => url.includes("after=two"))).toBe(true);
  });

  it("recovers an invalid saved pagination cursor without losing existing deduplication", async () => {
    const { t } = await setup();
    await t.mutation(internal.resendState.acquirePoll, { account: "test-account", token: "old-worker", now: Date.now() });
    await t.mutation(internal.resendState.checkpoint, { account: "test-account", token: "old-worker", cursor: "expired-cursor", scanHead: "previous-head", done: false, now: Date.now() });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("after=expired-cursor")) return json({}, 400);
      if (url.includes("/attachments?")) return json({ data: [], has_more: false });
      if (url.includes("/receiving?")) return json({ data: [message("fresh-head")], has_more: false });
      return json(message("fresh-head"));
    }));
    await runPoll(t);
    const state = (await t.run(ctx => ctx.db.query("mailSync").take(1)))[0];
    expect(state.cursor).toBeUndefined();
    expect(state.lastError).toContain("cursor");
    vi.setSystemTime(Date.now() + 11_000);
    expect((await runPoll(t)).imported).toBe(1);
    expect((await runPoll(t)).imported).toBe(0);
    expect(await t.run(ctx => ctx.db.query("messages").take(10))).toHaveLength(1);
  });

  it("does not accept a message whose attachment download failed", async () => {
    const { t } = await setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/attachments?")) return json({ data: [{ id: "file", download_url: "https://files.resend.com/missing", filename: "missing.txt" }], has_more: false });
      if (url.includes("files.resend")) return new Response("", { status: 503 });
      if (url.includes("/receiving?")) return json({ data: [message("failed")], has_more: false });
      return json(message("failed"));
    }));
    expect((await runPoll(t)).imported).toBe(0);
    const state = await t.run(async ctx => ({ receipts: await ctx.db.query("receivedEmails").take(10), sync: (await ctx.db.query("mailSync").take(1))[0] }));
    expect(state.receipts).toEqual([]);
    expect(state.sync.completedHead).toBe("failed");
    expect((await t.run(ctx => ctx.db.query("receivedImports").take(10)))[0].bodyStorageId).toBeTruthy();
  });
});

describe("recovery boundaries", () => {
  it("materializes mail archived before bootstrap, once, and indexes body and sender search", async () => {
    const t = convexTest(schema, modules);
    const bodyStorageId = await t.run(ctx => ctx.storage.store(new Blob(["raw"])));
    await t.mutation(internal.resendState.ingest, { account: "test-account", providerId: "early", payload: { messageId: "early", from: { address: "sender@example.com" }, to: [{ address: "notify@uncap.us" }], subject: "Before setup", bodyText: "Searchable avocado receipt", bodyStorageId, snippet: "Searchable avocado", date: Date.now(), attachments: [] } });
    expect(await t.run(ctx => ctx.db.query("messages").take(10))).toHaveLength(0);
    const owner = t.withIdentity(ownerIdentity);
    const { mailboxId } = await owner.mutation(api.mail.bootstrap, {});
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    await owner.mutation(api.mail.bootstrap, {});
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await t.run(ctx => ctx.db.query("messages").take(10))).toHaveLength(1);
    for (const search of ["avocado", "sender"]) expect((await owner.query(api.mail.messages, { mailboxId, folder: "inbox", search, paginationOpts: { cursor: null, numItems: 20 } })).page).toHaveLength(1);
  });

  it("restricts import recovery to the owner and preserves stored progress", async () => {
    const { t, owner } = await setup();
    const bodyStorageId = await t.run(ctx => ctx.storage.store(new Blob(["raw"])));
    await t.mutation(internal.resendState.stageImport, { account: "test-account", providerId: "retry-owner", bodyStorageId });
    await t.mutation(internal.resendState.failImport, { account: "test-account", providerId: "retry-owner", retryable: false, error: "Held for recovery", now: Date.now() });
    await expect(t.withIdentity(otherIdentity).mutation(api.mail.retryInbound, {})).rejects.toThrow("owner");
    await expect(t.mutation(api.mail.retryInbound, {})).rejects.toThrow("Sign in");
    await owner.mutation(api.mail.retryInbound, {});
    const stored = (await t.run(ctx => ctx.db.query("receivedImports").take(10)))[0];
    expect(stored.retryAt).toBe(Date.now());
    expect(stored.bodyStorageId).toBe(bodyStorageId);
    vi.stubEnv("RESEND_API_KEY", "");
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
  });

  it("enforces UTF-8 draft bytes before reaching the database document limit", async () => {
    const { owner, mailboxId } = await setup();
    await expect(owner.mutation(api.mail.saveDraft, { mailboxId, to: [], subject: "Unicode", text: "界".repeat(140_000) })).rejects.toThrow("400 KB");
    const id = await owner.mutation(api.mail.saveDraft, { mailboxId, to: [], subject: "Unicode", text: "界".repeat(100_000) });
    expect((await owner.query(api.mail.details, { id }))?.bodyText).toHaveLength(100_000);
  });

  it("shares provider request spacing and honors Retry-After without a request loop", async () => {
    const { t } = await setup();
    const start = Date.now();
    const first = await t.mutation(internal.resendState.reserveRequest, { account: "shared", now: start });
    const second = await t.mutation(internal.resendState.reserveRequest, { account: "shared", now: start });
    expect(second - first).toBe(550);
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 429, { "Retry-After": "60" })));
    await runPoll(t);
    const state = await t.run(async ctx => (await ctx.db.query("mailSync").withIndex("by_account", q => q.eq("account", "test-account")).unique())!);
    expect(state!.retryAt).toBeGreaterThanOrEqual(start + 60_000);
    expect((await runPoll(t)).skipped).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(start + 61_000);
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [], has_more: false })));
    expect((await runPoll(t)).skipped).toBe(false);
  });

  it("quarantines an oversized message visibly and continues importing other messages", async () => {
    const { t, owner } = await setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("/oversized/attachments?")) return json({ data: [{ id: "big", filename: "large.bin", download_url: "https://files.resend.com/large" }], has_more: false });
      if (url.includes("/attachments?")) return json({ data: [], has_more: false });
      if (url.includes("files.resend")) return new Response("", { headers: { "Content-Length": String(26 * 1024 * 1024) } });
      if (url.includes("/receiving?")) return json({ data: [message("oversized"), message("healthy")], has_more: false });
      return json({ ...message(url.split("/").at(-1)!), reply_to: "reply@example.com" });
    }));
    expect((await runPoll(t)).imported).toBe(1);
    const status = await owner.query(api.mail.status, {});
    expect(status.failedInbound).toBe(1);
    expect(status.inboundError).toContain("25 MiB");
    const stored = await t.run(async ctx => ({ receipts: await ctx.db.query("receivedEmails").take(10), held: await ctx.db.query("receivedImports").take(10) }));
    expect(stored.receipts[0].providerId).toBe("healthy");
    expect(stored.receipts[0].payload?.replyTo?.address).toBe("reply@example.com");
    expect(stored.held[0].bodyStorageId).toBeTruthy();
    expect(stored.held[0].retryAt).toBeGreaterThan(Date.now());
  });

  it("resumes attachment progress after a download failure without refetching stored files", async () => {
    const { t, owner } = await setup();
    let fail = true;
    const downloads: string[] = [];
    const requestTimes: number[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("https://api.resend.com")) requestTimes.push(Date.now());
      if (url.includes("/attachments?")) return json({ data: ["first", "second"].map(id => ({ id, filename: `${id}.txt`, download_url: `https://files.resend.com/${id}` })), has_more: false });
      if (url.includes("files.resend")) { downloads.push(url); return new Response("bytes", { status: url.endsWith("second") && fail ? 503 : 200 }); }
      if (url.includes("/receiving?")) return json({ data: [message("partial")], has_more: false });
      return json(message("partial"));
    }));
    expect((await runPoll(t)).imported).toBe(0);
    expect((await t.run(ctx => ctx.db.query("receivedImports").take(10)))[0].attachments).toHaveLength(1);
    const partial = (await t.run(ctx => ctx.db.query("messages").take(10)))[0];
    expect(partial.attachmentsPending).toBe(true);
    expect(partial.bodyText).toBe("Full message body partial");
    expect(partial.attachmentError).toBeTruthy();
    await owner.mutation(api.mail.update, { id: partial._id, patch: { isRead: true, isArchived: true } });
    fail = false;
    vi.setSystemTime(Date.now() + 11_000);
    expect((await runPoll(t)).imported).toBe(1);
    expect(downloads.filter(url => url.endsWith("first"))).toHaveLength(1);
    expect(downloads.filter(url => url.endsWith("second"))).toHaveLength(2);
    expect((await owner.query(api.mail.status, {})).failedInbound).toBe(0);
    const complete = (await owner.query(api.mail.details, { id: partial._id }))!;
    expect(complete.attachmentsPending).toBe(false);
    expect(complete.attachments).toHaveLength(2);
    expect(complete.isRead && complete.isArchived).toBe(true);
    expect(complete.attachmentError).toBeUndefined();
    expect(requestTimes.every((time, i) => i === 0 || time - requestTimes[i - 1] >= 550)).toBe(true);
  });
});

describe("durable outbound queue", () => {
  it("queues once, safely replays the draft save, and retries with an identical provider key and payload", async () => {
    const { t, owner, mailboxId } = await setup();
    const input = { mailboxId, clientDraftId: "send-draft-1", to: ["notify@uncap.us"], subject: "Dogfood", text: "Test body" };
    const draftId = await owner.mutation(api.mail.saveDraft, input);
    const queueId = await owner.mutation(api.mail.send, { draftId, idempotencyKey: "stable-send-1" });
    expect(await owner.mutation(api.mail.saveDraft, input)).toBe(draftId);
    expect(await owner.mutation(api.mail.send, { draftId, idempotencyKey: "stable-send-1" })).toBe(queueId);
    const calls: RequestInit[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => { if (options.method !== "POST") return json({ message_id: "<sent-provider@example.com>" }); calls.push(options); return calls.length === 1 ? json({}, 503) : json({ id: "sent-provider-id" }); }));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(calls).toHaveLength(2);
    expect(calls[0].body).toBe(calls[1].body);
    expect((calls[0].headers as Record<string, string>)["Idempotency-Key"]).toBe((calls[1].headers as Record<string, string>)["Idempotency-Key"]);
    const item = await t.run(ctx => ctx.db.get(queueId));
    expect(item?.status).toBe("sent");
    expect(item?.attempts).toBe(2);
    expect((await owner.query(api.mail.details, { id: draftId }))?.isSent).toBe(true);
    expect(await t.run(ctx => ctx.db.query("outboundQueue").take(10))).toHaveLength(1);
  });

  it("retries SMTP metadata lookup without resending, then uses the provider Message-ID for replies", async () => {
    const { t, owner, mailboxId } = await setup();
    const draftId = await owner.mutation(api.mail.saveDraft, { mailboxId, to: ["notify@uncap.us"], subject: "Thread", text: "Original" });
    const queueId = await owner.mutation(api.mail.send, { draftId, idempotencyKey: "metadata-recovery" });
    let sends = 0, lookups = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
      if (options.method === "POST") { sends++; return json({ id: "smtp-provider" }); }
      lookups++;
      return lookups === 1 ? json({}, 503) : json({ message_id: "<real-smtp@example.com>" });
    }));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(sends).toBe(1);
    expect(lookups).toBe(2);
    expect((await t.run(ctx => ctx.db.get(queueId)))?.smtpMessageId).toBe("<real-smtp@example.com>");
    const reply = await owner.mutation(api.mail.saveDraft, { mailboxId, inReplyTo: draftId, to: ["notify@uncap.us"], subject: "Re: Thread", text: "Reply" });
    expect((await owner.query(api.mail.details, { id: reply }))?.inReplyTo).toBe("<real-smtp@example.com>");
  });

  it("dispatches the supported 25 MiB attachment boundary without expanding mutation arguments", async () => {
    const { t, owner, mailboxId } = await setup();
    const attachments = [];
    for (const [index, size] of [8, 8, 8, 1].entries()) {
      attachments.push(await owner.action(api.mail.uploadAttachment, { mailboxId, filename: `file-${index}.bin`, contentType: "application/octet-stream", data: new Uint8Array(size * 1024 * 1024).buffer }));
    }
    const draftId = await owner.mutation(api.mail.saveDraft, { mailboxId, to: ["notify@uncap.us"], subject: "Boundary", text: "Body", attachments });
    const queueId = await owner.mutation(api.mail.send, { draftId, idempotencyKey: "attachment-boundary" });
    let bytes = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
      if (options.method !== "POST") return json({ message_id: "<large-provider@example.com>" });
      const payload = JSON.parse(options.body as string);
      bytes = payload.attachments.reduce((sum: number, file: { content: string }) => sum + Buffer.from(file.content, "base64").byteLength, 0);
      return json({ id: "large-sent-id" });
    }));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(bytes).toBe(25 * 1024 * 1024);
    expect((await t.run(ctx => ctx.db.get(queueId)))?.status).toBe("sent");
  });

  it("recovers a lost worker lease and stops before the provider idempotency window expires", async () => {
    const { t, owner, mailboxId } = await setup();
    const draftId = await owner.mutation(api.mail.saveDraft, { mailboxId, to: ["notify@uncap.us"], subject: "Recover", text: "Body" });
    const queueId = await owner.mutation(api.mail.send, { draftId, idempotencyKey: "lease-recovery" });
    expect(await t.mutation(internal.resendState.claimSend, { id: queueId, token: "lost-worker", now: Date.now() })).toBeTruthy();
    expect(await t.mutation(internal.resendState.claimSend, { id: queueId, token: "overlap", now: Date.now() })).toBeNull();
    vi.setSystemTime(Date.now() + 181_000);
    await t.mutation(internal.resendState.recoverSendsAndSnoozes, {});
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => options.method === "POST" ? json({ id: "recovered-send" }) : json({ message_id: "<recovered@example.com>" })));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await t.run(ctx => ctx.db.get(queueId)))?.attempts).toBe(2);
    const expiredId = await owner.mutation(api.mail.saveDraft, { mailboxId, to: ["notify@uncap.us"], subject: "Expired", text: "Body" });
    const expiredQueue = await owner.mutation(api.mail.send, { draftId: expiredId, idempotencyKey: "expired-key-window" });
    await t.run(ctx => ctx.db.patch(expiredQueue, { firstAttemptAt: Date.now() - 24 * 60 * 60 * 1000 }));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await t.run(ctx => ctx.db.get(expiredQueue)))?.status).toBe("failed");
  });

  it("stops automatic retries for a permanent provider rejection", async () => {
    const { t, owner, mailboxId } = await setup();
    const draftId = await owner.mutation(api.mail.saveDraft, { mailboxId, to: ["notify@uncap.us"], subject: "Rejected", text: "Body" });
    const queueId = await owner.mutation(api.mail.send, { draftId, idempotencyKey: "rejected-send-1" });
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 403)));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await t.run(ctx => ctx.db.get(queueId)))?.status).toBe("failed");
  });
});
