import { parseMailConfig } from "@codemail/config";
import { createHash } from "crypto";
import { pathToFileURL } from "url";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const configPath = resolve(process.cwd(), "mail.config.ts");

if (!existsSync(configPath)) {
  console.error("mail.config.ts not found");
  process.exit(1);
}

const fileContent = readFileSync(configPath, "utf8");
const hash = createHash("sha256").update(fileContent).digest("hex");

try {
  const mod = await import(pathToFileURL(configPath).href);
  const rawConfig = mod.default ?? mod.config;
  const parsed = parseMailConfig(rawConfig);

  console.log("mail.config.ts valid");
  console.log(`domain=${parsed.domain}`);
  console.log(`mailboxes=${parsed.mailboxes.length}`);
  console.log(`config_sha256=${hash}`);
} catch (error) {
  console.error("mail.config.ts validation failed");
  console.error(error);
  process.exit(1);
}
