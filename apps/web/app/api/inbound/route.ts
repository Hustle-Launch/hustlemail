/**
 * Inbound email webhook route.
 * Receives parsed emails from the SMTP ingress server, validates the
 * recipient mailbox, stores the message in Convex, and triggers
 * real-time updates to connected clients via Convex subscriptions.
 * @module app/api/inbound/route
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDomain,
  getMailbox,
  storeMessage,
  logSpamEvaluation,
  uploadAttachment,
  type AttachmentInput,
} from "@/lib/convex-smtp";

/** Webhook secret for verifying requests from SMTP server. */
const WEBHOOK_SECRET = process.env.hustlemail_WEBHOOK_SECRET;

/** Inbound email payload from SMTP server. */
interface InboundEmail {
  messageId: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  replyTo?: { name?: string; address: string };
  subject: string;
  text?: string;
  html?: string;
  date: string;
  headers: Record<string, string>;
  inReplyTo?: string;
  references?: string[];
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    content?: string; // base64
  }[];
  spam: {
    isSpam: boolean;
    score: number;
    reason?: string;
  };
}

/**
 * Processes attachments: uploads to Convex file storage and returns metadata.
 * Small attachments (<= maxSize) are uploaded inline; larger ones are skipped
 * (the SMTP ingress already rejects them for bounce strategy).
 */
async function processAttachments(
  attachments: InboundEmail["attachments"],
  maxSize: number
): Promise<AttachmentInput[]> {
  const results: AttachmentInput[] = [];

  for (const att of attachments) {
    const size = att.size || (att.content ? Math.ceil(att.content.length * 0.75) : 0);

    if (att.content && size <= maxSize) {
      try {
        const storageId = await uploadAttachment(att.content, att.contentType);
        results.push({
          filename: att.filename || "attachment",
          contentType: att.contentType || "application/octet-stream",
          size,
          storageId,
        });
      } catch (err) {
        console.error("Failed to upload attachment:", att.filename, err);
        // Record metadata without storageId rather than dropping entirely
        results.push({
          filename: att.filename || "attachment",
          contentType: att.contentType || "application/octet-stream",
          size,
        });
      }
    } else {
      // Large attachment or no content — record metadata only
      results.push({
        filename: att.filename || "attachment",
        contentType: att.contentType || "application/octet-stream",
        size,
      });
    }
  }

  return results;
}

/**
 * POST /api/inbound — receives inbound emails from the SMTP ingress server.
 */
export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  if (!WEBHOOK_SECRET) {
    console.error("hustlemail_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let email: InboundEmail;
  try {
    email = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const recipient = email.to[0]?.address;
  if (!recipient || !recipient.includes("@")) {
    return NextResponse.json({ error: "No valid recipient" }, { status: 400 });
  }

  const atIdx = recipient.lastIndexOf("@");
  const mailboxName = recipient.slice(0, atIdx).toLowerCase();
  const domainName = recipient.slice(atIdx + 1).toLowerCase();

  // ── Domain lookup ─────────────────────────────────────────────────────────
  let domain;
  try {
    domain = await getDomain(domainName);
  } catch (err) {
    console.error("Domain lookup failed:", err);
    return NextResponse.json({ error: "Domain lookup error" }, { status: 503 });
  }

  if (!domain) {
    console.warn(`Inbound email for unknown domain: ${domainName}`);
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  if (domain.status !== "active") {
    return NextResponse.json(
      { error: `Domain not active: ${domain.status}` },
      { status: 422 }
    );
  }

  // ── Mailbox lookup ────────────────────────────────────────────────────────
  let mailbox;
  try {
    mailbox = await getMailbox(domain._id, mailboxName);
  } catch (err) {
    console.error("Mailbox lookup failed:", err);
    return NextResponse.json({ error: "Mailbox lookup error" }, { status: 503 });
  }

  // Fall back to catch-all mailbox if configured
  if (!mailbox && domain.config.catchAllMailbox) {
    mailbox = await getMailbox(domain._id, domain.config.catchAllMailbox);
  }

  if (!mailbox) {
    console.warn(`No mailbox found for ${recipient}`);
    return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
  }

  // ── Process attachments ───────────────────────────────────────────────────
  const maxAttachmentSize = domain.config.maxAttachmentSize ?? 1024 * 1024;
  const attachments = await processAttachments(
    email.attachments ?? [],
    maxAttachmentSize
  );

  // ── Store message ─────────────────────────────────────────────────────────
  let convexMessageId: string;
  try {
    convexMessageId = await storeMessage({
      domainId: domain._id,
      mailboxId: mailbox._id,
      messageId:
        email.messageId ||
        `<${Date.now()}.${Math.random().toString(36).slice(2)}@hustlemail.dev>`,
      inReplyTo: email.inReplyTo,
      references: email.references,
      from: email.from,
      to: email.to,
      cc: email.cc,
      replyTo: email.replyTo,
      subject: email.subject || "(no subject)",
      bodyText: email.text,
      bodyHtml: email.html,
      attachments,
      date: email.date ? new Date(email.date).getTime() : Date.now(),
      isSpam: email.spam?.isSpam ?? false,
      spamScore: email.spam?.score,
      spamReason: email.spam?.reason,
    });
  } catch (err) {
    console.error("Failed to store message in Convex:", err);
    return NextResponse.json({ error: "Failed to store message" }, { status: 503 });
  }

  // ── Log spam evaluation (non-blocking) ────────────────────────────────────
  logSpamEvaluation(
    convexMessageId,
    email.spam?.isSpam ?? false,
    email.spam?.score ?? 0,
    email.spam?.reason
  ).catch((err) => console.error("Spam log failed (non-fatal):", err));

  console.log(`Stored message ${email.messageId} → Convex ${convexMessageId}`, {
    recipient,
    from: email.from.address,
    subject: email.subject,
    isSpam: email.spam?.isSpam,
    attachments: attachments.length,
  });

  return NextResponse.json({
    success: true,
    messageId: email.messageId,
    convexMessageId,
    recipient,
  });
}

/**
 * GET /api/inbound — health check.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "hustlemail-inbound" });
}
