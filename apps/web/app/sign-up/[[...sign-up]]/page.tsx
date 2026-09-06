"use client";
import { SignUp } from "@clerk/nextjs";
import { SetupCard } from "@/components/workspace/setup-card";
export default function AuthPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <SetupCard
        title="Connect your workspace first."
        description="Set the Clerk and Convex environment values to enable secure sign-in."
      >
        <a href="/">Setup guidance</a>
        <a href="/demo">Explore the sample inbox</a>
      </SetupCard>
    );
  return (
    <div className="hm-setup">
      <SignUp appearance={{ variables: { colorPrimary: "#8e73c9" } }} />
    </div>
  );
}
