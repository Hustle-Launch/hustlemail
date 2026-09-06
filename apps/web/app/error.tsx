"use client";
import { SetupCard } from "@/components/workspace/setup-card";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SetupCard
      title="Let’s reconnect."
      description="The workspace could not finish loading. Saved drafts remain on this device."
      error={error.message}
    >
      <button className="hm-primary" onClick={reset}>
        Try again
      </button>
      <a href="/mail/inbox">Return to your inbox</a>
    </SetupCard>
  );
}
