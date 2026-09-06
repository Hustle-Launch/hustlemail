#!/usr/bin/env node
import { Command } from "commander";
import {
  createResendRunner,
  exportConfig,
  importConfig,
  inspectProvider,
  provision,
  readConfig,
  setupConfig,
  testProvider,
  verifyProvider,
} from "./operations";

const program = new Command()
  .name("hustlemail")
  .description("Configure the notify@uncap.us Resend pilot")
  .version("0.2.0");
const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));
const configOption = (command: Command) =>
  command.option(
    "--config <file>",
    "Declarative TypeScript or JSON config",
    "mail.config.ts",
  );

configOption(
  program
    .command("setup [domain]")
    .description("Create local configuration once; preserve an existing file"),
).action(async (domain: string | undefined, options: { config: string }) =>
  print(await setupConfig(options.config, domain)),
);

const config = program
  .command("config")
  .description(
    "Validate and transfer declarative config; never deploys infrastructure",
  );
configOption(
  config
    .command("validate")
    .description(
      "Validate schema and current pilot support without executing the file",
    ),
).action(async (options: { config: string }) => {
  const data = await readConfig(options.config);
  print({
    valid: true,
    domain: data.domain,
    boxes: data.boxes.length,
    scope: "local configuration only",
  });
});
configOption(
  config
    .command("export")
    .description("Export normalized JSON with credential references only"),
)
  .option("--output <file>", "New output file; refuses to overwrite")
  .action(async (options: { config: string; output?: string }) => {
    const serialized = await exportConfig(options.config, options.output);
    if (options.output) print({ exported: options.output });
    else process.stdout.write(serialized);
  });
config
  .command("import <source>")
  .description(
    "Plan local import; --apply creates, --apply --replace backs up and replaces",
  )
  .option("--config <file>", "Destination config", "mail.config.ts")
  .option("--apply", "Apply this local file change")
  .option(
    "--replace",
    "Allow replacing an existing differing file, with backup",
  )
  .action(
    async (
      source: string,
      options: { config: string; apply?: boolean; replace?: boolean },
    ) => print(await importConfig(source, options.config, options)),
  );

for (const name of ["status", "dns"] as const) {
  configOption(
    program
      .command(name)
      .description(
        name === "dns"
          ? "Read exact DNS records and status from Resend; makes no DNS changes"
          : "Read Resend domain status; makes no provider changes",
      ),
  ).action(async (options: { config: string }) => {
    const data = await readConfig(options.config);
    const status = await inspectProvider(data, createResendRunner(data));
    print(status);
    if (!status.providerReady) process.exitCode = 1;
  });
}
configOption(
  program
    .command("provision")
    .description(
      "Plan Resend domain creation; --apply performs it without changing DNS",
    ),
)
  .option("--apply", "Create the domain in your Resend account if absent")
  .action(async (options: { config: string; apply?: boolean }) => {
    const data = await readConfig(options.config);
    print(await provision(data, createResendRunner(data), options.apply));
  });
configOption(
  program
    .command("verify")
    .description(
      "Plan an asynchronous DNS verification request; --apply submits it",
    ),
)
  .option("--apply", "Ask Resend to begin DNS verification")
  .action(async (options: { config: string; apply?: boolean }) => {
    const data = await readConfig(options.config);
    print(await verifyProvider(data, createResendRunner(data), options.apply));
  });
configOption(
  program
    .command("test")
    .description(
      "Read provider readiness; sends only with explicit --send and idempotency key",
    ),
)
  .option("--send", "Send one real probe from notify@uncap.us to itself")
  .option(
    "--idempotency-key <key>",
    "Stable identifier for this explicit probe",
  )
  .action(
    async (options: {
      config: string;
      send?: boolean;
      idempotencyKey?: string;
    }) => {
      const data = await readConfig(options.config);
      print(await testProvider(data, createResendRunner(data), options));
    },
  );

// Removed simulated deploy/logs/users commands deliberately fail as unknown commands.
program.parseAsync().catch((error: unknown) => {
  // Schema diagnostics can include input values; report paths/messages only.
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (
      error as {
        issues: { path: (string | number)[]; message: string; code: string }[];
      }
    ).issues;
    console.error(
      JSON.stringify({
        error: "Invalid configuration",
        issues: issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
      }),
    );
  } else if (error instanceof SyntaxError)
    console.error("Invalid JSON configuration");
  else if (error instanceof Error) console.error(error.message);
  else console.error("Command failed");
  process.exitCode = 1;
});
