# CodeMail — Code-Configured Mail Infrastructure Platform

## Business Plan, Business Model & Technical Specification

---

## The "By Monday" Prototype — Quick Reference

> *This section captures the core revelation from the original architecture conversation: the entire MVP is shippable in a weekend. Everything below this section — the business plan, pricing model, and full tech spec — exists because this prototype is real and buildable.*

### The Thesis

You're not building an email provider. You're building **infrastructure for founders**.

The pitch isn't "replace Gmail." It's:

> You have an idea. You want it to feel real from day 1. Real companies have company email. You shouldn't have to pay $600/year for 5 mailboxes while you're still figuring out if the product works.

Any dev could have an idea for a web or React Native app and just want domain email to work from day 1 for the MVP without paying Google or Microsoft hundreds per month for a couple of mailboxes while getting said idea ready for YC round 1.

### The Core Revelation

Traditional mail servers like Postfix/Dovecot exist because they had to. In 1998, you couldn't outsource spam filtering, storage, or key management. You ran everything locally.

In 2025, you can delegate *everything* except "speak the SMTP and IMAP protocols."

A protocol converter isn't a mail server. It's thin plumbing.

You don't need Stalwart or Maddy. Even the tiniest OS ships with mail handling built in — a Raspberry Pi says "you have new mail" when you SSH into it, and that thing runs a coffee maker over WiFi.

You need three things:

1. **SMTP receiver** — listen on port 25, accept mail, write to Convex
2. **IMAP server** — listen on port 993, read from Convex, speak IMAP protocol
3. **A way to generate DKIM keys and sign outbound mail**

That's it. A Lambda runs this. A $5/month VPS runs this.

### The Whole Tech Stack

```bash
npm install smtp-server imap-simple mailparser dkim-signer
```

And a Convex backend. Done.

### The ~100-Line MVP

```typescript
// Lambda function: SMTP ingress
import { Smtp } from "smtp-server";

export const handler = async (event) => {
  const server = new Smtp({
    secure: false,
    onData: async (stream, session) => {
      const parsed = await simpleParser(stream);
      const [mailbox, domain] = session.envelope.rcptTo[0].address.split("@");

      // Check: does this mailbox exist in config?
      const config = await getMailConfig(domain);
      if (!config.mailboxes.includes(mailbox)) {
        throw new Error("550 User not found");
      }

      // Check spam
      const spamEval = await checkSpam(parsed);
      if (spamEval.isSpam) return;

      // Store in Convex
      await api.messages.create({
        domain,
        mailbox,
        from: parsed.from.text,
        subject: parsed.subject,
        body: parsed.text,
        attachments: parsed.attachments.map(a => ({
          name: a.filename,
          url: uploadToS3(a),
        })),
      });

      return "250 Message queued";
    },
  });

  server.listen(25);
};

// Lambda function: IMAP server
import { ImapSimple } from "imap-simple";

export const imapHandler = async (event) => {
  const imap = new ImapSimple({
    secure: true,
    port: 993,
    onAuth: async (user, pass) => {
      const user = await getUserByName(user);
      if (!user) throw new Error("Invalid user");
      return user;
    },
    onFetch: async (user, mailbox) => {
      const messages = await api.messages.list({
        user: user.name,
        mailbox,
      });
      return messages;
    },
  });

  imap.listen(993);
};
```

Most of it is just glue between protocols and Convex.

### Weekend Sprint Breakdown

| Task | Time |
|------|------|
| Convex schema (messages, users, configs) | 1 hour |
| SMTP protocol handler | 2 hours |
| IMAP protocol handler | 2 hours |
| Web mail app (basic) | 3 hours |
| Deployment pipeline | 2 hours |
| **Total** | **~10 hours** |

**By Monday you could be accepting mail for real domains.**

### The Simplified Config That Makes It Work

```typescript
export const mail = {
  domain: "t3.chat",
  boxes: ["support", "theo", "mark", "phase", "sjobs", "sama", "dario", "em", "noreply", "catch-all", "sales", "susan", "sarah", "laura"],
  routes: {
    support: ["susan", "sarah", "laura"],
    catch_all: ["sjobs", "dario", "sama", "em", "theo"],
    noreply: ["bounce"],
    sales: ["steve", "elizabeth"],
  },
  auth: {
    provider: "convex", // or "clerk", "convex", "auth0"
  },
}

// mark@t3.chat

// mail.t3.chat -> t3.chat mail web client
```

No passwords in config. No plaintext secrets. Auth is orthogonal — Convex auth handles identity, `mail.config.ts` just maps mailbox names to users. Ship day 1 with hardcoded mock users, swap in real SSO when you close your seed round.

```typescript
// convex/auth.ts (day 1 — ship it)
export const mockUsers = [
  { id: "1", name: "sjobs" },
  { id: "2", name: "dario" },
  { id: "3", name: "susan" },
];
// Later, swap in WorkOS/Clerk/Okta. mail.config.ts doesn't change.
```

### Day 1 Founder Workflow

```bash
npx create-next-app t3-chat-web
cd myapp
npx codemail create t3.chat
# mail.config.ts appears, DNS sent to dnsimple config || shown.
git push
# theo@t3.chat works. Web mail at mail.t3.chat.
# Cost: $0 (Convex free tier)
```

### The Distribution Angle

Give Theo (@t3dotgg) a whiff of this and he'll never shut up about it — just like DNSimple and Convex. "Config belongs in code, not dashboards" is his identity. The positioning practically writes itself:

> *"Email shouldn't be a business problem. It should be a configuration problem."*

> *"Add email to your app like you add a database. Code first, config second, done."*

> *"From MVP to IPO, your mail.config.ts grows with you."*

### The 10% That's Missing

Right now the plan is at 90%. The missing 10% is **actually talking to the market and learning you're wrong about something fundamental.** The checklist:

- ✓ Coherent architecture
- ✓ Clear MVP
- ✓ Positioning angle
- ✓ Distribution channel (Theo's audience)
- ✗ Evidence anyone actually wants this

The validation question isn't "do founders want this?" — it's "does this actually work for the use cases that exist?" Can you get 10 founders to try this for a real product and have it not catastrophically break? Everything else is engineering and sales.

### Cost of Running the Prototype

| Resource | Monthly Cost |
|----------|-------------|
| Convex | Free tier (covers thousands of emails) |
| Lambda/Fargate | Pay per invocation (pennies) |
| S3 (attachments) | Pay per GB |
| OpenRouter (spam AI) | Free tier |
| **Total for 5-person team, 1000 emails/month** | **$0–5/month** |

---

## Executive Summary

CodeMail is a developer-first mail infrastructure platform where email configuration lives in your GitHub repo as TypeScript, deploys like a modern web app, and runs on real-time infrastructure. It combines the developer experience of Vercel and DNSimple with the generous pricing philosophy of PostHog—targeting the underserved market of developers who want to own their email infrastructure the way they own their DNS.

**The core insight:** Email should be real-time collaborative infrastructure, but nobody has built it that way because they were constrained by traditional mail server backends. By using Convex as the real-time database layer, we eliminate the push/pull delay inherent in IMAP, make email instantly collaborative, and turn mail configuration into version-controlled, auditable TypeScript code.

**The pitch:** *"Your email infrastructure lives in your GitHub repo, deploys like your app, costs pennies, and scales to millions of users."*

---

## Part 1: Business Plan

### 1.1 Problem Statement

The current email infrastructure landscape forces developers into one of three bad choices:

1. **Consumer-focused providers** (Gmail, Fastmail, Hey) — No code-level control, no infrastructure ownership, vendor lock-in.
2. **Transactional email APIs** (Mailgun, SendGrid) — Bulk sending focus, shared infrastructure, noisy neighbor problems, not designed for full mailbox hosting.
3. **Self-hosted open source** (Mail-in-a-Box, Stalwart, mailcow, Postfix + Dovecot) — Powerful but operationally complex, requires DevOps expertise, no code-first configuration story.

Nobody trusts developers enough to let them own their email config alongside their code. Everyone assumes email is too risky to expose to developers. We're betting they're wrong.

### 1.2 Target Market

**Primary persona:** The DNSimple customer. Developers and engineering teams who are not scared of automation, read documentation, understand infrastructure, and want to own their tools. They currently manage their own DNS and deploy their own apps via Vercel/Railway/Fly.io — but email is the one piece they can't configure in code.

**Secondary persona:** Small-to-mid SaaS companies that need business email without paying $6+/user/month for Google Workspace, and want programmatic control over mailbox provisioning, routing rules, and integrations.

**Market size indicators:**
- DNSimple has ~50,000+ active customers
- Vercel has 1M+ developers
- The broader "developer infrastructure" market was valued at $32B+ in 2024
- Fastmail, Migadu, and Forward Email prove there's willingness to pay for non-Google email

### 1.3 Competitive Landscape

| Provider | Approach | Weakness |
|----------|----------|----------|
| Mailgun / SendGrid | Transactional API, shared infra | Not for mailbox hosting; noisy neighbor problem |
| Fastmail / Hey | Consumer SaaS | No code-level control; no self-host option |
| Mail-in-a-Box | Self-hosted, single server | Manual setup, complex ops, single point of failure |
| Stalwart | Self-hosted Rust server | Powerful but intimidating; needs DevOps |
| mailcow | Docker-based self-hosted | Complex compose setup; no code-first story |
| Google Workspace | Managed, enterprise | Expensive per-user; zero infrastructure ownership |

**Our differentiation:** Code is law. Your mail infrastructure is version-controlled, auditable, composable, domain-isolated, and cost-linear. No other provider offers this.

### 1.4 Go-To-Market Strategy

**Phase 1 — Validation (Months 1–2)**
- Talk to 20+ DNSimple-type customers. Validate willingness to pay, config syntax preferences, and managed-vs-self-hosted preference.
- Build a landing page and waitlist. Gauge demand.

**Phase 2 — MVP Launch (Months 3–6)**
- Ship core: `mail.config.ts` → Convex backend → SMTP ingress → IMAP proxy → basic web mail.
- Target early adopters from the developer tools community.
- Open source the web mail client and IMAP/SMTP bridges.

**Phase 3 — Growth (Months 6–12)**
- DNSimple integration partnership (DNS snippet generation, co-marketing).
- Content marketing: "How we replaced Google Workspace with 50 lines of TypeScript."
- Developer community: Discord, GitHub Discussions, conference talks.

**Phase 4 — Expansion (Year 2+)**
- CalDAV/CardDAV for calendar and contacts.
- Enterprise features: SSO, audit logs, compliance controls.
- Marketplace for mail.config.ts plugins (spam rules, integrations, webhooks).

### 1.5 Validation Questions

Before committing to build:

1. Do DNSimple customers actually want this?
2. Would they pay per-mailbox or per-GB?
3. Does `mail.config.ts` syntax feel natural or over-engineered?
4. Would they self-host if we open-sourced the backend, or is managed the only thing they'd use?

---

## Part 2: Business Model

### 2.1 Revenue Model

Hybrid open-source/managed SaaS with per-domain billing. Every tier gets unlimited mailboxes, routes, and rules — we never gate features that live in your `mail.config.ts`. The billing unit is the domain, not the seat. This is a fundamental philosophical break from Google Workspace and every other provider that charges per-user. Your team grows? Your email bill doesn't.

### 2.2 Pricing Tiers

#### Free Forever — BYO Keys

| | |
|---|---|
| **Price** | $0/mo — forever |
| **Mailboxes** | Unlimited |
| **Domains** | Unlimited |
| **Routes & Rules** | Unlimited |
| **How it works** | Bring your own API keys for Resend (outbound sending), OpenRouter (spam AI), Convex (backend), and Uploadthing (large file storage). You pay those providers directly at their rates — we charge nothing. |
| **Large file handling** | Managed via your own Uploadthing/S3 keys |
| **Support** | Community (GitHub Discussions, Discord) |

This is the PostHog playbook taken further. The platform itself is free. You own every dependency. There is no catch, no trial period, no "free for 14 days." We make $0 on this tier, but it builds the community, proves the architecture, and creates the funnel. Developers who start here and scale up — or whose companies need managed infrastructure — convert to paid tiers naturally.

#### Simple — $8/mo per domain

| | |
|---|---|
| **Price** | $8/mo per domain |
| **Mailboxes** | Unlimited |
| **Routes & Rules** | Unlimited |
| **Infrastructure** | Managed Convex instance, managed SMTP/IMAP, managed spam AI — no keys to configure |
| **Large file handling** | Pay-as-you-go LFS bandwidth at cost, **or** opt out entirely — emails with large attachments auto-bounce with a rejection message advising the sender to retry with a cloud link (Google Drive, Dropbox, OneDrive, etc.) |
| **Outbound sending** | Managed via Resend on our infrastructure, reputation warming included |
| **Support** | Email support, documentation, community |

The auto-bounce behavior for large files is a deliberate design choice, not a limitation. It keeps infrastructure costs predictable for the customer, trains senders toward modern file-sharing habits, and eliminates the single biggest cost driver in email hosting (blob storage). Customers who want LFS bandwidth can enable it and pay only for what they use.

#### Managed — $80/mo per domain

| | |
|---|---|
| **Price** | $80/mo per domain |
| **Mailboxes** | Unlimited |
| **Routes & Rules** | Unlimited |
| **Infrastructure** | Fully managed, optimized Convex instance, dedicated SMTP/IMAP, managed spam AI |
| **Large file handling** | 1TB shared file bandwidth included per month |
| **Outbound sending** | Managed Resend with priority deliverability, dedicated IP warming |
| **Support** | White glove setup, priority support via shared comms channel (Slack/Discord), direct on-demand access to the in-house dev-run support team |

This tier is for teams and businesses that want everything handled. The shared comms channel means you're not filing tickets — you're talking to the engineers who built the platform. White glove setup includes DNS configuration assistance, `mail.config.ts` review, migration from existing providers, and deliverability optimization.

#### Self-Hosted — Open Source

| | |
|---|---|
| **Price** | Free (OSS) |
| **What you get** | Complete serverless-deployable provider code for all infrastructure components: SMTP ingress, IMAP proxy, Convex backend functions, web mail client, spam evaluation pipeline, CLI tooling |
| **Documentation** | Full deployment guides, tutorials, architecture docs |
| **Deployment targets** | Vercel, AWS Lambda, Cloudflare Workers, Fly.io, Docker — anywhere serverless runs |
| **Support** | Community only (GitHub Issues, Discussions, Discord) |

The self-hosted tier is the trust contract with the developer community. It prevents lock-in, proves we have nothing to hide architecturally, and captures the "I want full ownership" crowd. It's also the best possible documentation — the production code *is* the reference implementation. Contributions flow back upstream. Everyone benefits.

### 2.3 Pricing Philosophy

The billing model is built on three principles:

**Per-domain, not per-seat.** Email providers that charge per-user create perverse incentives — teams share accounts, avoid creating functional addresses, and resist adding new team members. Per-domain billing means "add as many mailboxes as you want" is the default, not a premium feature. This aligns with how developers think about infrastructure: you pay for a database, not for how many queries your team runs against it.

**Features are never gated.** Every tier gets unlimited mailboxes, routes, rules, webhooks, and full `mail.config.ts` expressiveness. The tiers differ only in who manages the infrastructure and the level of support. This means a solo developer on the free tier and a 200-person company on the managed tier are running the exact same software with the exact same capabilities.

**Large file strategy as a feature.** The Simple tier's auto-bounce behavior for oversized attachments is not a penny-pinching limitation — it's a genuine product opinion. Modern email shouldn't be a file transfer protocol. The rejection message is helpful and actionable: "This message was rejected because it contains a 45MB attachment. Please re-send with your file hosted on Google Drive, Dropbox, or OneDrive and include a sharing link instead." This is how email *should* work in 2026. Customers who disagree can enable LFS bandwidth and pay for it.

### 2.4 Cost Structure & Unit Economics

The architecture is inherently cost-linear thanks to domain isolation and the BYO-keys model:

**Free tier costs to us: $0.** The customer brings their own Resend, OpenRouter, Convex, and Uploadthing keys. We host the orchestration layer (the CLI, config parser, and deploy pipeline) which is trivially cheap static infrastructure. There is no marginal cost per free-tier customer.

**Simple tier costs per domain:**
- Convex instance: ~$0.50–2/mo depending on volume (their generous free tier covers most small domains entirely)
- SMTP/IMAP compute: ~$1–3/mo (lambda invocations, idle when not receiving)
- Resend outbound: ~$0.50–1/mo for typical business email volume
- OpenRouter spam AI: ~$0.10–0.30/mo (free-tier models handle most volume)
- Total COGS per Simple domain: **~$2–6/mo** → healthy margin on $8/mo

**Managed tier costs per domain:**
- Same base costs as Simple, plus dedicated IP warming, priority Resend allocation, and support team time
- Total COGS per Managed domain: **~$15–25/mo** → strong margin on $80/mo
- The support channel is the primary cost driver, offset by the 10x price premium

**Unit economics summary:** A domain receiving 1,000 emails/day uses ~1,000 email-units of Convex compute + metadata storage. A domain receiving 10 emails/day uses 10 units. No idle infrastructure. No wasted capacity. Costs scale linearly with actual usage.

### 2.5 Abuse Prevention

Free email hosting has historically been exploited for spam and phishing. Our mitigations:

- **GitHub OAuth gating** — Real identity behind every account across all tiers.
- **BYO keys on free tier** — Abusers would burn their own Resend/Convex accounts, not ours. Resend and Convex both have their own abuse detection.
- **Per-domain billing on paid tiers** — Economic disincentive for spam farms. Spinning up domains costs money.
- **Domain isolation** — Abuse in one domain doesn't affect others. The abuser eats their own compute/storage costs and IP reputation damage.
- **Rate limiting** — Configurable per domain in `mail.config.ts`, with sensible defaults enforced platform-wide.
- **AI spam evaluation on inbound** — Catches abuse patterns before they reach mailboxes.

### 2.6 Competitive Moat

1. **`mail.config.ts` becomes the standard** — Like `vercel.json` defined how you deploy, our config syntax defines how you do email infrastructure. Once teams adopt it, switching costs are real.
2. **GitHub-native workflow** — Config lives in your repo alongside your app code. Moving away means rearchitecting your deployment pipeline.
3. **OSS community + self-hosted option** — Builds trust, drives adoption, attracts contributors. The more people deploy it, the more battle-tested and feature-rich it becomes.
4. **Domain isolation architecture** — Fundamentally better security and reliability story than any shared-infrastructure competitor. This is a structural advantage that can't be bolted on after the fact.
5. **Per-domain unlimited-seats pricing** — Once a team experiences "add mailboxes without increasing your bill," going back to per-user pricing feels punitive.

---

## Part 3: Technical Specification

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────┐
│  mail.config.ts in your GitHub repo     │
│  (defines mailboxes, rules, routing)    │
└──────────────┬──────────────────────────┘
               │ deploys to
┌──────────────▼──────────────────────────┐
│  Convex backend (per domain)            │
│  - Mailbox metadata (schema)            │
│  - Message storage (small content)      │
│  - Live subscriptions for sync          │
│  - Auth/permission rules                │
│  - Spam eval results                    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌──▼────┐  ┌──▼────────┐
│ IMAP  │  │ SMTP  │  │ Web Mail  │
│Proxy  │  │Ingress│  │(React App)│
└───────┘  └───────┘  └───────────┘
```

### 3.2 Core Principles

1. **Code is law** — Infrastructure is version-controlled, auditable, lives in your repo.
2. **Composable** — SMTP ingress, spam eval, IMAP proxy, and web app are independent services. All talk to Convex. Upgrade one without touching others.
3. **Domain-isolated** — Each customer gets their own Convex instance, their own compute, their own risk profile. No shared infrastructure.
4. **Cost-linear** — Pay only for what you use with perfect per-domain granularity.
5. **Developer-first** — Developers write TypeScript. They push to GitHub. Mail happens.

### 3.3 Why Convex (Not PostgreSQL, Firebase, or Supabase)

Convex fundamentally changes the email architecture by providing real-time subscriptions as a first-class primitive:

- **Live sync solves email coherence** — Traditional IMAP is eventual consistency. Convex subscriptions deliver mailbox state as it happens. New message arrives → instantly in every connected client. No sync interval.
- **No dual-write problem** — Convex is the source of truth for both metadata and file storage. No managing "state in S3 + index in Postgres + cache in Redis."
- **`mail.config.ts` becomes live Convex functions** — Routing rules, filters, and user management are not static config; they're running Convex mutations. Update config, deploy, and every connected client sees new behavior instantly.
- **Built-in auth/permissions** — "Which users can access this mailbox?" is a Convex auth rule, not bolted-on middleware.
- **TypeScript-first** — `mail.config.ts` is genuinely your source of truth, not a serialization problem.
- **Scalability without pain** — Convex handles sharding, replication, and consistency. Email is append-heavy with occasional mutations — perfect for this model.

Firebase doesn't have real-time file storage sync. Supabase doesn't have the "code lives in your repo" story.

### 3.4 The `mail.config.ts` Specification

The config file is the heart of the system. It compiles to Convex queries/mutations and deploys automatically.

```typescript
// mail.config.ts

export const mailboxes = {
  inbox: {
    retention: "90d",
    rules: [
      {
        match: { from: /@newsletter\.example/ },
        actions: [{ label: "newsletters" }],
      },
    ],
  },
  archive: {
    isArchive: true,
  },
};

export const routing = {
  inbound: [
    { match: { to: /.*@mail\.example\.tld/ }, action: "inbox" },
    { match: { to: /support@mail\.example\.tld/ }, action: "support", auth: ["team"] },
  ],
};

export const users = [
  { email: "alice@mycompany.tld", password: hash("...") },
];

export const attachmentRules = {
  largeFileThreshold: 5 * 1024 * 1024, // 5MB
  handler: "uploadthing", // offload large blobs to S3
};

export const observability = {
  logAllEmails: true,       // in dev
  logSpamEvals: true,
  webhookOnDeliveryFailure: "https://my-app.tld/webhooks/mail-failed",
  sentryProject: process.env.SENTRY_DSN,
};
```

This isn't just configuration — it's running in Convex as a live rules engine. Changes deploy instantly. No server restart.

### 3.5 Multi-Tenancy & Domain Isolation

Each domain gets a fully isolated stack, provisioned programmatically:

```typescript
export async function deployMailDomain(domain: string) {
  // 1. Dedicated Convex instance
  const convexProject = await convex.projects.create({
    name: `mail-${domain}`,
    functions: mailConfigFunctions,
  });

  // 2. Isolated SMTP/IMAP lambda/container
  const smtpEndpoint = await lambda.deploy({
    name: `smtp-${domain}`,
    env: { CONVEX_DEPLOYMENT_URL: convexProject.url },
  });

  // 3. DNS records
  return {
    mx: `mail.${domain}.tld`,
    smtp: smtpEndpoint,
    convexProject,
  };
}
```

Breach in one domain? Only that domain is compromised. No shared state. Each SMTP instance only talks to its own Convex project.

### 3.6 Attachment & Large File Strategy (First Principles)

An email with an attachment is just: header strings, body string (maybe an inline image as a base64 string), and a blob. The platform handles this with a tiered strategy configured per-domain:

```typescript
// mail.config.ts
export const attachmentRules = {
  largeFileThreshold: 5 * 1024 * 1024, // 5MB
  
  // Strategy: "store" | "bounce" | "byo"
  // "store"  → offload to managed LFS, pay-as-you-go bandwidth (Simple/Managed)
  // "bounce" → reject with helpful message advising sender to use cloud link (Simple default)
  // "byo"    → offload to customer's own Uploadthing/S3 keys (Free tier)
  largeFileStrategy: "bounce",
  
  bounceMessage: `This message was rejected because it contains an attachment 
    exceeding {{threshold}}. Please re-send with your file hosted on Google Drive, 
    Dropbox, or OneDrive and include a sharing link instead.`,
};
```

**In SMTP ingress:**

```typescript
if (attachment.size > config.largeFileThreshold) {
  switch (config.largeFileStrategy) {
    case "store":
      const url = await uploadToLFS(attachment); // managed or BYO keys
      email.body.attachments.push({
        name: attachment.name,
        downloadUrl: url,
        size: attachment.size,
      });
      break;
    case "bounce":
      return rejectWithMessage(sender, config.bounceMessage, {
        threshold: formatBytes(config.largeFileThreshold),
        filename: attachment.name,
      });
    case "byo":
      const byoUrl = await uploadToUploadThing(attachment, customerKeys);
      email.body.attachments.push({
        name: attachment.name,
        downloadUrl: byoUrl,
        size: attachment.size,
      });
      break;
  }
} else {
  email.attachments.push(atob(attachment)); // inline for small stuff
}
```

The auto-bounce strategy is a deliberate product opinion: modern email shouldn't be a file transfer protocol. It keeps costs predictable, trains sender behavior, and eliminates the single biggest cost driver in email hosting. Customers who want LFS bandwidth can opt in and pay for it.

### 3.7 Outbound Sending (Resend Integration)

Outbound email delivery is handled via Resend, chosen for its developer-first API, modern infrastructure, and strong deliverability track record:

- **Free tier** — BYO Resend API key. Customer manages their own sending domain verification, reputation, and rate limits directly with Resend.
- **Simple tier** — Managed Resend integration. CodeMail provisions sending domains, handles DKIM signing, and manages reputation warming automatically.
- **Managed tier** — Priority Resend allocation with dedicated IP warming. Deliverability optimization included as part of white glove setup.

```typescript
// In mail.config.ts
export const outbound = {
  provider: "resend",
  // Free tier: customer provides their own key
  apiKey: process.env.RESEND_API_KEY,
  // Managed tiers: key is provisioned automatically
  warmup: true,           // gradual ramp-up for new domains
  rateLimitPerHour: 500,  // configurable per domain
};
```

This decouples outbound reputation from the platform itself. Each domain warms its own IP reputation through Resend, meaning one customer's poor sending behavior can never harm another customer's deliverability — a structural advantage over shared-infrastructure providers like Mailgun.

### 3.7 Spam Evaluation (AI-First)

No legacy SpamAssassin daemon chewing up CPU. Two-stage pipeline:

```typescript
export const evaluateSpam = async (message: EmailMessage) => {
  // Stage 1: Fast path — blocklist lookup
  const isKnownSpam = await checkSpamLists(message.from);
  if (isKnownSpam) return { spam: true, reason: "known spammer" };

  // Stage 2: AI evaluation for ambiguous cases
  const aiEval = await openrouter.messages.create({
    model: "xiaomi/mini", // free tier
    messages: [{
      role: "user",
      content: `Analyze this email. Is it: spam, scam, malicious, or legit?
From: ${message.from}
Subject: ${message.subject}
Body: ${message.body.slice(0, 500)}`,
    }],
  });

  const verdict = parseSpamAI(aiEval);

  await storeSpamEvaluation(message.id, {
    isSpam: verdict.isSpam,
    category: verdict.category,
    reason: verdict.reason,
    confidence: verdict.confidence,
  });

  return verdict;
};
```

The AI provides contextual reasoning ("this is a phishing attempt impersonating your bank") instead of opaque Bayesian scores. Cost is near-zero on OpenRouter's free tier.

### 3.8 IMAP Bridge

The IMAP proxy becomes thin because Convex is already pushing state changes via subscriptions. The proxy only needs to:

1. Handle IMAP protocol syntax.
2. Map IMAP commands to Convex mutations.
3. Broadcast Convex subscription updates as IMAP `EXPUNGE`, `EXISTS`, `FETCH` responses.

The proxy is not managing state — Convex is. It's just translating protocols.

### 3.9 Real-Time Capabilities (Beyond Traditional Email)

Because Convex is multi-user with live subscriptions, the platform enables features traditional email architecturally cannot support:

- **Instant delivery** — SMTP write → Convex → every client sees it immediately. No "check mail" button.
- **Shared mailboxes with live sync** — Multiple people viewing the same thread in real time.
- **Real-time read receipts** — Collaborative inbox workflows.
- **Live typing indicators** on drafts.
- **Conflict-free concurrent actions** — Mark read, archive, and label simultaneously from multiple clients.

### 3.10 Deployment Flow (Developer Experience)

```bash
# Install CLI
npm install @mail/cli

# Set up a new domain
npx mail setup mycompany.tld

# This automatically:
# 1. Creates mail.config.ts scaffold
# 2. Generates DKIM keys
# 3. Provisions Convex instance
# 4. Deploys SMTP/IMAP lambdas
# 5. Shows DNS records to add (MX, SPF, DKIM, CNAME)
# 6. Provides DNSimple API snippet if applicable
# 7. Waits for DNS propagation
# 8. Tests email delivery

# Add users to mail.config.ts, commit and push:
git push origin main

# Deploy hook triggers:
# 1. Parses mail.config.ts
# 2. Diffs against current Convex state
# 3. Updates Convex project
# 4. SMTP/IMAP instance auto-picks up changes (subscribes to config mutations)

# Done. No manual steps. No "restart the service."
```

This is the Vercel mental model applied to email. Same developer experience.

### 3.11 Dashboard

The web dashboard authenticates via GitHub OAuth and provides:

- List GitHub projects, select prod branches.
- Auto-detect `mail.config.ts` files in repos.
- Display required DNS records (MX, SPF, DKIM, CNAME).
- Generate copy-paste DNS snippets (DNSimple API, Cloudflare, Route53).
- Defaults to `mail.hostname.tld` for IMAP, SMTP, and hosted web app.
- Real-time mailbox stats, delivery metrics, spam eval logs.

### 3.12 Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Backend / Database | Convex (per-domain instance, managed or BYO keys) |
| SMTP Ingress | Serverless-deployable (Lambda, Cloudflare Workers, Fly.io, Docker) |
| IMAP Proxy | Serverless-deployable (Lambda, Cloudflare Workers, Fly.io, Docker) |
| Outbound Sending | Resend (managed or BYO API key) |
| Web Mail Client | React (Vercel-deployable, OSS) |
| Attachment Storage | Uploadthing → S3 (managed or BYO keys), with auto-bounce option |
| Spam Detection | Blocklist lookup + OpenRouter AI (managed or BYO key) |
| Auth | GitHub OAuth (dashboard), Convex auth (mailboxes) |
| DNS Integration | DNSimple API, Cloudflare, Route53, manual for others |
| CI/CD | GitHub Actions → Convex deploy |
| Config Format | TypeScript (`mail.config.ts`) |
| Observability | Convex native logs, webhook integrations, Sentry |
| Self-Hosted Deployment | Full OSS serverless provider code, docs, and tutorials |

### 3.13 Known Challenges & Mitigations

| Challenge | Mitigation |
|-----------|-----------|
| **Email deliverability / IP reputation** | Reputation warming pipeline, gradual ramp-up, potential partnership with established email infrastructure. DKIM/SPF/DMARC auto-configured. |
| **Web mail client quality** | Start simple (threading, search, labels). Iterate. Open source to get community contributions. Don't try to beat Gmail on day one. |
| **IMAP protocol chattiness** | Smart caching in the proxy layer. Convex queries are fast enough to absorb this. |
| **Convex file storage limits** | Large attachments offloaded to S3. Per-mailbox size caps or per-GB pricing. Self-hosted option for unlimited needs. |
| **DKIM/SPF key rotation** | Automated via CLI and dashboard. DNS provider variance handled per-provider. |
| **Abuse at scale** | GitHub identity, pay-per-mailbox economics, domain isolation, configurable rate limits. |
| **Calendar/contacts** | CalDAV/CardDAV are easy Convex additions but not core to MVP. Phase 2 feature. |
| **Distribution/sales** | DNSimple partnership, developer content marketing, open source community building. |

---

## Appendix: Reference Models

| Company | What We Borrow |
|---------|----------------|
| **Vercel** | Config in code, GitHub-native, simple pricing, instant deploys |
| **Convex** | TypeScript-first, real-time infrastructure, code-as-backend |
| **DNSimple** | Target developers not enterprises, treat them as builders |
| **PostHog** | Generous free tier, open source core, transparent pricing |
| **Twilio** | Pay-per-unit, composable APIs, developer-first docs |
| **Sentry** | Observability baked in, GitHub integration, self-hosted option |

---

## Appendix: MVP Timeline Estimate

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Customer validation | Months 1–2 | 20+ interviews, landing page, waitlist |
| Core backend | Months 2–4 | Convex schema, `mail.config.ts` parser, SMTP ingress, IMAP proxy |
| Web mail client v1 | Months 4–5 | Threading, search, labels, real-time sync |
| Dashboard & CLI | Month 5–6 | GitHub OAuth, project linking, DNS snippet generation, `npx mail setup` |
| Beta launch | Month 6 | Invite-only, 50–100 domains |
| Public launch | Month 8–9 | Open waitlist, pricing live, OSS components published |

**Estimated time to MVP: 3–4 months of focused development.**

The scary part? This is actually buildable. Convex exists. OpenRouter exists. Uploadthing exists. Lambda/Fargate exists. Nothing needs to be invented — just orchestrated with better architecture.

---

*Document generated from architecture discussion — February 2026*
