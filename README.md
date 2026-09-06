# Hustlemail

Hustlemail is a keyboard-first mail client for the `notify@uncap.us` pilot. Resend handles sending and receiving. Convex stores mailbox state and runs bounded polling jobs. The web client and Tauri native application share the mail workspace.

The committed configuration is deliberately limited to one mailbox. Native applications for Linux, macOS and iOS are in scope; platform builds, signing and device validation are tracked separately and are not implied by a passing web build.

Current validation: 81 JavaScript/TypeScript tests, 4 Rust authentication tests and all application typechecks pass. The local web pilot authenticates and sends/receives real mail; the installed Linux native app signs in, reads real mail and restores its session after restart. The macOS build launches, and the installed iOS simulator app passes its two preview UI tests. Inbound attachment downloads still encounter a provider-origin TLS failure, personal owner handoff remains pending, and no hosted production release has been published. See the [validation record](docs/VALIDATION.md) for exact observations and remaining native acceptance work.

## Start here

1. Read [the accepted decisions](docs/DECISIONS.md).
2. Follow [local setup and deployment](DEPLOY.md) for the actual account, credentials and DNS prerequisites.
3. Run the [configuration CLI](docs/CLI.md) for local validation and explicit provider provisioning.
4. Check [the implementation checklist](TODO.md) and [validation record](docs/VALIDATION.md) before using this for real mail.

```sh
npm install
npm run build --workspace=@hustlemail/config
npm run build --workspace=@hustlemail/cli
node packages/cli/dist/index.js setup uncap.us
npm run config:validate
```

`setup` creates a local configuration file only when absent. It preserves existing configuration. It does not sign up for services, register a domain, change DNS, or configure a running backend.

## Configuration

```ts
import { defineMailConfig } from "@hustlemail/config";

export default defineMailConfig({
  version: 1,
  domain: "uncap.us",
  boxes: [{ name: "notify", displayName: "Notifications" }],
  inbound: { provider: "resend" },
  outbound: { provider: "resend", fromName: "Hustlemail" },
  credentials: { resendApiKeyEnv: "RESEND_API_KEY" },
  polling: { intervalMs: 10_000 },
});
```

Configuration is data. Validation reads TypeScript literals without executing the file. JSON exports contain environment variable names, never resolved secrets. The current backend bootstraps the fixed pilot mailbox; importing a config changes a local file, not an account or deployed cron. Config display names and `outbound.fromName` are portable metadata; they do not currently change backend mailbox names or sender headers.

## Repository

| Path              | Responsibility                                                      |
| ----------------- | ------------------------------------------------------------------- |
| `apps/web`        | Browser client and authenticated mail workspace                     |
| `apps/native`     | Tauri application for Linux/macOS and iOS targets                   |
| `convex`          | Authentication, mailbox state, Resend polling and outbound delivery |
| `packages/config` | Strict schema and non-executing config reader                       |
| `packages/cli`    | Local config operations and explicit Resend provisioning            |
| `tests`           | Automated behavior checks                                           |
| `docs/archive`    | Superseded proposals and old, unverified completion reports         |

The current product has no AI features, SMTP server, Gmail connection or Outlook connection. Old proposals and their deployment URLs are retained only in the explicitly marked archive.
