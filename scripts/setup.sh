#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
command -v node >/dev/null || { echo "Node.js 22 or later is required." >&2; exit 1; }
if [[ ! -f packages/cli/dist/index.js ]]; then
  echo "Install dependencies and build first: npm install && npm run build --workspace=@hustlemail/config && npm run build --workspace=@hustlemail/cli" >&2
  exit 1
fi
node packages/cli/dist/index.js setup uncap.us
echo "Local config is ready. Account credentials, Convex setup and Resend DNS verification are separate steps in DEPLOY.md."
