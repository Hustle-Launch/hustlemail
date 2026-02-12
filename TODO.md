# CodeMail TODO

## [2026-02-12] Task: MVP Prototype

### Foundation
- [ ] Monorepo setup (Turborepo, packages structure)
- [ ] Package.json with workspaces
- [ ] Convex project initialization
- [ ] Convex schema (domains, mailboxes, messages, users)
- [ ] Config parser package (@codemail/config)

### SMTP Ingress
- [ ] SMTP server with smtp-server package
- [ ] Message parsing with mailparser
- [ ] Spam evaluation (blocklist + OpenRouter AI)
- [ ] Store messages in Convex
- [ ] Attachment handling

### Web Mail Client
- [ ] Next.js 15 app setup
- [ ] Clerk auth integration
- [ ] Convex provider setup
- [ ] Inbox view with real-time subscriptions
- [ ] Message detail view
- [ ] Compose & send with Resend
- [ ] Search functionality
- [ ] Labels & archive

### Dashboard
- [ ] Domain setup wizard
- [ ] DNS record display
- [ ] Mailbox management UI

### CLI
- [ ] `codemail setup <domain>` command
- [ ] `codemail deploy` command
- [ ] DNS record generation

### Landing Page
- [ ] Hero section
- [ ] Features overview
- [ ] Pricing table
- [ ] CTA

---

## Delegation Plan

**Main agent:** Orchestration, Convex backend, CLI
**Sub-agent 1:** SMTP ingress server
**Sub-agent 2:** Web mail client (frontend-design skill)
**Sub-agent 3:** Landing page (frontend-design skill)
