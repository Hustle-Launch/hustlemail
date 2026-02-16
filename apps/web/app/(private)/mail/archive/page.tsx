/**
 * Archive folder page displaying archive messages.
 * @module app/(private)/mail/archive/page
 */

"use client";

import { Archive } from "lucide-react";

export default function ArchivePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Archive className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">Archive</h3>
      <p className="text-muted-foreground text-sm mt-1">
        No archived messages
      </p>
    </div>
  );
}
