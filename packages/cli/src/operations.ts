import { execFile } from "node:child_process";
import { readFile, writeFile, lstat, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  assertPilotConfig,
  generateExampleConfig,
  parseMailConfig,
  serializeMailConfig,
  type MailConfig,
} from "@hustlemail/config";
import { parseConfigText } from "@hustlemail/config/dist/reader";

export async function readConfig(path: string): Promise<MailConfig> {
  const text = await readFile(path, "utf8");
  if (Buffer.byteLength(text) > 1024 * 1024)
    throw new Error("Configuration exceeds 1 MiB");
  const config = parseConfigText(text, path);
  assertPilotConfig(config);
  return config;
}

/** Exclusive creation makes repeated setup safe even when another process creates the file. */
export async function setupConfig(path: string, domain = "uncap.us") {
  const example = generateExampleConfig(domain);
  const content = path.endsWith(".json")
    ? serializeMailConfig(parseConfigText(example))
    : example;
  try {
    await writeFile(path, content, { flag: "wx", mode: 0o600 });
    return { action: "created", path: resolve(path), providerChanges: false };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    await readConfig(path);
    return { action: "preserved", path: resolve(path), providerChanges: false };
  }
}

export async function exportConfig(source: string, destination?: string) {
  const serialized = serializeMailConfig(await readConfig(source));
  if (destination)
    await writeFile(destination, serialized, { flag: "wx", mode: 0o600 });
  return serialized;
}

/** Import plans affect a local config file only. They do not provision Resend or Convex. */
export async function importConfig(
  source: string,
  destination: string,
  options: { apply?: boolean; replace?: boolean } = {},
) {
  const incoming = await readConfig(source);
  let existingText: string | undefined;
  try {
    existingText = await readFile(destination, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  let same = false;
  if (existingText !== undefined) {
    try {
      same =
        serializeMailConfig(parseConfigText(existingText, destination)) ===
        serializeMailConfig(incoming);
    } catch {
      /* An invalid legacy file can be replaced only with --replace, after backup. */
    }
  }
  const action = same
    ? "unchanged"
    : existingText === undefined
      ? "create"
      : "replace";
  const plan = {
    action,
    path: resolve(destination),
    providerChanges: false,
    applied: false,
    backup: undefined as string | undefined,
  };
  if (!options.apply || same) return plan;
  const content = destination.endsWith(".json")
    ? serializeMailConfig(incoming)
    : `import { defineMailConfig } from "@hustlemail/config";\n\nexport default defineMailConfig(${serializeMailConfig(incoming).trim()});\n`;
  if (action === "create")
    await writeFile(destination, content, { flag: "wx", mode: 0o600 });
  else {
    if (!options.replace)
      throw new Error(
        "Destination differs. Review the import plan, then use --apply --replace to preserve a backup and replace it.",
      );
    if (!(await lstat(destination)).isFile())
      throw new Error("Refusing to replace a symlink or non-regular file");
    if ((await readFile(destination, "utf8")) !== existingText)
      throw new Error(
        "Destination changed while preparing import; retry the plan",
      );
    const backup = `${destination}.backup-${randomUUID()}`;
    await writeFile(backup, existingText!, { flag: "wx", mode: 0o600 });
    const temporary = `${destination}.import-${randomUUID()}`;
    try {
      await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
      await rename(temporary, destination);
    } finally {
      await unlink(temporary).catch(() => {});
    }
    plan.backup = resolve(backup);
  }
  plan.applied = true;
  return plan;
}

export type ResendRunner = (args: string[]) => Promise<unknown>;

export function resendInvocation(
  args: string[],
  config: MailConfig,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const apiKey = environment[config.credentials.resendApiKeyEnv];
  if (!apiKey?.trim())
    throw new Error(
      `Set ${config.credentials.resendApiKeyEnv} in your environment; a Resend account and full-access key must already exist.`,
    );
  return {
    executable: "resend",
    args: ["--json", "--quiet", ...args],
    env: { ...environment, RESEND_API_KEY: apiKey },
    shell: false as const,
  };
}

/** No shell interpolation, no secret arguments, and no raw child output in error messages. */
export function createResendRunner(
  config: MailConfig,
  environment: NodeJS.ProcessEnv = process.env,
): ResendRunner {
  return async (args) => {
    const invocation = resendInvocation(args, config, environment);
    return new Promise((resolveResult, reject) => {
      execFile(
        invocation.executable,
        invocation.args,
        {
          env: invocation.env,
          shell: false,
          timeout: 30_000,
          maxBuffer: 1024 * 1024,
          encoding: "utf8",
        },
        (error, stdout) => {
          if (error) {
            const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
            reject(
              new Error(
                missing
                  ? "Resend CLI is missing. Install the official npm package resend-cli (not resend)."
                  : "Resend CLI request failed or timed out. No success is assumed; inspect the provider dashboard before retrying a write.",
              ),
            );
            return;
          }
          try {
            resolveResult(JSON.parse(stdout));
          } catch {
            reject(
              new Error(
                "Resend CLI returned invalid JSON; no success is assumed",
              ),
            );
          }
        },
      );
    });
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unexpected Resend response");
  return value as Record<string, unknown>;
}
function providerId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(value)
  )
    throw new Error("Invalid provider identifier in Resend response");
  return value;
}
type Domain = {
  id: string;
  name: string;
  status: string;
  capabilities: { sending: unknown; receiving: unknown };
  records: unknown[];
};
function domainDetails(value: unknown, name: string): Domain {
  const data = object(value);
  if (
    data.name !== name ||
    typeof data.status !== "string" ||
    !Array.isArray(data.records)
  )
    throw new Error("Resend domain details did not match the requested domain");
  const capabilities = object(data.capabilities);
  return {
    id: providerId(data.id),
    name,
    status: data.status,
    capabilities: {
      sending: capabilities.sending,
      receiving: capabilities.receiving,
    },
    records: data.records,
  };
}

/** Bound pagination. A truncated/invalid listing must never be mistaken for an absent domain. */
export async function findDomain(
  config: MailConfig,
  run: ResendRunner,
): Promise<Domain | undefined> {
  let cursor: string | undefined;
  const cursors = new Set<string>();
  for (let page = 0; page < 10; page++) {
    const response = object(
      await run([
        "domains",
        "list",
        "--limit",
        "100",
        ...(cursor ? ["--after", cursor] : []),
      ]),
    );
    if (!Array.isArray(response.data) || typeof response.has_more !== "boolean")
      throw new Error("Resend returned an invalid domain page");
    const domains = response.data.map(object);
    const found = domains.find((domain) => domain.name === config.domain);
    if (found)
      return domainDetails(
        await run(["domains", "get", providerId(found.id)]),
        config.domain,
      );
    if (!response.has_more) return undefined;
    cursor = providerId(domains.at(-1)?.id);
    if (cursors.has(cursor))
      throw new Error(
        "Resend domain pagination repeated a cursor; refusing to provision",
      );
    cursors.add(cursor);
  }
  throw new Error(
    "Resend domain listing exceeds the bounded lookup; refusing to assume the domain is absent",
  );
}

export async function inspectProvider(config: MailConfig, run: ResendRunner) {
  assertPilotConfig(config);
  const domain = await findDomain(config, run);
  return {
    domain: config.domain,
    provider: "resend",
    registered: !!domain,
    providerReady:
      !!domain &&
      domain.status === "verified" &&
      domain.capabilities.sending === "enabled" &&
      domain.capabilities.receiving === "enabled",
    applicationDeliveryVerified: false,
    details: domain ?? null,
  };
}

export async function provision(
  config: MailConfig,
  run: ResendRunner,
  apply = false,
) {
  assertPilotConfig(config);
  const existing = await findDomain(config, run);
  if (existing) {
    if (
      existing.capabilities.sending !== "enabled" ||
      existing.capabilities.receiving !== "enabled"
    )
      throw new Error(
        "Existing Resend domain needs sending and receiving enabled in the Resend dashboard. No duplicate domain was created. The official CLI does not currently expose capability updates.",
      );
    return { action: "preserved", applied: false, details: existing };
  }
  const args = [
    "domains",
    "create",
    "--name",
    config.domain,
    "--region",
    "us-east-1",
    "--sending",
    "--receiving",
  ];
  if (!apply)
    return {
      action: "create",
      applied: false,
      executable: "resend",
      args,
      dnsChanges: false,
    };
  const created = domainDetails(await run(args), config.domain);
  return {
    action: "created",
    applied: true,
    dnsChanges: false,
    details: created,
    next: "Publish the returned DNS records, then explicitly run verify --apply. Domain creation is not delivery verification.",
  };
}

export async function verifyProvider(
  config: MailConfig,
  run: ResendRunner,
  apply = false,
) {
  assertPilotConfig(config);
  const domain = await findDomain(config, run);
  if (!domain) throw new Error("Domain is not registered with Resend");
  if (!apply)
    return {
      action: "request-dns-verification",
      applied: false,
      domainId: domain.id,
    };
  const response = object(await run(["domains", "verify", domain.id]));
  if (providerId(response.id) !== domain.id)
    throw new Error("Unexpected Resend verification response");
  return {
    action: "verification-requested",
    applied: true,
    domainId: domain.id,
    verified: false,
    next: "Use status to read the result; verification is asynchronous.",
  };
}

export async function testProvider(
  config: MailConfig,
  run: ResendRunner,
  options: { send?: boolean; idempotencyKey?: string } = {},
) {
  if (
    options.send &&
    (!options.idempotencyKey ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{7,127}$/.test(options.idempotencyKey))
  )
    throw new Error(
      "--send requires --idempotency-key (8-128 letters, numbers, :, _ or -). Reuse that key if retrying this same probe.",
    );
  const status = await inspectProvider(config, run);
  if (!status.providerReady)
    throw new Error(
      "Resend sending and receiving are not verified/enabled. No test message was sent.",
    );
  if (!options.send)
    return {
      ...status,
      sent: false,
      result:
        "Provider configuration checks passed. End-to-end mail delivery has not been tested.",
    };
  const address = "notify@uncap.us";
  const response = object(
    await run([
      "emails",
      "send",
      "--from",
      address,
      "--to",
      address,
      "--subject",
      "Hustlemail delivery probe",
      "--text",
      "Explicit Hustlemail setup probe. Confirm this message arrives in notify@uncap.us.",
      "--idempotency-key",
      options.idempotencyKey!,
    ]),
  );
  return {
    ...status,
    sent: true,
    acceptedByResend: true,
    providerId: providerId(response.id),
    idempotencyKey: options.idempotencyKey,
    deliveryConfirmed: false,
  };
}
