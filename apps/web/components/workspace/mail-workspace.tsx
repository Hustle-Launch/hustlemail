"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  Command as CommandIcon,
  CornerDownLeft,
  FileText,
  Inbox,
  Keyboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  Paperclip,
  PenLine,
  Reply,
  ReplyAll,
  Search,
  Send,
  Shield,
  Star,
  Sun,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { COMMANDS, commandForEvent, nextFocus, visibleKey } from "./commands";
import type { CommandId } from "./commands";
import {
  belongsToFolder,
  draftFromMessage,
  isDownloadUrlAllowed,
  validateDraft,
} from "./types";
import type {
  Draft,
  Folder,
  Mailbox,
  MailMessage,
  MailTransport,
  MessagePatch,
} from "./types";
import { MessageBody } from "./message-body";

const FOLDERS: {
  id: Folder;
  title: string;
  icon: ComponentType<{ size?: number }>;
}[] = [
  { id: "inbox", title: "Inbox", icon: Inbox },
  { id: "starred", title: "Starred", icon: Star },
  { id: "snoozed", title: "Snoozed", icon: Clock3 },
  { id: "sent", title: "Sent", icon: Send },
  { id: "drafts", title: "Drafts", icon: FileText },
  { id: "archive", title: "Done", icon: Archive },
  { id: "spam", title: "Spam", icon: Shield },
  { id: "trash", title: "Trash", icon: Trash2 },
];
const formatTime = (date: number) =>
  new Intl.DateTimeFormat(
    undefined,
    Date.now() - date < 86400000
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" },
  ).format(new Date(date));
const initial = (value: string) =>
  value
    .trim()
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

export type MailWorkspaceProps = {
  userKey: string;
  userName: string;
  mailboxes: Mailbox[];
  mailboxId: string;
  onMailboxChange: (id: string) => void;
  messages: MailMessage[];
  folder: Folder;
  onFolderChange: (folder: Folder) => void;
  search: string;
  onSearch: (query: string) => void;
  transport: MailTransport;
  online: boolean;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  pendingCount?: number;
  syncLabel?: string;
  error?: string | null;
  onRetry?: () => void;
  onRetryAttachments?: () => void;
  onSignOut?: () => void;
  preview?: boolean;
  initialMessageId?: string;
  initialCompose?: boolean;
  serverSearch?: boolean;
};

/** Platform-independent mail surface. Hosts supply authentication, data and transport. */
export function MailWorkspace(props: MailWorkspaceProps) {
  const {
    userKey,
    userName,
    mailboxes,
    mailboxId,
    messages,
    folder,
    search,
    transport,
    online,
    preview,
  } = props;
  const mailbox =
    mailboxes.find((item) => item._id === mailboxId) ?? mailboxes[0];
  const [focusId, setFocusId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(
    props.initialMessageId ?? null,
  );
  const [detail, setDetail] = useState<MailMessage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<
    "palette" | "help" | "snooze" | "labels" | null
  >(null);
  const [labelInput, setLabelInput] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftStatus, setDraftStatus] = useState("Saved on this device");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<
    { id: string; patch: MessagePatch }[][]
  >([]);
  const [mac, setMac] = useState(true);
  const [light, setLight] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const modalReturnFocus = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  const openedInitialCompose = useRef(false);
  const draftKey = `hustlemail:draft:v1:${encodeURIComponent(userKey)}:${encodeURIComponent(mailboxId)}`;
  const items = useMemo(
    () =>
      messages.filter(
        (message) =>
          belongsToFolder(message, folder) &&
          (!unreadOnly || !message.isRead) &&
          (props.serverSearch ||
            !search ||
            `${message.subject} ${message.from.name ?? ""} ${message.from.address} ${message.snippet} ${message.bodyText ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [messages, folder, unreadOnly, search, props.serverSearch],
  );
  const ids = useMemo(() => items.map((item) => item._id), [items]);
  const activeId = openedId || focusId;
  const activeMessage =
    messages.find((item) => item._id === activeId) ??
    (detail?._id === activeId ? detail : null);
  const openedSummary = messages.find((item) => item._id === openedId);
  const attachmentVersion = openedSummary
    ? `${openedSummary.attachmentsPending ?? false}:${openedSummary.attachments.map((attachment) => attachment.storageId || attachment.filename).join(",")}`
    : "";
  const displayedDetail =
    detail && detail._id === openedId
      ? {
          ...detail,
          ...messages.find((item) => item._id === openedId),
          bodyText: detail.bodyText,
          bodyHtml: detail.bodyHtml,
          attachments: detail.attachments,
        }
      : null;
  const targetIds = selection.size
    ? [...selection]
    : activeId
      ? [activeId]
      : [];
  const unread = messages.filter(
    (item) => belongsToFolder(item, "inbox") && !item.isRead,
  ).length;

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    try {
      setLight(localStorage.getItem("hustlemail:theme") === "light");
    } catch {
      /* Use default. */
    }
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("hm-workspace-open");
    return () => root.classList.remove("hm-workspace-open");
  }, []);
  useEffect(() => {
    if (!composeOpen) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty(
          "--hm-viewport-height",
          `${viewport?.height ?? window.innerHeight}px`,
        );
        root.style.setProperty(
          "--hm-viewport-top",
          `${viewport?.offsetTop ?? 0}px`,
        );
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--hm-viewport-height");
      root.style.removeProperty("--hm-viewport-top");
      window.scrollTo(0, 0);
    };
  }, [composeOpen]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      setDraft(saved?.mailboxId === mailboxId ? saved : null);
    } catch {
      setDraft(null);
    }
  }, [draftKey, mailboxId]);
  useEffect(() => {
    setFocusId((current) =>
      current && ids.includes(current) ? current : (ids[0] ?? null),
    );
  }, [ids]);
  useEffect(() => {
    setSelection((current) => {
      const next = new Set([...current].filter((id) => ids.includes(id)));
      return next.size === current.size ? current : next;
    });
  }, [ids]);
  useEffect(() => {
    const row = rowsRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${CSS.escape(focusId ?? "")}"]`,
    );
    const list = rowsRef.current;
    if (row && list) {
      const rowBounds = row.getBoundingClientRect();
      const listBounds = list.getBoundingClientRect();
      if (rowBounds.top < listBounds.top)
        list.scrollTop -= listBounds.top - rowBounds.top;
      else if (rowBounds.bottom > listBounds.bottom)
        list.scrollTop += rowBounds.bottom - listBounds.bottom;
    }
  }, [focusId]);
  const previousMailbox = useRef(mailboxId);
  useEffect(() => {
    if (previousMailbox.current !== mailboxId) {
      setSelection(new Set());
      setOpenedId(null);
      setUnreadOnly(false);
      setComposeOpen(false);
      previousMailbox.current = mailboxId;
    }
  }, [mailboxId]);
  useEffect(() => {
    if (!openedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    transport
      .load(openedId)
      .then((message) => {
        if (!cancelled) {
          setDetail(message);
          if (!message)
            setNotice(
              "This message is unavailable or you no longer have access.",
            );
        }
      })
      .catch((error: Error) => {
        if (!cancelled)
          setNotice(error.message || "Message could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openedId, transport, attachmentVersion]);
  useEffect(() => {
    if (!draft || draft.mailboxId !== mailboxId) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setDraftStatus(online ? "Saving…" : "Saved on this device · offline");
    } catch {
      setDraftStatus("Device storage full — keep this draft open");
    }
    if (!online) return;
    const timer = window.setTimeout(() => {
      saveChain.current = saveChain.current
        .catch(() => {})
        .then(async () => {
          try {
            const id = await transport.saveDraft(draft);
            if (draftRef.current?.clientDraftId === draft.clientDraftId) {
              if (draftRef.current.updatedAt === draft.updatedAt)
                setDraftStatus(
                  preview ? "Preview draft · device only" : "All changes saved",
                );
              setDraft((current) =>
                current &&
                current.clientDraftId === draft.clientDraftId &&
                current.id !== id
                  ? { ...current, id }
                  : current,
              );
            }
          } catch (error) {
            setDraftStatus(
              `Saved on this device · ${error instanceof Error ? error.message : "sync failed"}`,
            );
          }
        });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, draftKey, mailboxId, online, transport, preview]);
  useEffect(() => {
    if (props.initialCompose && mailbox && !openedInitialCompose.current) {
      openedInitialCompose.current = true;
      setComposeOpen(true);
      setDraft(
        (current) =>
          current || {
            clientDraftId: crypto.randomUUID(),
            mailboxId: mailbox._id,
            to: "",
            cc: "",
            bcc: "",
            subject: "",
            text: "",
            attachments: [],
            updatedAt: Date.now(),
          },
      );
    }
  }, [props.initialCompose, mailbox]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (draftRef.current && draftStatus.includes("storage full")) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [draftStatus]);

  const announceError = (error: unknown) =>
    setNotice(
      error instanceof Error
        ? error.message
        : "The action could not be completed. Try again.",
    );
  const compose = useCallback(() => {
    if (!mailbox) return;
    setDraft(
      (current) =>
        current || {
          clientDraftId: crypto.randomUUID(),
          mailboxId: mailbox._id,
          to: "",
          cc: "",
          bcc: "",
          subject: "",
          text: "",
          attachments: [],
          updatedAt: Date.now(),
        },
    );
    setComposeOpen(true);
    setMobileNav(false);
  }, [mailbox]);
  const changeDraft = (patch: Partial<Draft>) =>
    setDraft((current) =>
      current ? { ...current, ...patch, updatedAt: Date.now() } : current,
    );
  const openMessage = (message: MailMessage) => {
    setFocusId(message._id);
    if (message.isDraft) {
      transport
        .load(message._id)
        .then((full) => {
          if (full && mailbox) {
            setDraft(draftFromMessage(full, mailbox, "edit"));
            setComposeOpen(true);
          }
        })
        .catch(announceError);
      return;
    }
    setOpenedId(message._id);
    if (!message.isRead)
      transport.update([message._id], { isRead: true }).catch(announceError);
  };
  const changeFolder = (next: Folder) => {
    props.onFolderChange(next);
    props.onSearch("");
    setMobileNav(false);
    setSelection(new Set());
    setOpenedId(null);
    setUnreadOnly(false);
  };
  const apply = async (
    patch: MessagePatch,
    title: string,
    explicitIds?: string[],
  ) => {
    const affectedIds = explicitIds ?? targetIds;
    if (!affectedIds.length) return;
    const previous = affectedIds.map((id) => ({
      id,
      patch: Object.fromEntries(
        Object.keys(patch).map((key) => [
          key,
          (messages.find((item) => item._id === id) ??
            (detail?._id === id ? detail : undefined))?.[
            key as keyof MessagePatch
          ] ?? (key === "snoozedUntil" ? null : key === "labels" ? [] : false),
        ]),
      ) as MessagePatch,
    }));
    try {
      await transport.update(affectedIds, patch);
      setUndoStack((history) => [...history.slice(-19), previous]);
      setSelection(new Set());
      setNotice(`${title}${online ? "" : " · queued until you reconnect"}`);
      if (
        "isArchived" in patch ||
        "isTrashed" in patch ||
        "isSpam" in patch ||
        "snoozedUntil" in patch
      ) {
        const currentIndex = ids.indexOf(activeId || "");
        const next = [
          ...ids.slice(currentIndex + 1),
          ...ids.slice(0, currentIndex).reverse(),
        ].find((id) => !affectedIds.includes(id));
        setFocusId(next ?? null);
        setOpenedId(null);
      }
    } catch (error) {
      announceError(error);
    }
  };
  const undo = async () => {
    const previous = undoStack.at(-1);
    if (!previous) {
      setNotice("Nothing to undo.");
      return;
    }
    try {
      for (const action of previous)
        await transport.update([action.id], action.patch);
      setUndoStack((history) => history.slice(0, -1));
      setNotice("Action undone");
    } catch (error) {
      announceError(error);
    }
  };
  const reply = async (mode: "reply" | "replyAll" | "forward") => {
    if (!activeId || !mailbox) return;
    if (draft && draft.text.trim()) {
      setComposeOpen(true);
      setNotice(
        "Finish or discard your current draft before starting another.",
      );
      return;
    }
    try {
      const full = await transport.load(activeId);
      if (full) {
        setDraft(draftFromMessage(full, mailbox, mode));
        setComposeOpen(true);
      }
    } catch (error) {
      announceError(error);
    }
  };
  const send = async () => {
    const current = draftRef.current;
    if (!current || sending) return;
    if (!online) {
      setNotice(
        "You’re offline. Your draft is saved; reconnect before sending.",
      );
      return;
    }
    const error = validateDraft(current);
    if (error) {
      setNotice(error);
      return;
    }
    setSending(true);
    try {
      await saveChain.current.catch(() => {});
      await transport.send(current);
      localStorage.removeItem(draftKey);
      setDraft(null);
      setComposeOpen(false);
      setNotice("Message queued for delivery. Check Sent for delivery status.");
    } catch (error) {
      announceError(error);
    } finally {
      setSending(false);
    }
  };
  const discard = async () => {
    if (!draft) return;
    try {
      await saveChain.current.catch(() => {});
      await transport.discardDraft(draft);
      localStorage.removeItem(draftKey);
      setDraft(null);
      setComposeOpen(false);
      setNotice("Draft discarded");
    } catch (error) {
      announceError(error);
    }
  };
  const toggleSelection = (id: string) =>
    setSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const run = (command: CommandId) => {
    switch (command) {
      case "palette":
        setModal((current) => (current === "palette" ? null : "palette"));
        break;
      case "help":
        setModal("help");
        break;
      case "compose":
        compose();
        break;
      case "search":
        searchRef.current?.focus();
        break;
      case "down":
      case "up":
      case "selectDown":
      case "selectUp": {
        if (command.startsWith("select") && focusId)
          setSelection((current) => new Set(current).add(focusId));
        const next = nextFocus(
          ids,
          openedId || focusId,
          command === "up" || command === "selectUp" ? -1 : 1,
        );
        setFocusId(next);
        if (openedId && next) {
          const nextMessage = items.find((message) => message._id === next);
          if (nextMessage) openMessage(nextMessage);
        }
        break;
      }
      case "open":
        if (activeMessage) openMessage(activeMessage);
        break;
      case "select":
        if (activeId) toggleSelection(activeId);
        break;
      case "archive":
        void apply(
          { isArchived: folder !== "archive", snoozedUntil: null },
          folder === "archive" ? "Moved to inbox" : "Marked done",
        );
        break;
      case "star":
        void apply(
          { isStarred: !activeMessage?.isStarred },
          activeMessage?.isStarred ? "Star removed" : "Starred",
        );
        break;
      case "read":
        void apply(
          { isRead: !activeMessage?.isRead },
          activeMessage?.isRead ? "Marked unread" : "Marked read",
        );
        break;
      case "trash":
        void apply(
          { isTrashed: folder !== "trash" },
          folder === "trash" ? "Restored from trash" : "Moved to trash",
        );
        break;
      case "snooze":
        if (targetIds.length) setModal("snooze");
        break;
      case "label":
        if (targetIds.length) {
          setLabelInput(activeMessage?.labels.join(", ") || "");
          setModal("labels");
        }
        break;
      case "spam":
        void apply(
          { isSpam: folder !== "spam", isArchived: false, snoozedUntil: null },
          folder === "spam" ? "Moved to inbox" : "Moved to spam",
        );
        break;
      case "undo":
        void undo();
        break;
      case "reply":
      case "replyAll":
      case "forward":
        void reply(command);
        break;
      case "close":
        if (modal) setModal(null);
        else if (composeOpen) setComposeOpen(false);
        else if (openedId) setOpenedId(null);
        else {
          setSelection(new Set());
          props.onSearch("");
          searchRef.current?.blur();
        }
        break;
      case "send":
        void send();
        break;
    }
  };
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const externalCommand = (event: Event) => {
      const id = (event as CustomEvent<{ id?: CommandId }>).detail?.id;
      if (id && COMMANDS.some((item) => item.id === id)) runRef.current(id);
    };
    const externalCompose = (event: Event) => {
      const data = (
        event as CustomEvent<{ to?: string; subject?: string; body?: string }>
      ).detail;
      if (!mailbox) return;
      if (draftRef.current?.text.trim()) {
        setComposeOpen(true);
        setNotice(
          "Your existing draft is open. Finish or discard it before composing another.",
        );
        return;
      }
      setDraft({
        clientDraftId: crypto.randomUUID(),
        mailboxId: mailbox._id,
        to: data?.to || "",
        cc: "",
        bcc: "",
        subject: data?.subject || "",
        text: data?.body || "",
        attachments: [],
        updatedAt: Date.now(),
      });
      setComposeOpen(true);
    };
    window.addEventListener("hustlemail:command", externalCommand);
    window.addEventListener("hustlemail:compose", externalCompose);
    window.dispatchEvent(new CustomEvent("hustlemail:ready"));
    return () => {
      window.removeEventListener("hustlemail:command", externalCommand);
      window.removeEventListener("hustlemail:compose", externalCompose);
      window.dispatchEvent(new CustomEvent("hustlemail:unready"));
    };
  }, [mailbox?._id]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const editing = !!target?.closest(
        "input,textarea,[contenteditable=true],select,[role=textbox]",
      );
      const inDialog = !!target?.closest("[role=dialog]");
      const command = commandForEvent(event, {
        editing,
        modal: !!modal || (inDialog && !composeOpen),
        composing: composeOpen,
      });
      if (command) {
        event.preventDefault();
        runRef.current(command);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [modal, composeOpen]);
  const uploadFiles = async (files: FileList | null) => {
    if (!files || !mailbox) return;
    if (!online) {
      setNotice("Reconnect to attach a file. Your draft is saved.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024)
          throw new Error("Attachments must be 8 MB or smaller.");
        const attachment = await transport.upload(file, mailbox._id);
        setDraft((current) =>
          current
            ? {
                ...current,
                attachments: [...current.attachments, attachment],
                updatedAt: Date.now(),
              }
            : current,
        );
      }
    } catch (error) {
      announceError(error);
    } finally {
      setUploading(false);
    }
  };
  const toggleTheme = () => {
    setLight((current) => {
      try {
        localStorage.setItem("hustlemail:theme", current ? "dark" : "light");
      } catch {
        /* Theme still changes. */
      }
      return !current;
    });
  };
  const enableNotifications = async () => {
    if ("__TAURI_INTERNALS__" in window) {
      window.dispatchEvent(new CustomEvent("hustlemail:enable-notifications"));
      setNotice("Check the system notification permission prompt.");
      return;
    }
    if (!("Notification" in window)) {
      setNotice("This browser does not support notifications.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotificationsEnabled(result === "granted");
    setNotice(
      result === "granted"
        ? "Notifications enabled. Message contents remain private."
        : "Notifications are disabled. You can change this in browser settings.",
    );
  };
  useEffect(() => {
    const notify = (event: Event) => {
      if (
        preview ||
        "__TAURI_INTERNALS__" in window ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      )
        return;
      const data = (event as CustomEvent<{ messageId: string }>).detail;
      const notification = new Notification("New mail", {
        body: "A new message arrived in Hustlemail.",
        tag: data.messageId,
      });
      notification.onclick = () => {
        window.focus();
        setOpenedId(data.messageId);
        notification.close();
      };
    };
    window.addEventListener("hustlemail:notify", notify);
    return () => window.removeEventListener("hustlemail:notify", notify);
  }, [preview]);
  return (
    <div className={`hm-app ${light ? "hm-light" : ""}`}>
      <a href="#hm-mail-list" className="hm-skip">
        Skip to messages
      </a>
      {preview && (
        <div className="hm-preview-bar">
          <span className="hm-status-dot" /> Interactive preview · Sample mail,
          no messages can be sent{" "}
          <a href="/mail/inbox">
            Open your inbox <ArrowRight size={13} />
          </a>
        </div>
      )}
      <div className="hm-shell">
        {mobileNav && (
          <button
            className="hm-nav-scrim"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          />
        )}
        <aside className={`hm-sidebar ${mobileNav ? "hm-sidebar-open" : ""}`}>
          <div className="hm-brand">
            <span className="hm-mark">
              <Mail size={17} strokeWidth={2.2} />
            </span>
            <strong>
              Hustlemail<span>.</span>
            </strong>
            <button
              className="hm-icon hm-mobile-close"
              onClick={() => setMobileNav(false)}
              aria-label="Close navigation"
            >
              <X size={17} />
            </button>
          </div>
          <div className="hm-account">
            <div className="hm-avatar">{initial(userName)}</div>
            <div>
              <strong>{userName}</strong>
              <span>{preview ? "Preview workspace" : "Your workspace"}</span>
            </div>
            <ChevronDown size={13} />
          </div>
          <button className="hm-compose-button" onClick={compose}>
            <PenLine size={16} />
            Compose <kbd>C</kbd>
          </button>
          <div className="hm-nav-caption">MAILBOX</div>
          <nav aria-label="Mail folders">
            {FOLDERS.map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                onClick={() => changeFolder(id)}
                className={`hm-nav-item ${folder === id ? "hm-nav-active" : ""}`}
                aria-current={folder === id ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{title}</span>
                {id === "inbox" && unread > 0 ? (
                  <span className="hm-count">{unread}</span>
                ) : id === "drafts" && draft ? (
                  <span className="hm-count">1</span>
                ) : null}
              </button>
            ))}
          </nav>
          {draft && !composeOpen && (
            <button className="hm-resume" onClick={() => setComposeOpen(true)}>
              <span className="hm-status-dot" />
              <span>
                Resume your draft
                <small>{draft.subject || "Untitled message"}</small>
              </span>
              <ArrowRight size={13} />
            </button>
          )}
          <div className="hm-sidebar-bottom">
            <div className="hm-mailbox-select">
              <Mail size={13} />
              <select
                aria-label="Active mailbox"
                value={mailboxId}
                onChange={(event) => props.onMailboxChange(event.target.value)}
              >
                {mailboxes.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.address}
                  </option>
                ))}
              </select>
            </div>
            <div className="hm-sidebar-tools">
              <button
                onClick={() => setModal("help")}
                title="Keyboard shortcuts (?)"
              >
                <Keyboard size={16} />
                <span>Shortcuts</span>
              </button>
              {!preview && (
                <button
                  onClick={() => void enableNotifications()}
                  aria-label={
                    notificationsEnabled
                      ? "Notifications enabled"
                      : "Enable notifications"
                  }
                  title="Enable notifications"
                >
                  <Bell size={15} />
                </button>
              )}
              <button
                onClick={toggleTheme}
                aria-label={
                  light ? "Switch to dark mode" : "Switch to light mode"
                }
              >
                {light ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              {props.onSignOut && (
                <button onClick={props.onSignOut} aria-label="Sign out">
                  <LogOut size={15} />
                </button>
              )}
            </div>
          </div>
        </aside>
        <main className={`hm-main ${openedId ? "hm-reading" : ""}`}>
          <header className="hm-topbar">
            <button
              className="hm-icon hm-menu-button"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <label className="hm-search">
              <Search size={16} />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => props.onSearch(event.target.value)}
                placeholder="Search your mail"
                aria-label="Search your mail"
              />
              <kbd>/</kbd>
              {search && (
                <button
                  onClick={() => props.onSearch("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <button
              className="hm-command-button"
              onClick={() => setModal("palette")}
            >
              <CommandIcon size={14} />
              <span>Command</span>
              <kbd>{mac ? "⌘ K" : "Ctrl K"}</kbd>
            </button>
          </header>
          <div className="hm-folder-header">
            <div>
              <h1>
                {search
                  ? "Search results"
                  : FOLDERS.find((item) => item.id === folder)?.title}
                <span>{items.length}</span>
              </h1>
            </div>
            <div className="hm-sync" title={props.syncLabel}>
              {online ? (
                <span className="hm-status-dot" />
              ) : (
                <WifiOff size={13} />
              )}
              <span>
                {!online
                  ? "Offline · saved mail"
                  : props.pendingCount
                    ? `${props.pendingCount} pending`
                    : props.syncLabel || "Connected"}
              </span>
            </div>
          </div>
          {(props.error || !online) && (
            <div
              className={`hm-status-banner ${props.error ? "hm-status-error" : ""}`}
              role="status"
            >
              {props.error ||
                "You’re offline. Downloaded mail is available; changes will sync when you reconnect."}
              {props.onRetry && props.error && (
                <button onClick={props.onRetry}>Retry</button>
              )}
            </div>
          )}
          <div className="hm-mail-content">
            <section className="hm-list-panel" aria-label="Messages">
              <div className="hm-list-toolbar">
                <div className="hm-tabs">
                  <button
                    onClick={() => setUnreadOnly(false)}
                    className={!unreadOnly ? "hm-tab-active" : ""}
                  >
                    All mail
                  </button>
                  <button
                    onClick={() => setUnreadOnly(true)}
                    className={unreadOnly ? "hm-tab-active" : ""}
                  >
                    Unread {unread > 0 && <span>{unread}</span>}
                  </button>
                </div>
                <div className="hm-list-actions">
                  {selection.size > 0 ? (
                    <>
                      <span>{selection.size} selected</span>
                      <button
                        className="hm-icon"
                        onClick={() => run("archive")}
                        title="Mark done (E)"
                      >
                        <CheckCheck size={16} />
                      </button>
                      <button
                        className="hm-icon"
                        onClick={() => run("trash")}
                        title="Move to trash (#)"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        className="hm-icon"
                        onClick={() => setSelection(new Set())}
                        aria-label="Clear selection"
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span>Newest first</span>
                      <ArrowDown size={13} />
                    </>
                  )}
                </div>
              </div>
              <div
                className="hm-message-list"
                ref={rowsRef}
                id="hm-mail-list"
                tabIndex={-1}
                role="list"
                aria-label={`${folder} messages`}
              >
                {props.loading && !items.length ? (
                  <div className="hm-empty">
                    <span className="hm-loading" />
                    <h2>Opening your mailbox</h2>
                    <p>Fetching your latest conversations.</p>
                  </div>
                ) : !items.length ? (
                  <div className="hm-empty">
                    <div className="hm-empty-icon">
                      <CheckCheck size={29} strokeWidth={1.3} />
                    </div>
                    <span className="hm-eyebrow">
                      {search ? "NO MATCHES" : "A MOMENT OF CLARITY"}
                    </span>
                    <h2>
                      {search
                        ? "Nothing here just yet."
                        : unreadOnly
                          ? "You’re all caught up."
                          : folder === "inbox"
                            ? "Room for what’s next."
                            : "Nothing here yet."}
                    </h2>
                    <p>
                      {search
                        ? "Try another sender, subject, or phrase."
                        : "Your conversations will appear here."}
                    </p>
                    {folder === "inbox" && (
                      <button className="hm-text-button" onClick={compose}>
                        Start a conversation <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  items.map((message, index) => (
                    <div
                      role="listitem"
                      key={message._id}
                      data-message-id={message._id}
                      className={`hm-row ${focusId === message._id ? "hm-row-focused" : ""} ${openedId === message._id ? "hm-row-open" : ""} ${!message.isRead ? "hm-row-unread" : ""} ${selection.has(message._id) ? "hm-row-selected" : ""}`}
                    >
                      <button
                        className="hm-select-message"
                        aria-label={`${selection.has(message._id) ? "Deselect" : "Select"} ${message.subject}`}
                        aria-pressed={selection.has(message._id)}
                        onClick={() => {
                          setFocusId(message._id);
                          toggleSelection(message._id);
                        }}
                      >
                        {selection.has(message._id) ? (
                          <Check size={12} />
                        ) : (
                          <span
                            className={`hm-sender-avatar hm-avatar-${index % 5}`}
                          >
                            {initial(message.from.name || message.from.address)}
                          </span>
                        )}
                      </button>
                      <button
                        className="hm-row-main"
                        onClick={() => openMessage(message)}
                        onFocus={() => setFocusId(message._id)}
                        aria-label={`${message.isRead ? "" : "Unread: "}${message.from.name || message.from.address}, ${message.subject}`}
                      >
                        <span className="hm-row-top">
                          <span className="hm-sender">
                            {message.isSent || message.isDraft
                              ? `To: ${message.to.map((recipient) => recipient.name || recipient.address).join(", ") || "No recipient"}`
                              : message.from.name || message.from.address}
                          </span>
                          <time dateTime={new Date(message.date).toISOString()}>
                            {formatTime(message.date)}
                          </time>
                        </span>
                        <span className="hm-subject">
                          {message.isDraft && <em>Draft</em>}
                          {message.subject || "(No subject)"}
                        </span>
                        <span className="hm-snippet">
                          {message.snippet || "No preview available"}
                        </span>
                        <span className="hm-row-tags">
                          {message.labels.slice(0, 2).map((label) => (
                            <span key={label}>{label}</span>
                          ))}
                          {message.attachments.length > 0 && (
                            <span>
                              <Paperclip size={11} />{" "}
                              {message.attachments.length}
                            </span>
                          )}
                          {message.deliveryStatus && (
                            <span
                              className={
                                message.deliveryStatus === "failed"
                                  ? "hm-failed"
                                  : ""
                              }
                            >
                              {message.deliveryStatus === "pending"
                                ? "Queued"
                                : message.deliveryStatus}
                            </span>
                          )}
                          {message.snoozedUntil &&
                            message.snoozedUntil > Date.now() && (
                              <span>
                                <Clock3 size={11} />
                                {formatTime(message.snoozedUntil)}
                              </span>
                            )}
                        </span>
                      </button>
                      <button
                        className={`hm-row-star ${message.isStarred ? "hm-starred" : ""}`}
                        onClick={() =>
                          void apply(
                            { isStarred: !message.isStarred },
                            message.isStarred ? "Star removed" : "Starred",
                            [message._id],
                          )
                        }
                        aria-label={
                          message.isStarred ? "Remove star" : "Star message"
                        }
                      >
                        <Star
                          size={14}
                          fill={message.isStarred ? "currentColor" : "none"}
                        />
                      </button>
                    </div>
                  ))
                )}
                {props.hasMore && (
                  <button
                    className="hm-load-more"
                    disabled={props.loading}
                    onClick={props.onLoadMore}
                  >
                    {props.loading ? "Loading…" : "Load more conversations"}
                  </button>
                )}
              </div>
              <footer className="hm-list-footer">
                <span>
                  <span className="hm-status-dot" />
                  {preview
                    ? "Sample mailbox · preview"
                    : `${mailbox?.address ?? "Your mailbox"}`}
                </span>
                <button onClick={() => setModal("help")}>
                  <kbd>J</kbd>
                  <kbd>K</kbd> navigate <kbd>?</kbd> help
                </button>
              </footer>
            </section>
            {openedId && (
              <section className="hm-reader" aria-label="Open conversation">
                <div className="hm-reader-toolbar">
                  <button
                    className="hm-icon"
                    onClick={() => setOpenedId(null)}
                    aria-label="Back to inbox (Esc)"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span />
                  {[
                    {
                      id: "archive" as const,
                      icon: CheckCheck,
                      label: "Mark done (E)",
                    },
                    {
                      id: "snooze" as const,
                      icon: Clock3,
                      label: "Snooze (H)",
                    },
                    {
                      id: "trash" as const,
                      icon: Trash2,
                      label: "Move to trash (#)",
                    },
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      className="hm-icon"
                      onClick={() => run(id)}
                      title={label}
                      aria-label={label}
                    >
                      <Icon size={17} />
                    </button>
                  ))}
                </div>
                {detailLoading && !displayedDetail ? (
                  <div className="hm-empty">
                    <span className="hm-loading" />
                    <p>Opening conversation…</p>
                  </div>
                ) : displayedDetail ? (
                  <div className="hm-reader-scroll">
                    <div className="hm-reader-heading">
                      <span className="hm-eyebrow">CONVERSATION</span>
                      <h2>{displayedDetail.subject || "(No subject)"}</h2>
                      {displayedDetail.deliveryError && (
                        <p className="hm-inline-error" role="alert">
                          Delivery failed: {displayedDetail.deliveryError}
                          {displayedDetail.queueId && transport.retry && (
                            <button
                              className="hm-text-button"
                              disabled={!online}
                              onClick={() => {
                                void transport
                                  .retry?.(displayedDetail.queueId!)
                                  .then(() =>
                                    setNotice(
                                      "Delivery retry queued. Check Sent for status.",
                                    ),
                                  )
                                  .catch(announceError);
                              }}
                            >
                              Retry delivery
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="hm-message-meta">
                      <div className="hm-sender-avatar hm-avatar-0">
                        {initial(
                          displayedDetail.from.name ||
                            displayedDetail.from.address,
                        )}
                      </div>
                      <div>
                        <strong>
                          {displayedDetail.from.name ||
                            displayedDetail.from.address}
                        </strong>
                        <span>{displayedDetail.from.address}</span>
                        <small>
                          To{" "}
                          {displayedDetail.to
                            .map((recipient) => recipient.address)
                            .join(", ")}
                          {displayedDetail.cc?.length
                            ? ` · Cc ${displayedDetail.cc.map((recipient) => recipient.address).join(", ")}`
                            : ""}
                        </small>
                      </div>
                      <time>{formatTime(displayedDetail.date)}</time>
                    </div>
                    <MessageBody
                      key={displayedDetail._id}
                      message={displayedDetail}
                    />
                    {displayedDetail.attachmentsPending && (
                      <div className="hm-attachment-pending" role="status">
                        <Paperclip size={17} />
                        <div>
                          <strong>Attachments pending</strong>
                          <p>
                            The message is ready to read. Its attachments are
                            still being retrieved.
                          </p>
                          {displayedDetail.attachmentError && (
                            <p className="hm-inline-error">
                              {displayedDetail.attachmentError}
                            </p>
                          )}
                        </div>
                        {online && props.onRetryAttachments && (
                          <button onClick={props.onRetryAttachments}>
                            Retry attachments
                          </button>
                        )}
                      </div>
                    )}
                    {displayedDetail.attachments.length > 0 && (
                      <div className="hm-attachments">
                        {displayedDetail.attachments.map((attachment, index) =>
                          attachment.url &&
                          isDownloadUrlAllowed(attachment.url) ? (
                            <a
                              key={index}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={attachment.filename}
                            >
                              <Paperclip size={16} />
                              <span>
                                {attachment.filename}
                                <small>
                                  {(attachment.size / 1024).toFixed(0)} KB
                                </small>
                              </span>
                              <ArrowDown size={14} />
                            </a>
                          ) : (
                            <div key={index}>
                              <Paperclip size={16} />
                              <span>
                                {attachment.filename}
                                <small>
                                  {online
                                    ? "Download unavailable"
                                    : "Reconnect to download"}
                                </small>
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                    <div className="hm-reply-actions">
                      <button
                        className="hm-primary"
                        onClick={() => void reply("reply")}
                      >
                        <Reply size={16} />
                        Reply<kbd>R</kbd>
                      </button>
                      <button onClick={() => void reply("replyAll")}>
                        <ReplyAll size={16} />
                        Reply all<kbd>⇧ R</kbd>
                      </button>
                      <button onClick={() => void reply("forward")}>
                        Forward
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="hm-empty">
                    <p>Message unavailable.</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
      {notice && (
        <div className="hm-toast" role="status">
          <Check size={16} />
          <span>{notice}</span>
          {undoStack.length > 0 && (
            <button onClick={() => void undo()}>
              Undo <kbd>Z</kbd>
            </button>
          )}
          <button
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <Dialog.Root open={composeOpen} onOpenChange={setComposeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="hm-dialog-overlay" />
          <Dialog.Content
            className={`hm-composer ${light ? "hm-light" : ""}`}
            onInteractOutside={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              rowsRef.current?.focus({ preventScroll: true });
            }}
            aria-describedby="hm-compose-description"
          >
            <div className="hm-composer-title">
              <PenLine size={17} />
              <Dialog.Title>
                {draft?.id ? "Your draft" : "New message"}
              </Dialog.Title>
              <span>{draftStatus}</span>
              <Dialog.Close
                className="hm-icon"
                aria-label="Save and close draft"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <Dialog.Description
              id="hm-compose-description"
              className="hm-sr-only"
            >
              Compose an email. Changes are saved on this device and synced when
              online. Escape saves and closes.
            </Dialog.Description>
            {draft && (
              <>
                <div className="hm-compose-content">
                  <div className="hm-compose-fields">
                    <div>
                      <label>From</label>
                      <span>{mailbox?.address}</span>
                    </div>
                    {(["to", "cc", "bcc"] as const).map((field) => (
                      <div key={field}>
                        <label htmlFor={`hm-${field}`}>
                          {field === "to"
                            ? "To"
                            : field === "cc"
                              ? "Cc"
                              : "Bcc"}
                        </label>
                        <input
                          id={`hm-${field}`}
                          value={draft[field]}
                          onChange={(event) =>
                            changeDraft({ [field]: event.target.value })
                          }
                          placeholder={field === "to" ? "name@company.com" : ""}
                          autoFocus={field === "to"}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    ))}
                    <div>
                      <label htmlFor="hm-subject">Subject</label>
                      <input
                        id="hm-subject"
                        value={draft.subject}
                        onChange={(event) =>
                          changeDraft({ subject: event.target.value })
                        }
                        placeholder="A good place to begin"
                      />
                    </div>
                  </div>
                  <textarea
                    className="hm-compose-text"
                    aria-label="Message body"
                    placeholder="Write something worth opening…"
                    value={draft.text}
                    onChange={(event) =>
                      changeDraft({ text: event.target.value })
                    }
                  />
                  <div className="hm-compose-attachments">
                    {draft.attachments.map((attachment, index) => (
                      <span key={index}>
                        <Paperclip size={12} />
                        {attachment.filename}
                        <button
                          onClick={() =>
                            changeDraft({
                              attachments: draft.attachments.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                          aria-label={`Remove ${attachment.filename}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hm-composer-footer">
                  <button
                    className="hm-primary"
                    onClick={() => void send()}
                    disabled={sending || uploading || !online || preview}
                  >
                    {sending
                      ? "Queuing…"
                      : preview
                        ? "Sending disabled in preview"
                        : "Send message"}
                    <CornerDownLeft size={15} />
                    <kbd>{mac ? "⌘" : "Ctrl"} Enter</kbd>
                  </button>
                  <label
                    className="hm-icon hm-attach-button"
                    title="Attach a file (up to 8 MB)"
                  >
                    <Paperclip size={18} />
                    <input
                      type="file"
                      multiple
                      disabled={uploading || !online || preview}
                      onChange={(event) => {
                        void uploadFiles(event.target.files);
                        event.target.value = "";
                      }}
                      aria-label="Attach files"
                    />
                  </label>
                  <span>{uploading ? "Uploading…" : ""}</span>
                  <button
                    className="hm-icon"
                    onClick={() => void discard()}
                    aria-label="Discard draft"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!modal}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="hm-dialog-overlay" />
          <Dialog.Content
            className={`hm-command-modal ${light ? "hm-light" : ""}`}
            onOpenAutoFocus={() => {
              modalReturnFocus.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = modalReturnFocus.current;
              if (target?.isConnected) target.focus({ preventScroll: true });
              else rowsRef.current?.focus({ preventScroll: true });
            }}
            aria-describedby="hm-modal-description"
          >
            <Dialog.Title className="hm-sr-only">
              {modal === "help"
                ? "Keyboard shortcuts"
                : modal === "snooze"
                  ? "Snooze conversation"
                  : modal === "labels"
                    ? "Edit labels"
                    : "Find a command"}
            </Dialog.Title>
            <Dialog.Description
              id="hm-modal-description"
              className="hm-sr-only"
            >
              Use the arrow keys to navigate and Enter to choose. Press Escape
              to close.
            </Dialog.Description>
            {modal === "help" ? (
              <>
                <div className="hm-modal-heading">
                  <Keyboard size={18} />
                  <h2>A little muscle memory.</h2>
                  <Dialog.Close
                    className="hm-icon"
                    aria-label="Close keyboard shortcuts"
                  >
                    <X size={17} />
                  </Dialog.Close>
                </div>
                <p className="hm-help-description">
                  Move through your day without leaving the keyboard.
                </p>
                <div className="hm-shortcuts">
                  {COMMANDS.filter((command) => command.id !== "palette").map(
                    (command) => (
                      <div key={command.id}>
                        <span>{command.title}</span>
                        <kbd>{visibleKey(command.keys, mac)}</kbd>
                      </div>
                    ),
                  )}
                </div>
              </>
            ) : modal === "labels" ? (
              <>
                <div className="hm-modal-heading">
                  <FileText size={18} />
                  <h2>Give it a little context.</h2>
                  <Dialog.Close
                    className="hm-icon"
                    aria-label="Close label editor"
                  >
                    <X size={17} />
                  </Dialog.Close>
                </div>
                <form
                  className="hm-label-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const labels = [
                      ...new Set(
                        labelInput
                          .split(",")
                          .map((label) => label.trim())
                          .filter(Boolean),
                      ),
                    ];
                    setModal(null);
                    void apply({ labels }, "Labels updated");
                  }}
                >
                  <label htmlFor="hm-labels">Labels, separated by commas</label>
                  <input
                    id="hm-labels"
                    value={labelInput}
                    onChange={(event) => setLabelInput(event.target.value)}
                    placeholder="Projects, People, Reading"
                    autoFocus
                  />
                  <p>
                    Applies these labels to {targetIds.length} selected
                    conversation{targetIds.length === 1 ? "" : "s"}. Leave empty
                    to clear labels.
                  </p>
                  <button className="hm-primary" type="submit">
                    Save labels
                  </button>
                </form>
              </>
            ) : modal === "snooze" ? (
              <>
                <div className="hm-modal-heading">
                  <Clock3 size={18} />
                  <h2>Back at a better time.</h2>
                  <Dialog.Close className="hm-icon" aria-label="Close snooze">
                    <X size={17} />
                  </Dialog.Close>
                </div>
                <div className="hm-snooze-options">
                  {[
                    { label: "Later today", date: Date.now() + 3 * 3600000 },
                    {
                      label: "Tomorrow morning",
                      date: new Date(
                        new Date().setHours(24 + 9, 0, 0, 0),
                      ).getTime(),
                    },
                    { label: "In one week", date: Date.now() + 7 * 86400000 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        setModal(null);
                        void apply(
                          { snoozedUntil: option.date, isArchived: false },
                          `Snoozed until ${new Date(option.date).toLocaleString()}`,
                        );
                      }}
                    >
                      <Clock3 size={16} />
                      <span>{option.label}</span>
                      <small>
                        {new Date(option.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </small>
                    </button>
                  ))}
                  <label>
                    Choose a date and time
                    <input
                      type="datetime-local"
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(event) => {
                        const date = new Date(event.target.value).getTime();
                        if (date > Date.now()) {
                          setModal(null);
                          void apply(
                            { snoozedUntil: date, isArchived: false },
                            "Conversation snoozed",
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </>
            ) : (
              <Command>
                <div className="hm-command-input">
                  <Search size={18} />
                  <Command.Input placeholder="What would you like to do?" />
                  <kbd>Esc</kbd>
                </div>
                <Command.List>
                  <Command.Empty>No matching commands.</Command.Empty>
                  <Command.Group heading="YOUR NEXT MOVE">
                    {COMMANDS.filter(
                      (command) =>
                        ![
                          "down",
                          "up",
                          "selectDown",
                          "selectUp",
                          "close",
                          "palette",
                        ].includes(command.id) &&
                        (!composeOpen || ["send", "help"].includes(command.id)),
                    ).map((command) => (
                      <Command.Item
                        key={command.id}
                        disabled={
                          (command.message && !activeId) ||
                          (command.id === "send" &&
                            (!composeOpen || !online || preview))
                        }
                        onSelect={() => {
                          setModal(null);
                          run(command.id);
                        }}
                      >
                        <span>{command.title}</span>
                        <kbd>{visibleKey(command.keys, mac)}</kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="GO TO">
                    {FOLDERS.map((item) => (
                      <Command.Item
                        key={item.id}
                        onSelect={() => {
                          setModal(null);
                          changeFolder(item.id);
                        }}
                      >
                        <item.icon size={15} />
                        <span>{item.title}</span>
                        <ArrowRight size={13} />
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>
                <div className="hm-palette-footer">
                  <span>
                    <kbd>↑</kbd>
                    <kbd>↓</kbd> navigate
                  </span>
                  <span>
                    <kbd>↵</kbd> select
                  </span>
                </div>
              </Command>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
