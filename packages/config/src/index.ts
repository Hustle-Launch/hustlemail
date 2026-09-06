/** Declarative, portable configuration. Secrets are resolved only by server/CLI code. */
import { z } from "zod";

export const DomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Use a DNS domain, without a scheme, port or path",
  );
export const BoxNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(64)
  .regex(
    /^[a-z0-9]+(?:[._+-][a-z0-9]+)*$/,
    "Use a mailbox local name, without @domain",
  );
const CredentialReference = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9_]{1,127}$/,
    "Use an environment variable name, never a credential value",
  );
export const BoxSchema = z.union([
  BoxNameSchema,
  z
    .object({
      name: BoxNameSchema,
      displayName: z.string().trim().min(1).max(100).optional(),
    })
    .strict(),
]);
export const MailConfigSchema = z
  .object({
    version: z.literal(1).default(1),
    domain: DomainSchema,
    boxes: z.array(BoxSchema).min(1).max(100),
    inbound: z
      .object({ provider: z.literal("resend").default("resend") })
      .strict()
      .default({}),
    outbound: z
      .object({
        provider: z.literal("resend").default("resend"),
        fromName: z.string().trim().min(1).max(100).default("Hustlemail"),
      })
      .strict()
      .default({}),
    credentials: z
      .object({
        resendApiKeyEnv: CredentialReference.default("RESEND_API_KEY"),
      })
      .strict()
      .default({}),
    polling: z
      .object({
        intervalMs: z.number().int().min(10_000).max(300_000).default(10_000),
      })
      .strict()
      .default({}),
  })
  .strict()
  .superRefine((value, ctx) => {
    const names = value.boxes.map((box) =>
      typeof box === "string" ? box : box.name,
    );
    if (new Set(names).size !== names.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["boxes"],
        message: "Mailbox names must be unique",
      });
  });

export type MailConfig = z.output<typeof MailConfigSchema>;
export type MailConfigInput = z.input<typeof MailConfigSchema>;
export type Box = z.output<typeof BoxSchema>;
export function defineMailConfig(config: MailConfigInput): MailConfig {
  return MailConfigSchema.parse(config);
}
export function parseMailConfig(config: unknown): MailConfig {
  return MailConfigSchema.parse(config);
}
export function validateMailConfig(config: unknown) {
  return MailConfigSchema.safeParse(config);
}
export function normalizeBox(box: Box) {
  return typeof box === "string" ? { name: box } : box;
}
export function getBoxNames(config: MailConfig): string[] {
  return config.boxes.map((box) => normalizeBox(box).name);
}
export function hasBox(config: MailConfig, name: string): boolean {
  return getBoxNames(config).includes(name);
}

/** The current backend deliberately serves only the approved pilot mailbox. */
export function assertPilotConfig(config: MailConfig): void {
  if (
    config.domain !== "uncap.us" ||
    getBoxNames(config).join(",") !== "notify"
  ) {
    throw new Error(
      "This release supports only notify@uncap.us. Other domains/mailboxes require a reviewed backend scope change.",
    );
  }
  if (config.polling.intervalMs !== 10_000)
    throw new Error(
      "This release polls every 10000ms. Changing cadence requires updating and deploying the backend cron.",
    );
}

export function createPilotConfig(): MailConfig {
  return defineMailConfig({
    domain: "uncap.us",
    boxes: [{ name: "notify", displayName: "Notifications" }],
  });
}

/** JSON contains environment variable names, never resolved values. */
export function serializeMailConfig(config: MailConfig): string {
  return JSON.stringify(parseMailConfig(config), null, 2) + "\n";
}
export function generateExampleConfig(domain = "uncap.us"): string {
  const config = createPilotConfig();
  if (DomainSchema.parse(domain) !== config.domain)
    throw new Error("Only the uncap.us pilot is supported in this release.");
  return `import { defineMailConfig } from "@hustlemail/config";\n\nexport default defineMailConfig(${serializeMailConfig(config).trim()});\n`;
}
