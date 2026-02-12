# @codemail/smtp

SMTP ingress server for CodeMail. Receives inbound email via SMTP protocol, validates recipients, evaluates spam, and stores messages in Convex.

## Features

- **SMTP Protocol** - Standards-compliant SMTP server using `smtp-server`
- **Recipient Validation** - Validates mailbox exists via Convex API before accepting
- **Email Parsing** - Full MIME parsing with `mailparser` (headers, body, attachments)
- **Spam Detection** - Two-stage: fast blocklist check + OpenRouter AI classification
- **Attachment Handling** - Small files stored in Convex, large files configurable (store/bounce/byo)
- **Real-time** - Messages instantly available via Convex subscriptions

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Convex and OpenRouter credentials

# Run in development mode (with hot reload)
npm run dev
```

### Production (Docker)

```bash
# Build image
docker build -t codemail-smtp .

# Run container
docker run -d \
  --name codemail-smtp \
  -p 25:25 \
  -e CONVEX_URL=https://your-project.convex.cloud \
  -e CONVEX_DEPLOY_KEY=prod:your-key \
  -e OPENROUTER_API_KEY=sk-or-v1-xxx \
  codemail-smtp
```

### Docker Compose

```yaml
services:
  smtp:
    build: ./packages/smtp
    ports:
      - "25:25"
    environment:
      CONVEX_URL: ${CONVEX_URL}
      CONVEX_DEPLOY_KEY: ${CONVEX_DEPLOY_KEY}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      LOG_LEVEL: info
    restart: unless-stopped
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_PORT` | `25` | SMTP listening port |
| `SMTP_HOST` | `0.0.0.0` | Bind address |
| `SMTP_SECURE` | `false` | Enable implicit TLS (port 465) |
| `TLS_KEY_PATH` | - | Path to TLS private key |
| `TLS_CERT_PATH` | - | Path to TLS certificate |
| `CONVEX_URL` | **required** | Convex deployment URL |
| `CONVEX_DEPLOY_KEY` | **required** | Convex deploy key for HTTP actions |
| `OPENROUTER_API_KEY` | **required** | OpenRouter API key for spam AI |
| `SPAM_MODEL` | `meta-llama/llama-3.2-3b-instruct:free` | AI model for spam classification |
| `MAX_MESSAGE_SIZE` | `26214400` | Max message size in bytes (25MB) |
| `MAX_ATTACHMENT_SIZE` | `1048576` | Inline storage threshold (1MB) |
| `CONNECTION_TIMEOUT` | `300000` | Socket timeout in ms (5 min) |
| `LOG_LEVEL` | `info` | Logging verbosity |

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │         SMTP Client (MTA)           │
                    └─────────────────┬───────────────────┘
                                      │ SMTP
                    ┌─────────────────▼───────────────────┐
                    │       @codemail/smtp Server         │
                    │                                     │
                    │  ┌───────────┐  ┌────────────────┐  │
                    │  │ RCPT TO   │  │   DATA         │  │
                    │  │ Validator │  │   Handler      │  │
                    │  └─────┬─────┘  └───────┬────────┘  │
                    │        │                │           │
                    │        │         ┌──────▼──────┐    │
                    │        │         │ mailparser  │    │
                    │        │         └──────┬──────┘    │
                    │        │                │           │
                    │        │         ┌──────▼──────┐    │
                    │        │         │ Spam Eval   │    │
                    │        │         │ blocklist   │    │
                    │        │         │ + AI        │    │
                    │        │         └──────┬──────┘    │
                    │        │                │           │
                    └────────┼────────────────┼───────────┘
                             │                │
                    ┌────────▼────────────────▼───────────┐
                    │         Convex HTTP Actions         │
                    │  /smtp/getDomain                    │
                    │  /smtp/getMailbox                   │
                    │  /smtp/storeMessage                 │
                    │  /smtp/logSpamEvaluation           │
                    └─────────────────────────────────────┘
```

## SMTP Flow

1. **Connection** - Client connects, server sends banner
2. **EHLO/HELO** - Client identifies itself
3. **MAIL FROM** - Client specifies sender
4. **RCPT TO** - Server validates recipient exists in Convex
5. **DATA** - Server receives message, parses, evaluates spam, stores

## Spam Evaluation

Two-stage spam detection:

### Stage 1: Blocklist (Fast)
Instant lookup against known spam sources:
- Exact email matches
- Domain blocklist

### Stage 2: AI Classification (Contextual)
OpenRouter LLM analyzes email content:
- Classifies as: `ham`, `spam`, `phishing`, `scam`
- Returns confidence score (0-100)
- Provides human-readable reason

```typescript
// AI prompt
"Classify this email: spam/ham/phishing/scam?"

// Response
{
  "classification": "spam",
  "confidence": 85,
  "reason": "Unsolicited bulk email with suspicious links"
}
```

## Attachment Handling

Configurable per domain:

| Strategy | Behavior |
|----------|----------|
| `store` | Upload all attachments to Convex storage |
| `bounce` | Reject attachments over threshold |
| `byo` | Store metadata only, customer handles storage |

## Convex HTTP Actions Required

The SMTP server expects these HTTP actions in your Convex deployment:

```typescript
// convex/smtp.ts
import { httpAction } from "./_generated/server";

export const getDomain = httpAction(async (ctx, request) => {
  const { name } = await request.json();
  // Return domain or null
});

export const getMailbox = httpAction(async (ctx, request) => {
  const { domainId, name } = await request.json();
  // Return mailbox or null
});

export const storeMessage = httpAction(async (ctx, request) => {
  const message = await request.json();
  // Store message, return { messageId }
});

export const logSpamEvaluation = httpAction(async (ctx, request) => {
  const { messageId, isSpam, score, category, reason, model } = await request.json();
  // Log evaluation
});

export const getUploadUrl = httpAction(async (ctx, request) => {
  const { domainId } = await request.json();
  // Return { uploadUrl } for attachment upload
});
```

## Testing

Send a test email:

```bash
# Using swaks (Swiss Army Knife for SMTP)
swaks \
  --to test@yourdomain.com \
  --from sender@example.com \
  --server localhost:25 \
  --header "Subject: Test Email" \
  --body "Hello from SMTP test"

# Or using telnet
telnet localhost 25
HELO test
MAIL FROM:<sender@example.com>
RCPT TO:<test@yourdomain.com>
DATA
Subject: Test

Hello World
.
QUIT
```

## Deployment

### Port 25 Considerations

Port 25 is often blocked by cloud providers to prevent spam. Options:

1. **VPS providers** (Hetzner, OVH, Vultr) - Usually allow port 25
2. **AWS/GCP/Azure** - Request unblock or use SES/equivalent
3. **Fly.io** - Supports port 25 with dedicated IP

### DNS Setup

Configure MX records for your domain:

```
yourdomain.com.  IN  MX  10  mail.yourdomain.com.
mail.yourdomain.com.  IN  A   <your-server-ip>
```

### TLS

For production, enable TLS:

```bash
# Generate certificates (or use Let's Encrypt)
docker run -d \
  -p 465:465 \
  -e SMTP_PORT=465 \
  -e SMTP_SECURE=true \
  -e TLS_KEY_PATH=/certs/key.pem \
  -e TLS_CERT_PATH=/certs/cert.pem \
  -v /path/to/certs:/certs:ro \
  codemail-smtp
```

## License

MIT
