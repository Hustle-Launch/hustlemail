/**
 * DKIM key generation and signing actions.
 * Runs on Node.js (Convex action runtime) for real crypto.
 *
 * Private keys are encrypted with AES-256-GCM before storage.
 * Requires ENCRYPTION_KEY env var.
 */

"use node";

import * as crypto from "crypto";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { encrypt, decrypt } from "./lib/encryption";

/**
 * Generate real RSA-2048 DKIM keys for a domain and store them.
 * Encrypts the private key before writing to Convex.
 */
export const generateAndStoreDKIMKeys = action({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args): Promise<{ selector: string; publicKey: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Generate real RSA-2048 keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Strip PEM headers for DNS TXT record
    const rawPublicKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\n/g, "");

    const selector = `cm${Date.now().toString(36)}`;

    // Encrypt private key before storage
    const encryptedPrivateKey = encrypt(privateKey);

    await ctx.runMutation(internal.dkimActions.storeDKIMKeys, {
      domainId: args.domainId,
      selector,
      publicKey: rawPublicKey,
      encryptedPrivateKey,
    });

    return { selector, publicKey: rawPublicKey };
  },
});

/**
 * Internal: store DKIM keys in the domain record.
 * Only callable from the generateAndStoreDKIMKeys action.
 */
export const storeDKIMKeys = internalAction({
  args: {
    domainId: v.id("domains"),
    selector: v.string(),
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.mutations.updateDomainDKIM, {
      domainId: args.domainId,
      selector: args.selector,
      publicKey: args.publicKey,
      encryptedPrivateKey: args.encryptedPrivateKey,
    });
  },
});

/**
 * Sign an email with DKIM using the domain's private key.
 * Decrypts the private key for use, never stores decrypted form.
 */
export const signWithDKIM = internalAction({
  args: {
    domainId: v.id("domains"),
    headers: v.record(v.string(), v.string()),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const domain: {
      dkimPrivateKey: string;
      dkimSelector: string;
      name: string;
    } | null = await ctx.runQuery(api.domains.getById, { id: args.domainId });

    if (!domain) throw new Error("Domain not found");
    if (!domain.dkimPrivateKey || domain.dkimPrivateKey === "pending") {
      throw new Error("DKIM keys not yet generated for this domain");
    }

    // Decrypt private key (never logged, never returned)
    const privateKeyPem = decrypt(domain.dkimPrivateKey);

    // Build the DKIM signature
    const canonicalized = Object.entries(args.headers)
      .map(([k, v]) => `${k.toLowerCase()}:${v}`)
      .join("\r\n");

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(canonicalized + "\r\n\r\n" + args.body);
    const signature = sign.sign(privateKeyPem, "base64");

    const headerList = Object.keys(args.headers)
      .map((k) => k.toLowerCase())
      .join(":");

    return (
      `v=1; a=rsa-sha256; c=relaxed/relaxed;` +
      ` d=${domain.name}; s=${domain.dkimSelector};` +
      ` h=${headerList};` +
      ` bh=${crypto.createHash("sha256").update(args.body).digest("base64")};` +
      ` b=${signature}`
    );
  },
});
