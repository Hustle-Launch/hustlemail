/**
 * Sign-up page using Clerk authentication.
 * Catch-all route for Clerk's sign-up flow.
 * @module app/sign-up/page
 */

"use client";

import { SignUp } from "@clerk/nextjs";

/**
 * Sign-up page component with themed Clerk SignUp.
 * @returns The sign-up form centered on the page.
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-zinc-900 border border-zinc-800",
          },
        }}
      />
    </div>
  );
}
