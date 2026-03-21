/**
 * HTTP Router for Convex.
 * Routes HTTP requests to webhook handlers for Resend.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

/** HTTP router instance for handling external requests. */
const http = httpRouter();

/**
 * Resend webhook handler for incoming email events.
 * Receives email.received events from Resend and stores them in Convex.
 */
const resendWebhook = httpAction(async (ctx, request) => {
  // Verify webhook signature (in production, use Svix)
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  try {
    const body = await request.json();
    const eventType = body.type;

    // Handle email.received event
    if (eventType === "email.received") {
      const data = body.data;
      
      // Parse recipient to find domain and mailbox
      const toAddress = data.to?.[0]?.toLowerCase() || "";
      const [localPart, domainName] = toAddress.split("@");

      if (!domainName) {
        return new Response("Invalid recipient address", { status: 400 });
      }

      // Look up domain and mailbox
      // In a full implementation, we'd query the database here
      // For now, just log the event
      console.log(`Received email for ${toAddress} from ${data.from}`);

      // Store the message via internal mutation
      // Note: This would need the domain and mailbox IDs from the database
      /*
      await ctx.runMutation(internal.pollIncoming.storeIncomingEmail, {
        domainId: domainId,
        mailboxId: mailboxId,
        messageId: data.id,
        from: { address: data.from, name: data.from_name },
        to: [{ address: toAddress }],
        subject: data.subject || "(No subject)",
        bodyText: data.text,
        bodyHtml: data.html,
        snippet: (data.text || "").slice(0, 100),
        date: Date.now(),
      });
      */

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle other event types
    if (eventType === "email.bounced") {
      console.log("Email bounced:", body.data);
    } else if (eventType === "email.complained") {
      console.log("Email complained:", body.data);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook processing failed", { status: 500 });
  }
});

/** Route for Resend webhooks (incoming email events). */
http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: resendWebhook,
});

export default http;
