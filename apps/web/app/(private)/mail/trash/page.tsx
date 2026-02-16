/**
 * Trash folder page displaying trash messages.
 * @module app/(private)/mail/trash/page
 */

"use client";

import { Trash2 } from "lucide-react";

export default function TrashPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Trash2 className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">Trash</h3>
      <p className="text-muted-foreground text-sm mt-1">
        No messages in trash
      </p>
    </div>
  );
}
