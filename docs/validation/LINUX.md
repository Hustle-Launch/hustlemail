# Linux native validation

Observed on 2026-09-06 on Linux ARM64. The installed Hustlemail application authenticated against the local QA backend, displayed the real `notify@uncap.us` inbox, opened the received test message using Enter, and restored the same signed-in inbox after closing the process and launching it again.

## Build and installation

```sh
VITE_CONVEX_URL= VITE_CLERK_PUBLISHABLE_KEY= npm run desktop:build --workspace @hustlemail/native -- --bundles deb
cargo test --locked --manifest-path apps/native/src-tauri/Cargo.toml --lib
cargo fmt --manifest-path apps/native/src-tauri/Cargo.toml --check
```

The production frontend and ARM64 release build passed. The binary is approximately 8.4 MiB; the Debian package is approximately 3.7 MiB. Four Rust transport checks passed, including origin confinement and retaining rotated credentials when a response body is interrupted.

The native binary was installed at `~/.local/bin/hustlemail`, with its generated application entry at `~/.local/share/applications/Hustlemail.desktop` and its icon under the user hicolor icon directory. Launching the installed binary passed. This Arch Linux installation used the binary directly; no Debian package-manager installation or cross-distribution compatibility is claimed.

The desktop-entry template includes `%u` so registered mail links can be passed to the application. Starting the installed binary with a `mailto:` URL opened a draft containing the expected recipient, subject and body. It remained an unsent draft. The application's default mail-handler association was not changed.

## Authentication and real mail

The initial browser-cookie implementation reached the development test OTP step but returned to sign-in. The corrected implementation uses Clerk's native API and stores its persistent client credential in Linux Secret Service. The native command restricts requests to the public-key-selected HTTPS frontend API host, does not follow redirects, and never returns the persistent client credential to JavaScript. The local GNOME Keyring Secret Service was available; the app used it without a plaintext fallback.

The real native flow then passed:

1. Enter the public connection settings for the isolated local Convex/Clerk QA installation.
2. Sign in with the development QA identity using its password and supported test OTP.
3. Open the real inbox and read the self-addressed message using Enter.
4. Observe the complete text and the explicit pending-attachment state.
5. Close the native process, relaunch, and observe the signed-in inbox without another password prompt.

Screenshots: [inbox](linux-live-inbox.png), [message reader](linux-live-reader.png), [restored session](linux-session-restored.png), [installed application](linux-installed.png). Only the QA identity and self-addressed test message are shown.

The native window uses the desktop's existing appearance/opacity rules; those rules were not changed. Browser and backend validation separately established offline archive replay and updates from another client. Native background delivery, notifications after app exit, reboot recovery, attachment-download completion, other Linux architectures and production Clerk domains remain separate acceptance work. See [the backend report](BACKEND.md) for the provider CDN limitation and ownership handoff.
