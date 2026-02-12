import { z } from "zod";

// Zod schemas for mail.config.ts validation
export const SpamConfigSchema = z.object({
  provider: z.enum(["openrouter", "none"]).default("openrouter"),
  model: z.string().default("meta-llama/llama-3.2-3b-instruct:free"),
  threshold: z.number().min(0).max(1).default(0.7),
  blocklist: z.array(z.string()).optional(),
  allowlist: z.array(z.string()).optional(),
});

export const AttachmentConfigSchema = z.object({
  maxSize: z.union([z.string(), z.number()]).default("10mb"),
  largeFileStrategy: z.enum(["store", "bounce", "byo"]).default("bounce"),
  bounceMessage: z.string().optional(),
  storageProvider: z.enum(["convex", "s3", "uploadthing"]).default("convex"),
});

export const OutboundConfigSchema = z.object({
  provider: z.enum(["resend"]).default("resend"),
  apiKey: z.string().optional(), // From env if not provided
  fromName: z.string().optional(),
  replyTo: z.string().optional(),
});

export const RouteSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())])
);

export const MailboxSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    displayName: z.string().optional(),
    type: z.enum(["personal", "shared", "alias"]).default("personal"),
    forwardTo: z.array(z.string()).optional(),
  }),
]);

export const MailConfigSchema = z.object({
  domain: z.string().min(1),
  mailboxes: z.array(MailboxSchema),
  routes: RouteSchema.optional(),
  users: z.array(
    z.object({
      email: z.string().email(),
      name: z.string(),
      mailboxes: z.array(z.string()).optional(),
    })
  ).optional(),
  spam: SpamConfigSchema.optional(),
  attachments: AttachmentConfigSchema.optional(),
  outbound: OutboundConfigSchema.optional(),
  catchAll: z.string().optional(),
});

// TypeScript types derived from schemas
export type SpamConfig = z.infer<typeof SpamConfigSchema>;
export type AttachmentConfig = z.infer<typeof AttachmentConfigSchema>;
export type OutboundConfig = z.infer<typeof OutboundConfigSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Mailbox = z.infer<typeof MailboxSchema>;
export type MailConfig = z.infer<typeof MailConfigSchema>;

// Helper function to define a mail config with type safety
export function defineMailConfig(config: MailConfig): MailConfig {
  return MailConfigSchema.parse(config);
}

// Parse and validate a config object
export function parseMailConfig(config: unknown): MailConfig {
  return MailConfigSchema.parse(config);
}

// Validate a config and return errors if invalid
export function validateMailConfig(config: unknown): {
  success: boolean;
  data?: MailConfig;
  errors?: z.ZodError;
} {
  const result = MailConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// Parse size string to bytes
export function parseSize(size: string | number): number {
  if (typeof size === "number") return size;

  const match = size.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/i);
  if (!match) throw new Error(`Invalid size: ${size}`);

  const value = parseFloat(match[1]);
  const unit = (match[2] || "b").toLowerCase();

  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  return Math.floor(value * multipliers[unit]);
}

// Normalize mailbox config to consistent format
export function normalizeMailbox(mailbox: Mailbox): {
  name: string;
  displayName?: string;
  type: "personal" | "shared" | "alias";
  forwardTo?: string[];
} {
  if (typeof mailbox === "string") {
    return { name: mailbox, type: "personal" };
  }
  return {
    name: mailbox.name,
    displayName: mailbox.displayName,
    type: mailbox.type || "personal",
    forwardTo: mailbox.forwardTo,
  };
}

// Get all mailbox names from config
export function getMailboxNames(config: MailConfig): string[] {
  return config.mailboxes.map((m) =>
    typeof m === "string" ? m : m.name
  );
}

// Check if a mailbox exists in config
export function hasMailbox(config: MailConfig, name: string): boolean {
  return getMailboxNames(config).includes(name);
}

// Get route recipients for a mailbox
export function getRouteRecipients(
  config: MailConfig,
  mailbox: string
): string[] {
  if (!config.routes) return [mailbox];

  const route = config.routes[mailbox];
  if (!route) {
    // Check catch-all
    const catchAll = config.routes["*"];
    if (catchAll) {
      return Array.isArray(catchAll) ? catchAll : [catchAll];
    }
    return [mailbox];
  }

  return Array.isArray(route) ? route : [route];
}

// Generate example mail.config.ts content
export function generateExampleConfig(domain: string): string {
  return `import { defineMailConfig } from "@codemail/config";

export default defineMailConfig({
  domain: "${domain}",

  // Mailboxes to create
  mailboxes: [
    "hello",     // hello@${domain}
    "support",   // support@${domain}
    "team",      // team@${domain} (shared)
  ],

  // Route patterns (optional)
  routes: {
    // Route support@ to multiple people
    support: ["alice", "bob"],
    // Catch-all for unknown addresses
    "*": ["team"],
  },

  // Spam detection settings
  spam: {
    provider: "openrouter",
    threshold: 0.7,
  },

  // Attachment handling
  attachments: {
    maxSize: "10mb",
    largeFileStrategy: "bounce",
  },

  // Outbound email (uses RESEND_API_KEY from env)
  outbound: {
    provider: "resend",
  },
});
`;
}
