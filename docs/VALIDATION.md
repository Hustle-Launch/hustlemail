# Validation record

Updated 2026-09-06. The local QA web installation can authenticate, send a real pilot message, receive its readable body, and persist mailbox changes across offline recovery and separate clients. The installed Linux app authenticates, reads the same mailbox and restores its session after restart. Apple builds and iOS preview checks pass. Inbound attachment transfer, personal owner handoff and production distribution remain acceptance gaps.

## Automated checks and builds

The root JavaScript/TypeScript test run passed **81 tests**:

| Suite                  | Passed | Scope                                                                                                   |
| ---------------------- | -----: | ------------------------------------------------------------------------------------------------------- |
| Configuration and CLI  |     37 | Literal-only parsing, validation, safe process arguments, preservation and explicit provider operations |
| Convex backend         |     19 | Identity boundaries, routing, deduplication, partial imports, cursor recovery and outbound retries      |
| Mail workspace         |     18 | Client mailbox behavior, drafts, addressing, attachment links and keyboard actions                      |
| HTML sanitizer         |      3 | Unsafe content and remote-content handling                                                              |
| Native Clerk transport |      4 | Frontend host validation, native request routing and credential-header handling                         |

Separately, **4 Rust authentication tests passed**, including persistence of a rotated client token before a truncated response body fails. Run them with `cargo test --manifest-path apps/native/src-tauri/Cargo.toml --lib clerk::tests`.

These tests use temporary files, fixture HTTP responses, simulated identities or client state. They do not establish live provider delivery. The separate live observations below do.

Observed commands passed:

```sh
npm run build --workspace=@hustlemail/config
npm run build --workspace=@hustlemail/cli
npm run config:validate
npm run typecheck
npm test
npm run build:web
npm run build --workspace=@hustlemail/native
```

`typecheck` covers Convex, web and native TypeScript. Backend code generation with typechecking also passed. Configuration validation accepts the fixed one-mailbox `uncap.us` pilot. Config and CLI tests do not mutate live provider state; their provisioning and test-send checks use a fake provider runner.

The [browser regression record](validation/web-regression.json) contains 11 passing checks on the sample workspace, including archive/undo, keyboard help, saved drafts, theme persistence, mobile navigation and composer resizing. It records no page errors or console errors; the development Clerk instance emits its expected development-key warning. The iOS tests below are a separate installed-app check.

## Authenticated local web and mail behavior

These checks used the isolated local Convex deployment and an explicitly allowlisted development Clerk QA identity:

| Check                              | Observed result                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Clerk sign-in and ownership        | Password plus test OTP completed; a signed Clerk JWT authenticated the Next.js `/mail/inbox` route and pilot bootstrap                          |
| Outbound delivery                  | A message from `notify@uncap.us` to itself was accepted by Resend, recorded as sent after one attempt, and received back into the pilot mailbox |
| Provider identity                  | A subsequent read retrieved the actual SMTP Message-ID without resending the accepted message                                                   |
| Readable inbound content           | The received body is stored and readable; repeated finite polls preserve one inbound row                                                        |
| Uploaded attachment                | The uploaded, sent-side attachment downloaded from application storage matched its original **59 bytes** exactly                                |
| Offline mailbox action             | Pressing `E` while offline queued archive; reconnecting persisted the change                                                                    |
| Independent client synchronization | Archiving from a second client removed the row in the first client; restoring it made the row reappear                                          |
| Native frontend CSP                | The compiled native bundle, served in a browser with its exact Content Security Policy, authenticated successfully with zero CSP console errors |

The sent-side attachment download does **not** establish inbound attachment transfer. The incoming copy still has pending files because the provider download origin fails TLS. The browser exercise of the native bundle's policy also does **not** establish authenticated behavior in an installed OS webview.

Anonymous/cross-user denial, draft and upload ownership, owner-only bootstrap/retry, replay safety and worker recovery passed automated backend checks. These checks use explicit signed/fixture identity boundaries; they do not claim a production penetration test or prolonged live failure campaign. See [the backend report](validation/BACKEND.md) for live provider observations, recovery behavior and the review outcome.

## Native platform evidence

| Target              | Observed result                                                                                                                                                                                                                                                       | Remaining boundary                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux ARM64         | The 8.4 MiB release binary was installed with a desktop launcher; a 3.7 MiB Debian package was built. The app signed in, read the real pilot message and restored its authenticated inbox after process restart. A mailto launch populated an unsent draft correctly. | Package-manager installation, other Linux architectures and production distribution are not established here.                                  |
| macOS Apple Silicon | Final release `.app` built, installed locally and launched; strict verification of its local ad-hoc signature passed. Process/window inspection confirmed one active visible window.                                                                                  | Screen capture was unavailable under existing permissions. Authenticated mail workflow, Developer ID signing and notarization were not tested. |
| iOS simulator       | Unsigned app built, installed and launched on iPhone 17 Pro / iOS 26.5. **2 of 2 XCUITests passed**: sample reading/composition, software-keyboard layout, draft reopening and preview-to-setup navigation.                                                           | No authenticated live mail on iOS, physical-device test or distribution signing is claimed.                                                    |

Linux build outputs are `apps/native/src-tauri/target/release/hustlemail` and `apps/native/src-tauri/target/release/bundle/deb/Hustlemail_0.2.0_arm64.deb`. The installed executable is `/home/michael/.local/bin/hustlemail` with SHA-256 `fc9b815e2677ec52a30ebfef431d9de29405beb30e32fa609116a53ddb1956cc`; the package SHA-256 is `2ef8657d1fcf3c3a3ee894814404c7bddba63f8d95242e4af4e7b5688590128c`. Their existence and launch do not imply a published installer.

The [Linux report](validation/LINUX.md) records installation and secure-storage behavior. Screenshots show the [authenticated inbox](validation/linux-live-inbox.png), [message reader](validation/linux-live-reader.png), [restored session](validation/linux-session-restored.png), [installed app](validation/linux-installed.png) and [unsent mailto draft](validation/linux-mailto-draft.png).

The [Apple report](validation/APPLE.md) records exact tooling, commands, installed paths, executable hash and source parity. The [portable Apple runner](../scripts/apple-smoke/README.md) preserves test results outside the repository by default and only acts in the explicit sample workspace. Screenshots show the [iOS inbox](validation/ios-inbox.png), [reader](validation/ios-reader.png) and [composer with its software keyboard](validation/ios-compose.png); the [test summary](validation/ios-test-summary.json) records two passed and zero failed tests.

## Remaining acceptance work

- **Complete inbound attachments.** `cdn.resend.app` fails TLS from both tested Linux and Mac hosts while the Resend API remains reachable. Refreshing the individual attachment URL returns the same failing origin. Bodies remain readable, completed files retain durable progress and pending files expose recovery state. TLS verification remains enabled; byte-complete incoming attachment recovery has not been observed live.
- **Hand off ownership.** The current mailbox belongs to the allowlisted QA identity, not automatically to the intended personal Clerk login. Configure the intended identity and use a fresh deployment or deliberate administrative ownership transfer; changing the allowlist alone does not overwrite existing ownership. Preserve the QA evidence. [Handoff details](validation/BACKEND.md#owner-handoff-before-personal-dogfooding).
- **Update dependency branding.** The recovered development Clerk application still displays the old **CodeMail** name. Its provider-side display name needs to match Hustlemail before personal or production handoff.
- **Finish native authenticated acceptance.** Linux sign-in, real-message reading and authenticated process restart passed. macOS and iOS evidence currently covers launch or sample data. Live native sending and full attachment/reconnect acceptance remain separate gates.
- **Configure production native auth hosts.** The bundled policy covers the current development Clerk hosts. A custom production frontend API host requires an explicit policy update and validation; the successful pilot sign-in does not cover it.
- **Validate the selected hosted environment and release path.** No hosted deployment or production release was published. Production credentials/ownership, Apple distribution signing, physical-device testing, installer distribution, sustained operation and interruption recovery require evidence in the chosen environment.

The current results establish a functioning local pilot with specific tested boundaries. They do not convert the archived prototype completion claims into production readiness.
