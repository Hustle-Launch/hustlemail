import { NextResponse } from "next/server";
/** User identity is bootstrapped from verified Convex authentication, never an untrusted webhook payload. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This webhook is retired. User profiles are synchronized during authenticated sign-in.",
    },
    { status: 410 },
  );
}
