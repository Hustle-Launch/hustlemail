import { NextResponse } from "next/server";
/** Provider-returned DNS records are supplied by Resend provisioning; never invent mail-server records. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        "Use hustlemail status or resend-cli to inspect your domain's authoritative DNS records.",
    },
    { status: 410 },
  );
}
