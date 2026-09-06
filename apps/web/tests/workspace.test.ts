import assert from "node:assert/strict";
import { test } from "vitest";
import {
  COMMANDS,
  commandForEvent,
  nextFocus,
  visibleKey,
} from "../components/workspace/commands";
import {
  applyPending,
  cacheKey,
  emptyCache,
  mergeMessages,
  readCache,
  writeCache,
} from "../components/workspace/cache";
import {
  belongsToFolder,
  draftFromMessage,
  isDownloadUrlAllowed,
  validateDraft,
} from "../components/workspace/types";
import type { Draft, MailMessage } from "../components/workspace/types";

const context = { editing: false, modal: false, composing: false };
test("attachment downloads require HTTPS outside exact local development hosts", () => {
  for (const url of [
    "https://storage.example.com/file",
    "http://localhost:3210/api/storage/file",
    "http://127.0.0.1:3210/api/storage/file",
  ])
    assert.equal(isDownloadUrlAllowed(url), true, url);
  for (const url of [
    "http://storage.example.com/file",
    "http://localhost.evil.test/file",
    "http://127.0.0.1.evil.test/file",
    "http://localhost@evil.test/file",
    "javascript:alert(1)",
    "data:text/html,test",
    "//localhost/file",
    "not a URL",
  ])
    assert.equal(isDownloadUrlAllowed(url), false, url);
});
const key = (value: string, overrides = {}) => ({
  key: value,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...overrides,
});
const message: MailMessage = {
  _id: "one",
  mailboxId: "box",
  from: { address: "sender@example.com", name: "Sender" },
  to: [{ address: "notify@uncap.us" }, { address: "colleague@example.com" }],
  cc: [{ address: "colleague@example.com" }, { address: "other@example.com" }],
  subject: "A conversation",
  snippet: "Hello",
  bodyText: "Hello",
  date: 10,
  receivedAt: 10,
  isRead: false,
  isStarred: false,
  isArchived: false,
  isTrashed: false,
  isSpam: false,
  isSent: false,
  isDraft: false,
  labels: [],
  attachments: [],
};
const draft: Draft = {
  clientDraftId: "draft-one",
  mailboxId: "box",
  to: "sender@example.com",
  cc: "",
  bcc: "",
  subject: "Hello",
  text: "A message",
  attachments: [],
  updatedAt: 1,
};

test("keyboard command registry exposes unique working bindings", () => {
  assert.equal(
    new Set(COMMANDS.map((command) => command.id)).size,
    COMMANDS.length,
  );
  for (const command of COMMANDS.filter(
    (item) => !["send", "close"].includes(item.id),
  ))
    assert.equal(
      commandForEvent(
        key(command.key, { shiftKey: !!command.shift, metaKey: !!command.mod }),
        context,
      ),
      command.id,
    );
});
test("typing a mail shortcut never changes the inbox", () => {
  for (const value of ["j", "k", "e", "r", "c", "x", "z", "h", "/"])
    assert.equal(
      commandForEvent(key(value), { ...context, editing: true }),
      null,
    );
  assert.equal(
    commandForEvent(key("k", { ctrlKey: true }), { ...context, editing: true }),
    "palette",
  );
});
test("modal dialogs own their keyboard focus", () => {
  assert.equal(commandForEvent(key("e"), { ...context, modal: true }), null);
  assert.equal(
    commandForEvent(key("Enter"), { ...context, modal: true }),
    null,
  );
  assert.equal(
    commandForEvent(key("Escape"), { ...context, modal: true }),
    "close",
  );
});
test("composer send works with Command and Control only in composer", () => {
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    assert.equal(
      commandForEvent(key("Enter", modifier), {
        ...context,
        composing: true,
        editing: true,
      }),
      "send",
    );
    assert.equal(commandForEvent(key("Enter", modifier), context), null);
  }
  assert.equal(
    commandForEvent(key("Enter"), {
      ...context,
      composing: true,
      editing: true,
    }),
    null,
  );
});
test("composition, browser shortcuts, consumed events and held destructive keys are respected", () => {
  assert.equal(commandForEvent(key("e", { isComposing: true }), context), null);
  assert.equal(
    commandForEvent(key("e", { defaultPrevented: true }), context),
    null,
  );
  assert.equal(commandForEvent(key("e", { repeat: true }), context), null);
  assert.equal(commandForEvent(key("j", { repeat: true }), context), "down");
  assert.equal(commandForEvent(key("e", { altKey: true }), context), null);
  assert.equal(
    commandForEvent(key("k", { ctrlKey: true, shiftKey: true }), context),
    null,
  );
});
test("bulk-selection directions and reply-all do not collide with basic actions", () => {
  assert.equal(
    commandForEvent(key("J", { shiftKey: true }), context),
    "selectDown",
  );
  assert.equal(
    commandForEvent(key("K", { shiftKey: true }), context),
    "selectUp",
  );
  assert.equal(
    commandForEvent(key("R", { shiftKey: true }), context),
    "replyAll",
  );
  assert.equal(commandForEvent(key("#", { shiftKey: true }), context), "trash");
});
test("focus stays bounded across empty lists and removed messages", () => {
  assert.equal(nextFocus([], "one", 1), null);
  assert.equal(nextFocus(["one", "two"], "missing", 1), "one");
  assert.equal(nextFocus(["one", "two"], "one", -1), "one");
  assert.equal(nextFocus(["one", "two"], "two", 1), "two");
  assert.equal(nextFocus(["two"], "one", 1), "two");
});
test("platform hints match the active modifier", () => {
  assert.equal(visibleKey("⌘ Enter", false), "Ctrl Enter");
  assert.equal(visibleKey("⌘ K", true), "⌘ K");
});
test("queued operations are applied in order and undo restores explicit previous values", () => {
  const first = {
    id: "a",
    ids: ["one"],
    patch: { isArchived: true },
    createdAt: 1,
  };
  const undo = {
    id: "b",
    ids: ["one"],
    patch: { isArchived: false },
    createdAt: 2,
  };
  assert.equal(applyPending([message], [first])[0].isArchived, true);
  assert.equal(applyPending([message], [first, undo])[0].isArchived, false);
  assert.equal(message.isArchived, false);
});
test("cache scopes separate users and mailboxes without key collisions", () => {
  assert.notEqual(cacheKey("user-a", "one"), cacheKey("user-b", "one"));
  assert.notEqual(cacheKey("user-a", "one"), cacheKey("user-a", "two"));
  assert.notEqual(cacheKey("a:b", "c"), cacheKey("a", "b:c"));
});
test("offline cache round-trips pending changes and rejects unknown versions", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  const cache = {
    ...emptyCache(),
    messages: [message],
    pending: [
      { id: "pending", ids: ["one"], patch: { isRead: true }, createdAt: 1 },
    ],
  };
  assert.equal(writeCache("test", cache), true);
  assert.equal(readCache("test").pending[0].id, "pending");
  values.set("test", '{"version":2}');
  assert.deepEqual(readCache("test"), emptyCache());
  values.set("test", "not json");
  assert.deepEqual(readCache("test"), emptyCache());
});
test("live summaries refresh flags while preserving downloaded bodies", () => {
  const { bodyText: _body, ...summary } = message;
  assert.equal(
    mergeMessages([message], [{ ...summary, isRead: true }])[0].bodyText,
    "Hello",
  );
  assert.equal(
    mergeMessages([message], [{ ...summary, isRead: true }])[0].isRead,
    true,
  );
});
test("folder rules keep snoozed, queued, spam and trashed mail out of inbox", () => {
  assert.equal(belongsToFolder(message, "inbox", 100), true);
  assert.equal(
    belongsToFolder({ ...message, snoozedUntil: 200 }, "inbox", 100),
    false,
  );
  assert.equal(
    belongsToFolder({ ...message, snoozedUntil: 200 }, "snoozed", 100),
    true,
  );
  assert.equal(
    belongsToFolder({ ...message, snoozedUntil: 50 }, "inbox", 100),
    true,
  );
  assert.equal(
    belongsToFolder({ ...message, deliveryStatus: "pending" }, "inbox"),
    false,
  );
  assert.equal(
    belongsToFolder({ ...message, deliveryStatus: "pending" }, "sent"),
    true,
  );
  assert.equal(
    belongsToFolder(
      { ...message, isTrashed: true, isStarred: true },
      "starred",
    ),
    false,
  );
  assert.equal(belongsToFolder({ ...message, isSpam: true }, "inbox"), false);
});
test("reply-all excludes your own address and deduplicates colleagues", () => {
  const reply = draftFromMessage(
    message,
    { _id: "box", name: "notify", address: "notify@uncap.us" },
    "replyAll",
  );
  assert.equal(reply.to, "sender@example.com");
  assert.equal(reply.cc, "colleague@example.com, other@example.com");
  assert.equal(reply.subject, "Re: A conversation");
  assert.equal(reply.inReplyTo, "one");
});
test("send validation rejects incomplete recipients without discarding a draft", () => {
  assert.equal(validateDraft(draft), null);
  assert.match(validateDraft({ ...draft, to: "" })!, /recipient/);
  assert.match(validateDraft({ ...draft, to: "someone" })!, /complete email/);
  assert.match(
    validateDraft({ ...draft, cc: "unfinished@" })!,
    /complete email/,
  );
});

test("reply honors the sender's Reply-To address", () => {
  const reply = draftFromMessage(
    { ...message, replyTo: "Support <support@example.com>" },
    { _id: "box", name: "notify", address: "notify@uncap.us" },
    "reply",
  );
  assert.equal(reply.to, "support@example.com");
});

test("reopening a server draft preserves its send idempotency identity", () => {
  const reopened = draftFromMessage(
    { ...message, isDraft: true, clientDraftId: "original-client-identity" },
    { _id: "box", name: "notify", address: "notify@uncap.us" },
    "edit",
  );
  assert.equal(reopened.clientDraftId, "original-client-identity");
  assert.equal(reopened.id, message._id);
});
