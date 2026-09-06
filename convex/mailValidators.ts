import { v } from "convex/values";

export const folder = v.union(v.literal("inbox"), v.literal("sent"), v.literal("drafts"), v.literal("archive"), v.literal("trash"), v.literal("spam"), v.literal("starred"), v.literal("snoozed"));
export const address = v.object({ address: v.string(), name: v.optional(v.string()) });
export const deliveryStatus = v.union(v.literal("pending"), v.literal("sending"), v.literal("sent"), v.literal("failed"));
export const attachment = v.object({ filename: v.string(), contentType: v.string(), size: v.number(), storageId: v.optional(v.id("_storage")), externalUrl: v.optional(v.string()) });
export const upload = v.object({ filename: v.string(), contentType: v.string(), size: v.number(), storageId: v.id("_storage") });
export const patch = v.object({ isRead: v.optional(v.boolean()), isStarred: v.optional(v.boolean()), isArchived: v.optional(v.boolean()), isTrashed: v.optional(v.boolean()), isSpam: v.optional(v.boolean()), labels: v.optional(v.array(v.string())), snoozedUntil: v.optional(v.union(v.number(), v.null())) });
export const summaryFields = {
  _id: v.id("messages"), mailboxId: v.id("mailboxes"), from: address, to: v.array(address), subject: v.string(), snippet: v.string(), date: v.number(), receivedAt: v.number(),
  isRead: v.boolean(), isStarred: v.boolean(), isArchived: v.boolean(), isTrashed: v.boolean(), isSpam: v.boolean(), isSent: v.boolean(), isDraft: v.boolean(), labels: v.array(v.string()), attachments: v.array(attachment),
  snoozedUntil: v.optional(v.number()), deliveryStatus: v.optional(deliveryStatus), deliveryError: v.optional(v.string()), queueId: v.optional(v.id("outboundQueue")), threadId: v.optional(v.string()), clientDraftId: v.optional(v.string()),
  attachmentsPending: v.optional(v.boolean()), attachmentError: v.optional(v.string()),
};
export const summary = v.object(summaryFields);
export const detail = v.object({ ...summaryFields,
  bodyText: v.optional(v.string()), bodyHtml: v.optional(v.string()), bodyUrl: v.union(v.string(), v.null()),
  cc: v.optional(v.array(address)), bcc: v.optional(v.array(address)), replyTo: v.optional(address), inReplyTo: v.optional(v.string()), references: v.optional(v.array(v.string())), mailboxAddress: v.string(),
  attachments: v.array(v.object({ filename: v.string(), contentType: v.string(), size: v.number(), storageId: v.optional(v.id("_storage")), externalUrl: v.optional(v.string()), url: v.union(v.string(), v.null()) })),
});
export const mailbox = v.object({ _id: v.id("mailboxes"), name: v.string(), address: v.string(), displayName: v.string(), role: v.union(v.literal("owner"), v.literal("member"), v.literal("readonly")) });
export const receivedPayload = v.object({
  messageId: v.string(), from: address, to: v.array(address), cc: v.optional(v.array(address)), bcc: v.optional(v.array(address)), replyTo: v.optional(address), subject: v.string(),
  bodyText: v.optional(v.string()), bodyHtml: v.optional(v.string()), bodyStorageId: v.id("_storage"), snippet: v.string(), date: v.number(),
  attachments: v.array(attachment), inReplyTo: v.optional(v.string()), references: v.optional(v.array(v.string())),
});
export const stagedAttachment = v.object({ providerId: v.string(), ...upload.fields });
export const receivedImportFields = {
  account: v.string(), providerId: v.string(), bodyStorageId: v.optional(v.id("_storage")),
  attachments: v.array(stagedAttachment), attachmentCursor: v.optional(v.string()), attachmentsComplete: v.boolean(),
  attempts: v.number(), retryAt: v.number(), error: v.optional(v.string()), updatedAt: v.number(),
};
export const receivedImport = v.object({ _id: v.id("receivedImports"), _creationTime: v.number(), ...receivedImportFields });
