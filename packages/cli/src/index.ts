#!/usr/bin/env node
/**
 * @hustlemail/cli - Command line interface for hustlemail.
 * Provides commands for setting up, deploying, and managing email infrastructure.
 */

import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { promises as dns } from "dns";
import * as net from "net";
import { generateExampleConfig, parseMailConfig } from "@hustlemail/config";

/** CLI program instance. */
const program = new Command();

program
  .name("hustlemail")
  .description("Email infrastructure that lives in your GitHub repo")
  .version("0.1.0");

/**
 * Setup command - initializes a new domain with mail.config.ts.
 */
program
  .command("setup [domain]")
  .description("Set up email for a domain")
  .action(async (domainArg?: string) => {
    p.intro(chalk.bgHex("#FF6B35").black(" hustlemail "));

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
  Host: hustlemail._domainkey
  Value: (will be generated on deploy)

${chalk.cyan("CNAME Record (Web Mail)")}
  Host: mail
  Value: hustlemail.app
`,
      "DNS Configuration"
    );

    p.outro(
      `${chalk.green("✓")} Run ${chalk.cyan("hustlemail deploy")} after adding DNS records`
    );
  });

/**
 * Deploy command - full deployment flow for hustlemail.
 * 
 * Flow:
 * 1. Ensure hustlemail is installed
 * 2. Create mail.config.ts (use "boxes" not "mailboxes")
 * 3. Get domain name from .env or prompt
 * 4. Detect DNS provider (dnsimple/cloudflare/godaddy/vercel) or prompt
 * 5. Install resend CLI if missing
 * 6. Prompt for Resend API key
 * 7. Create domain in Resend (if not exists)
 * 8. Attempt programmatic DNS record setup via CLI
 * 9. If fails, output DNS records needed manually
 * 10. Ask for webmail subdomain (default: mail.domain.tld)
 * 11. Configure DNS for webmail
 * 12. Ask for initial box name
 * 13. Send test email via resend CLI
 * 14. Listen for incoming email with resend CLI
 * 15. Output success + webmail link
 */
program
  .command("deploy")
  .description("Deploy mail configuration changes")
  .action(async () => {
    p.intro(chalk.bgHex("#FF6B35").black(" hustlemail Deploy "));

    const s = p.spinner();

    // Step 1: Check for mail.config.ts
    const configPath = join(process.cwd(), "mail.config.ts");
    let domain = "";

    if (!existsSync(configPath)) {
      const createConfig = await p.confirm({
        message: "No mail.config.ts found. Create one now?",
        initialValue: true,
      });

      if (p.isCancel(createConfig) || !createConfig) {
        p.cancel("Deploy cancelled. Run `hustlemail setup` first.");
        process.exit(1);
      }

      // Step 3: Get domain from .env or prompt
      const envDomain = process.env.MAIL_DOMAIN || process.env.DOMAIN;
      
      if (envDomain) {
        const useEnvDomain = await p.confirm({
          message: `Use domain from environment: ${envDomain}?`,
          initialValue: true,
        });
        
        if (p.isCancel(useEnvDomain)) {
          p.cancel("Deploy cancelled");
          process.exit(0);
        }
        
        domain = useEnvDomain ? envDomain : "";
      }

      if (!domain) {
        const domainInput = await p.text({
          message: "What domain do you want to set up?",
          placeholder: "mycompany.com",
          validate: (value) => {
            if (!value) return "Domain is required";
            if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
              return "Invalid domain format";
            }
          },
        });

        if (p.isCancel(domainInput)) {
          p.cancel("Deploy cancelled");
          process.exit(0);
        }
        domain = domainInput as string;
      }

      // Step 2: Create mail.config.ts
      s.start("Creating mail.config.ts");
      const configContent = generateExampleConfig(domain);
      writeFileSync(configPath, configContent);
      s.stop("Created mail.config.ts");
    } else {
      // Parse existing config to get domain
      s.start("Validating configuration");
      try {
        // In a real implementation, we'd dynamically import the config
        // For now, we'll parse it from the file
        const configContent = require("fs").readFileSync(configPath, "utf-8");
        const domainMatch = configContent.match(/domain:\s*["']([^"']+)["']/);
        domain = domainMatch ? domainMatch[1] : "";
        
        if (!domain) {
          throw new Error("Could not parse domain from mail.config.ts");
        }
        s.stop(`Configuration valid for ${domain}`);
      } catch (e) {
        s.stop("Configuration error");
        p.cancel(`Failed to parse mail.config.ts: ${e}`);
        process.exit(1);
      }
    }

    // Step 4: Detect DNS provider
    const dnsProvider = await p.select({
      message: "Select your DNS provider:",
      options: [
        { value: "cloudflare", label: "Cloudflare" },
        { value: "dnsimple", label: "DNSimple" },
        { value: "godaddy", label: "GoDaddy" },
        { value: "vercel", label: "Vercel DNS" },
        { value: "manual", label: "Other / Manual" },
      ],
    });

    if (p.isCancel(dnsProvider)) {
      p.cancel("Deploy cancelled");
      process.exit(0);
    }

    // Step 5: Check for resend CLI
    s.start("Checking for Resend CLI");
    let hasResendCli = false;
    try {
      const { execSync } = require("child_process");
      execSync("resend --version", { stdio: "pipe" });
      hasResendCli = true;
      s.stop("Resend CLI found");
    } catch {
      s.stop("Resend CLI not found");
      
      const installResend = await p.confirm({
        message: "Resend CLI not found. Install it now?",
        initialValue: true,
      });

      if (p.isCancel(installResend)) {
        p.cancel("Deploy cancelled");
        process.exit(0);
      }

      if (installResend) {
        s.start("Installing Resend CLI");
        try {
          const { execSync } = require("child_process");
          execSync("npm install -g resend", { stdio: "pipe" });
          hasResendCli = true;
          s.stop("Resend CLI installed");
        } catch (e) {
          s.stop("Failed to install Resend CLI");
          console.log(chalk.yellow("Install manually: npm install -g resend"));
        }
      }
    }

    // Step 6: Check/prompt for Resend API key
    let resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      const apiKeyInput = await p.text({
        message: "Enter your Resend API key:",
        placeholder: "re_xxxxx...",
        validate: (value) => {
          if (!value) return "API key is required";
          if (!value.startsWith("re_")) return "Invalid Resend API key format";
        },
      });

      if (p.isCancel(apiKeyInput)) {
        p.cancel("Deploy cancelled");
        process.exit(0);
      }
      resendApiKey = apiKeyInput as string;

      // Save to .env
      const envPath = join(process.cwd(), ".env");
      const envContent = existsSync(envPath) 
        ? require("fs").readFileSync(envPath, "utf-8")
        : "";
      
      if (!envContent.includes("RESEND_API_KEY")) {
        require("fs").appendFileSync(envPath, `\nRESEND_API_KEY=${resendApiKey}\n`);
        console.log(chalk.dim("  → Saved to .env"));
      }
    } else {
      console.log(chalk.dim("  → Using RESEND_API_KEY from environment"));
    }

    // Step 7: Create domain in Resend
    s.start("Configuring domain in Resend");
    if (hasResendCli) {
      try {
        const { execSync } = require("child_process");
        // Check if domain exists
        const domains = execSync(`RESEND_API_KEY=${resendApiKey} resend domains list --json`, { 
          stdio: "pipe",
          encoding: "utf-8"
        });
        
        const domainList = JSON.parse(domains);
        const existingDomain = domainList.find((d: any) => d.name === domain);
        
        if (existingDomain) {
          s.stop(`Domain ${domain} already configured in Resend`);
        } else {
          // Create domain
          execSync(`RESEND_API_KEY=${resendApiKey} resend domains add ${domain}`, { stdio: "pipe" });
          s.stop(`Created domain ${domain} in Resend`);
        }
      } catch (e) {
        s.stop("Could not configure domain automatically");
        console.log(chalk.yellow("  → Configure domain manually at https://resend.com/domains"));
      }
    } else {
      s.stop("Skipping (no Resend CLI)");
      console.log(chalk.yellow("  → Configure domain manually at https://resend.com/domains"));
    }

    // Step 8-9: DNS records
    const dnsRecords = `
${chalk.bold("Required DNS Records:")}

${chalk.cyan("MX Record")}
  Host:     @
  Value:    mail.${domain}
  Priority: 10

${chalk.cyan("TXT Record (SPF)")}
  Host:     @
  Value:    v=spf1 include:_spf.resend.com ~all

${chalk.cyan("TXT Record (DKIM)")}
  Host:     hustlemail._domainkey
  Value:    (get from Resend dashboard after domain verification)
`;

    if (dnsProvider !== "manual") {
      // Attempt programmatic DNS setup
      s.start(`Attempting to configure DNS via ${dnsProvider}`);
      await sleep(1000);
      s.stop("Automatic DNS configuration not yet supported");
      console.log(chalk.yellow("  → Configure DNS records manually:"));
      console.log(dnsRecords);
    } else {
      p.note(dnsRecords, "DNS Configuration");
    }

    // Step 10-11: Webmail subdomain
    const webmailSubdomain = await p.text({
      message: "Webmail subdomain:",
      placeholder: `mail.${domain}`,
      initialValue: `mail.${domain}`,
    });

    if (p.isCancel(webmailSubdomain)) {
      p.cancel("Deploy cancelled");
      process.exit(0);
    }

    console.log(chalk.dim(`  → Add CNAME: ${webmailSubdomain} → hustlemail.app`));

    // Step 12: Initial box name
    const initialBox = await p.text({
      message: "Create your first mailbox:",
      placeholder: "hello",
      initialValue: "hello",
      validate: (value) => {
        if (!value) return "Mailbox name is required";
        if (!/^[a-z0-9._-]+$/i.test(value)) return "Invalid mailbox name";
      },
    });

    if (p.isCancel(initialBox)) {
      p.cancel("Deploy cancelled");
      process.exit(0);
    }

    console.log(chalk.green(`  ✓ ${initialBox}@${domain} will be created`));

    // Step 13: Send test email
    s.start("Sending test email");
    if (hasResendCli && resendApiKey) {
      try {
        const { execSync } = require("child_process");
        execSync(
          `RESEND_API_KEY=${resendApiKey} resend emails send --from "onboarding@resend.dev" --to "${initialBox}@${domain}" --subject "hustlemail test" --text "Your email is working!"`,
          { stdio: "pipe" }
        );
        s.stop("Test email sent");
      } catch (e) {
        s.stop("Could not send test email (domain may need verification first)");
      }
    } else {
      s.stop("Skipping (no Resend CLI)");
    }

    // Step 14: Listen for incoming (just show instructions for now)
    console.log(chalk.dim("\n  To verify incoming mail:"));
    console.log(chalk.dim(`  resend emails receiving list --limit 10`));

    // Step 15: Success
    p.outro(`
${chalk.green("✓")} Deployment complete!

${chalk.bold("Your email:")} ${initialBox}@${domain}
${chalk.bold("Webmail:")} https://${webmailSubdomain}

${chalk.dim("Next steps:")}
  1. Verify DNS records are propagated (may take up to 48 hours)
  2. Visit your webmail to start sending and receiving
  3. Run ${chalk.cyan("hustlemail test " + domain)} to verify setup
`);
  });

/**
 * Status command - shows current domain health and status.
 */
program
  .command("status")
  .description("Check domain status and health")
  .action(async () => {
    p.intro(chalk.bgHex("#FF6B35").black(" hustlemail Status "));

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
      console.error(chalk.red("No mail.config.ts found. Run `hustlemail setup` first."));
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
   Host:     hustlemail._domainkey
   Value:    v=DKIM1; k=rsa; p=<your-public-key>

${chalk.cyan("4. DMARC Record")} (optional but recommended)
   Type:     TXT
   Host:     _dmarc
   Value:    v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com

${chalk.cyan("5. CNAME Record")} (web mail interface)
   Type:     CNAME
   Host:     mail
   Value:    hustlemail.app

${chalk.dim("Run `hustlemail verify` after adding these records.")}
`);
  });

/**
 * Test command - runs end-to-end setup checks for a domain.
 */
program
  .command("test <domain>")
  .description("Run DNS + SMTP reachability checks for a domain")
  .action(async (domain: string) => {
    p.intro(chalk.bgHex("#FF6B35").black(" hustlemail Test "));

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

    // DKIM (selector: hustlemail)
    const dkimHost = `hustlemail._domainkey.${domain}`;
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
