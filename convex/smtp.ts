/**
 * SMTP HTTP Actions
 * 
 * HTTP endpoints called by the @codemail/smtp ingress server.
 * These handle mailbox validation, message storage, and attachment uploads.
 */

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Look up domain by name
 * POST /smtp/getDomain
 * Body: { name: string }
 */
export const getDomain = httpAction(async (ctx, request) => {
  const { name } = await request.json() as { name: string };
  
  const domain = await ctx.runQuery(internal.smtp_internal.getDomainByName, { name });
  
  return new Response(JSON.stringify(domain), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Look up mailbox by domain and name
 * POST /smtp/getMailbox
 * Body: { domainId: string, name: string }
 */
export const getMailbox = httpAction(async (ctx, request) => {
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
 * Store an inbound message
 * POST /smtp/storeMessage
 * Body: MessageInput
 */
export const storeMessage = httpAction(async (ctx, request) => {
  const message = await request.json();
  
  const messageId = await ctx.runMutation(internal.smtp_internal.storeMessage, message);
  
  return new Response(JSON.stringify({ messageId }), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Log spam evaluation result
 * POST /smtp/logSpamEvaluation
 * Body: { messageId, isSpam, score, category, reason, model }
 */
export const logSpamEvaluation = httpAction(async (ctx, request) => {
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
 * Get upload URL for attachment storage
 * POST /smtp/getUploadUrl
 * Body: { domainId: string }
 */
export const getUploadUrl = httpAction(async (ctx, request) => {
  const uploadUrl = await ctx.storage.generateUploadUrl();
  
  return new Response(JSON.stringify({ uploadUrl }), {
    headers: { "Content-Type": "application/json" },
  });
});
