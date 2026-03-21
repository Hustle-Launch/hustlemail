/**
 * Compose page for creating new emails.
 * @module app/(private)/mail/compose/page
 */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ComposeEditor } from "@/components/mail/compose-editor";
import { Loader2 } from "lucide-react";

function ComposeContent() {
  const searchParams = useSearchParams();
  const replyToId = searchParams.get("replyTo");
  const forwardId = searchParams.get("forward");

  // In real app, fetch the original message if replying/forwarding
  const replyTo = replyToId
    ? {
        from: { name: "GitHub", address: "noreply@github.com" },
        subject: "[hustlemail/api] Pull request #42: Add spam detection",
        body: "mergify[bot] merged 1 commit into main...",
      }
    : undefined;

  const handleSend = async (data: {
    to: string[];
    cc: string[];
    bcc: string[];
    subject: string;
    body: string;
    attachments: File[];
  }) => {
    // In real app, call Convex mutation to queue outbound email
    console.log("Sending email:", data);
    
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
  };

  return (
    <ComposeEditor
      replyTo={replyTo}
      initialSubject={forwardId ? "Fwd: [hustlemail/api] Pull request #42" : undefined}
      onSend={handleSend}
    />
  );
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      }
    >
      <ComposeContent />
    </Suspense>
  );
}
