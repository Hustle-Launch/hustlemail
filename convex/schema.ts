/**
 * Convex database schema for hustlemail.
 * Defines all tables, indexes, and search indexes for the email system.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { receivedPayload, receivedImportFields } from "./mailValidators";

export default defineSchema({
  /** Domain configuration for email routing and authentication. */
  domains: defineTable({
    ownerTokenIdentifier: v.optional(v.string()),
    name: v.string(), // e.g., "mycompany.com"
    ownerId: v.string(), // Clerk user ID
    status: v.union(
      v.literal("pending"),
      v.literal("verifying"),
      v.literal("active"),
      v.literal("suspended")
    ),
    dkimSelector: v.string(),
    dkimPublicKey: v.string(),
    dkimPrivateKey: v.string(), // Encrypted
    spfRecord: v.string(),
    dmarcRecord: v.string(),
    config: v.object({
      spamThreshold: v.number(),
      largeFileStrategy: v.union(
        v.literal("store"),
        v.literal("bounce"),
        v.literal("byo")
      ),
      maxAttachmentSize: v.number(), // bytes
      catchAllMailbox: v.optional(v.string()),
    }),
    createdAt: v.number(),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_owner", ["ownerId"]),

  /** Mailboxes within a domain (email addresses). */
  mailboxes: defineTable({
    domainId: v.id("domains"),
    name: v.string(), // e.g., "support", "hello"
    displayName: v.optional(v.string()),
    type: v.union(
      v.literal("personal"),
      v.literal("shared"),
      v.literal("alias")
    ),
    forwardTo: v.optional(v.array(v.string())), // For aliases/routing
    createdAt: v.number(),
  })
    .index("by_domain", ["domainId"])
    .index("by_domain_name", ["domainId", "name"]),

  /** Users who can access mailboxes. */
  users: defineTable({
    tokenIdentifier: v.optional(v.string()),
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  /** User access permissions to mailboxes. */
  mailboxAccess: defineTable({
    userId: v.id("users"),
    mailboxId: v.id("mailboxes"),
    role: v.union(v.literal("owner"), v.literal("member"), v.literal("readonly")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_mailbox", ["mailboxId"])
    .index("by_user_mailbox", ["userId", "mailboxId"]),

  /** Email messages stored in the system. */
  messages: defineTable({
    searchText: v.optional(v.string()),
    attachmentsPending: v.optional(v.boolean()),
    attachmentError: v.optional(v.string()),
    folder: v.optional(v.string()),
    providerAccount: v.optional(v.string()),
    providerId: v.optional(v.string()),
    clientDraftId: v.optional(v.string()),
    authorId: v.optional(v.id("users")),
    snoozedUntil: v.optional(v.number()),
    queueId: v.optional(v.id("outboundQueue")),
    deliveryStatus: v.optional(v.union(v.literal("pending"), v.literal("sending"), v.literal("sent"), v.literal("failed"))),
    deliveryError: v.optional(v.string()),
    bodyStorageId: v.optional(v.id("_storage")),
    bcc: v.optional(v.array(v.object({ name: v.optional(v.string()), address: v.string() }))),
    domainId: v.id("domains"),
    mailboxId: v.id("mailboxes"),
    // Email headers
    messageId: v.string(), // RFC 5322 Message-ID
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    threadId: v.optional(v.string()), // For threading
    // Envelope
    from: v.object({
      name: v.optional(v.string()),
      address: v.string(),
    }),
    to: v.array(
      v.object({
        name: v.optional(v.string()),
        address: v.string(),
      })
    ),
    cc: v.optional(
      v.array(
        v.object({
          name: v.optional(v.string()),
          address: v.string(),
        })
      )
    ),
    replyTo: v.optional(
      v.object({
        name: v.optional(v.string()),
        address: v.string(),
      })
    ),
    subject: v.string(),
    // Body
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    snippet: v.string(), // First ~100 chars for preview
    // Attachments
    attachments: v.array(
      v.object({
        filename: v.string(),
        contentType: v.string(),
        size: v.number(),
        storageId: v.optional(v.id("_storage")),
        externalUrl: v.optional(v.string()),
      })
    ),
    // State
    labels: v.array(v.string()),
    isRead: v.boolean(),
    isStarred: v.boolean(),
    isArchived: v.boolean(),
    isDraft: v.boolean(),
    isSent: v.boolean(),
    isSpam: v.boolean(),
    isTrashed: v.boolean(),
    // Spam evaluation
    spamScore: v.optional(v.number()),
    spamReason: v.optional(v.string()),
    // Sender authentication results (SPF/DKIM)
    spfResult: v.optional(v.string()),   // "pass" | "fail" | "softfail" | "neutral" | "none" | "temperror" | "permerror"
    dkimResult: v.optional(v.string()),  // "pass" | "fail" | "none" — best result across all signatures
    authHeaders: v.optional(v.string()), // Raw Authentication-Results header for audit
    // Timestamps
    date: v.number(), // Email Date header
    receivedAt: v.number(), // When we received it
  })
    .index("by_mailbox_folder_receivedAt", ["mailboxId", "folder", "receivedAt"])
    .index("by_mailbox_isStarred_receivedAt", ["mailboxId", "isStarred", "receivedAt"])
    .index("by_author_clientDraftId", ["authorId", "clientDraftId"])
    .index("by_snoozedUntil", ["snoozedUntil"])
    .index("by_provider_mailbox", ["providerAccount", "providerId", "mailboxId"])
    .index("by_mailbox", ["mailboxId", "receivedAt"])
    .index("by_mailbox_unread", ["mailboxId", "isRead", "receivedAt"])
    .index("by_thread", ["threadId", "receivedAt"])
    .index("by_domain", ["domainId", "receivedAt"])
    .searchIndex("search_messages", {
      searchField: "subject",
      filterFields: ["mailboxId", "folder", "isArchived", "isSpam", "isTrashed"],
    })
    .searchIndex("search_mail", {
      searchField: "searchText",
      filterFields: ["mailboxId", "folder"],
    }),

  /** Spam evaluations for debugging and tuning. */
  spamEvaluations: defineTable({
    messageId: v.id("messages"),
    isSpam: v.boolean(),
    score: v.number(),
    category: v.string(), // "ham", "spam", "phishing", "scam"
    reason: v.string(),
    model: v.string(), // Which AI model evaluated
    evaluatedAt: v.number(),
  }).index("by_message", ["messageId"]),

  /** Outbound email queue for sending. */
  outboundQueue: defineTable({
    transport: v.optional(v.literal("resend")),
    smtpMessageId: v.optional(v.string()),
    metadataNextAt: v.optional(v.number()),
    metadataAttempts: v.optional(v.number()),
    metadataError: v.optional(v.string()),
    inReplyTo: v.optional(v.string()),
    references: v.optional(v.array(v.string())),
    draftId: v.optional(v.id("messages")),
    idempotencyKey: v.optional(v.string()),
    from: v.optional(v.string()),
    attempts: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
    leaseUntil: v.optional(v.number()),
    leaseToken: v.optional(v.string()),
    firstAttemptAt: v.optional(v.number()),
    domainId: v.id("domains"),
    mailboxId: v.id("mailboxes"),
    userId: v.id("users"),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    attachments: v.array(
      v.object({
        filename: v.string(),
        contentType: v.string(),
        storageId: v.id("_storage"),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed")
    ),
    resendId: v.optional(v.string()),
    error: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_user_idempotencyKey", ["userId", "idempotencyKey"])
    .index("by_status_nextAttemptAt", ["status", "nextAttemptAt"])
    .index("by_status_leaseUntil", ["status", "leaseUntil"])
    .index("by_transport_status_nextAttemptAt", ["transport", "status", "nextAttemptAt"])
    .index("by_transport_status_leaseUntil", ["transport", "status", "leaseUntil"])
    .index("by_transport_status_metadataNextAt", ["transport", "status", "metadataNextAt"])
    .index("by_mailbox_status", ["mailboxId", "status"])
    .index("by_status", ["status", "createdAt"])
    .index("by_domain", ["domainId", "createdAt"]),

  receivedEmails: defineTable({
    account: v.string(), providerId: v.string(),
    payload: v.optional(receivedPayload),
    messageIds: v.array(v.id("messages")), receivedAt: v.number(),
  }).index("by_account_providerId", ["account", "providerId"]),

  receivedImports: defineTable(receivedImportFields)
    .index("by_account_providerId", ["account", "providerId"])
    .index("by_account_retryAt", ["account", "retryAt"]),

  mailSync: defineTable({
    account: v.string(), cursor: v.optional(v.string()),
    completedHead: v.optional(v.string()), scanHead: v.optional(v.string()),
    leaseToken: v.optional(v.string()), leaseUntil: v.optional(v.number()),
    lastPollAt: v.optional(v.number()), lastSuccessAt: v.optional(v.number()),
    lastError: v.optional(v.string()), failures: v.number(), retryAt: v.optional(v.number()),
    nextRequestAt: v.optional(v.number()),
  }).index("by_account", ["account"]),

  mailUploads: defineTable({
    userId: v.id("users"), mailboxId: v.id("mailboxes"), storageId: v.id("_storage"),
    filename: v.string(), contentType: v.string(), size: v.number(),
  }).index("by_storageId", ["storageId"]),

  /** Activity log for audit trails. */
  activityLog: defineTable({
    domainId: v.id("domains"),
    userId: v.optional(v.id("users")),
    action: v.string(), // "message.received", "message.sent", "mailbox.created", etc.
    details: v.string(), // JSON string with action-specific data
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_domain", ["domainId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),
});
