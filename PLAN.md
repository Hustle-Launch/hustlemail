# Current implementation plan

Accepted on 2026-09-06. [Product decisions](docs/DECISIONS.md) supersede earlier plans.

1. Make the `notify@uncap.us` mailbox real: authenticated access, persistent messages and actions, bounded Resend receiving, idempotent outbound delivery and explicit failure states.
2. Complete the shared keyboard-first workspace: inbox, message reading, compose/reply/forward, search, mailbox actions and Superhuman-style shortcuts with visible help.
3. Connect the workspace to web and Tauri applications. Validate Linux locally; validate macOS and iOS on the required Apple toolchain and devices. Distribution requires separate signing and release checks.
4. Replace misleading setup and configuration paths with a strict declarative config, idempotent bootstrap, accurate status and explicit provider mutations.
5. Record automated checks and live delivery evidence separately. A fixture test, provider acceptance response or web build is not a successful native-device delivery test.

## Release acceptance

The pilot must support an authenticated owner receiving an actual message at `notify@uncap.us`, reading it, replying, and observing persistent state after a reload. Outbound retries must not duplicate the same send. Receiving retries must not duplicate stored provider messages. Another user must not access the pilot mailbox.

Account credentials, verified DNS, platform toolchains and device signing are external prerequisites. The code and documentation must show their absence accurately instead of generating sample mail or reporting simulated success.
