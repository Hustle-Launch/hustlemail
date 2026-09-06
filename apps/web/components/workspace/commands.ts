export type CommandId =
  | "down"
  | "up"
  | "selectDown"
  | "selectUp"
  | "open"
  | "compose"
  | "search"
  | "archive"
  | "reply"
  | "replyAll"
  | "forward"
  | "star"
  | "trash"
  | "read"
  | "snooze"
  | "undo"
  | "select"
  | "help"
  | "palette"
  | "close"
  | "send"
  | "label"
  | "spam";
export type CommandDefinition = {
  id: CommandId;
  title: string;
  keys: string;
  key: string;
  shift?: boolean;
  mod?: boolean;
  message?: boolean;
  repeat?: boolean;
  editing?: boolean;
};
export const COMMANDS: CommandDefinition[] = [
  {
    id: "palette",
    title: "Find a command",
    keys: "⌘ K",
    key: "k",
    mod: true,
    editing: true,
  },
  { id: "compose", title: "Compose a message", keys: "C", key: "c" },
  { id: "search", title: "Search mail", keys: "/", key: "/" },
  { id: "down", title: "Next conversation", keys: "J", key: "j", repeat: true },
  {
    id: "up",
    title: "Previous conversation",
    keys: "K",
    key: "k",
    repeat: true,
  },
  {
    id: "selectDown",
    title: "Select and move down",
    keys: "⇧ J",
    key: "j",
    shift: true,
    repeat: true,
  },
  {
    id: "selectUp",
    title: "Select and move up",
    keys: "⇧ K",
    key: "k",
    shift: true,
    repeat: true,
  },
  {
    id: "open",
    title: "Open conversation",
    keys: "Enter",
    key: "Enter",
    message: true,
  },
  {
    id: "archive",
    title: "Mark done / archive",
    keys: "E",
    key: "e",
    message: true,
  },
  { id: "reply", title: "Reply", keys: "R", key: "r", message: true },
  {
    id: "replyAll",
    title: "Reply all",
    keys: "⇧ R",
    key: "r",
    shift: true,
    message: true,
  },
  { id: "forward", title: "Forward", keys: "F", key: "f", message: true },
  { id: "star", title: "Star or unstar", keys: "S", key: "s", message: true },
  {
    id: "read",
    title: "Mark read or unread",
    keys: "U",
    key: "u",
    message: true,
  },
  {
    id: "trash",
    title: "Move to trash",
    keys: "#",
    key: "#",
    shift: true,
    message: true,
  },
  {
    id: "snooze",
    title: "Snooze conversation",
    keys: "H",
    key: "h",
    message: true,
  },
  { id: "label", title: "Edit labels", keys: "L", key: "l", message: true },
  {
    id: "spam",
    title: "Move to spam / not spam",
    keys: "!",
    key: "!",
    shift: true,
    message: true,
  },
  { id: "undo", title: "Undo last action", keys: "Z", key: "z" },
  {
    id: "select",
    title: "Select conversation",
    keys: "X",
    key: "x",
    message: true,
  },
  { id: "help", title: "Keyboard shortcuts", keys: "?", key: "?", shift: true },
  {
    id: "close",
    title: "Go back / close",
    keys: "Esc",
    key: "Escape",
    editing: true,
  },
  {
    id: "send",
    title: "Send message",
    keys: "⌘ Enter",
    key: "Enter",
    mod: true,
    editing: true,
  },
];
export type KeyEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
};
export function commandForEvent(
  event: KeyEvent,
  context: { editing: boolean; modal: boolean; composing: boolean },
): CommandId | null {
  if (event.defaultPrevented || event.isComposing || event.altKey) return null;
  const command = COMMANDS.find(
    (item) =>
      item.key.toLowerCase() === event.key.toLowerCase() &&
      !!item.mod === (event.metaKey || event.ctrlKey) &&
      !!item.shift === event.shiftKey,
  );
  if (!command || (event.repeat && !command.repeat)) return null;
  if (context.editing && !command.editing) return null;
  if (context.modal && command.id !== "close") return null;
  if (context.composing && !["close", "send", "palette"].includes(command.id))
    return null;
  if (!context.composing && command.id === "send") return null;
  return command.id;
}
export function visibleKey(keys: string, mac: boolean): string {
  return mac ? keys : keys.replace("⌘", "Ctrl");
}
export function nextFocus(
  ids: string[],
  currentId: string | null,
  direction: number,
): string | null {
  if (!ids.length) return null;
  const index = currentId ? ids.indexOf(currentId) : -1;
  return ids[
    Math.max(0, Math.min(ids.length - 1, index < 0 ? 0 : index + direction))
  ];
}
