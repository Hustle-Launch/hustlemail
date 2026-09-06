import { NextResponse } from "next/server";
/** Sending is exclusively handled by the authenticated Convex mail.send mutation. */
export async function POST() {
  return NextResponse.json(
    { error: "Use the authenticated mailbox to send a saved draft." },
    { status: 410 },
  );
}
