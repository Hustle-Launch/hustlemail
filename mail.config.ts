import { defineMailConfig } from "@hustlemail/config";

export default defineMailConfig({
  version: 1,
  domain: "uncap.us",
  boxes: [{ name: "notify", displayName: "Notifications" }],
  inbound: { provider: "resend" },
  outbound: { provider: "resend", fromName: "Hustlemail" },
  credentials: { resendApiKeyEnv: "RESEND_API_KEY" },
  polling: { intervalMs: 10_000 },
});
