/**
 * Inbound email webhook route.
 * Receives emails from the SMTP ingress server and stores them in Convex.
 * @module app/api/inbound/route
 */

import { NextRequest, NextResponse } from "next/server";

/** Webhook secret for verifying requests from SMTP server. */
const WEBHOOK_SECRET = process.env.CODEMAIL_WEBHOOK_SECRET;

/** Inbound email payload from SMTP server. */
interface InboundEmail {
  messageId: string;
  from: { name?: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  subject: string;
  text?: string;
  html?: string;
  date: string;
  headers: Record<string, string>;
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
 * POST handler for receiving inbound emails from SMTP server.
 * @param request - The incoming webhook request.
 * @returns JSON response with processing result.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret - FAIL SECURE if not configured
    if (!WEBHOOK_SECRET) {
      console.error("CODEMAIL_WEBHOOK_SECRET not configured - rejecting inbound webhook");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }
    
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email: InboundEmail = await request.json();

    // Extract domain and mailbox from recipient
    const recipient = email.to[0]?.address;
    if (!recipient) {
      return NextResponse.json({ error: "No recipient" }, { status: 400 });
    }

    const [mailbox, domain] = recipient.split("@");

    // In production, this would:
    // 1. Look up domain in Convex
    // 2. Verify mailbox exists
    // 3. Store message in Convex
    // 4. Trigger real-time update to connected clients

    console.log(`Received email for ${mailbox}@${domain}:`, {
      from: email.from.address,
      subject: email.subject,
      spam: email.spam,
    });

    // For now, just acknowledge receipt
    // TODO: Wire to Convex when project is deployed
    return NextResponse.json({
      success: true,
      messageId: email.messageId,
      recipient: `${mailbox}@${domain}`,
    });
  } catch (error) {
    console.error("Inbound webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process email" },
      { status: 500 }
    );
  }
}

/**
 * GET handler for health check.
 * @returns Service status JSON.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "codemail-inbound" });
}
