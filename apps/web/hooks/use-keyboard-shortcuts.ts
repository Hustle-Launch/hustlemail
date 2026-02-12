"use client";

import { useEffect, useCallback } from "react";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  handler: ShortcutHandler;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow escape key in inputs
        if (event.key !== "Escape") return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined mail shortcuts
export function useMailShortcuts({
  onNavigateUp,
  onNavigateDown,
  onArchive,
  onReply,
  onCompose,
  onSearch,
  onStar,
  onDelete,
  onMarkRead,
  onOpen,
}: {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onArchive?: () => void;
  onReply?: () => void;
  onCompose?: () => void;
  onSearch?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
  onMarkRead?: () => void;
  onOpen?: () => void;
}) {
  const shortcuts: Shortcut[] = [
    { key: "j", handler: onNavigateDown || (() => {}) },
    { key: "k", handler: onNavigateUp || (() => {}) },
    { key: "e", handler: onArchive || (() => {}) },
    { key: "r", handler: onReply || (() => {}) },
    { key: "c", handler: onCompose || (() => {}) },
    { key: "/", handler: onSearch || (() => {}) },
    { key: "s", handler: onStar || (() => {}) },
    { key: "#", handler: onDelete || (() => {}), shift: true },
    { key: "u", handler: onMarkRead || (() => {}) },
    { key: "Enter", handler: onOpen || (() => {}) },
    { key: "o", handler: onOpen || (() => {}) },
  ];

  useKeyboardShortcuts(shortcuts);
}
