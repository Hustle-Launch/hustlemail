/**
 * Stub DKIM key generation for development.
 * In production, implement real RSA-2048 via Convex Node.js action.
 */

export async function generateDKIMKeys(domain: string) {
  const selector = `hustlemail${Date.now().toString(36)}`;

  // Stub keys - DO NOT USE IN PRODUCTION
  const publicKey = Buffer.from(
    "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDT+qGLXvJAzpkxg1yL9/RPqU+D+5vSLdQNU3rOdVTtqR7/97yKbGWSklSqt6CjR9TCHXJkMZd9D5fSotL2CpECxbVmmZzJ28CtSNg24TbjEctR2ctN7C7Gn1f8kjbu7M7VLILuMqvgsS+QL1FqvsrLIXIfRttu1G1nhjHwchWLfwIDAQAB"
  ).toString("base64");

  const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDT+qGLXvJAzpkxg1yL9/RPqU+D+5vSLdQNU3rOdVTtqR7/97yK
bGWSklSqt6CjR9TCHXJkMZd9D5fSotL2CpECxbVmmZzJ28CtSNg24TbjEctR2ctN
7C7Gn1f8kjbu7M7VLILuMqvgsS+QL1FqvsrLIXIfRttu1G1nhjHwchWLfwIDAQAB
AoGATaqG5N8vJePRgAr8zIZfXRXQxwpx3Yj8Xyp9u2pJ1x5tNj7K3fK1vJ3F9gKQ
a8v5J5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5
K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5
K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5K5j5
K5j5K5j5K5ECQQDlDRgCOqWjC5KFaIQw1WqkYd9L/
-----END RSA PRIVATE KEY-----`;

  return {
    selector,
    publicKey,
    privateKey,
  };
}

export function signMessage(
  privateKey: string,
  domain: string,
  selector: string,
  headers: Record<string, string>,
  body: string
): string {
  // Stub: return a fake DKIM signature
  return `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${domain}; s=${selector}; h=from:to:subject; bh=stub; b=stub`;
}
