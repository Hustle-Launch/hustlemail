/**
 * Hooks for keyboard shortcut handling in the mail interface.
 */

"use client";

import { useEffect, useCallback } from "react";

/** Handler function for a keyboard shortcut. */
type ShortcutHandler = () => void;

/** Configuration for a single keyboard shortcut. */
interface Shortcut {
  /** The key to listen for (case-insensitive). */
  key: string;
  /** Handler function to call when shortcut is triggered. */
  handler: ShortcutHandler;
  /** Whether Ctrl key must be pressed. */
  ctrl?: boolean;
  /** Whether Meta/Cmd key must be pressed. */
  meta?: boolean;
  /** Whether Shift key must be pressed. */
  shift?: boolean;
  /** Whether Alt key must be pressed. */
  alt?: boolean;
  /** Whether to prevent default browser behavior (default: true). */
  preventDefault?: boolean;
}

/**
 * Hook for registering multiple keyboard shortcuts.
 * Automatically ignores shortcuts when typing in inputs/textareas.
 * @param shortcuts - Array of shortcut configurations.
 */
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

/** Mail-specific shortcut handler options. */
interface MailShortcutHandlers {
  /** Navigate to previous message (k). */
  onNavigateUp?: () => void;
  /** Navigate to next message (j). */
  onNavigateDown?: () => void;
  /** Archive selected message (e). */
  onArchive?: () => void;
  /** Reply to message (r). */
  onReply?: () => void;
  /** Compose new message (c). */
  onCompose?: () => void;
  /** Open search (/). */
  onSearch?: () => void;
  /** Star/unstar message (s). */
  onStar?: () => void;
  /** Delete message (#). */
  onDelete?: () => void;
  /** Toggle read/unread (u). */
  onMarkRead?: () => void;
  /** Open selected message (Enter/o). */
  onOpen?: () => void;
}

/**
 * Hook for Gmail-style keyboard shortcuts in the mail interface.
 * @param handlers - Object with optional handlers for each shortcut.
 */
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
}: MailShortcutHandlers) {
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
