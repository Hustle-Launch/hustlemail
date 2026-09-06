export type Folder =
  | "inbox"
  | "sent"
  | "drafts"
  | "archive"
  | "trash"
  | "spam"
  | "starred"
  | "snoozed";
export type Address = { address: string; name?: string };
export type Attachment = {
  filename: string;
  contentType: string;
  size: number;
  storageId?: string;
  url?: string | null;
};
export type Mailbox = {
  _id: string;
  name: string;
  address: string;
  displayName?: string;
  role?: string;
};
export type MailMessage = {
  _id: string;
  mailboxId: string;
  from: Address;
  to: Address[];
  cc?: Address[];
  bcc?: Address[];
  replyTo?: Address | string;
  subject: string;
  snippet: string;
  date: number;
  receivedAt: number;
  bodyText?: string;
  bodyHtml?: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isSpam: boolean;
  isSent: boolean;
  isDraft: boolean;
  snoozedUntil?: number | null;
  labels: string[];
  attachments: Attachment[];
  attachmentsPending?: boolean;
  attachmentError?: string;
  deliveryStatus?: "pending" | "sending" | "sent" | "failed";
  deliveryError?: string;
  queueId?: string;
  clientDraftId?: string;
};
export type MessagePatch = Partial<
  Pick<
    MailMessage,
    | "isRead"
    | "isStarred"
    | "isArchived"
    | "isTrashed"
    | "isSpam"
    | "labels"
    | "snoozedUntil"
  >
>;
export type Draft = {
  clientDraftId: string;
  id?: string;
  mailboxId: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  text: string;
  attachments: Attachment[];
  updatedAt: number;
  inReplyTo?: string;
};
export type MailTransport = {
  update: (ids: string[], patch: MessagePatch) => Promise<void>;
  load: (id: string) => Promise<MailMessage | null>;
  saveDraft: (draft: Draft) => Promise<string>;
  discardDraft: (draft: Draft) => Promise<void>;
  send: (draft: Draft) => Promise<void>;
  upload: (file: File, mailboxId: string) => Promise<Attachment>;
  retry?: (queueId: string) => Promise<void>;
};
export function isDownloadUrlAllowed(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}
export function belongsToFolder(
  message: MailMessage,
  folder: Folder,
  now = Date.now(),
): boolean {
  if (folder === "trash") return message.isTrashed;
  if (message.isTrashed) return false;
  if (folder === "drafts") return message.isDraft;
  if (message.isDraft) return false;
  if (folder === "spam") return message.isSpam;
  if (message.isSpam) return false;
  if (folder === "sent") return message.isSent || !!message.deliveryStatus;
  if (folder === "starred") return message.isStarred;
  if (folder === "snoozed")
    return !!message.snoozedUntil && message.snoozedUntil > now;
  if (folder === "archive") return message.isArchived;
  return (
    !message.isArchived &&
    !message.isSent &&
    !message.deliveryStatus &&
    !(message.snoozedUntil && message.snoozedUntil > now)
  );
}
export function parseAddresses(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
export function validateDraft(draft: Draft): string | null {
  const recipients = parseAddresses(draft.to);
  if (!recipients.length) return "Add at least one recipient.";
  if (
    [
      ...recipients,
      ...parseAddresses(draft.cc),
      ...parseAddresses(draft.bcc),
    ].some((value) => !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value))
  )
    return "Use complete email addresses, separated by commas.";
  return null;
}
export function draftFromMessage(
  message: MailMessage,
  mailbox: Mailbox,
  mode: "reply" | "replyAll" | "forward" | "edit",
): Draft {
  const self = mailbox.address.toLowerCase();
  const replyAddress =
    typeof message.replyTo === "string"
      ? message.replyTo.match(/<([^>]+)>/)?.[1] || message.replyTo.trim()
      : message.replyTo?.address;
  const to =
    mode === "edit"
      ? message.to
      : mode === "forward"
        ? []
        : [
            message.from.address.toLowerCase() === self
              ? message.to[0]
              : replyAddress
                ? { address: replyAddress }
                : message.from,
          ].filter(Boolean);
  const cc =
    mode === "replyAll"
      ? [...message.to, ...(message.cc ?? [])].filter(
          (item) =>
            item.address.toLowerCase() !== self &&
            !to.some(
              (recipient) =>
                recipient.address.toLowerCase() === item.address.toLowerCase(),
            ),
        )
      : mode === "edit"
        ? (message.cc ?? [])
        : [];
  return {
    clientDraftId:
      mode === "edit"
        ? message.clientDraftId || `server-${message._id}`
        : crypto.randomUUID(),
    id: mode === "edit" ? message._id : undefined,
    mailboxId: mailbox._id,
    to: to.map((item) => item.address).join(", "),
    cc: [...new Set(cc.map((item) => item.address))].join(", "),
    bcc:
      mode === "edit"
        ? (message.bcc ?? []).map((item) => item.address).join(", ")
        : "",
    subject:
      mode === "edit"
        ? message.subject
        : `${mode === "forward" ? "Fwd: " : /^re:/i.test(message.subject) ? "" : "Re: "}${message.subject}`,
    text:
      mode === "edit"
        ? (message.bodyText ?? "")
        : `\n\nOn ${new Date(message.date).toLocaleString()}, ${message.from.name || message.from.address} wrote:\n${(
            message.bodyText || message.snippet
          )
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")}`,
    attachments: mode === "edit" ? message.attachments : [],
    updatedAt: Date.now(),
    inReplyTo:
      mode === "reply" || mode === "replyAll" ? message._id : undefined,
  };
}
