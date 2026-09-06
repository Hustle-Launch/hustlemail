# Implementation and acceptance checklist

Updated 2026-09-06. Checked items have the evidence described in [docs/VALIDATION.md](docs/VALIDATION.md); automated checks and live observations remain distinct.

## Completed implementation and validation

- [x] Resend-only configuration and credential environment references; no AI, SMTP host or external-account settings.
- [x] Literal-only TypeScript reader, JSON import/export and idempotent setup that preserve existing configuration.
- [x] Read-only provider status/DNS, explicit provisioning/verification and explicit idempotent test-send semantics; no simulated deployment or user commands.
- [x] Pass 81 JavaScript/TypeScript tests: 37 config/CLI, 19 backend, 18 workspace, 3 sanitizer and 4 native transport tests; separately pass 4 Rust authentication tests.
- [x] Pass Convex/web/native typechecks, package builds, final web build and native frontend build.
- [x] Authenticate the local QA owner using Clerk password/test OTP and a signed JWT; bootstrap `notify@uncap.us` in the local deployment.
- [x] Send a real self-addressed pilot message, retrieve its actual SMTP Message-ID and receive its readable body without duplicate inbound rows.
- [x] Download the uploaded sent-side attachment byte-exactly (59 bytes).
- [x] Queue archive with `E` offline and persist it on reconnect; observe archive/restore reactively from an independent second client.
- [x] Exercise anonymous/cross-user denial, ownership, retry/idempotency, partial-file recovery and invalid-cursor recovery in automated backend tests.
- [x] Run browser sample-workspace interaction checks; authenticate the compiled native bundle under its exact CSP without CSP console errors.
- [x] Build and install the Linux ARM64 native binary and desktop launcher; produce its Debian package and verify a mailto launch populates an unsent draft.
- [x] Sign in inside the actual Linux native app, read the real pilot message and restore the authenticated inbox after a process restart.
- [x] Build/install/launch the macOS app with a verified local ad-hoc signature; record the limits on visual and signed-release evidence.
- [x] Build/install/launch the unsigned iOS simulator app; pass 2 UI tests covering reading, keyboard-safe composition, draft reopening and return to setup.
- [x] Preserve the portable Apple UI runner and platform screenshots/reports.

## Remaining pilot acceptance

- [ ] Hand off the local mailbox from its QA identity to the intended owner through a fresh deployment or deliberate administrative transfer, then repeat signed-user acceptance.
- [ ] Correct the development Clerk application's remaining CodeMail display name.
- [ ] Resolve the Resend download-origin TLS failure and observe byte-complete inbound attachment recovery without duplicating messages or resetting mailbox flags.
- [ ] Exercise real authenticated mail in the macOS and iOS applications, including attachments and reconnect behavior.
- [ ] Complete live reply/forward/threading, search and mailbox-action acceptance beyond the specific recorded flows.
- [ ] Complete prolonged operation and interruption recovery in the chosen daily-use environment; fixture-based retry tests are not live outage evidence.

## Release gates

- [ ] Configure and validate the native content policy for the chosen production Clerk frontend API hostname.
- [ ] Choose and validate hosted Convex/web deployment, production Clerk configuration and final ownership; no hosted deployment has been published.
- [ ] Validate physical iOS devices and Apple distribution signing/notarization as applicable.
- [ ] Validate installer installation/update behavior and supported Linux architectures, then publish the intended distribution artifacts.
- [ ] Recheck the remaining acceptance gates against the actual release build before claiming production readiness.

Configuration import currently changes a local bootstrap file. It does not change live Convex mailbox settings, provider accounts or deployed polling. Historical February completion checkmarks remain archived and are not release evidence.
