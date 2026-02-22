# CodeMail Architecture

## Overview

CodeMail is a developer-first mail infrastructure platform where email configuration lives in your GitHub repo as TypeScript, deploys like a modern web app, and runs on real-time infrastructure.

```
┌─────────────────────────────────────────┐
│   mail.config.ts in your GitHub repo    │
│   (defines mailboxes, rules, routing)   │
└──────────────┬──────────────────────────┘
               │ deploys to
┌──────────────▼──────────────────────────┐
│      Convex backend (per domain)        │
│  - Mailbox metadata & message storage   │
│  - Live subscriptions for sync          │
│  - Auth/permission rules                │
│  - Spam evaluation results              │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌───▼────┐ ┌───▼────────┐
│ SMTP  │ │  IMAP  │ │  Web Mail  │
│Ingress│ │ Proxy  │ │   (React)  │
└───────┘ └────────┘ └────────────┘
```

## Core Principles

1. **Code is Law** — Infrastructure is version-controlled, auditable, lives in your repo
2. **Composable** — SMTP, IMAP, spam eval, web app are independent services talking to Convex
3. **Domain-Isolated** — Each customer gets their own Convex instance, compute, risk profile
4. **Cost-Linear** — Pay only for what you use with per-domain granularity
5. **Developer-First** — Write TypeScript, push to GitHub, mail happens

## Why Convex?

Convex fundamentally changes email architecture by providing real-time subscriptions as a first-class primitive:

- **Live sync solves email coherence** — No IMAP polling. New message → instantly in every client
- **No dual-write problem** — Single source of truth for metadata and content
- **`mail.config.ts` becomes live functions** — Routing rules are running Convex mutations
- **Built-in auth/permissions** — Mailbox access is a Convex auth rule
- **TypeScript-first** — Config is genuinely your source of truth

## Component Details

### SMTP Ingress (Port 25)

Persistent TCP server (Node.js `smtp-server`) that:
1. Receives inbound mail via SMTP protocol
2. Validates recipient exists in domain config
3. Runs spam evaluation pipeline
4. Stores message in Convex
5. Triggers real-time subscription updates

```typescript
// Simplified flow
onData: async (stream, session) => {
  const parsed = await simpleParser(stream);
  const [mailbox, domain] = session.envelope.rcptTo[0].address.split("@");
  
  // Validate mailbox exists
  const config = await getMailConfig(domain);
  if (!config.mailboxes.includes(mailbox)) throw "550 User not found";
  
  // Spam check
  const spam = await evaluateSpam(parsed);
  if (spam.isSpam) return;
  
  // Store in Convex
  await api.messages.create({ domain, mailbox, ...parsed });
  return "250 OK";
}
```

### IMAP Proxy (Port 993)

Thin protocol translator that:
1. Handles IMAP protocol syntax
2. Maps IMAP commands to Convex queries/mutations
3. Broadcasts Convex subscription updates as IMAP responses

The proxy doesn't manage state — Convex does. It just translates protocols.

### Outbound Sending (Resend)

All outbound mail flows through Resend:
- Free tier: BYO Resend API key
- Paid tiers: Managed Resend with reputation warming
- DKIM signing handled automatically

### Spam Evaluation

Two-stage pipeline:
1. **Fast path** — Blocklist lookup (instant)
2. **AI evaluation** — OpenRouter for ambiguous cases (contextual reasoning)

```typescript
const aiEval = await openrouter.messages.create({
  model: "meta-llama/llama-3.2-3b-instruct:free",
  messages: [{
    role: "user",
    content: `Analyze: spam, scam, malicious, or legit?\n${message}`
  }]
});
```

### Web Mail Client

React app with:
- Real-time sync via Convex subscriptions
- Threading, search, labels
- Compose with rich text
- Attachment handling

### Large File Strategy

Three configurable strategies per domain:
- **store** — Offload to S3, pay-as-you-go bandwidth
- **bounce** — Reject with helpful message (default for Simple tier)
- **byo** — Use customer's own storage keys

## Data Model (Convex Schema)

```typescript
// convex/schema.ts
export default defineSchema({
  domains: defineTable({
    name: v.string(),
    ownerId: v.string(),
    config: v.object({...}),
    dkimPrivateKey: v.string(),
    dkimPublicKey: v.string(),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  mailboxes: defineTable({
    domainId: v.id("domains"),
    name: v.string(),
    type: v.union(v.literal("personal"), v.literal("shared"), v.literal("alias")),
    forwardTo: v.optional(v.array(v.string())),
  }).index("by_domain", ["domainId"]),

  messages: defineTable({
    domainId: v.id("domains"),
    mailboxId: v.id("mailboxes"),
    messageId: v.string(),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    bodyText: v.optional(v.string()),
    bodyHtml: v.optional(v.string()),
    attachments: v.array(v.object({
      filename: v.string(),
      contentType: v.string(),
      size: v.number(),
      storageId: v.optional(v.id("_storage")),
      externalUrl: v.optional(v.string()),
    })),
    labels: v.array(v.string()),
    isRead: v.boolean(),
    isStarred: v.boolean(),
    isArchived: v.boolean(),
    isSpam: v.boolean(),
    spamScore: v.optional(v.number()),
    receivedAt: v.number(),
  })
    .index("by_mailbox", ["mailboxId", "receivedAt"])
    .index("by_domain", ["domainId", "receivedAt"])
    .searchIndex("search_messages", {
      searchField: "subject",
      filterFields: ["mailboxId", "isArchived", "isSpam"],
    }),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    domainId: v.id("domains"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  }).index("by_email", ["email"]),

  spamEvaluations: defineTable({
    messageId: v.id("messages"),
    isSpam: v.boolean(),
    category: v.string(),
    reason: v.string(),
    confidence: v.number(),
    evaluatedAt: v.number(),
  }).index("by_message", ["messageId"]),
});
```

## Security Model

### Domain Isolation
- Each domain = separate Convex project (managed tier) or namespace (simple tier)
- Breach in one domain cannot affect others
- No shared infrastructure between customers

### Authentication
- Dashboard: GitHub OAuth
- Mailbox access: Convex auth rules
- IMAP/SMTP: Standard credentials mapped to Convex users

### Key Management
- DKIM keys generated per domain
- Private keys stored encrypted in Convex
- Auto-rotation supported

## Deployment Targets

Components have **different deployment requirements**:

### Web App (Next.js)
- ✅ Vercel (recommended)
- ✅ Any Node.js host or Docker container

### Convex Backend
- ✅ Convex Cloud (managed, recommended)

### SMTP Ingress (`packages/smtp`)
> ⚠️ **Must run on a persistent server with a static IP — Lambda, Cloudflare Workers, and Vercel Edge Functions will not work.**
>
> SMTP requires a persistent TCP connection on port 25, a static IP address (email reputation is IP-tied), and a configurable PTR (reverse DNS) record. Serverless platforms do not support any of these.

Supported deployment targets:
- ✅ **Fly.io** (recommended) — persistent VMs, dedicated IPs, PTR records configurable
- ✅ **Hetzner / DigitalOcean VPS** — cheapest option, full control over PTR records
- ✅ **EC2** — static Elastic IP + port 25 unblock request + PTR via AWS console
- ✅ **Docker** (self-hosted on any VPS)
- ❌ AWS Lambda — no persistent TCP, dynamic IPs, port 25 blocked by default
- ❌ Cloudflare Workers — HTTP-only, no TCP server support
- ❌ Vercel Edge Functions — HTTP-only, no TCP server support

## Cost Model

| Resource | Cost Driver |
|----------|-------------|
| Convex | Per-operation (free tier covers thousands of emails) |
| SMTP server (Fly.io) | ~$7/month for a persistent micro VM |
| S3/R2 Attachments | Per-GB stored + bandwidth |
| Resend (transactional only) | Per-email sent (see #31 re: outbound architecture) |
| OpenRouter | Per-token (free models available) |

**Estimated cost for 5-person team, 1000 emails/month: ~$10-15/month** (Fly.io VM is the floor)
