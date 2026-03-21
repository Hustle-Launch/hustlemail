/**
 * Client for calling the Convex SMTP HTTP endpoints from Next.js.
 * These endpoints are defined in convex/smtp.ts and authenticated
 * with SMTP_SHARED_SECRET — the same secret used by the SMTP ingress server.
 */

const CONVEX_URL = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
const SMTP_SECRET = process.env.SMTP_SHARED_SECRET ?? "";

function convexHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SMTP_SECRET}`,
  };
}

async function convexPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${CONVEX_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: convexHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConvexDomain {
  _id: string;
  name: string;
  status: string;
  config: {
    spamThreshold: number;
    largeFileStrategy: "store" | "bounce" | "byo";
    maxAttachmentSize: number;
    catchAllMailbox?: string;
  };
}

export interface ConvexMailbox {
  _id: string;
  domainId: string;
  name: string;
  type: string;
  forwardTo?: string[];
}

export interface AttachmentInput {
  filename: string;
  contentType: string;
  size: number;
  storageId?: string;
  externalUrl?: string;
}

export interface StoreMessageInput {
  domainId: string;
  mailboxId: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  replyTo?: { name?: string; address: string };
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: AttachmentInput[];
  date: number;
  isSpam: boolean;
  spamScore?: number;
  spamReason?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Looks up a domain by its name (e.g. "example.com"). */
export async function getDomain(name: string): Promise<ConvexDomain | null> {
  return convexPost<ConvexDomain | null>("/smtp/getDomain", { name });
}

/** Looks up a mailbox within a domain by its local-part (e.g. "support"). */
export async function getMailbox(
  domainId: string,
  name: string
): Promise<ConvexMailbox | null> {
  return convexPost<ConvexMailbox | null>("/smtp/getMailbox", { domainId, name });
}

/** Stores an inbound message. Returns the Convex message ID. */
export async function storeMessage(input: StoreMessageInput): Promise<string> {
  return convexPost<string>("/smtp/storeMessage", input);
}

/** Logs a spam evaluation result for analytics. */
export async function logSpamEvaluation(
  messageId: string,
  isSpam: boolean,
  score: number,
  reason?: string
): Promise<void> {
  await convexPost("/smtp/logSpamEvaluation", {
    messageId,
    isSpam,
    score,
    category: isSpam ? "spam" : "ham",
    reason: reason ?? "",
    model: "smtp-ingress",
  });
}

/** Gets an upload URL for storing an attachment in Convex file storage. */
export async function getUploadUrl(): Promise<string> {
  const res = await convexPost<{ uploadUrl: string }>("/smtp/getUploadUrl", {});
  return res.uploadUrl;
}

/**
 * Uploads a base64-encoded attachment to Convex file storage.
 * Returns the storageId to reference in storeMessage.
 */
export async function uploadAttachment(
  content: string,
  contentType: string
): Promise<string> {
  const uploadUrl = await getUploadUrl();
  const buffer = Buffer.from(content, "base64");
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: buffer,
  });
  if (!res.ok) {
    throw new Error(`Attachment upload failed: ${res.status}`);
  }
  const { storageId } = (await res.json()) as { storageId: string };
  return storageId;
}
