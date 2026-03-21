# hustlemail

**Email infrastructure that lives in your GitHub repo.**

```bash
npx hustlemail setup mycompany.com
# → mail.config.ts created
# → DNS records shown
# → founder@mycompany.com works in hustlemail Web
```

## The Pitch

You have an idea. You want it to feel real from day 1. Real companies have company email. You shouldn't have to pay $600/year for 5 mailboxes while you're still figuring out if the product works.

hustlemail is email infrastructure for founders:
- **Config in code** — `mail.config.ts` defines your mailboxes, routes, and rules
- **Deploy like an app** — Push to GitHub, email updates instantly
- **Costs pennies** — Per-domain pricing, not per-seat. Unlimited mailboxes.
- **Real-time sync** — No "check mail" button. Messages appear instantly.

## Quick Start

```bash
# Install CLI
npm install -g @hustlemail/cli

# Set up a domain
hustlemail setup mycompany.com

# This creates mail.config.ts:
```

```typescript
// mail.config.ts
import { defineMailConfig } from "@hustlemail/config";

export default defineMailConfig({
  domain: "mycompany.com",
  
  mailboxes: [
    "hello",      // hello@mycompany.com
    "support",    // support@mycompany.com
    "founders",   // shared inbox
  ],
  
  routes: {
    // Route support@ to multiple people
    support: ["alice", "bob"],
    // Catch-all for unknown addresses
    "*": ["founders"],
  },
  
  spam: {
    provider: "openrouter", // AI-powered spam detection
    aggressiveness: "medium",
  },
});
```

```bash
# Deploy
git add mail.config.ts
git commit -m "Add email config"
git push

# CI validates config on push/PR
bun run config:validate
```

Pushes that change `mail.config.ts` now run the **Mail Config Sync** GitHub Action to validate schema and publish pass/fail commit status.

## Live Demo

- Public read-only demo inbox: `/demo` (host as `demo.hustlemail.dev` in production)
- Includes seeded realistic threads + visible DNS records for setup walkthroughs

## Features

### 📧 MVP Email Stack (Current)
- SMTP ingress (receive mail)
- Web mail client (included)
- Outbound sending via Resend

### 🚧 Planned (Phase 2)
- IMAP proxy (Apple Mail, Outlook, Thunderbird, etc.)

### ⚡ Real-Time
Built on Convex for instant sync:
- New emails appear immediately
- Shared mailboxes with live collaboration
- No polling, no refresh

### 🔒 Domain Isolated
Each domain runs on isolated infrastructure:
- Your data never touches other customers
- Breach containment by design
- Full audit trail

### 💰 Why $8/domain Exists

You're not paying for mailbox count. You're paying for a different product category:
- **Real-time team inboxes** (Convex subscriptions, not periodic polling)
- **Config-as-code** (`mail.config.ts` in git with review/rollback history)
- **Per-domain isolation** (domain-scoped infra and blast-radius containment)
- **Programmatic routing** (TypeScript rules, not checkbox-only admin UI)

| Tier | Price | What You Get |
|------|-------|--------------|
| **Free** | $0/mo | BYO API keys (Resend, Convex, OpenRouter) |
| **Simple** | $8/mo/domain | Managed infra, unlimited mailboxes, real-time sync, git-based config deploys |
| **Managed** | $80/mo/domain | White-glove onboarding, DNS/auth setup, migration help, deliverability tuning, priority incident response |
| **Self-Hosted** | Free (OSS) | Run everything yourself |

### hustlemail vs Low-Cost Mail Hosts

| Capability | Migadu ($1.58/mo equiv) | Fastmail | hustlemail ($8/domain) |
|---|---|---|---|
| Config in code (`mail.config.ts`) | ❌ | ❌ | ✅ |
| Git push -> config deploy pipeline | ❌ | ❌ | ✅ |
| Real-time shared mailbox presence | ❌ | ❌ | ✅ |
| Per-domain infra isolation model | Limited/shared | Shared | ✅ |
| Web + programmable routing in TS | ❌ | ❌ | ✅ |

## How It Works

```
mail.config.ts → Convex Backend → SMTP/Web
```

1. You write `mail.config.ts` in your repo
2. Push to GitHub triggers deploy
3. Convex stores messages with real-time sync
4. SMTP ingress accepts incoming mail
5. Web mail gives you a Gmail-like interface

> Note: IMAP client support is planned for Phase 2. Today, mailbox access is through hustlemail Web.

## Web Mail

Access your mail at `mail.yourdomain.com`:

- Threading & conversations
- Full-text search
- Labels & filters
- Keyboard shortcuts
- Dark mode
- Mobile responsive

## CLI Commands

```bash
hustlemail setup <domain>     # Initialize a new domain
hustlemail deploy             # Deploy config changes
hustlemail status             # Check domain health
hustlemail dns                # Show required DNS records
hustlemail logs               # Stream real-time logs
hustlemail users list         # List mailbox users
hustlemail users add <email>  # Add a user
```

## Self-Hosting

Everything is open source. Run your own:

```bash
git clone https://github.com/hustlemail/hustlemail
cd hustlemail

# Deploy Convex backend
npx convex deploy

# Deploy SMTP ingress — requires a persistent server with static IP
# (Lambda/Cloudflare Workers/Vercel will NOT work — see ARCHITECTURE.md)
fly deploy                              # Fly.io (recommended)
# or
docker-compose up                       # Docker on any VPS (Hetzner, DO, EC2)

# Deploy web mail
cd apps/web && vercel deploy
```

## Documentation

- [Architecture](./ARCHITECTURE.md) — How it all works
- [Configuration](./docs/configuration.md) — `mail.config.ts` reference
- [Self-Hosting Guide](./docs/self-hosting.md) — Run your own
- [API Reference](./docs/api.md) — Programmatic access

## Why Not Just Use Gmail/Google Workspace?

| | Google Workspace | hustlemail |
|---|---|---|
| 5 users | $30-90/mo | $8/mo |
| 50 users | $300-900/mo | $8/mo |
| Config in code | ❌ | ✅ |
| Self-host option | ❌ | ✅ |
| Real-time sync | Polling | Instant |
| Audit trail | Extra cost | Included |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup.

## License

MIT — See [LICENSE](./LICENSE)

---

**hustlemail** — Email shouldn't be a business problem. It should be a configuration problem.
