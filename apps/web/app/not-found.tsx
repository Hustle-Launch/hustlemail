/**
 * 404 Not Found page component.
 * Displayed when a route doesn't exist.
 * @module app/not-found
 */

import Link from "next/link";
import { Envelope, ArrowLeft } from "@phosphor-icons/react";

/**
 * Not Found page component.
 * @returns 404 page with navigation back to home.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800">
            <Envelope className="h-10 w-10 text-zinc-500" />
          </div>
        </div>
        
        <h1 className="mb-2 text-6xl font-bold text-zinc-300">404</h1>
        <p className="mb-8 text-xl text-zinc-500">
          This page doesn&apos;t exist
        </p>
        
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
