import type { Draft, MailMessage, MessagePatch } from "./types";
export type PendingAction = {
  id: string;
  ids: string[];
  patch: MessagePatch;
  createdAt: number;
};
export type MailCache = {
  version: 1;
  messages: MailMessage[];
  drafts: Draft[];
  pending: PendingAction[];
  updatedAt: number;
};
export const emptyCache = (): MailCache => ({
  version: 1,
  messages: [],
  drafts: [],
  pending: [],
  updatedAt: 0,
});
export function cacheKey(userId: string, mailboxId: string): string {
  return `hustlemail:v1:${encodeURIComponent(userId)}:${encodeURIComponent(mailboxId)}`;
}
export function readCache(key: string): MailCache {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (
      value?.version === 1 &&
      Array.isArray(value.messages) &&
      Array.isArray(value.drafts) &&
      Array.isArray(value.pending)
    )
      return value;
  } catch {
    /* Cache unavailable or invalid: start empty. */
  }
  return emptyCache();
}
export function writeCache(key: string, cache: MailCache): boolean {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...cache,
        messages: cache.messages.slice(0, 500),
        updatedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function mergeMessages(
  cached: MailMessage[],
  incoming: MailMessage[],
): MailMessage[] {
  const messages = new Map(cached.map((message) => [message._id, message]));
  for (const message of incoming)
    messages.set(message._id, { ...messages.get(message._id), ...message });
  return [...messages.values()].sort((a, b) => b.date - a.date).slice(0, 500);
}
export function applyPending(
  messages: MailMessage[],
  pending: PendingAction[],
): MailMessage[] {
  const patches = new Map<string, MessagePatch>();
  for (const action of pending)
    for (const id of action.ids)
      patches.set(id, { ...patches.get(id), ...action.patch });
  return messages.map((message) =>
    patches.has(message._id)
      ? { ...message, ...patches.get(message._id) }
      : message,
  );
}
