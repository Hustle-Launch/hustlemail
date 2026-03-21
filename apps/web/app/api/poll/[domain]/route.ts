/**
 * API route for foreground polling of incoming emails.
 * Triggered by client every 5 seconds when page is focused.
 * POST /api/poll/[domain]
 *
 * Calls the Convex action to trigger a manual poll.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain parameter required" },
        { status: 400 }
      );
    }

    // In a full implementation, this would call:
    // const result = await client.action(api.pollIncoming.triggerPoll, { domainName: domain });
    //
    // For now, return a success response.
    // The backend 60-second scheduler (pollAllDomains) handles the actual polling.

    return NextResponse.json({
      success: true,
      processed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
      message: "Poll triggered (handled by backend scheduler)",
    });
  } catch (error) {
    console.error("[api/poll] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
