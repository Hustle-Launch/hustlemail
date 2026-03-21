# hustlemail TODO

## [2026-02-12] Task: MVP Prototype

### Foundation ✅
- [x] Monorepo setup (Turborepo, packages structure)
- [x] Package.json with workspaces
- [x] Convex project initialization
- [x] Convex schema (domains, mailboxes, messages, users, spamEvaluations)
- [x] Config parser package (@hustlemail/config)

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

### Convex Backend ✅
- [x] Queries: listDomains, getDomain, listMailboxes, listMessages, getMessage
- [x] Queries: searchMessages, getAnalytics, listUsers, getUnreadCounts
- [x] Mutations: createDomain with DKIM key generation
- [x] Mutations: createMailbox, deleteMailbox with access control
- [x] Mutations: markAsRead, toggleStar, archiveMessage, trashMessage
- [x] Mutations: markAsSpam, updateLabels, deleteMessage
- [x] Mutations: queueOutboundEmail, syncUser, inviteUserToMailbox

### API Routes ✅
- [x] POST /api/send - Outbound email via Resend
- [x] POST /api/inbound - Webhook for SMTP server
- [x] POST /api/webhooks/clerk - User sync from Clerk
- [x] GET /api/dns/[domain] - DNS record generation and verification

### CLI ✅
- [x] `hustlemail setup <domain>` command
- [x] `hustlemail deploy` command
- [x] `hustlemail status` command
- [x] `hustlemail dns` command
- [x] `hustlemail logs` command
- [x] `hustlemail users list/add` commands

### Deployment ✅
- [x] Vercel deployment for web - https://hustlemail.vercel.app
- [x] GitHub repo - https://github.com/michaelmonetized/hustlemail

### Remaining for Full Production
- [x] Interactive Convex project setup (`bunx convex dev`) ✅
- [x] Convex deployed: frugal-oriole-112.convex.cloud ✅
- [x] Create hustlemail-specific Clerk app ✅
- [x] Fixed Clerk publishable key typo in Vercel (flowmng→flowing) ✅
- [x] Configured Clerk fallback development host to Vercel URL ✅
- [x] Add RESEND_API_KEY to Vercel ✅
- [x] Deploy SMTP server to Fly.io ✅ - hustlemail-smtp.fly.dev (ports 25/587)
- [x] SMTP server connected to Convex backend ✅
- [ ] Custom domain (hustlemail.dev) - requires domain purchase
- [ ] DNS verification automation

---

## Completed Commits
- `3e9b209` feat(api): add email and webhook API routes
- `ab0ffe6` fix: remove workspace dependency for Vercel deployment
- `5338868` feat(convex): add queries and mutations for full backend
- `c7cdb17` feat(dashboard): add full admin dashboard
- `673d3cd` feat(web): implement mail client with Linear-inspired UI
- `0032b88` feat(web): enhance landing page with SEO metadata
- `2087db5` feat(smtp): add SMTP ingress server

## Live URLs
- **Web App:** https://hustlemail-web.vercel.app
- **SMTP Server:** hustlemail-smtp.fly.dev (ports 25 & 587)
- **Convex:** https://dashboard.convex.dev/d/frugal-oriole-112
- **GitHub:** https://github.com/michaelmonetized/hustlemail

## Stats
- **Files created:** ~80+
- **Lines of code:** ~10,000+
- **Packages:** 3 (config, cli, smtp)
- **App:** 1 (web)
- **API Routes:** 4
- **Dashboard pages:** 7
- **Convex queries:** 8
- **Convex mutations:** 12
