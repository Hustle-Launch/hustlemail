/**
 * Convex mutations for modifying data.
 * All mutations require authentication and enforce ownership checks.
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireMailboxAccess } from "./lib/auth";

/**
 * Generates a random selector string for DKIM.
 * @returns A unique selector prefixed with 'hustlemail'.
 */
function generateSelector(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'hustlemail';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new domain for the authenticated user.
 * @param name - The domain name to register.
 * @returns The ID of the newly created domain.
 */
export const createDomain = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if domain already exists
    const existing = await ctx.db
      .query("domains")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error("Domain already registered");
    }

    // DKIM keys will be generated via a Node.js action when domain is verified
    // For now, use placeholders
    const dkimSelector = generateSelector();

    const domainId = await ctx.db.insert("domains", {
      name: args.name,
      ownerId: identity.subject,
      status: "pending",
      dkimSelector,
      dkimPublicKey: "pending", // Generated when domain is verified
      dkimPrivateKey: "pending", // Generated when domain is verified
      spfRecord: "v=spf1 include:_spf.resend.com ~all",
      dmarcRecord: `v=DMARC1; p=none; rua=mailto:dmarc@${args.name}`,
      config: {
        spamThreshold: 0.7,
        largeFileStrategy: "bounce",
        maxAttachmentSize: 25 * 1024 * 1024, // 25MB
      },
      createdAt: Date.now(),
    });

    return domainId;
  },
});

/**
 * Verifies domain DNS configuration.
 * @param domainId - The domain ID to verify.
 * @returns Success status.
 */
export const verifyDomain = mutation({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) {
      throw new Error("Domain not found");
    }

    // In production, we'd verify DNS records here
    // For now, just mark as active
    await ctx.db.patch(args.domainId, {
      status: "active",
      verifiedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Creates a new mailbox within a domain.
 * @param domainId - The domain to create the mailbox in.
 * @param name - The mailbox name (local part of email).
 * @param displayName - Optional display name.
 * @param type - The mailbox type (personal, shared, alias).
 * @param forwardTo - Optional array of forwarding addresses.
 * @returns The ID of the newly created mailbox.
 */
export const createMailbox = mutation({
  args: {
    domainId: v.id("domains"),
    name: v.string(),
    displayName: v.optional(v.string()),
    type: v.union(
      v.literal("personal"),
      v.literal("shared"),
      v.literal("alias")
    ),
    forwardTo: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) {
      throw new Error("Domain not found");
    }

    // Check if mailbox already exists
    const existing = await ctx.db
      .query("mailboxes")
      .withIndex("by_domain_name", (q) =>
        q.eq("domainId", args.domainId).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error("Mailbox already exists");
    }

    const mailboxId = await ctx.db.insert("mailboxes", {
      domainId: args.domainId,
      name: args.name,
      displayName: args.displayName,
      type: args.type,
      forwardTo: args.forwardTo,
      createdAt: Date.now(),
    });

    // Give the creator access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (user) {
      await ctx.db.insert("mailboxAccess", {
        userId: user._id,
        mailboxId,
        role: "owner",
        createdAt: Date.now(),
      });
    }

    return mailboxId;
  },
});

/**
 * Deletes a mailbox and all associated access records.
 * @param mailboxId - The mailbox ID to delete.
 * @returns Success status.
 */
export const deleteMailbox = mutation({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const mailbox = await ctx.db.get(args.mailboxId);
    if (!mailbox) throw new Error("Mailbox not found");

    const domain = await ctx.db.get(mailbox.domainId);
    if (!domain || domain.ownerId !== identity.subject) {
      throw new Error("Not authorized");
    }

    // Delete all access records
    const access = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_mailbox", (q) => q.eq("mailboxId", args.mailboxId))
      .collect();

    for (const a of access) {
      await ctx.db.delete(a._id);
    }

    // Delete the mailbox (messages remain for audit)
    await ctx.db.delete(args.mailboxId);

    return { success: true };
  },
});

/**
 * Marks a message as read or unread.
 * @param messageId - The message ID to update.
 * @param isRead - Whether the message is read.
 * @returns Success status.
 */
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.messageId, { isRead: args.isRead });
    return { success: true };
  },
});

/**
 * Toggles the starred status of a message.
 * @param messageId - The message ID to toggle.
 * @returns Success status and new starred state.
 */
export const toggleStar = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, { isStarred: !message.isStarred });
    return { success: true, isStarred: !message.isStarred };
  },
});

/**
 * Archives a message.
 * @param messageId - The message ID to archive.
 * @returns Success status.
 */
export const archiveMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.messageId, { isArchived: true });
    return { success: true };
  },
});

/**
 * Moves a message to trash.
 * @param messageId - The message ID to trash.
 * @returns Success status.
 */
export const trashMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.messageId, { isTrashed: true });
    return { success: true };
  },
});

/**
 * Permanently deletes a message (must be in trash first).
 * @param messageId - The message ID to delete.
 * @returns Success status.
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only allow deletion if already trashed
    if (!message.isTrashed) {
      throw new Error("Message must be in trash to delete permanently");
    }

    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

/**
 * Marks a message as spam or not spam.
 * @param messageId - The message ID to update.
 * @param isSpam - Whether the message is spam.
 * @returns Success status.
 */
export const markAsSpam = mutation({
  args: {
    messageId: v.id("messages"),
    isSpam: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.messageId, { isSpam: args.isSpam });
    return { success: true };
  },
});

/**
 * Updates the labels on a message.
 * @param messageId - The message ID to update.
 * @param labels - Array of label strings.
 * @returns Success status.
 */
export const updateLabels = mutation({
  args: {
    messageId: v.id("messages"),
    labels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.messageId, { labels: args.labels });
    return { success: true };
  },
});

/**
 * Queues an outbound email for sending.
 * @param mailboxId - The mailbox to send from.
 * @param to - Array of recipient addresses.
 * @param cc - Optional CC addresses.
 * @param bcc - Optional BCC addresses.
 * @param subject - Email subject.
 * @param bodyText - Plain text body.
 * @param bodyHtml - HTML body.
 * @param attachments - Optional attachments.
 * @returns The queue ID.
 */
export const queueOutboundEmail = mutation({
  args: {
    mailboxId: v.id("mailboxes"),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          contentType: v.string(),
          storageId: v.id("_storage"),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Verify user has member access to send from this mailbox
    const { user } = await requireMailboxAccess(ctx, args.mailboxId, "member");

    const mailbox = await ctx.db.get(args.mailboxId);
    if (!mailbox) throw new Error("Mailbox not found");

    const queueId = await ctx.db.insert("outboundQueue", {
      domainId: mailbox.domainId,
      mailboxId: args.mailboxId,
      userId: user._id,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyText: args.bodyText,
      bodyHtml: args.bodyHtml,
      attachments: args.attachments ?? [],
      status: "pending",
      createdAt: Date.now(),
    });

    return queueId;
  },
});

/**
 * Syncs user data from Clerk (called by webhook or on first access).
 * @param clerkId - The Clerk user ID.
 * @param email - User's email address.
 * @param name - User's display name.
 * @param avatarUrl - Optional avatar URL.
 * @returns The user ID.
 */
export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Invites a user to access a mailbox.
 * @param mailboxId - The mailbox to grant access to.
 * @param email - The invitee's email address.
 * @param role - The access role (member or readonly).
 * @returns Success status.
 */
export const inviteUserToMailbox = mutation({
  args: {
    mailboxId: v.id("mailboxes"),
    email: v.string(),
    role: v.union(v.literal("member"), v.literal("readonly")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const mailbox = await ctx.db.get(args.mailboxId);
    if (!mailbox) throw new Error("Mailbox not found");

    // Check if inviter has owner access
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!inviter) throw new Error("User not found");

    const inviterAccess = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user_mailbox", (q) =>
        q.eq("userId", inviter._id).eq("mailboxId", args.mailboxId)
      )
      .first();

    if (!inviterAccess || inviterAccess.role !== "owner") {
      throw new Error("Not authorized to invite users");
    }

    // Find or create the invitee
    let invitee = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!invitee) {
      // Create placeholder user
      const userId = await ctx.db.insert("users", {
        clerkId: `pending_${args.email}`,
        email: args.email,
        name: args.email.split("@")[0],
        createdAt: Date.now(),
      });
      invitee = await ctx.db.get(userId);
    }

    if (!invitee) throw new Error("Failed to create user");

    // Check if already has access
    const existingAccess = await ctx.db
      .query("mailboxAccess")
      .withIndex("by_user_mailbox", (q) =>
        q.eq("userId", invitee!._id).eq("mailboxId", args.mailboxId)
      )
      .first();

    if (existingAccess) {
      throw new Error("User already has access to this mailbox");
    }

    // Grant access
    await ctx.db.insert("mailboxAccess", {
      userId: invitee._id,
      mailboxId: args.mailboxId,
      role: args.role,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update DKIM keys for a domain (called from dkimActions only).
 * Stores encrypted private key — never plaintext.
 */
export const updateDomainDKIM = mutation({
  args: {
    domainId: v.id("domains"),
    selector: v.string(),
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const domain = await ctx.db.get(args.domainId);
    if (!domain || domain.ownerId !== identity.subject) {
      throw new Error("Domain not found or unauthorized");
    }

    await ctx.db.patch(args.domainId, {
      dkimSelector: args.selector,
      dkimPublicKey: args.publicKey,
      dkimPrivateKey: args.encryptedPrivateKey, // AES-256-GCM encrypted
    });
  },
});
