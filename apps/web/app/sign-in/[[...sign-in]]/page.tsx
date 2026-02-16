/**
 * Sign-in page using Clerk authentication.
 * Catch-all route for Clerk's sign-in flow.
 * @module app/sign-in/page
 */

"use client";

import { SignIn } from "@clerk/nextjs";

/**
 * Sign-in page component with themed Clerk SignIn.
 * @returns The sign-in form centered on the page.
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <SignIn
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
