# CodeMail Development Plan

## MVP Scope

The MVP proves the core thesis: **email as code-configured infrastructure**.

### What's In MVP
- ✅ `mail.config.ts` configuration format
- ✅ Convex backend (schema, mutations, queries, subscriptions)
- ✅ SMTP ingress (receive mail, store in Convex)
- ✅ Basic spam evaluation (blocklist + AI)
- ✅ Web mail client (read, compose, send)
- ✅ Outbound sending via Resend
- ✅ CLI for setup and deployment
- ✅ Dashboard for domain management
- ✅ DNS record generation

### What's NOT in MVP
- ❌ IMAP proxy (MVP is web-mail-first; Apple Mail/Outlook/Thunderbird support lands in Phase 2)
- ❌ CalDAV/CardDAV (calendar/contacts)
- ❌ Self-hosted deployment docs
- ❌ Multi-domain in single config
- ❌ Advanced spam rules
- ❌ SSO/SAML integration

## Technical Decisions

### Stack
| Component | Choice | Rationale |
|-----------|--------|-----------|
| Backend | Convex | Real-time subscriptions, TypeScript-first |
| Web Framework | Next.js 15 | App Router, Server Actions, React 19 |
| Auth | Clerk | Easy setup, works with Convex |
| Outbound Email | Resend | Developer-first, good deliverability |
| Spam AI | OpenRouter | Free models available, easy integration |
| SMTP Server | `smtp-server` npm | Battle-tested, 1M+ downloads |
| Styling | Tailwind v4 | Utility-first, fast iteration |
| UI Components | shadcn/ui | Composable, customizable |

### Monorepo Structure
```
codemail/
├── apps/
│   ├── web/              # Next.js dashboard + web mail
│   └── docs/             # Documentation site
├── packages/
│   ├── config/           # mail.config.ts parser & types
│   ├── smtp/             # SMTP ingress server
│   ├── convex/           # Shared Convex functions
│   └── cli/              # codemail CLI
├── convex/               # Convex schema & functions
└── mail.config.ts        # Example config
```

### Config Format Design

```typescript
// mail.config.ts
import { defineMailConfig } from "@codemail/config";

export default defineMailConfig({
  domain: "example.com",
  
  // Mailboxes to create
  mailboxes: ["hello", "support", "team"],
  
  // Route patterns
  routes: {
    support: ["alice@team", "bob@team"],  // Multiple recipients
    "*": ["catchall@team"],                // Catch-all
  },
  
  // Spam settings
  spam: {
    provider: "openrouter",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    threshold: 0.7,
  },
  
  // Attachment handling
  attachments: {
    maxSize: "10mb",
    largeFileStrategy: "bounce", // or "store", "byo"
  },
  
  // Outbound
  outbound: {
    provider: "resend",
    // apiKey from env: RESEND_API_KEY
  },
});
```

## Development Phases

### Phase 1: Foundation (Day 1-2)
- [ ] Project scaffold (monorepo, configs)
- [ ] Convex schema & basic functions
- [ ] Config parser with Zod validation
- [ ] Basic CLI structure

### Phase 2: SMTP Ingress (Day 2-3)
- [ ] SMTP server implementation
- [ ] Message parsing & storage
- [ ] Spam evaluation pipeline
- [ ] Attachment handling

### Phase 3: Web Mail (Day 3-5)
- [ ] Next.js app with Clerk auth
- [ ] Inbox view with real-time updates
- [ ] Message detail view
- [ ] Compose & send
- [ ] Search & labels

### Phase 4: Dashboard (Day 5-6)
- [ ] Domain setup wizard
- [ ] DNS record display
- [ ] Mailbox management
- [ ] Activity logs

### Phase 5: Polish & Deploy (Day 6-7)
- [ ] Error handling & edge cases
- [ ] Landing page
- [ ] Deploy to production
- [ ] Documentation

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Email deliverability | Use Resend's infrastructure, follow warming best practices |
| Spam false positives | AI provides reasoning, easy to adjust threshold |
| SMTP complexity | Use battle-tested `smtp-server` package |
| Convex limits | Per-domain isolation, paid tier for high volume |

## Success Criteria

MVP is complete when:
1. A new user can `codemail setup domain.com` and receive email within 10 minutes
2. Web mail loads inbox in < 2 seconds
3. New messages appear in real-time (< 1 second)
4. Outbound mail delivers successfully to Gmail/Outlook
5. Spam detection catches obvious spam with < 1% false positives
