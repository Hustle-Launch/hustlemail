#!/bin/bash

# CodeMail Setup Script
# Run this after cloning to set up your development environment

set -e

echo "🚀 CodeMail Setup"
echo ""

# Check for required tools
command -v bun >/dev/null 2>&1 || { echo "❌ bun is required. Install from https://bun.sh"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required"; exit 1; }

echo "✓ Dependencies checked"

# Install packages
echo ""
echo "📦 Installing packages..."
bun install

# Create .env files
echo ""
echo "📝 Creating environment files..."

if [ ! -f "apps/web/.env.local" ]; then
  cat > apps/web/.env.local << 'EOF'
# Clerk Authentication (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Convex Database (run `bunx convex dev` to get)
NEXT_PUBLIC_CONVEX_URL=

# Resend for outbound email (get from https://resend.com)
RESEND_API_KEY=

# CodeMail config
CODEMAIL_DOMAIN=localhost
CODEMAIL_WEBHOOK_SECRET=dev-secret-change-me
EOF
  echo "✓ Created apps/web/.env.local"
else
  echo "○ apps/web/.env.local already exists"
fi

if [ ! -f "packages/smtp/.env" ]; then
  cat > packages/smtp/.env << 'EOF'
# SMTP Server Configuration
PORT=2525
HOSTNAME=localhost

# Convex HTTP endpoint
CONVEX_URL=
CONVEX_API_KEY=

# Spam detection (OpenRouter)
OPENROUTER_API_KEY=

# Webhook for processed emails
WEBHOOK_URL=http://localhost:3000/api/inbound
WEBHOOK_SECRET=dev-secret-change-me

# Logging
LOG_LEVEL=debug
EOF
  echo "✓ Created packages/smtp/.env"
else
  echo "○ packages/smtp/.env already exists"
fi

# Initialize Convex
echo ""
echo "🗄️  Setting up Convex..."
echo "   Run: bunx convex dev"
echo "   This will create your Convex project interactively."

# Print next steps
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Setup complete! Next steps:"
echo ""
echo "1. Configure Convex:"
echo "   bunx convex dev"
echo ""
echo "2. Get Clerk keys:"
echo "   https://dashboard.clerk.com → Create Application → API Keys"
echo "   Add to apps/web/.env.local"
echo ""
echo "3. Get Resend API key:"
echo "   https://resend.com → API Keys"
echo "   Add to apps/web/.env.local"
echo ""
echo "4. Start development:"
echo "   bun run dev"
echo ""
echo "5. Open http://localhost:3000"
echo "═══════════════════════════════════════════════════"
