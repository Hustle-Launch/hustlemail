/**
 * DKIM key generation utilities.
 * Uses Node.js crypto for real RSA-2048 key pair generation.
 * Must be called from a Convex action (Node.js runtime).
 */

import { generateKeyPairSync, createSign, createHash } from "crypto";

/**
 * Generates a 2048-bit RSA DKIM key pair for a domain.
 * @param domain - The domain name to generate keys for.
 * @returns Object containing selector, publicKey (base64 DER), and privateKey (PEM).
 */
export async function generateDKIMKeys(domain: string) {
  const selector = `hustlemail${Date.now().toString(36)}`;

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "der",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // Convert DER public key to base64 for DNS TXT record
  const publicKeyBase64 = Buffer.from(publicKey).toString("base64");

  return {
    selector,
    publicKey: publicKeyBase64,
    privateKey: privateKey as string,
  };
}

/**
 * Signs a message with DKIM.
 * In production, implement proper DKIM signing. For MVP, returns placeholder.
 * @param privateKey - The domain's DKIM private key.
 * @param domain - The domain name.
 * @param selector - The DKIM selector.
 * @param headers - The email headers to sign.
 * @param body - The email body.
 * @returns A DKIM signature header value.
 */
export function signMessage(
  privateKey: string,
  domain: string,
  selector: string,
  headers: Record<string, string>,
  body: string
): string {

  // Canonicalize body (relaxed): trim trailing whitespace per line, ensure single CRLF at end
  const canonBody = body
    .split("\n")
    .map((line: string) => line.replace(/[ \t]+$/g, ""))
    .join("\r\n")
    .replace(/(\r\n)+$/g, "\r\n");

  // Body hash
  const bodyHash = createHash("sha256").update(canonBody).digest("base64");

  // Header fields to sign
  const signedHeaders = Object.keys(headers).map((h) => h.toLowerCase());
  const headerCanon = signedHeaders
    .map((h) => `${h}:${(headers[h] || headers[h.charAt(0).toUpperCase() + h.slice(1)] || "").trim()}`)
    .join("\r\n");

  // Build DKIM header (without b= value)
  const dkimHeader =
    `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${domain}; s=${selector}; ` +
    `h=${signedHeaders.join(":")}; bh=${bodyHash}; b=`;

  // Sign
  const dataToSign = `${headerCanon}\r\ndkim-signature:${dkimHeader}`;
  const signer = createSign("RSA-SHA256");
  signer.update(dataToSign);
  const signature = signer.sign(privateKey, "base64");

  return `${dkimHeader}${signature}`;
}
