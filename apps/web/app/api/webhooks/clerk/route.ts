import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Get headers
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  // Get body
  const payload = await request.text();

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } = event.data;
      const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id);

      console.log(`User ${event.type}:`, {
        clerkId: id,
        email: primaryEmail?.email_address,
        name: `${first_name || ""} ${last_name || ""}`.trim(),
      });

      // TODO: Sync to Convex when deployed
      // await convex.mutation(api.mutations.syncUser, {
      //   clerkId: id,
      //   email: primaryEmail?.email_address || "",
      //   name: `${first_name || ""} ${last_name || ""}`.trim() || "User",
      //   avatarUrl: image_url,
      // });

      break;
    }

    case "user.deleted": {
      const { id } = event.data;
      console.log(`User deleted: ${id}`);
      // TODO: Handle user deletion
      break;
    }

    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
