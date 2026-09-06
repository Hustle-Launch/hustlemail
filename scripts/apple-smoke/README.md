# Installed iOS preview smoke test

This runner drives the installed `app.hustlemail.mail` application using XCUITest. It enters the explicit sample workspace, opens a message, composes a local draft, checks keyboard layout, verifies entered fields survive closing, and follows “Open your inbox” back to connection setup. Sending is asserted disabled and is never invoked. Each run clears only the sample workspace draft.

Use a simulator installation with no saved Convex/Clerk connection settings. The test stops at the first screen if the sample entry point is absent; it does not sign in, change credentials, or operate a real mailbox. Launching an already configured app can still perform its normal startup network requests, so use the unconfigured simulator intended for this check.

## Prerequisites

- macOS with Xcode selected, its license accepted and an installed iOS simulator runtime.
- XcodeGen on `PATH` (Tauri's `ios init` installs its required project tooling).
- The Hustlemail simulator `.app` already built and installed. No signing identity is needed for the unsigned simulator package.

The tested device is iPhone 17 Pro, iOS 26.5, ID `7262E580-B494-4FD9-BE24-91A04282BA0A`. Find a different available ID with `xcrun simctl list devices available` and set `APPLE_SIMULATOR_ID`.

From the repository root on the Mac:

```sh
export PATH="$HOME/.cargo/bin:$HOME/.vite-plus/bin:/opt/homebrew/bin:$PATH"
npm run tauri --workspace @hustlemail/native -- ios init --ci
npm run tauri --workspace @hustlemail/native -- ios build --debug --target aarch64-sim --no-sign --ci
export APPLE_SIMULATOR_ID=7262E580-B494-4FD9-BE24-91A04282BA0A
xcrun simctl bootstatus "$APPLE_SIMULATOR_ID" -b
xcrun simctl install "$APPLE_SIMULATOR_ID" apps/native/src-tauri/gen/apple/build/arm64-sim/Hustlemail.app
bash scripts/apple-smoke/run.sh
```

The runner generates its Xcode project, DerivedData, test log, `.xcresult` bundle and exported screenshots in a new temporary directory and prints that path. To retain results elsewhere, set `HUSTLEMAIL_APPLE_RESULTS_DIR` to an absolute directory that does not yet exist. No generated test project or result bundle is written to the repository by default. The runner's exit status reflects test or screenshot-export failures.

If a repeated Tauri build reports `Directory not empty` while renaming its output app, preserve the previous generated `build/arm64-sim/Hustlemail.app` outside that output directory before rebuilding. This is an observed Tauri packaging-output collision; it does not require changing signing credentials.

See [Apple validation evidence](../../docs/validation/APPLE.md) for the observed build/runtime results and the separate limits on release-signing and live-mail claims.
