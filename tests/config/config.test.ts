import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createPilotConfig,
  generateExampleConfig,
  parseMailConfig,
  serializeMailConfig,
} from "../../packages/config/src/index";
import { parseConfigText } from "../../packages/config/src/reader";
import {
  createResendRunner,
  exportConfig,
  findDomain,
  importConfig,
  inspectProvider,
  provision,
  readConfig,
  resendInvocation,
  setupConfig,
  testProvider,
  verifyProvider,
  type ResendRunner,
} from "../../packages/cli/src/operations";

const directories: string[] = [];
async function temporary() {
  const directory = await mkdtemp(join(tmpdir(), "hustlemail-config-test-"));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
const config = createPilotConfig();
const domain = {
  id: "domain_123",
  name: "uncap.us",
  status: "verified",
  capabilities: { sending: "enabled", receiving: "enabled" },
  records: [
    {
      type: "TXT",
      name: "resend._domainkey",
      value: "public-test-key",
      status: "verified",
    },
  ],
};
function provider(found = true, overrides: Record<string, unknown> = {}) {
  const calls: string[][] = [];
  const run: ResendRunner = async (args) => {
    calls.push(args);
    if (args[1] === "list")
      return { data: found ? [domain] : [], has_more: false };
    if (args[1] === "get" || args[1] === "create")
      return { ...domain, ...overrides };
    if (args[1] === "verify") return { object: "domain", id: domain.id };
    if (args[1] === "send") return { id: "email_123" };
    throw new Error("Unexpected command");
  };
  return { run, calls };
}

describe("portable config", () => {
  it("round-trips both declarative TypeScript and JSON with only credential references", () => {
    const parsed = parseConfigText(generateExampleConfig());
    expect(parsed).toEqual(config);
    expect(parseConfigText(serializeMailConfig(parsed), "config.json")).toEqual(
      config,
    );
    expect(parsed.credentials).toEqual({ resendApiKeyEnv: "RESEND_API_KEY" });
  });
  it.each([
    { ...config, spam: { provider: "openrouter" } },
    { ...config, ai: { enabled: true } },
    { ...config, outbound: { provider: "smtp" } },
    { ...config, outbound: { provider: "resend", apiKey: "re_SECRET" } },
    { ...config, credentials: { resendApiKeyEnv: "re_SECRET" } },
    { ...config, domain: "uncap.us;touch /tmp/side-effect" },
    { ...config, boxes: ["notify", "NOTIFY"] },
    { ...config, boxes: [] },
    { ...config, polling: { intervalMs: 0 } },
    { ...config, polling: { intervalMs: Infinity } },
  ])(
    "rejects obsolete features, inline keys, unsafe domains, duplicates and unbounded polling",
    (input) => {
      expect(() => parseMailConfig(input)).toThrow();
    },
  );
  it.each([
    'export default defineMailConfig({domain: process.env.DOMAIN, boxes:["notify"]})',
    "export default defineMailConfig({...other})",
    'export default defineMailConfig({get domain(){return "uncap.us"},boxes:["notify"]})',
    'import "node:fs"; export default {domain:"uncap.us",boxes:["notify"]}',
    'console.log("side effect"); export default {domain:"uncap.us",boxes:["notify"]}',
    'export default {domain:"uncap.us",domain:"example.com",boxes:["notify"]}',
    'export default {domain:"uncap.us",boxes:["notify"],__proto__:{}}',
    'export default {domain:"uncap.us",boxes:[`notify${process.exit()}`]}',
  ])("rejects executable config syntax without evaluation", (text) =>
    expect(() => parseConfigText(text)).toThrow(),
  );
  it("does not execute code while reading a config file", async () => {
    const directory = await temporary();
    const path = join(directory, "mail.config.ts");
    await writeFile(
      path,
      'export default (() => { throw new Error("EXECUTED"); })()',
    );
    await expect(readConfig(path)).rejects.not.toThrow("EXECUTED");
  });
});

describe("local setup and transfers", () => {
  it("creates once and preserves edited valid configuration byte-for-byte", async () => {
    const path = join(await temporary(), "mail.config.ts");
    expect((await setupConfig(path)).action).toBe("created");
    const customized = generateExampleConfig().replace(
      '"fromName": "Hustlemail"',
      '"fromName": "My Notifications"',
    );
    await writeFile(path, customized);
    expect((await setupConfig(path)).action).toBe("preserved");
    expect(await readFile(path, "utf8")).toBe(customized);
  });
  it("preserves invalid existing config and reports failure", async () => {
    const path = join(await temporary(), "mail.config.ts");
    await writeFile(path, "legacy config that needs manual migration");
    await expect(setupConfig(path)).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(
      "legacy config that needs manual migration",
    );
  });
  it("supports idempotent JSON setup", async () => {
    const path = join(await temporary(), "mail.config.json");
    await setupConfig(path);
    expect((await setupConfig(path)).action).toBe("preserved");
  });
  it("plans import without writes, creates explicitly and refuses an export overwrite", async () => {
    const directory = await temporary();
    const source = join(directory, "source.json");
    const destination = join(directory, "mail.config.ts");
    await writeFile(source, serializeMailConfig(config));
    expect(await importConfig(source, destination)).toMatchObject({
      action: "create",
      applied: false,
      providerChanges: false,
    });
    await expect(readFile(destination)).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(
      (await importConfig(source, destination, { apply: true })).applied,
    ).toBe(true);
    expect(await readConfig(destination)).toEqual(config);
    await expect(exportConfig(destination, source)).rejects.toMatchObject({
      code: "EEXIST",
    });
  });
  it("requires --replace, backs up original data, and treats repeated import as unchanged", async () => {
    const directory = await temporary();
    const source = join(directory, "source.json");
    const destination = join(directory, "mail.config.ts");
    await writeFile(source, serializeMailConfig(config));
    await writeFile(destination, "legacy config");
    await expect(
      importConfig(source, destination, { apply: true }),
    ).rejects.toThrow("--replace");
    expect(await readFile(destination, "utf8")).toBe("legacy config");
    const imported = await importConfig(source, destination, {
      apply: true,
      replace: true,
    });
    expect(await readFile(imported.backup!, "utf8")).toBe("legacy config");
    expect(
      (await importConfig(source, destination, { apply: true })).action,
    ).toBe("unchanged");
  });
});

describe("explicit provider operations", () => {
  it("keeps credentials in environment and data in separate non-shell arguments", () => {
    const invocation = resendInvocation(
      ["domains", "create", "--name", "uncap.us"],
      config,
      { RESEND_API_KEY: "re_DUMMY_SECRET" },
    );
    expect(invocation.shell).toBe(false);
    expect(invocation.args).not.toContain("re_DUMMY_SECRET");
    expect(invocation.env.RESEND_API_KEY).toBe("re_DUMMY_SECRET");
    expect(() => resendInvocation([], config, {})).toThrow("RESEND_API_KEY");
  });
  it("actually uses the executable with literal argv and suppresses child secret output on failure", async () => {
    const directory = await temporary();
    const executable = join(directory, "resend");
    await writeFile(
      executable,
      `#!${process.execPath}\nconsole.log(JSON.stringify({args:process.argv.slice(2), keyPresent:!!process.env.RESEND_API_KEY}));\n`,
      { mode: 0o700 },
    );
    const run = createResendRunner(config, {
      PATH: directory,
      RESEND_API_KEY: "re_DUMMY_SECRET",
    });
    const result = await run(["test", "$(touch should-not-exist); literal"]);
    expect(result).toEqual({
      args: ["--json", "--quiet", "test", "$(touch should-not-exist); literal"],
      keyPresent: true,
    });
    await writeFile(
      executable,
      `#!${process.execPath}\nconsole.error(process.env.RESEND_API_KEY);process.exit(1);\n`,
    );
    await expect(run([])).rejects.toThrow("Resend CLI request failed");
    await expect(run([])).rejects.not.toThrow("re_DUMMY_SECRET");
  });
  it("status and default test only read, without claiming application delivery", async () => {
    const fake = provider();
    expect(await inspectProvider(config, fake.run)).toMatchObject({
      providerReady: true,
      applicationDeliveryVerified: false,
    });
    expect(await testProvider(config, fake.run)).toMatchObject({ sent: false });
    expect(fake.calls.every((args) => ["list", "get"].includes(args[1]))).toBe(
      true,
    );
  });
  it("does not pass a provider check when receiving is disabled or domain is absent", async () => {
    await expect(testProvider(config, provider(false).run)).rejects.toThrow(
      "not verified",
    );
    const fake = provider(true, {
      capabilities: { sending: "enabled", receiving: "disabled" },
    });
    await expect(
      testProvider(config, fake.run, {
        send: true,
        idempotencyKey: "probe-12345",
      }),
    ).rejects.toThrow("No test message");
    expect(fake.calls.some((args) => args[1] === "send")).toBe(false);
  });
  it("provision plans by default and uses the official create flags only on explicit apply", async () => {
    const fake = provider(false);
    expect(await provision(config, fake.run)).toMatchObject({
      applied: false,
      action: "create",
    });
    expect(fake.calls.some((args) => args[1] === "create")).toBe(false);
    expect(await provision(config, fake.run, true)).toMatchObject({
      applied: true,
      action: "created",
      dnsChanges: false,
    });
    expect(fake.calls.at(-1)).toEqual([
      "domains",
      "create",
      "--name",
      "uncap.us",
      "--region",
      "us-east-1",
      "--sending",
      "--receiving",
    ]);
  });
  it("preserves registered domains, and fails rather than faking capability updates", async () => {
    const fake = provider();
    expect(await provision(config, fake.run, true)).toMatchObject({
      action: "preserved",
      applied: false,
    });
    expect(fake.calls.some((args) => args[1] === "create")).toBe(false);
    await expect(
      provision(
        config,
        provider(true, {
          capabilities: { sending: "enabled", receiving: "disabled" },
        }).run,
        true,
      ),
    ).rejects.toThrow("No duplicate");
  });
  it("never creates after malformed, failing or incomplete provider listings", async () => {
    await expect(
      provision(config, async () => ({ data: [] }), true),
    ).rejects.toThrow("invalid domain page");
    const calls: string[][] = [];
    await expect(
      provision(
        config,
        async (args) => {
          calls.push(args);
          return {
            data: [{ id: "repeated", name: "other.us" }],
            has_more: true,
          };
        },
        true,
      ),
    ).rejects.toThrow("repeated a cursor");
    expect(calls.every((args) => args[1] === "list")).toBe(true);
    await expect(
      provision(
        config,
        async () => {
          throw new Error("network unavailable");
        },
        true,
      ),
    ).rejects.toThrow("network unavailable");
  });
  it("finds a domain on subsequent pages without provisioning a duplicate", async () => {
    const calls: string[][] = [];
    const run: ResendRunner = async (args) => {
      calls.push(args);
      if (args[1] === "get") return domain;
      return args.includes("--after")
        ? { data: [domain], has_more: false }
        : { data: [{ id: "cursor_1", name: "other.us" }], has_more: true };
    };
    expect((await findDomain(config, run))?.id).toBe(domain.id);
    expect(calls[1]).toEqual([
      "domains",
      "list",
      "--limit",
      "100",
      "--after",
      "cursor_1",
    ]);
  });
  it("verification is explicit and reports requested, not verified", async () => {
    const fake = provider();
    expect(await verifyProvider(config, fake.run)).toMatchObject({
      applied: false,
    });
    expect(fake.calls.some((args) => args[1] === "verify")).toBe(false);
    expect(await verifyProvider(config, fake.run, true)).toMatchObject({
      action: "verification-requested",
      verified: false,
    });
  });
  it("requires an explicit send plus stable key and distinguishes accepted from delivered", async () => {
    const fake = provider();
    await expect(
      testProvider(config, fake.run, { send: true }),
    ).rejects.toThrow("--idempotency-key");
    expect(fake.calls).toHaveLength(0);
    expect(
      await testProvider(config, fake.run, {
        send: true,
        idempotencyKey: "pilot-probe-001",
      }),
    ).toMatchObject({
      sent: true,
      acceptedByResend: true,
      deliveryConfirmed: false,
    });
    expect(fake.calls.at(-1)).toContain("notify@uncap.us");
    expect(fake.calls.at(-1)?.at(-1)).toBe("pilot-probe-001");
  });
});

describe("built CLI failure reporting", () => {
  const execute = promisify(execFile);
  const entrypoint = join(process.cwd(), "packages/cli/dist/index.js");
  it("unknown former simulated commands fail without success text", async () => {
    try {
      await execute(process.execPath, [
        entrypoint,
        "users",
        "add",
        "alice@uncap.us",
      ]);
      throw new Error("Unknown simulated command unexpectedly succeeded");
    } catch (error) {
      const result = error as Error & {
        code: number;
        stdout: string;
        stderr: string;
      };
      expect(result.code).toBe(1);
      expect(result.stdout).not.toContain("Added user");
      expect(result.stderr).toContain("unknown command");
    }
  });
  it("reports invalid credential-bearing config without printing its value", async () => {
    const path = join(await temporary(), "config.json");
    await writeFile(
      path,
      JSON.stringify({
        ...config,
        outbound: { provider: "resend", apiKey: "re_DUMMY_SECRET" },
      }),
    );
    try {
      await execute(process.execPath, [
        entrypoint,
        "config",
        "validate",
        "--config",
        path,
      ]);
      throw new Error("Invalid config unexpectedly succeeded");
    } catch (error) {
      const result = error as Error & {
        code: number;
        stdout: string;
        stderr: string;
      };
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Invalid configuration");
      expect(result.stderr).not.toContain("re_DUMMY_SECRET");
      expect(result.stdout).toBe("");
    }
  });
});
