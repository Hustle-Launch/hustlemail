/**
 * Stub encryption for development.
 * In production, replace with real AES-256-GCM via Convex action.
 */

export function encrypt(plaintext: string): string {
  // Stub: just base64 encode for now
  return Buffer.from(plaintext).toString("base64");
}

export function decrypt(ciphertext: string): string {
  // Stub: just base64 decode for now
  return Buffer.from(ciphertext, "base64").toString("utf-8");
}
