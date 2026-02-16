/**
 * Hook for managing the command menu (⌘+K palette) state.
 */

"use client";

import { useState, useEffect } from "react";

/**
 * Manages command menu open/close state with keyboard shortcut.
 * @returns Object with open state and setOpen function.
 */
export function useCommandMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    /**
     * Handles keydown events for ⌘+K / Ctrl+K shortcut.
     */
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
