"use client";
import { useClerk, useUser } from "@clerk/nextjs";
import { LiveMail } from "./live-mail";
import type { LiveMailProps } from "./live-mail";
import { SetupCard } from "./setup-card";

const configured =
  !!process.env.NEXT_PUBLIC_CONVEX_URL &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export function AuthenticatedMail(
  props: Pick<
    LiveMailProps,
    "initialFolder" | "initialMessageId" | "initialCompose"
  >,
) {
  if (!configured)
    return (
      <SetupCard
        title="Your mail. Your space."
        description="Hustlemail is ready to connect to your workspace. Configure authentication and your backend to open real mail."
      >
        <a className="hm-primary" href="/demo">
          Explore the sample inbox
        </a>
        <div>
          <p>Set these values in the web environment:</p>
          <ol>
            <li>
              <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
            </li>
            <li>
              <code>CLERK_SECRET_KEY</code>
            </li>
            <li>
              <code>NEXT_PUBLIC_CONVEX_URL</code>
            </li>
          </ol>
          <p>
            Keep the Resend key on the backend. Your private inbox never uses
            sample data.
          </p>
        </div>
      </SetupCard>
    );
  return <ClerkMail {...props} />;
}
function ClerkMail(
  props: Pick<
    LiveMailProps,
    "initialFolder" | "initialMessageId" | "initialCompose"
  >,
) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  if (!isLoaded)
    return (
      <SetupCard
        title="Welcome back."
        description="Checking your account."
        loading
      />
    );
  if (!user)
    return (
      <SetupCard
        title="Welcome to your clearer inbox."
        description="Sign in to open your Hustlemail workspace."
      >
        <a className="hm-primary" href="/sign-in">
          Sign in
        </a>
        <a href="/demo">Explore the sample inbox</a>
      </SetupCard>
    );
  return (
    <LiveMail
      {...props}
      userId={user.id}
      userName={user.firstName || user.fullName || "Your workspace"}
      onSignOut={() => {
        void signOut({ redirectUrl: "/" });
      }}
    />
  );
}
