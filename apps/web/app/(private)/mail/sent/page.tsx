"use client";

import { Send } from "lucide-react";

export default function SentPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Send className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">Sent</h3>
      <p className="text-muted-foreground text-sm mt-1">
        No sent messages yet
      </p>
    </div>
  );
}
