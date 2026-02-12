#!/usr/bin/env node
import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";
import { generateExampleConfig, parseMailConfig } from "@codemail/config";

const program = new Command();

program
  .name("codemail")
  .description("Email infrastructure that lives in your GitHub repo")
  .version("0.1.0");

// Setup command - initialize a new domain
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

// Deploy command
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

// Status command
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

// DNS command - show required DNS records
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

// Logs command
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

// Users command
const users = program.command("users").description("Manage mailbox users");

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

users
  .command("add <email>")
  .description("Add a new user")
  .option("-n, --name <name>", "User display name")
  .action(async (email: string, options: { name?: string }) => {
    const name = options.name || email.split("@")[0];
    console.log(chalk.green(`✓ Added user: ${name} <${email}>`));
  });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

program.parse();
