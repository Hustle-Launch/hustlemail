# Local setup and deployment

This guide configures the `notify@uncap.us` pilot. Run from the repository root unless a command says otherwise. The CLI is not an account-signup service.

## Prerequisites

- Node.js 22.12 or later and npm; the workspace lockfile records dependency versions.
- An existing Resend account with a full-access server API key and authority to manage `uncap.us` DNS. Receiving must be enabled for the domain. Sending-only API keys cannot support receiving and provisioning.
- A Clerk application with the frontend publishable key and a JWT template named `convex`. Its issuer must match the backend configuration. Authentication remains required when the database is local.
- For native sign-in, enable **Native API** in the Clerk dashboard's **Native applications** settings. [Clerk's native setup documentation](https://clerk.com/docs/ios/getting-started/quickstart#enable-native-api).
- A selected Convex deployment. The Convex CLI supports local development; cloud deployment needs an existing authenticated account/project.
- Rust and the relevant Tauri OS prerequisites for native builds. macOS and iOS compilation require macOS/Xcode; release signing requires the appropriate Apple credentials.

Do not paste API keys into `mail.config.ts`, export files, command arguments or commits. The `credentials` object contains environment variable names only.

## Install and validate local config

```sh
npm install
npm run build --workspace=@hustlemail/config
npm run build --workspace=@hustlemail/cli
node packages/cli/dist/index.js setup uncap.us
npm run config:validate
```

An existing config is preserved. An invalid existing file is reported for migration. `scripts/setup.sh` is an optional wrapper around this local setup after building; it does not install packages or write secret files.

## Start a local Convex deployment

```sh
npx convex dev --configure new
```

Choose the local development deployment in the configuration flow. When linking an existing project, use `--configure existing` instead. Inspect `npx convex dev --help` for the installed version's choices; local configuration can download a backend binary and write `.env.local`. Confirm the target before pushing functions or environment settings. Keep `convex dev` running while using the local app.

Copy the selected deployment URL into the web client's `NEXT_PUBLIC_CONVEX_URL`. Do not confuse the Convex function URL with an HTTP-actions `.site` URL. A local deployment's data stays with that deployment; starting the web server alone does not start its database.

Configure these **backend environment variables** through the selected Convex deployment's environment settings. Use the dashboard's secret entry fields or protected environment files rather than putting secret values in command arguments:

| Variable                            | Purpose                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `CLERK_JWT_ISSUER_DOMAIN`           | Exact Clerk token issuer; required, with no fallback environment variable                 |
| `HUSTLEMAIL_OWNER_TOKEN_IDENTIFIER` | Exact Clerk/Convex token identifier for the pilot owner; preferred                        |
| `HUSTLEMAIL_OWNER_EMAIL`            | Alternative owner email; the identity must report a verified email                        |
| `RESEND_API_KEY`                    | Full-access Resend server credential                                                      |
| `RESEND_ACCOUNT_ID`                 | Stable nonsecret provider-account namespace, default `primary`; do not change it casually |

Set the owner identifier or verified owner email before the first bootstrap. No owner configuration means setup is incomplete. Configure `RESEND_API_KEY` only when you intend the running backend to poll the provider; without it, provider polling does no work. Scheduled receiving and send-recovery/snooze jobs run every 10 seconds and return after finite work. No webhook or publicly reachable local ingress URL is required.

For web development, copy `apps/web/.env.example` to an ignored `apps/web/.env.local` and enter the actual values for:

```dotenv
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

Never use production secrets as placeholder examples. Start the browser client with `npm run dev:web`, sign in as the configured owner, and use the authenticated pilot bootstrap. Bootstrap creates application records only; it does not register or verify the Resend domain.

## Configure Resend explicitly

Install the official CLI package; its executable is named `resend`:

```sh
npm install --global resend-cli
resend --version
```

The npm package `resend` is the SDK, not the CLI. Configure `RESEND_API_KEY` in your local environment using your secret manager. The Hustlemail wrapper passes the key to the child process through its environment, never shell interpolation.

```sh
node packages/cli/dist/index.js status
node packages/cli/dist/index.js provision
node packages/cli/dist/index.js provision --apply
node packages/cli/dist/index.js dns
```

`provision` first checks all bounded pages needed to find the domain. Without `--apply`, a missing domain produces a plan. With `--apply`, it creates that domain with sending and receiving enabled. An existing compatible domain is preserved. If the existing domain has receiving disabled, enable it in the Resend dashboard; the current official CLI does not expose a capability-update flag. No duplicate domain is created to work around this.

Publish **the exact records returned by Resend** in the DNS zone. No hard-coded receiving host, guessed DKIM key or generic web-host CNAME is supplied. Domain DNS changes can affect existing mail, so review the current zone and preserve records needed by other services.

After DNS is published, explicitly request verification, then read its result:

```sh
node packages/cli/dist/index.js verify --apply
node packages/cli/dist/index.js status
node packages/cli/dist/index.js test
```

The last command performs read-only provider checks. It does not send. A verified provider domain is not proof of application delivery. If a real self-addressed probe is intended:

```sh
node packages/cli/dist/index.js test --send --idempotency-key pilot-probe-001
```

This sends from `notify@uncap.us` to itself. Reuse the same key only when retrying the same probe; use a new key for a genuinely new probe. Inspect Resend and the Hustlemail inbox to confirm delivery. The CLI reports provider acceptance separately from delivery confirmation.

## Attachment limits

Outgoing attachment uploads allow up to 8 MiB per file, 25 MiB total and 20 files per draft. Combined plain-text and HTML draft bodies are limited to 400,000 UTF-8 bytes. Inbound bodies become readable while attachment import completes, with up to 25 MiB per file and 100 attachments. Pending or failed attachment downloads retain an explicit recovery state; the app must not present incomplete attachments as successfully imported files.

## Native development

The Tauri project lives in `apps/native`. Read [the platform validation record](docs/VALIDATION.md) before treating a build as distributable. The available scripts include:

```sh
npm run dev:native
npm run build:native
npm run ios:init --workspace=@hustlemail/native
npm run ios:dev --workspace=@hustlemail/native
```

The iOS commands require a macOS/Xcode host. Enter the public Convex deployment URL and Clerk publishable key on the native welcome screen. Alternatively, copy `apps/native/.env.example` to an ignored `apps/native/.env.local` and set these public build-time values before building:

```dotenv
VITE_CONVEX_URL=
VITE_CLERK_PUBLISHABLE_KEY=
```

Use actual values from the selected installation. A localhost backend URL works only on the machine running that backend; another device needs a reachable HTTPS deployment. The saved connection settings are public configuration.

Native sign-in uses a Rust HTTPS transport restricted to the frontend API host encoded in the configured Clerk publishable key. Clerk's Native API must be enabled. The long-lived Clerk client token is retained in macOS/iOS Keychain or a Linux desktop Secret Service, and is never returned across the JavaScript bridge. Short-lived session tokens still authenticate the client to Convex. Server credentials such as `RESEND_API_KEY` and `CLERK_SECRET_KEY` belong only in their backend/server environments, never in a native bundle or `VITE_*` value.

The operating system credential store must be available and unlocked in the application's user session. Linux needs a running Secret Service provider on its desktop D-Bus session; Apple targets use Keychain. If secure storage is unavailable, sign-in reports an error and requires retry after restoring access. There is no plaintext file or browser-storage fallback for the long-lived client token. A remote-shell Keychain check can be denied user interaction even when a GUI application has a different security context, so validate persistence in the installed application.

The current native content policy covers the Clerk hosts used by the development pilot. A production Clerk application using a custom frontend API hostname needs that exact host added to the applicable native script/frame/connection policy before its release build is accepted. The current pilot's successful sign-in does not validate an arbitrary production hostname.

## Hosted deployment

Provision a chosen Convex cloud deployment, set its backend environment, and deploy functions there. Point web and native release configurations at that deployment and the correct Clerk application. Web hosting is independent of Resend DNS. No historical deployment URL is assumed to belong to or serve the current implementation.

Before switching any live client, complete the acceptance flow in [PLAN.md](PLAN.md), record evidence in [docs/VALIDATION.md](docs/VALIDATION.md), and verify the target environment. Native distribution also requires platform signing, update and install checks.

Provider command references: [official Resend CLI](https://resend.com/docs/cli), [domain creation](https://resend.com/docs/api-reference/domains/create-domain), [CLI source](https://github.com/resend/resend-cli).
