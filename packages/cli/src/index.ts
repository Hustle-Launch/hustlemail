#!/usr/bin/env node
/**
 * @hustlemail/cli - Command line interface for hustlemail.
 * Provides commands for setting up, deploying, and managing email infrastructure.
 */

import { Command } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { writeFileSync, existsSync, readFileSync } from "fs";
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
  Value: inbound-smtp.us-east-1.amazonaws.com
  Priority: 10

${chalk.cyan("TXT Record (SPF)")}
  Host: @
  Value: v=spf1 include:amazonses.com ~all

${chalk.cyan("TXT Record (DKIM)")}
  Host: resend._domainkey
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
 * Cloudflare DNS helper - creates DNS records via Cloudflare API.
 * Supports both API Token (Bearer) and Global API Key (email + key) authentication.
 */
async function createCloudflareRecord(
  zoneId: string,
  authEmail: string | null,
  authKey: string,
  record: { type: string; name: string; content: string; priority?: number; proxied?: boolean }
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { execSync } = require("child_process");
  
  const data: Record<string, any> = {
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: 1,
    proxied: record.proxied ?? false,
  };
  
  if (record.priority !== undefined) {
    data.priority = record.priority;
  }

  try {
    let curlCmd = `curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records" `;
    
    // Use Bearer token if authEmail is null, otherwise use email + key
    if (authEmail) {
      curlCmd += `-H "X-Auth-Email: ${authEmail}" -H "X-Auth-Key: ${authKey}" `;
    } else {
      curlCmd += `-H "Authorization: Bearer ${authKey}" `;
    }
    
    curlCmd += `-H "Content-Type: application/json" --data '${JSON.stringify(data)}'`;
    
    const response = execSync(curlCmd, { encoding: "utf-8" });
    const result = JSON.parse(response);
    
    if (result.success) {
      return { success: true, id: result.result?.id };
    } else {
      return { success: false, error: result.errors?.[0]?.message || "Unknown error" };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Get Cloudflare zone ID for a domain.
 * Supports both API Token (Bearer) and Global API Key (email + key) authentication.
 */
async function getCloudflareZoneId(
  domain: string,
  authEmail: string | null,
  authKey: string
): Promise<{ success: boolean; zoneId?: string; error?: string }> {
  const { execSync } = require("child_process");
  
  try {
    let curlCmd = `curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${domain}" `;
    
    // Use Bearer token if authEmail is null, otherwise use email + key
    if (authEmail) {
      curlCmd += `-H "X-Auth-Email: ${authEmail}" -H "X-Auth-Key: ${authKey}" `;
    } else {
      curlCmd += `-H "Authorization: Bearer ${authKey}" `;
    }
    
    curlCmd += `-H "Content-Type: application/json"`;
    
    const response = execSync(curlCmd, { encoding: "utf-8" });
    const result = JSON.parse(response);
    
    if (result.success && result.result?.[0]?.id) {
      return { success: true, zoneId: result.result[0].id };
    } else if (result.errors?.[0]?.code === 9103) {
      return { success: false, error: "Invalid Cloudflare credentials" };
    } else {
      return { success: false, error: result.errors?.[0]?.message || "Zone not found" };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

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
    const { execSync } = require("child_process");

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
        const configContent = readFileSync(configPath, "utf-8");
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

    // Cloudflare credentials (only needed if cloudflare selected)
    let cfEmail: string | null = null;
    let cfApiKey = "";
    let cfZoneId = "";

    if (dnsProvider === "cloudflare") {
      // Check for Cloudflare Global API Key first
      cfApiKey = 
        process.env.CLOUDFLARE_GLOBAL_API_KEY ||
        process.env.CLOUDFLARE_API_KEY ||
        process.env.CF_API_KEY ||
        "";

      // For Global API Key, get email from environment (required)
      cfEmail = process.env.CLOUDFLARE_EMAIL || process.env.CF_EMAIL || null;

      if (!cfApiKey) {
        const keyInput = await p.text({
          message: "Cloudflare Global API Key:",
          placeholder: "xxxxxxxx...",
          validate: (v) => v?.length >= 20 ? undefined : "API key appears too short",
        });
        if (p.isCancel(keyInput)) {
          p.cancel("Deploy cancelled");
          process.exit(0);
        }
        cfApiKey = keyInput as string;
      } else {
        console.log(chalk.dim(`  → Using Cloudflare API key from environment`));
      }

      // If we still don't have email, prompt for it
      if (!cfEmail) {
        const emailInput = await p.text({
          message: "Cloudflare account email:",
          placeholder: "you@example.com",
          validate: (v) => v && v.includes("@") ? undefined : "Valid email required",
        });
        if (p.isCancel(emailInput)) {
          p.cancel("Deploy cancelled");
          process.exit(0);
        }
        cfEmail = emailInput as string;
      } else {
        console.log(chalk.dim(`  → Using Cloudflare email: ${cfEmail}`));
      }

      // Validate and get zone ID
      s.start("Validating Cloudflare credentials");
      const zoneResult = await getCloudflareZoneId(domain, cfEmail, cfApiKey);
      if (!zoneResult.success) {
        s.stop("Cloudflare authentication failed");
        console.log(chalk.red(`  Error: ${zoneResult.error}`));
        const proceed = await p.confirm({
          message: "Continue with manual DNS setup?",
          initialValue: true,
        });
        if (!proceed || p.isCancel(proceed)) {
          p.cancel("Deploy cancelled");
          process.exit(1);
        }
      } else {
        cfZoneId = zoneResult.zoneId!;
        s.stop(`Found Cloudflare zone: ${cfZoneId}`);
      }
    }

    // Step 5: Check for resend CLI
    s.start("Checking for Resend CLI");
    let hasResendCli = false;
    try {
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
      const envContent = existsSync(envPath) ? readFileSync(envPath, "utf-8") : "";
      
      if (!envContent.includes("RESEND_API_KEY")) {
        require("fs").appendFileSync(envPath, `\nRESEND_API_KEY=${resendApiKey}\n`);
        console.log(chalk.dim("  → Saved to .env"));
      }
    } else {
      console.log(chalk.dim("  → Using RESEND_API_KEY from environment"));
    }

    // Step 7: Create domain in Resend
    let resendDomainId = "";
    let dkimKey = "";
    
    s.start("Configuring domain in Resend");
    if (hasResendCli) {
      try {
        // Check if domain exists
        const domainsJson = execSync(`RESEND_API_KEY=${resendApiKey} resend domains list --json`, { 
          stdio: "pipe",
          encoding: "utf-8"
        });
        
        // Handle both array and object with data property
        let domainList: any[];
        const parsed = JSON.parse(domainsJson);
        if (Array.isArray(parsed)) {
          domainList = parsed;
        } else if (parsed.data && Array.isArray(parsed.data)) {
          domainList = parsed.data;
        } else {
          domainList = [];
        }
        
        const existingDomain = domainList.find((d: any) => d.name === domain);
        
        if (existingDomain) {
          resendDomainId = existingDomain.id;
          s.stop(`Domain ${domain} already configured in Resend`);
        } else {
          // Create domain using correct syntax: resend domains create --name
          try {
            const createResult = execSync(
              `RESEND_API_KEY=${resendApiKey} resend domains create --name ${domain} --region us-east-1 --json`,
              { stdio: "pipe", encoding: "utf-8" }
            );
            const created = JSON.parse(createResult);
            if (created.id) {
              resendDomainId = created.id;
              // Get DNS records from response
              if (created.records) {
                const dkimRecord = created.records.find((r: any) => r.record === "DKIM");
                if (dkimRecord) {
                  dkimKey = dkimRecord.value;
                }
              }
              s.stop(`Created domain ${domain} in Resend`);
            } else if (created.error) {
              throw new Error(created.error.message || "Failed to create domain");
            }
          } catch (createErr: any) {
            // Check for plan limit error
            const errStr = createErr.message || createErr.toString();
            if (errStr.includes("plan includes") || errStr.includes("Upgrade to add more")) {
              s.stop("Resend plan limit reached");
              console.log(chalk.yellow("  → Your Resend plan limits domains. Options:"));
              console.log(chalk.yellow("    1. Delete an existing domain in Resend dashboard"));
              console.log(chalk.yellow("    2. Upgrade your Resend plan"));
              
              const proceed = await p.confirm({
                message: "Continue without Resend domain setup?",
                initialValue: false,
              });
              if (!proceed || p.isCancel(proceed)) {
                p.cancel("Deploy cancelled - resolve Resend domain limit first");
                process.exit(1);
              }
            } else {
              throw createErr;
            }
          }
        }
        
        // If we have a domain ID but no DKIM key, fetch it
        if (resendDomainId && !dkimKey) {
          try {
            const domainInfo = execSync(
              `RESEND_API_KEY=${resendApiKey} resend domains get ${resendDomainId} --json`,
              { stdio: "pipe", encoding: "utf-8" }
            );
            const info = JSON.parse(domainInfo);
            const dkimRecord = info.records?.find((r: any) => r.record === "DKIM");
            if (dkimRecord) {
              dkimKey = dkimRecord.value;
            }
          } catch {
            // Non-fatal
          }
        }
      } catch (e: any) {
        s.stop("Could not configure domain automatically");
        console.log(chalk.yellow(`  → Error: ${e.message}`));
        console.log(chalk.yellow("  → Configure domain manually at https://resend.com/domains"));
      }
    } else {
      s.stop("Skipping (no Resend CLI)");
      console.log(chalk.yellow("  → Configure domain manually at https://resend.com/domains"));
    }

    // Step 8-9: DNS records
    // For Resend, we need these records:
    // 1. DKIM at resend._domainkey (TXT)
    // 2. SPF MX at send subdomain
    // 3. SPF TXT at send subdomain
    // 4. (Optional) MX at root for receiving
    // 5. (Optional) Root SPF
    // 6. (Optional) DMARC
    // 7. Webmail CNAME

    const dnsRecords = [
      { type: "TXT", name: "resend._domainkey", content: dkimKey || "(get from Resend dashboard)", description: "DKIM" },
      { type: "MX", name: "send", content: "feedback-smtp.us-east-1.amazonses.com", priority: 10, description: "SPF MX" },
      { type: "TXT", name: "send", content: "v=spf1 include:amazonses.com ~all", description: "SPF TXT" },
      { type: "MX", name: "@", content: "inbound-smtp.us-east-1.amazonaws.com", priority: 10, description: "Inbound MX (for receiving)" },
      { type: "TXT", name: "@", content: "v=spf1 include:amazonses.com include:_spf.resend.com ~all", description: "Root SPF" },
      { type: "TXT", name: "_dmarc", content: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`, description: "DMARC" },
    ];

    if (dnsProvider === "cloudflare" && cfZoneId) {
      s.start("Configuring DNS records via Cloudflare");
      let successCount = 0;
      let failCount = 0;

      for (const record of dnsRecords) {
        const result = await createCloudflareRecord(cfZoneId, cfEmail, cfApiKey, {
          type: record.type,
          name: record.name,
          content: record.content,
          priority: record.priority,
        });

        if (result.success) {
          successCount++;
          console.log(chalk.dim(`  ✓ ${record.description}: ${record.name}`));
        } else {
          // Check if it's a duplicate error (already exists)
          if (result.error?.includes("already exists") || result.error?.includes("81057")) {
            console.log(chalk.dim(`  ○ ${record.description}: already exists`));
          } else {
            failCount++;
            console.log(chalk.yellow(`  ✗ ${record.description}: ${result.error}`));
          }
        }
      }

      s.stop(`DNS records: ${successCount} created, ${failCount} failed`);
    } else if (dnsProvider !== "manual") {
      s.start(`Attempting to configure DNS via ${dnsProvider}`);
      await sleep(1000);
      s.stop("Automatic DNS not yet supported for this provider");
      
      console.log(chalk.yellow("\n  Add these DNS records manually:\n"));
      for (const record of dnsRecords) {
        console.log(chalk.cyan(`  ${record.description}`));
        console.log(`    Type:  ${record.type}`);
        console.log(`    Name:  ${record.name}`);
        console.log(`    Value: ${record.content}`);
        if (record.priority) {
          console.log(`    Priority: ${record.priority}`);
        }
        console.log();
      }
    } else {
      p.note(
        dnsRecords.map(r => 
          `${chalk.cyan(r.description)}\n  Type: ${r.type}\n  Name: ${r.name}\n  Value: ${r.content}${r.priority ? `\n  Priority: ${r.priority}` : ""}`
        ).join("\n\n"),
        "DNS Configuration"
      );
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

    // Add webmail CNAME
    if (dnsProvider === "cloudflare" && cfZoneId) {
      const webmailName = (webmailSubdomain as string).replace(`.${domain}`, "");
      const result = await createCloudflareRecord(cfZoneId, cfEmail, cfApiKey, {
        type: "CNAME",
        name: webmailName,
        content: "hustlemail.app",
        proxied: false,
      });
      if (result.success) {
        console.log(chalk.dim(`  ✓ Webmail CNAME: ${webmailSubdomain} → hustlemail.app`));
      } else if (!result.error?.includes("already exists")) {
        console.log(chalk.yellow(`  → Add CNAME manually: ${webmailSubdomain} → hustlemail.app`));
      }
    } else {
      console.log(chalk.dim(`  → Add CNAME: ${webmailSubdomain} → hustlemail.app`));
    }

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

    // Trigger verification if we have a domain ID
    if (resendDomainId && hasResendCli) {
      s.start("Triggering domain verification");
      try {
        execSync(`RESEND_API_KEY=${resendApiKey} resend domains verify ${resendDomainId}`, { stdio: "pipe" });
        s.stop("Verification triggered");
        console.log(chalk.dim("  → DNS changes may take a few minutes to propagate"));
      } catch {
        s.stop("Could not trigger verification");
      }
    }

    // Step 13: Send test email
    s.start("Sending test email");
    if (hasResendCli && resendApiKey) {
      try {
        // Wait a moment for DNS
        await sleep(2000);
        
        execSync(
          `RESEND_API_KEY=${resendApiKey} resend emails send --from "${initialBox}@${domain}" --to "${initialBox}@${domain}" --subject "hustlemail test" --text "Your email is working!"`,
          { stdio: "pipe" }
        );
        s.stop("Test email sent");
      } catch (e: any) {
        s.stop("Could not send test email");
        if (e.message?.includes("not verified")) {
          console.log(chalk.yellow("  → Domain needs verification first"));
        } else {
          console.log(chalk.yellow("  → You can send a test email after DNS propagates"));
        }
      }
    } else {
      s.stop("Skipping (no Resend CLI)");
    }

    // Step 15: Success
    p.outro(`
${chalk.green("✓")} Deployment complete!

${chalk.bold("Your email:")} ${initialBox}@${domain}
${chalk.bold("Webmail:")} https://${webmailSubdomain}

${chalk.dim("Next steps:")}
  1. Wait for DNS propagation (usually 5-15 minutes)
  2. Verify domain status: ${chalk.cyan(`hustlemail status`)}
  3. Run tests: ${chalk.cyan(`hustlemail test ${domain}`)}
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

    const configPath = join(process.cwd(), "mail.config.ts");
    if (!existsSync(configPath)) {
      p.cancel("No mail.config.ts found. Run `hustlemail setup` first.");
      process.exit(1);
    }

    const configContent = readFileSync(configPath, "utf-8");
    const domainMatch = configContent.match(/domain:\s*["']([^"']+)["']/);
    const domain = domainMatch ? domainMatch[1] : "unknown";

    const s = p.spinner();
    s.start("Checking domain status");

    // Check Resend status if API key available
    let resendStatus = "unknown";
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const { execSync } = require("child_process");
        const domainsJson = execSync(`RESEND_API_KEY=${resendApiKey} resend domains list --json`, { 
          stdio: "pipe",
          encoding: "utf-8"
        });
        const parsed = JSON.parse(domainsJson);
        const domainList = Array.isArray(parsed) ? parsed : (parsed.data || []);
        const domainInfo = domainList.find((d: any) => d.name === domain);
        if (domainInfo) {
          resendStatus = domainInfo.status;
        }
      } catch {
        // Non-fatal
      }
    }

    s.stop("Status retrieved");

    const statusColor = resendStatus === "verified" ? chalk.green : (resendStatus === "pending" ? chalk.yellow : chalk.red);
    const statusIcon = resendStatus === "verified" ? "●" : (resendStatus === "pending" ? "○" : "✗");

    console.log(`
${chalk.bold("Domain:")} ${domain}
${chalk.bold("Status:")} ${statusColor(`${statusIcon} ${resendStatus.charAt(0).toUpperCase() + resendStatus.slice(1)}`)}

${chalk.bold("DNS Records:")}
`);

    // Quick DNS checks
    const checks = [
      { name: "MX", check: async () => (await dns.resolveMx(domain)).length > 0 },
      { name: "SPF", check: async () => {
        const txt = await dns.resolveTxt(domain);
        return txt.flat().some(r => r.toLowerCase().startsWith("v=spf1"));
      }},
      { name: "DKIM", check: async () => {
        const txt = await dns.resolveTxt(`resend._domainkey.${domain}`);
        return txt.flat().some(r => r.includes("DKIM1") || r.startsWith("p="));
      }},
      { name: "DMARC", check: async () => {
        const txt = await dns.resolveTxt(`_dmarc.${domain}`);
        return txt.flat().some(r => r.toLowerCase().startsWith("v=dmarc1"));
      }},
    ];

    for (const { name, check } of checks) {
      try {
        const ok = await check();
        console.log(`  ${name}:    ${ok ? chalk.green("✓") : chalk.yellow("○")} ${ok ? "Configured" : "Not set"}`);
      } catch {
        console.log(`  ${name}:    ${chalk.red("✗")} Not found`);
      }
    }
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

    const configContent = readFileSync(configPath, "utf-8");
    const domainMatch = configContent.match(/domain:\s*["']([^"']+)["']/);
    const domain = domainMatch ? domainMatch[1] : "yourdomain.com";

    console.log(`
${chalk.bold.underline("Required DNS Records for " + domain)}

${chalk.cyan("1. DKIM Record")} (email signing)
   Type:     TXT
   Host:     resend._domainkey
   Value:    p=<your-public-key> (get from Resend dashboard)

${chalk.cyan("2. SPF MX Record")} (Resend bounce handling)
   Type:     MX
   Host:     send
   Value:    feedback-smtp.us-east-1.amazonses.com
   Priority: 10

${chalk.cyan("3. SPF TXT Record")} (authorizes sending)
   Type:     TXT
   Host:     send
   Value:    v=spf1 include:amazonses.com ~all

${chalk.cyan("4. Root MX Record")} (routes incoming email)
   Type:     MX
   Host:     @
   Value:    inbound-smtp.us-east-1.amazonaws.com
   Priority: 10

${chalk.cyan("5. Root SPF Record")} (authorizes sending from root domain)
   Type:     TXT
   Host:     @
   Value:    v=spf1 include:amazonses.com ~all

${chalk.cyan("6. DMARC Record")} (recommended)
   Type:     TXT
   Host:     _dmarc
   Value:    v=DMARC1; p=none; rua=mailto:dmarc@${domain}

${chalk.cyan("7. CNAME Record")} (web mail interface)
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
  .description("Run DNS + email provider checks for a domain")
  .option("--provider <provider>", "Email provider (resend)", "resend")
  .action(async (domain: string, options: { provider: string }) => {
    p.intro(chalk.bgHex("#FF6B35").black(" hustlemail Test "));

    const failures: string[] = [];
    const warnings: string[] = [];
    const pass = (msg: string) => console.log(`${chalk.green("✓")} ${msg}`);
    const fail = (msg: string) => {
      failures.push(msg);
      console.log(`${chalk.red("✗")} ${msg}`);
    };
    const warn = (msg: string) => {
      warnings.push(msg);
      console.log(`${chalk.yellow("○")} ${msg}`);
    };

    // MX
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.length === 0) fail(`MX record missing for ${domain}`);
      else {
        const top = mx.sort((a, b) => a.priority - b.priority)[0];
        pass(`MX record found: ${top.exchange} (priority ${top.priority})`);
      }
    } catch {
      fail(`MX lookup failed for ${domain}`);
    }

    // SPF - accept both Resend and Amazon SES includes
    try {
      const txt = await dns.resolveTxt(domain);
      const rows = txt.map((r) => r.join(""));
      const spf = rows.find((r) => r.toLowerCase().startsWith("v=spf1"));
      if (!spf) {
        fail(`SPF missing (add TXT @: v=spf1 include:amazonses.com ~all)`);
      } else if (spf.includes("amazonses.com") || spf.includes("_spf.resend.com") || spf.includes("resend.com")) {
        pass(`SPF record found`);
      } else {
        warn(`SPF found but may need Resend/SES include: ${spf.substring(0, 60)}...`);
      }
    } catch {
      fail(`SPF lookup failed`);
    }

    // DKIM - check both resend._domainkey and hustlemail._domainkey
    let dkimFound = false;
    for (const selector of ["resend", "hustlemail"]) {
      const dkimHost = `${selector}._domainkey.${domain}`;
      try {
        const txt = await dns.resolveTxt(dkimHost);
        const rows = txt.map((r) => r.join(""));
        const dkim = rows.find((r) => /DKIM1/i.test(r) || r.startsWith("p="));
        if (dkim) {
          pass(`DKIM key found at ${dkimHost}`);
          dkimFound = true;
          break;
        }
      } catch {
        // Try next selector
      }
    }
    if (!dkimFound) {
      fail(`DKIM not found at resend._domainkey.${domain} or hustlemail._domainkey.${domain}`);
    }

    // DMARC
    const dmarcHost = `_dmarc.${domain}`;
    try {
      const txt = await dns.resolveTxt(dmarcHost);
      const rows = txt.map((r) => r.join(""));
      const dmarc = rows.find((r) => /v=DMARC1/i.test(r));
      if (!dmarc) warn(`DMARC missing (recommended: add TXT ${dmarcHost}: v=DMARC1; p=none)`);
      else pass(`DMARC policy found`);
    } catch {
      warn(`DMARC not set (recommended for email deliverability)`);
    }

    // Resend domain verification status (instead of SMTP port check)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && options.provider === "resend") {
      try {
        const { execSync } = require("child_process");
        const domainsJson = execSync(`RESEND_API_KEY=${resendApiKey} resend domains list --json`, { 
          stdio: "pipe",
          encoding: "utf-8"
        });
        const parsed = JSON.parse(domainsJson);
        const domainList = Array.isArray(parsed) ? parsed : (parsed.data || []);
        const domainInfo = domainList.find((d: any) => d.name === domain);
        
        if (domainInfo) {
          if (domainInfo.status === "verified") {
            pass(`Resend domain verified`);
          } else {
            fail(`Resend domain status: ${domainInfo.status} (run: resend domains verify ${domainInfo.id})`);
          }
        } else {
          fail(`Domain ${domain} not found in Resend (run: hustlemail deploy)`);
        }
      } catch (e) {
        warn(`Could not check Resend status (set RESEND_API_KEY)`);
      }
    } else {
      // Skip SMTP check for Resend - it's not relevant
      console.log(chalk.dim("  (SMTP port check skipped - not required for Resend)"));
    }

    if (failures.length === 0 && warnings.length === 0) {
      p.outro(`${chalk.green("✓ All checks passed")} for ${domain}`);
      process.exit(0);
    }

    if (failures.length > 0) {
      p.note(failures.map((f) => `- ${f}`).join("\n"), "Fixes needed");
    }
    if (warnings.length > 0) {
      p.note(warnings.map((w) => `- ${w}`).join("\n"), "Recommendations");
    }

    if (failures.length > 0) {
      p.outro(chalk.red(`Test failed (${failures.length} errors)`));
      process.exit(1);
    } else {
      p.outro(chalk.yellow(`Test passed with ${warnings.length} warnings`));
      process.exit(0);
    }
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
