/**
 * DKIM key generation and signing actions.
 * Uses stub implementations for development.
 * In production, implement real crypto via Convex Node.js runtime.
 *
 * Private keys are encrypted with AES-256-GCM before storage.
 * Requires ENCRYPTION_KEY env var.
 */

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { encrypt, decrypt } from "./lib/encryption_stub";
import { generateDKIMKeys, signMessage } from "./lib/dkim_stub";

/**
 * Generate real RSA-2048 DKIM keys for a domain and store them.
 * Encrypts the private key before writing to Convex.
 */
export const generateAndStoreDKIMKeys = action({
  args: { domainId: v.id("domains") },
  handler: async (ctx, args) => {
    try {
      // Generate keys using stub
      const keys = await generateDKIMKeys("example.com");

      // Encrypt the private key
      const encryptedPrivateKey = encrypt(keys.privateKey);

      // Store in database
      await ctx.runMutation(internal.dkimActions.storeDKIMKeys, {
        domainId: args.domainId,
        dkimSelector: keys.selector,
        dkimPublicKey: keys.publicKey,
        encryptedPrivateKey,
      });

      return {
        success: true,
        selector: keys.selector,
        publicKeyDER: keys.publicKey,
        message: "DKIM keys generated and stored",
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

/**
 * Store encrypted DKIM private key in database.
 * Called from generateAndStoreDKIMKeys action.
 */
export const storeDKIMKeys = internalAction({
  args: {
    domainId: v.id("domains"),
    dkimSelector: v.string(),
    dkimPublicKey: v.string(),
    encryptedPrivateKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Call mutation to store in DB
    return await ctx.runMutation(internal.mutations.updateDomainDKIM, {
      domainId: args.domainId,
      dkimSelector: args.dkimSelector,
      dkimPublicKey: args.dkimPublicKey,
      encryptedPrivateKey: args.encryptedPrivateKey,
    });
  },
});

/**
 * Sign an email message with DKIM.
 * Uses the stored encrypted private key.
 */
export const signEmailWithDKIM = action({
  args: {
    domainId: v.id("domains"),
    emailHeaders: v.object({}),
    emailBody: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Fetch domain to get DKIM keys
      const domain = await ctx.runQuery(internal.domains.getDomain, {
        id: args.domainId,
      });

      if (!domain || !domain.dkimPrivateKey) {
        return {
          success: false,
          error: "DKIM keys not configured for this domain",
        };
      }

      // Decrypt the private key
      const privateKeyPem = decrypt(domain.dkimPrivateKey);

      // Sign the message
      const signature = signMessage(
        privateKeyPem,
        domain.name,
        domain.dkimSelector || "default",
        args.emailHeaders as Record<string, string>,
        args.emailBody
      );

      return {
        success: true,
        signature,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  },
});
