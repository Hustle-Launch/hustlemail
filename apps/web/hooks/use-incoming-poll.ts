/**
 * Hook for polling incoming emails from Resend.
 * Implements the dual-polling strategy:
 * - Foreground (page focused): 5-second polling via HTTP API
 * - Background (page unfocused): 60-second backend polling via Convex scheduler
 * @module hooks/use-incoming-poll
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Polling intervals in milliseconds */
const FOREGROUND_INTERVAL = 5000; // 5 seconds when focused
const BACKGROUND_INTERVAL = 60000; // 1 minute when unfocused

/**
 * Hook for real-time polling of incoming emails.
 * - Foreground: Polls every 5 seconds via HTTP API
 * - Background: Relies on 60-second backend scheduler
 * @param domainName - The domain to poll for.
 * @param enabled - Whether polling is enabled.
 * @returns Object with polling status and manual trigger function.
 */
export function useIncomingPoll(domainName: string, enabled = true) {
  const [isFocused, setIsFocused] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const newFocused = document.visibilityState === "visible";
      setIsFocused(newFocused);
      console.log(`[useIncomingPoll] Page ${newFocused ? "focused" : "blurred"}`);
    };

    const handleFocus = () => {
      setIsFocused(true);
      console.log("[useIncomingPoll] Window focused");
    };

    const handleBlur = () => {
      setIsFocused(false);
      console.log("[useIncomingPoll] Window blurred");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Polling function
  const poll = useCallback(async () => {
    if (isPolling || !enabled) return;

    setIsPolling(true);
    setError(null);

    try {
      // Call HTTP endpoint for foreground polling
      const response = await fetch(`/api/poll/${encodeURIComponent(domainName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Poll failed: ${response.status} - ${errorData.error || "Unknown error"}`);
      }

      const data = await response.json();
      setLastPoll(new Date());
      setPollCount((c) => c + 1);

      if (data.processed > 0) {
        console.log(`[useIncomingPoll] Polled ${domainName}: processed ${data.processed} emails`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Polling failed";
      setError(message);
      console.error("[useIncomingPoll] Error:", message);
    } finally {
      setIsPolling(false);
    }
  }, [domainName, isPolling, enabled]);

  // Set up polling interval based on focus state
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval based on focus state
    const interval = isFocused ? FOREGROUND_INTERVAL : BACKGROUND_INTERVAL;

    console.log(
      `[useIncomingPoll] Starting interval: ${interval}ms (${isFocused ? "foreground" : "background"})`
    );

    // Initial poll
    poll();

    // Start polling
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isFocused, enabled, poll]);

  return {
    isFocused,
    isPolling,
    lastPoll,
    error,
    triggerPoll: poll,
    interval: isFocused ? FOREGROUND_INTERVAL : BACKGROUND_INTERVAL,
    pollCount,
  };
}

/**
 * Hook for subscribing to real-time message updates via Convex.
 * Uses Convex queries for instant updates as messages are stored.
 * @param mailboxId - The mailbox ID to subscribe to.
 * @returns The latest messages for the mailbox.
 */
export function useRealtimeMessages(mailboxId: string | undefined) {
  // Use Convex query to subscribe to messages in real-time
  const messages = useQuery(
    mailboxId ? api.queries.getMessagesByMailbox : "skip",
    mailboxId ? { mailboxId } : "skip"
  );

  return {
    messages: messages || [],
    isLoading: messages === undefined,
    error: null,
  };
}
