import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateDKIMKeys } from "./lib/dkim";

// Get all domains for a user
export const list = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domains")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

// Get domain by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("domains")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Get domain by ID
export const get = query({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new domain
export const create = mutation({
  args: {
    name: v.string(),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if domain already exists
    const existing = await ctx.db
      .query("domains")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Domain ${args.name} already exists`);
    }

    // Generate DKIM keys
    const { selector, publicKey, privateKey } = await generateDKIMKeys(args.name);

    const domainId = await ctx.db.insert("domains", {
      name: args.name,
      ownerId: args.ownerId,
      status: "pending",
      dkimSelector: selector,
      dkimPublicKey: publicKey,
      dkimPrivateKey: privateKey,
      spfRecord: `v=spf1 include:_spf.resend.com ~all`,
      dmarcRecord: `v=DMARC1; p=none; rua=mailto:dmarc@${args.name}`,
      config: {
        spamThreshold: 0.7,
        largeFileStrategy: "bounce",
        maxAttachmentSize: 10 * 1024 * 1024, // 10MB
        catchAllMailbox: undefined,
      },
      createdAt: Date.now(),
    });

    return domainId;
  },
});

// Update domain config
export const updateConfig = mutation({
  args: {
    id: v.id("domains"),
    config: v.object({
      spamThreshold: v.optional(v.number()),
      largeFileStrategy: v.optional(
        v.union(v.literal("store"), v.literal("bounce"), v.literal("byo"))
      ),
      maxAttachmentSize: v.optional(v.number()),
      catchAllMailbox: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.id);
    if (!domain) throw new Error("Domain not found");

    await ctx.db.patch(args.id, {
      config: {
        ...domain.config,
        ...args.config,
      },
    });
  },
});

// Verify domain (called after DNS records are set)
export const verify = mutation({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.id);
    if (!domain) throw new Error("Domain not found");

    // In production, this would check DNS records
    // For MVP, we'll just mark as verified
    await ctx.db.patch(args.id, {
      status: "active",
      verifiedAt: Date.now(),
    });
  },
});

// Get DNS records needed for domain
export const getDnsRecords = query({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.id);
    if (!domain) throw new Error("Domain not found");

    return {
      mx: {
        type: "MX",
        host: "@",
        value: `mail.${domain.name}`,
        priority: 10,
        description: "Routes incoming email to CodeMail",
      },
      spf: {
        type: "TXT",
        host: "@",
        value: domain.spfRecord,
        description: "Authorizes CodeMail to send email for your domain",
      },
      dkim: {
        type: "TXT",
        host: `${domain.dkimSelector}._domainkey`,
        value: `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`,
        description: "DKIM signature verification",
      },
      dmarc: {
        type: "TXT",
        host: "_dmarc",
        value: domain.dmarcRecord,
        description: "DMARC policy for email authentication",
      },
      webmail: {
        type: "CNAME",
        host: "mail",
        value: "codemail.app",
        description: "Web mail interface at mail.yourdomain.com",
      },
    };
  },
});

// Delete domain
export const remove = mutation({
  args: { id: v.id("domains") },
  handler: async (ctx, args) => {
    // Delete all associated data
    const mailboxes = await ctx.db
      .query("mailboxes")
      .withIndex("by_domain", (q) => q.eq("domainId", args.id))
      .collect();

    for (const mailbox of mailboxes) {
      // Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_mailbox", (q) => q.eq("mailboxId", mailbox._id))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      // Delete mailbox access
      const access = await ctx.db
        .query("mailboxAccess")
        .withIndex("by_mailbox", (q) => q.eq("mailboxId", mailbox._id))
        .collect();

      for (const a of access) {
        await ctx.db.delete(a._id);
      }

      await ctx.db.delete(mailbox._id);
    }

    // Delete activity logs
    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_domain", (q) => q.eq("domainId", args.id))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Delete domain
    await ctx.db.delete(args.id);
  },
});
