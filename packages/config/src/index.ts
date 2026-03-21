/**
 * @hustlemail/config - Mail configuration schemas and utilities.
 * Provides Zod schemas for validating mail.config.ts files.
 */

import { z } from "zod";

/** Schema for spam detection configuration. */
export const SpamConfigSchema = z.object({
  provider: z.enum(["openrouter", "none"]).default("openrouter"),
  model: z.string().default("meta-llama/llama-3.2-3b-instruct:free"),
  threshold: z.number().min(0).max(1).default(0.7),
  blocklist: z.array(z.string()).optional(),
  allowlist: z.array(z.string()).optional(),
});

/** Schema for attachment handling configuration. */
export const AttachmentConfigSchema = z.object({
  maxSize: z.union([z.string(), z.number()]).default("10mb"),
  largeFileStrategy: z.enum(["store", "bounce", "byo"]).default("bounce"),
  bounceMessage: z.string().optional(),
  storageProvider: z.enum(["convex", "s3", "uploadthing"]).default("convex"),
});

/** Schema for outbound email configuration. */
export const OutboundConfigSchema = z.object({
  provider: z.enum(["resend"]).default("resend"),
  apiKey: z.string().optional(), // From env if not provided
  fromName: z.string().optional(),
  replyTo: z.string().optional(),
});

/** Schema for email routing rules. */
export const RouteSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())])
);

/** Schema for mailbox configuration (simple string or object). */
export const MailboxSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    displayName: z.string().optional(),
    type: z.enum(["personal", "shared", "alias"]).default("personal"),
    forwardTo: z.array(z.string()).optional(),
  }),
]);

/** Schema for the complete mail.config.ts file. */
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

/** Spam detection configuration type. */
export type SpamConfig = z.infer<typeof SpamConfigSchema>;

/** Attachment handling configuration type. */
export type AttachmentConfig = z.infer<typeof AttachmentConfigSchema>;

/** Outbound email configuration type. */
export type OutboundConfig = z.infer<typeof OutboundConfigSchema>;

/** Email routing rules type. */
export type Route = z.infer<typeof RouteSchema>;

/** Mailbox configuration type. */
export type Mailbox = z.infer<typeof MailboxSchema>;

/** Complete mail configuration type. */
export type MailConfig = z.infer<typeof MailConfigSchema>;

/**
 * Defines a mail config with type safety.
 * @param config - The mail configuration object.
 * @returns The validated mail configuration.
 */
export function defineMailConfig(config: MailConfig): MailConfig {
  return MailConfigSchema.parse(config);
}

/**
 * Parses and validates a config object.
 * @param config - The unknown config object to parse.
 * @returns The validated mail configuration.
 * @throws ZodError if validation fails.
 */
export function parseMailConfig(config: unknown): MailConfig {
  return MailConfigSchema.parse(config);
}

/**
 * Validates a config and returns errors if invalid.
 * @param config - The unknown config object to validate.
 * @returns Object with success flag and either data or errors.
 */
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

/**
 * Parses a size string to bytes.
 * @param size - Size string (e.g., "10mb") or number.
 * @returns Size in bytes.
 * @throws Error if size format is invalid.
 */
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

/**
 * Normalizes a mailbox config to a consistent format.
 * @param mailbox - The mailbox config (string or object).
 * @returns Normalized mailbox object with all fields.
 */
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

/**
 * Gets all mailbox names from a config.
 * @param config - The mail configuration.
 * @returns Array of mailbox names.
 */
export function getMailboxNames(config: MailConfig): string[] {
  return config.mailboxes.map((m) =>
    typeof m === "string" ? m : m.name
  );
}

/**
 * Checks if a mailbox exists in a config.
 * @param config - The mail configuration.
 * @param name - The mailbox name to check.
 * @returns True if the mailbox exists.
 */
export function hasMailbox(config: MailConfig, name: string): boolean {
  return getMailboxNames(config).includes(name);
}

/**
 * Gets route recipients for a mailbox.
 * @param config - The mail configuration.
 * @param mailbox - The mailbox name to get routes for.
 * @returns Array of recipient mailbox names.
 */
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

/**
 * Generates example mail.config.ts content for a domain.
 * @param domain - The domain name.
 * @returns TypeScript config file content as a string.
 */
export function generateExampleConfig(domain: string): string {
  return `import { defineMailConfig } from "@hustlemail/config";

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
