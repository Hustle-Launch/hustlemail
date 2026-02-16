/**
 * SMTP HTTP Actions.
 * HTTP endpoints called by the @codemail/smtp ingress server.
 * These handle mailbox validation, message storage, and attachment uploads.
 * 
 * SECURITY: All endpoints require SMTP_SHARED_SECRET in Authorization header.
 */

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Verifies the SMTP shared secret from the Authorization header.
 * @throws Error if secret is missing or invalid.
 */
function verifySmtpSecret(request: Request): void {
  const authHeader = request.headers.get("Authorization");
  const expectedSecret = process.env.SMTP_SHARED_SECRET;

  if (!expectedSecret) {
    throw new Error("Server configuration error: SMTP_SHARED_SECRET not set");
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid Authorization header");
  }

  const providedSecret = authHeader.slice(7); // Remove "Bearer " prefix
  if (providedSecret !== expectedSecret) {
    throw new Error("Unauthorized: Invalid SMTP secret");
  }
}

/**
 * Looks up a domain by name.
 * POST /smtp/getDomain
 * @param request - Request with JSON body containing { name: string }
 * @returns JSON response with domain info or null.
 */
export const getDomain = httpAction(async (ctx, request) => {
  try {
    verifySmtpSecret(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name } = await request.json() as { name: string };
  
  const domain = await ctx.runQuery(internal.smtp_internal.getDomainByName, { name });
  
  return new Response(JSON.stringify(domain), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Looks up a mailbox by domain and name.
 * POST /smtp/getMailbox
 * @param request - Request with JSON body containing { domainId: string, name: string }
 * @returns JSON response with mailbox info or null.
 */
export const getMailbox = httpAction(async (ctx, request) => {
  try {
    verifySmtpSecret(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { domainId, name } = await request.json() as { domainId: string; name: string };
  
  const mailbox = await ctx.runQuery(internal.smtp_internal.getMailboxByName, {
    domainId,
    name,
  });
  
  return new Response(JSON.stringify(mailbox), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Stores an inbound message.
 * POST /smtp/storeMessage
 * @param request - Request with JSON body containing message data.
 * @returns JSON response with { messageId: string }.
 */
export const storeMessage = httpAction(async (ctx, request) => {
  try {
    verifySmtpSecret(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = await request.json();
  
  const messageId = await ctx.runMutation(internal.smtp_internal.storeMessage, message);
  
  return new Response(JSON.stringify({ messageId }), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Logs spam evaluation result for analytics and tuning.
 * POST /smtp/logSpamEvaluation
 * @param request - Request with JSON body containing evaluation data.
 * @returns JSON response with { success: true }.
 */
export const logSpamEvaluation = httpAction(async (ctx, request) => {
  try {
    verifySmtpSecret(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const evaluation = await request.json() as {
    messageId: string;
    isSpam: boolean;
    score: number;
    category: string;
    reason: string;
    model: string;
  };
  
  await ctx.runMutation(internal.smtp_internal.logSpamEvaluation, evaluation);
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Generates an upload URL for attachment storage.
 * POST /smtp/getUploadUrl
 * @param request - Request with JSON body (domainId not currently used).
 * @returns JSON response with { uploadUrl: string }.
 */
export const getUploadUrl = httpAction(async (ctx, request) => {
  try {
    verifySmtpSecret(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uploadUrl = await ctx.storage.generateUploadUrl();
  
  return new Response(JSON.stringify({ uploadUrl }), {
    headers: { "Content-Type": "application/json" },
  });
});
