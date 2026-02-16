/**
 * Global error boundary component.
 * Catches unhandled errors and displays a recovery UI.
 * @module app/error
 */

"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error boundary component for handling runtime errors.
 * @param error - The error that was thrown.
 * @param reset - Function to reset and retry.
 * @returns Error UI with retry button.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
        </div>
        
        <h1 className="mb-2 text-3xl font-bold text-zinc-300">
          Something went wrong
        </h1>
        <p className="mb-8 text-zinc-500">
          {error.message || "An unexpected error occurred"}
        </p>
        
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        
        {error.digest && (
          <p className="mt-4 text-xs text-zinc-600">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
