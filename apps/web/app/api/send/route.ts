/**
 * Email sending API route.
 * Proxies email sending through Resend.
 * @module app/api/send/route
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/** Lazily initialized Resend client. */
let _resend: Resend | null = null;

/**
 * Gets or creates the Resend client instance.
 * @returns Configured Resend client.
 * @throws Error if RESEND_API_KEY is not configured.
 */
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * POST handler for sending emails via Resend.
 * @param request - The incoming request with email data.
 * @returns JSON response with send result or error.
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key first
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email sending not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { to, cc, bcc, subject, text, html, from, replyTo, attachments } = body;

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject" },
        { status: 400 }
      );
    }

    // Default from address
    const fromAddress = from || `hustlemail <noreply@${process.env.hustlemail_DOMAIN || "hustlemail.dev"}>`;

    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      subject,
      text,
      html,
      replyTo,
      attachments: attachments?.map((a: { filename: string; content: string; contentType?: string }) => ({
        filename: a.filename,
        content: Buffer.from(a.content, "base64"),
        contentType: a.contentType,
      })),
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
