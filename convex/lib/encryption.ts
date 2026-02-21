/**
 * Server-side encryption for secrets/PII storage.
 * Uses AES-256-GCM with:
 *   - Key derived from ENCRYPTION_KEY + ENCRYPTION_SALT (server-side env vars)
 *   - Random IV per encryption
 *
 * Token format: <ivHex>:<authTagHex>:<ciphertextHex>
 *
 * Required env vars:
 *   ENCRYPTION_KEY  — 64-char hex (32 bytes)
 *   ENCRYPTION_SALT — 32-char hex minimum
 *
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;

function getDerivedKey(): Buffer {
  const master = process.env.ENCRYPTION_KEY;
  const salt = process.env.ENCRYPTION_SALT;
  if (!master || master.length < 32) {
    throw new Error("ENCRYPTION_KEY env var missing or too short");
  }
  if (!salt || salt.length < 16) {
    throw new Error("ENCRYPTION_SALT env var missing or too short");
  }
  return crypto.scryptSync(master, salt, KEY_LEN);
}

export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("hex")).join(":");
}

export function decrypt(token: string): string {
  const key = getDerivedKey();
  const parts = token.split(":");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [ivHex, authTagHex, ctHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return decipher.update(Buffer.from(ctHex, "hex")) + decipher.final("utf8");
}

export function isEncrypted(value: string): boolean {
  return value.split(":").length === 3;
}
