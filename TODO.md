# CodeMail TODO

## [2026-02-12] Task: MVP Prototype

### Foundation ✅
- [x] Monorepo setup (Turborepo, packages structure)
- [x] Package.json with workspaces
- [x] Convex project initialization
- [x] Convex schema (domains, mailboxes, messages, users, spamEvaluations)
- [x] Config parser package (@codemail/config)

### SMTP Ingress ✅
- [x] SMTP server with smtp-server package
- [x] Message parsing with mailparser
- [x] Spam evaluation (blocklist + OpenRouter AI)
- [x] Store messages in Convex via HTTP actions
- [x] Attachment handling
- [x] Dockerfile for deployment
- [x] README with deployment docs

### Web Mail Client ✅
- [x] Next.js 15 app setup
- [x] Clerk auth integration
- [x] Convex provider setup
- [x] Inbox view with keyboard navigation (j/k, e, s, r)
- [x] Message detail view with threading
- [x] Compose with Tiptap rich text editor
- [x] Search functionality with filters
- [x] Labels & archive
- [x] Command menu (⌘+K)
- [x] Dark mode default

### Landing Page ✅
- [x] Hero section with animated gradient
- [x] Animated terminal demo
- [x] Features overview (6 cards)
- [x] Pricing table (Free/Simple/Managed)
- [x] Code example section
- [x] CTA section
- [x] Footer with links
- [x] SEO metadata (OpenGraph, Twitter cards)

### Dashboard ✅
- [x] Domain setup wizard (multi-step flow)
- [x] DNS record display (MX, SPF, DKIM, DMARC)
- [x] Mailbox management UI
- [x] Settings page (API keys, notifications, security, integrations)
- [x] Analytics page (weekly charts, top senders, spam breakdown)
- [x] Users page (team management, roles)
- [x] Security page (DKIM keys, threat monitoring)

### CLI 🔲 (REMAINING)
- [ ] `codemail setup <domain>` command
- [ ] `codemail deploy` command
- [ ] DNS record generation
- [ ] Config validation

### Integration 🔲 (REMAINING)
- [ ] Wire Convex queries to web client (replace mock data)
- [ ] Outbound email via Resend
- [ ] Clerk webhooks for user sync
- [ ] Environment variables setup guide

### Deploy 🔲 (REMAINING)
- [ ] Vercel deployment for web
- [ ] SMTP server deployment (Fly.io or Railway)
- [ ] Custom domain setup

---

## Completed Commits
- `673d3cd` feat(web): implement mail client with Linear-inspired UI
- `0032b88` feat(web): enhance landing page with SEO metadata and fix build
- `2087db5` feat(smtp): add SMTP ingress server for inbound email

## Stats
- **Files created:** ~70+
- **Lines of code:** ~8,000+
- **Packages:** 3 (config, cli, smtp)
- **App:** 1 (web)
- **Dashboard pages:** 7 (domains, mailboxes, users, analytics, security, settings, new domain wizard)
