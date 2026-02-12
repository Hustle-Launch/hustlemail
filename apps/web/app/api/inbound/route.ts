import { NextRequest, NextResponse } from "next/server";

// Webhook secret for verifying requests from SMTP server
const WEBHOOK_SECRET = process.env.CODEMAIL_WEBHOOK_SECRET;

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

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
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

// Health check
export async function GET() {
  return NextResponse.json({ status: "ok", service: "codemail-inbound" });
}
