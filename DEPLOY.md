# hustlemail Deployment Guide

## Quick Start

### 1. Deploy Web App (Vercel)

The web app is already deployed at https://hustlemail.vercel.app

To deploy your own:

```bash
cd apps/web
vercel --prod
```

Required environment variables:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
RESEND_API_KEY=re_...
hustlemail_DOMAIN=yourdomain.com
hustlemail_WEBHOOK_SECRET=your-secret
```

### 2. Set Up Convex

```bash
# Install Convex CLI
bun add -d convex

# Initialize project (interactive)
bunx convex dev

# Deploy schema and functions
bunx convex deploy
```

### 3. Set Up Clerk

1. Create app at https://dashboard.clerk.com
2. Copy publishable key and secret key
3. Add webhook endpoint: `https://yourdomain.com/api/webhooks/clerk`
4. Subscribe to `user.created`, `user.updated`, `user.deleted` events
5. Copy webhook secret

### 4. Deploy SMTP Server

#### Option A: Fly.io (Recommended)

```bash
cd packages/smtp

# Install Fly CLI
brew install flyctl

# Login and create app
fly auth login
fly launch --name hustlemail-smtp --region iad

# Set secrets
fly secrets set \
  CONVEX_URL=https://your-project.convex.cloud \
  CONVEX_API_KEY=your-api-key \
  OPENROUTER_API_KEY=your-key \
  WEBHOOK_URL=https://yourdomain.com/api/inbound \
  WEBHOOK_SECRET=your-secret

# Deploy
fly deploy
```

#### Option B: Railway

```bash
cd packages/smtp

# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

#### Option C: Docker (Self-hosted)

```bash
cd packages/smtp

# Build image
docker build -t hustlemail-smtp .

# Run with environment variables
docker run -d \
  -p 25:25 \
  -e CONVEX_URL=https://your-project.convex.cloud \
  -e CONVEX_API_KEY=your-api-key \
  -e OPENROUTER_API_KEY=your-key \
  -e WEBHOOK_URL=https://yourdomain.com/api/inbound \
  -e WEBHOOK_SECRET=your-secret \
  hustlemail-smtp
```

### 5. Configure DNS

Add these records to your domain:

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | @ | mail.yourdomain.com | 10 |
| A | mail | [SMTP Server IP] | - |
| TXT | @ | v=spf1 include:_spf.resend.com ~all | - |
| TXT | hustlemail._domainkey | v=DKIM1; k=rsa; p=... | - |
| TXT | _dmarc | v=DMARC1; p=none | - |
| CNAME | app | hustlemail.vercel.app | - |

### 6. Verify Setup

```bash
# Check DNS records
hustlemail dns

# Check domain status
curl https://yourdomain.com/api/dns/yourdomain.com

# Send test email
curl -X POST https://yourdomain.com/api/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","text":"Hello!"}'
```

## Architecture

```
                    ┌──────────────────────────────────┐
                    │        DNS (MX Record)           │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │     SMTP Server (Fly.io)         │
                    │   - Receives inbound email       │
                    │   - Spam detection (OpenRouter)  │
                    │   - Forwards to webhook          │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │     Web App (Vercel)             │
                    │   - /api/inbound webhook         │
                    │   - /api/send outbound           │
                    │   - Dashboard & mail client      │
                    └──────────────┬───────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
┌────────▼────────┐    ┌──────────▼──────────┐    ┌────────▼────────┐
│     Convex      │    │       Clerk         │    │     Resend      │
│  (Real-time DB) │    │  (Authentication)   │    │ (Outbound mail) │
└─────────────────┘    └─────────────────────┘    └─────────────────┘
```

## Monitoring

### Logs

```bash
# Fly.io
fly logs -a hustlemail-smtp

# Vercel
vercel logs hustlemail-web

# Convex
bunx convex logs
```

### Health Checks

- SMTP: `telnet mail.yourdomain.com 25`
- Web: `curl https://yourdomain.com/api/inbound`
- DNS: `curl https://yourdomain.com/api/dns/yourdomain.com`

## Troubleshooting

### Email not arriving?

1. Check MX record: `dig MX yourdomain.com`
2. Check SMTP logs: `fly logs -a hustlemail-smtp`
3. Check spam score in webhook response

### DNS verification failing?

1. Wait for propagation (up to 48h)
2. Check records: `dig TXT yourdomain.com`
3. Verify DKIM key matches

### Outbound email blocked?

1. Verify Resend API key
2. Check sender domain is verified in Resend
3. Review Resend dashboard for errors
