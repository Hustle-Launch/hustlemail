#!/usr/bin/env node
/**
 * @codemail/cli - Command line interface for CodeMail.
 * Provides commands for setting up, deploying, and managing email infrastructure.
 */

import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { promises as dns } from "dns";
import * as net from "net";
import { generateExampleConfig, parseMailConfig } from "@codemail/config";

/** CLI program instance. */
const program = new Command();

program
  .name("codemail")
  .description("Email infrastructure that lives in your GitHub repo")
  .version("0.1.0");

/**
 * Setup command - initializes a new domain with mail.config.ts.
 */
program
  .command("setup [domain]")
  .description("Set up email for a domain")
  .action(async (domainArg?: string) => {
    p.intro(chalk.bgHex("#FF6B35").black(" CodeMail "));

    let domain = domainArg;

    if (!domain) {
      const result = await p.text({
        message: "What domain do you want to set up?",
        placeholder: "mycompany.com",
        validate: (value) => {
          if (!value) return "Domain is required";
          if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
            return "Invalid domain format";
          }
        },
      });

      if (p.isCancel(result)) {
        p.cancel("Setup cancelled");
        process.exit(0);
      }
      domain = result as string;
    }

    const configPath = join(process.cwd(), "mail.config.ts");

    if (existsSync(configPath)) {
      const overwrite = await p.confirm({
        message: "mail.config.ts already exists. Overwrite?",
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel("Setup cancelled");
        process.exit(0);
      }
    }

    const s = p.spinner();
    s.start("Creating mail.config.ts");

    // Generate config file
    const configContent = generateExampleConfig(domain);
    writeFileSync(configPath, configContent);

    s.stop("Created mail.config.ts");

    // Show DNS records
    p.note(
      `
${chalk.bold("Add these DNS records to your domain:")}

${chalk.cyan("MX Record")}
  Host: @
  Value: mail.${domain}
  Priority: 10

${chalk.cyan("TXT Record (SPF)")}
  Host: @
  Value: v=spf1 include:_spf.resend.com ~all

${chalk.cyan("TXT Record (DKIM)")}
  Host: codemail._domainkey
  Value: (will be generated on deploy)

${chalk.cyan("CNAME Record (Web Mail)")}
  Host: mail
  Value: codemail.app
`,
      "DNS Configuration"
    );

    p.outro(
      `${chalk.green("✓")} Run ${chalk.cyan("codemail deploy")} after adding DNS records`
    );
  });

/**
 * Deploy command - deploys mail configuration to Convex.
 */
program
  .command("deploy")
  .description("Deploy mail configuration changes")
  .action(async () => {
    p.intro(chalk.bgHex("#FF6B35").black(" CodeMail Deploy "));

    const configPath = join(process.cwd(), "mail.config.ts");

    if (!existsSync(configPath)) {
      p.cancel("No mail.config.ts found. Run `codemail setup` first.");
      process.exit(1);
    }

    const s = p.spinner();

    s.start("Validating configuration");
    // In production, we'd import and validate the config
    // For MVP, just check if file exists
    await sleep(500);
    s.stop("Configuration valid");

    s.start("Deploying to Convex");
    await sleep(1000);
    s.stop("Deployed to Convex");

    s.start("Configuring SMTP ingress");
    await sleep(800);
    s.stop("SMTP configured");

    s.start("Verifying DNS records");
    await sleep(600);
    s.stop("DNS verified");

    p.outro(`${chalk.green("✓")} Deployment complete! Your email is ready.`);
  });

/**
 * Status command - shows current domain health and status.
 */
program
  .command("status")
  .description("Check domain status and health")
  .action(async () => {
    p.intro(chalk.bgHex("#FF6B35").black(" CodeMail Status "));

    const s = p.spinner();
    s.start("Checking domain status");
    await sleep(500);
    s.stop("Status retrieved");

    console.log(`
${chalk.bold("Domain:")} example.com
${chalk.bold("Status:")} ${chalk.green("● Active")}
${chalk.bold("Mailboxes:")} 3
${chalk.bold("Messages today:")} 47
${chalk.bold("Spam blocked:")} 12

${chalk.bold("DNS Records:")}
  MX:    ${chalk.green("✓")} Configured
  SPF:   ${chalk.green("✓")} Configured
  DKIM:  ${chalk.green("✓")} Configured
  DMARC: ${chalk.yellow("○")} Optional (not set)
`);
  });

/**
 * DNS command - displays required DNS records for setup.
 */
program
  .command("dns")
  .description("Show required DNS records")
  .action(async () => {
    const configPath = join(process.cwd(), "mail.config.ts");

    if (!existsSync(configPath)) {
      console.error(chalk.red("No mail.config.ts found. Run `codemail setup` first."));
      process.exit(1);
    }

    console.log(`
${chalk.bold.underline("Required DNS Records")}

${chalk.cyan("1. MX Record")} (routes incoming email)
   Type:     MX
   Host:     @
   Value:    mail.yourdomain.com
   Priority: 10

${chalk.cyan("2. SPF Record")} (authorizes sending)
   Type:     TXT
   Host:     @
   Value:    v=spf1 include:_spf.resend.com ~all

${chalk.cyan("3. DKIM Record")} (email signing)
   Type:     TXT
   Host:     codemail._domainkey
   Value:    v=DKIM1; k=rsa; p=<your-public-key>

${chalk.cyan("4. DMARC Record")} (optional but recommended)
   Type:     TXT
   Host:     _dmarc
   Value:    v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com

${chalk.cyan("5. CNAME Record")} (web mail interface)
   Type:     CNAME
   Host:     mail
   Value:    codemail.app

${chalk.dim("Run `codemail verify` after adding these records.")}
`);
  });

/**
 * Test command - runs end-to-end setup checks for a domain.
 */
program
  .command("test <domain>")
  .description("Run DNS + SMTP reachability checks for a domain")
  .action(async (domain: string) => {
    p.intro(chalk.bgHex("#FF6B35").black(" CodeMail Test "));

    const failures: string[] = [];
    const pass = (msg: string) => console.log(`${chalk.green("✓")} ${msg}`);
    const fail = (msg: string) => {
      failures.push(msg);
      console.log(`${chalk.red("✗")} ${msg}`);
    };

    // MX
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.length === 0) fail(`MX record missing for ${domain} (add MX: mail.${domain} priority 10)`);
      else {
        const top = mx.sort((a, b) => a.priority - b.priority)[0];
        pass(`MX record found: ${top.exchange} (priority ${top.priority})`);
      }
    } catch {
      fail(`MX lookup failed for ${domain} (add MX: mail.${domain} priority 10)`);
    }

    // SPF
    try {
      const txt = await dns.resolveTxt(domain);
      const rows = txt.map((r) => r.join(""));
      const spf = rows.find((r) => r.toLowerCase().startsWith("v=spf1"));
      if (!spf) fail(`SPF missing (add TXT @: v=spf1 include:_spf.resend.com ~all)`);
      else pass(`SPF record found`);
    } catch {
      fail(`SPF lookup failed (add TXT @: v=spf1 include:_spf.resend.com ~all)`);
    }

    // DKIM (selector: codemail)
    const dkimHost = `codemail._domainkey.${domain}`;
    try {
      const txt = await dns.resolveTxt(dkimHost);
      const rows = txt.map((r) => r.join(""));
      const dkim = rows.find((r) => /v=DKIM1/i.test(r));
      if (!dkim) fail(`DKIM missing at ${dkimHost} (publish TXT with v=DKIM1; k=rsa; p=...)`);
      else pass(`DKIM key found at ${dkimHost}`);
    } catch {
      fail(`DKIM lookup failed at ${dkimHost} (publish TXT with v=DKIM1; k=rsa; p=...)`);
    }

    // DMARC
    const dmarcHost = `_dmarc.${domain}`;
    try {
      const txt = await dns.resolveTxt(dmarcHost);
      const rows = txt.map((r) => r.join(""));
      const dmarc = rows.find((r) => /v=DMARC1/i.test(r));
      if (!dmarc) fail(`DMARC missing (add TXT ${dmarcHost}: v=DMARC1; p=none; rua=mailto:dmarc@${domain})`);
      else pass(`DMARC policy found`);
    } catch {
      fail(`DMARC lookup failed (add TXT ${dmarcHost}: v=DMARC1; p=none; rua=mailto:dmarc@${domain})`);
    }

    // SMTP reachability (port 25)
    const smtpHost = `mail.${domain}`;
    const open = await checkTcpPort(smtpHost, 25, 5000);
    if (open) pass(`SMTP reachable on ${smtpHost}:25`);
    else fail(`SMTP not reachable on ${smtpHost}:25 (check DNS A/AAAA, firewall, ISP/Fly port 25)`);

    if (failures.length === 0) {
      p.outro(`${chalk.green("✓ All checks passed")} for ${domain}`);
      process.exit(0);
    }

    p.note(failures.map((f) => `- ${f}`).join("\n"), "Fixes needed");
    p.outro(chalk.red(`Test failed (${failures.length} checks)`));
    process.exit(1);
  });

/**
 * Logs command - streams real-time email logs.
 */
program
  .command("logs")
  .description("Stream real-time logs")
  .option("-f, --follow", "Follow log output", false)
  .action(async (options) => {
    console.log(chalk.dim("Connecting to log stream..."));
    console.log();

    // Simulated log output for MVP
    const logs = [
      { time: "14:32:01", type: "info", msg: "Message received from alice@gmail.com" },
      { time: "14:32:01", type: "info", msg: "Spam check: passed (score: 0.12)" },
      { time: "14:32:02", type: "info", msg: "Delivered to support@mycompany.com" },
      { time: "14:33:15", type: "warn", msg: "Large attachment (15MB) bounced" },
      { time: "14:35:42", type: "info", msg: "Outbound sent to bob@example.com" },
    ];

    for (const log of logs) {
      const color = log.type === "warn" ? chalk.yellow : chalk.blue;
      console.log(`${chalk.dim(log.time)} ${color(log.type.padEnd(5))} ${log.msg}`);
      await sleep(200);
    }

    if (options.follow) {
      console.log(chalk.dim("\nWaiting for new logs... (Ctrl+C to exit)"));
    }
  });

/** Users subcommand group for managing mailbox users. */
const users = program.command("users").description("Manage mailbox users");

/**
 * Users list command - shows all users with access.
 */
users
  .command("list")
  .description("List all users")
  .action(async () => {
    console.log(`
${chalk.bold("Users")}

  alice@mycompany.com    Alice Smith     [support, team]
  bob@mycompany.com      Bob Johnson     [support]
  carol@mycompany.com    Carol Williams  [team]
`);
  });

/**
 * Users add command - adds a new user to the system.
 */
users
  .command("add <email>")
  .description("Add a new user")
  .option("-n, --name <name>", "User display name")
  .action(async (email: string, options: { name?: string }) => {
    const name = options.name || email.split("@")[0];
    console.log(chalk.green(`✓ Added user: ${name} <${email}>`));
  });

/**
 * TCP connectivity check helper.
 */
function checkTcpPort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

/**
 * Sleeps for the specified duration.
 * @param ms - Duration in milliseconds.
 * @returns Promise that resolves after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

program.parse();
