/**
 * Hook for polling incoming emails from Resend.
 * Implements the dual-polling strategy:
 * - Foreground (page focused): 5-second polling
 * - Background (page unfocused): 1-minute backend polling via Convex
 * @module hooks/use-incoming-poll
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Polling intervals in milliseconds */
const FOREGROUND_INTERVAL = 5000; // 5 seconds when focused
const BACKGROUND_INTERVAL = 60000; // 1 minute when unfocused

/**
 * Hook for real-time polling of incoming emails.
 * @param domainName - The domain to poll for.
 * @param enabled - Whether polling is enabled.
 * @returns Object with polling status and manual trigger function.
 */
export function useIncomingPoll(domainName: string, enabled = true) {
  const [isFocused, setIsFocused] = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsFocused(document.visibilityState === "visible");
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

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
      // In a full implementation, this would call a Convex action
      // that polls Resend for new emails
      const response = await fetch(`/api/poll/${domainName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Poll failed: ${response.status}`);
      }

      setLastPoll(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Polling failed");
      console.error("Poll error:", e);
    } finally {
      setIsPolling(false);
    }
  }, [domainName, isPolling, enabled]);

  // Set up polling interval based on focus state
  useEffect(() => {
    if (!enabled) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval based on focus state
    const interval = isFocused ? FOREGROUND_INTERVAL : BACKGROUND_INTERVAL;
    
    // Initial poll
    poll();

    // Start polling
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
  };
}

/**
 * Hook for subscribing to real-time message updates via Convex.
 * Uses Convex subscriptions for instant updates without polling.
 * @param mailboxId - The mailbox ID to subscribe to.
 * @returns The latest messages for the mailbox.
 */
export function useRealtimeMessages(mailboxId: string | undefined) {
  // In a full implementation, this would use Convex's useQuery
  // with a subscription to the messages table
  // For now, return a placeholder
  return {
    messages: [],
    isLoading: !mailboxId,
    error: null,
  };
}
