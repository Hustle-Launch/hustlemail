# Apple platform validation

Validation date: 2026-09-06. These checks use the installed native application and local sample data. No Resend secret, Clerk credential, real mailbox, Apple signing certificate or release account was transferred to the Mac.

## Environment

- Host: `m1pro-13`, Apple Silicon, 16 GB RAM.
- Isolated build checkout: `/Users/hustlelaunch/Projects/hustlemail-codex-build`.
- Node 24.20.0, npm 11.19.0, Rust 1.98.1, Tauri CLI 2.11.4.
- Xcode 26.6 (17F113); iOS 26.5 simulator, iPhone 17 Pro.
- Simulator ID: `7262E580-B494-4FD9-BE24-91A04282BA0A`.
- Application identifier: `app.hustlemail.mail`; version: `0.2.0`.

The Mac shell needs the installed tool locations explicitly:

```sh
export PATH="$HOME/.cargo/bin:$HOME/.vite-plus/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$HOME/Projects/hustlemail-codex-build"
```

Source was copied without `.env*`, `.git`, `node_modules`, `target`, `gen` or `dist`. Dependencies were installed on the Mac; the final install reported zero npm vulnerabilities. Native builds share the React mail workspace used by the web application.

## macOS

```sh
npm run tauri --workspace @hustlemail/native -- build --bundles app
```

The final release build, including the native Clerk HTTPS transport and Apple Keychain integration, produced `apps/native/src-tauri/target/release/bundle/macos/Hustlemail.app`. It was installed locally as `/Users/hustlelaunch/Applications/Hustlemail Dogfood.app` and launched. Process inspection and the window server confirmed active PID `1618` with one visible application window. The installed executable SHA-256 is `ddbedadfcacac6f63e8694ee6367fb8f8dd6d6982dd2f5f29c5dcd5584f5e569`. The final build log is `validation-artifacts/macos-native-auth-build.log`.

The generated bundle needed an ad-hoc bundle signature for this local installation; its initial linker signature failed strict bundle verification. The installed copy passed after:

```sh
codesign --force --deep --sign - "$HOME/Applications/Hustlemail Dogfood.app"
codesign --verify --deep --strict "$HOME/Applications/Hustlemail Dogfood.app"
open "$HOME/Applications/Hustlemail Dogfood.app"
```

This is local ad-hoc signing, without a Developer ID or notarization. macOS window capture was unavailable under the host's existing screen-capture permissions, so no macOS screenshot or visual interaction pass is claimed.

## iOS

```sh
npm run tauri --workspace @hustlemail/native -- ios init --ci
npm run tauri --workspace @hustlemail/native -- ios build --debug --target aarch64-sim --no-sign --ci
xcrun simctl boot 7262E580-B494-4FD9-BE24-91A04282BA0A
xcrun simctl bootstatus 7262E580-B494-4FD9-BE24-91A04282BA0A -b
xcrun simctl install 7262E580-B494-4FD9-BE24-91A04282BA0A apps/native/src-tauri/gen/apple/build/arm64-sim/Hustlemail.app
xcrun simctl launch 7262E580-B494-4FD9-BE24-91A04282BA0A app.hustlemail.mail
```

Initialization, unsigned simulator compilation, installation and launch passed. The generated Xcode project lives in the ignored `apps/native/src-tauri/gen/apple` directory. Initialization installed the required Apple Rust targets and XcodeGen tooling. The absent signing-team warning is expected for this simulator-only check.

The first installed launch displayed the public connection settings form correctly. After rebuilding with the completed shared workspace, a standalone XCUITest runner drove normal accessibility controls on the installed simulator app. Both tests passed (2 tests, 0 failures):

1. Open the sample inbox, read a message, return, open navigation, compose, type recipient/subject/body, verify that sending is disabled, check that the header and footer remain above the software keyboard, save/close, and reopen to confirm the exact entered values.
2. Follow the preview's “Open your inbox” link and verify that public connection setup appears again. The native route does not become a blank or missing-asset page.

The reusable runner is [scripts/apple-smoke](../../scripts/apple-smoke/README.md). Its final run, after rebuilding with the native authentication implementation, is retained in `validation-artifacts/ios-native-auth-preview`: `result.xcresult`, `summary.json`, `test.log` and exported screenshots. The final package build log is `validation-artifacts/ios-native-auth-build.log`. The copied [test summary](ios-test-summary.json) records 2 passed, 0 failed and 0 skipped tests. Screenshot evidence from that final run: [inbox](ios-inbox.png), [reader](ios-reader.png), [composer with keyboard](ios-compose.png), [return to setup](ios-return-to-setup.png).

The inbox's first status-bar overlap was corrected with safe-area spacing. Keyboard-open screenshots then exposed a composer scrolling issue: its header could move offscreen and its footer could sit behind the input accessory. The shared workspace now follows the mobile visual viewport, keeps its title/footer separate from scrollable content and prevents small-input zoom. The corrected screenshot shows the title, recipient, subject, body and footer above the keyboard; the actual simulator tests pass the corresponding geometry checks.

The final Apple packages include the Clerk challenge/worker CSP fixes and native authentication transport, including the credential-rotation ordering fix. After those builds, the Linux-only desktop-entry template and its configuration reference were copied to the Mac checkout; they do not change Apple application behavior. A checksum comparison then found no differences between the local and Mac copies of `apps/native`, the shared workspace or `scripts/apple-smoke` (excluding generated output and environment files).

Repeating the Tauri simulator packaging command encountered a generated-output collision (`Directory not empty` when renaming `Hustlemail.app`). Moving the previously generated `build/arm64-sim/Hustlemail.app` into the isolated checkout's `validation-artifacts` directory allowed the next build to pass, while preserving the prior package. No source or signing setting needed changing.

## Scope of this evidence

These checks do not establish authenticated Clerk sign-in, Keychain session persistence, live Convex connection, provider delivery, device push notifications, background mail delivery, physical-device installation, TestFlight/App Store release, Developer ID distribution or notarization. Native authentication and Apple Keychain code compiled for both targets, but the installed Apple apps were tested without credentials. A separate temporary Keychain probe from SSH was denied user interaction; no privacy setting or keychain was changed, and this remote-shell result does not establish GUI application behavior. A simulator build and a local ad-hoc macOS launch establish different things from distributable signed releases.

Build logs, Xcode test result bundles and the standalone UI runner are retained in `validation-artifacts` inside the isolated Mac checkout. Screenshots in this directory contain only public setup fields and sample mail.
