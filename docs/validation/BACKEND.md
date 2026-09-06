# Backend validation — 2026-09-06

The local Hustlemail pilot can authenticate, persist drafts and uploaded files, send through Resend, receive a readable message body, and retrieve the sender's actual SMTP Message-ID. Inbound attachment transfer is currently incomplete because the download host returned by Resend fails TLS from both tested machines. The application retains the body and attachment recovery state and displays the failure; it does not report those files as downloaded.

This is an isolated local QA deployment using a development Clerk account. Hosted Convex and production ownership have not been validated or changed as part of these backend checks.

## Automated checks

- `node_modules/.bin/vitest run tests/backend/mail.test.ts`: **19 passed**.
- `node_modules/.bin/tsc --noEmit -p convex/tsconfig.json`: **passed**.
- `node_modules/.bin/convex codegen --typecheck enable`: **passed** against the local deployment.
- `git diff --check -- convex tests/backend`: **passed**.

The backend tests replace HTTP requests with explicit fixtures and use `convex-test` identities. They do not send real email or use live credentials. Coverage includes:

- Anonymous and cross-user denial; owner-restricted bootstrap and import retry; draft and upload ownership.
- Bootstrap replay without overwriting mailbox settings; safe initial draft retries; UTF-8 body limits.
- Multiple-recipient routing, provider-account/message deduplication, pagination recovery, and restarting an invalid saved cursor.
- Restoring messages archived before mailbox setup.
- Shared provider request spacing and `Retry-After` backoff.
- Download failure and oversized-file recovery; visible partial bodies; resuming stored attachments without downloading completed files again; preserving read/archive flags when completion updates the same message.
- Stable outbound payload and provider idempotency key across retry, permanent rejection, worker lease recovery, and refusing automatic retry beyond the safe provider-key window.
- A 25 MiB outbound attachment payload in the Node worker.
- Retrying sent metadata lookup without resending accepted mail, then using the returned SMTP Message-ID for a reply.

## Live local evidence

The root agent exercised actual Clerk sign-in and pilot bootstrap through a signed JWT. Draft persistence across offline/reload and a small file upload also passed in the live browser. The owner-only import retry route was exercised with that signed identity and then through the local administrative CLI using the same QA identity.

One self-addressed test message with a text attachment was sent from and to `notify@uncap.us`. The local outbound queue showed `sent`, one send attempt, and a provider acceptance ID. A separate authenticated Resend GET retrieved the actual SMTP Message-ID and persisted it locally. This lookup did not submit another send.

The receive path stored the complete provider representation in Convex storage and materialized one message in the pilot mailbox. Its readable body was available with `attachmentsPending: true`, zero downloaded inbound files, and the explicit attachment transfer error. Repeated finite polls did not create a second inbound row. Completion of the inbound attachment has **not** been observed live.

Three earlier provider records were addressed outside the pilot mailbox and were not routed into `notify@uncap.us`. Their staged content remains associated with the provider account for recovery. No private message contents, account identifiers, signed download URLs, or credentials are included in this report.

## Attachment transfer limitation

The supplied download origin is `https://cdn.resend.app`. Fetching even that bare origin failed with `ERR_SSL_WRONG_VERSION_NUMBER` on the local Linux host; the Mac peer also failed TLS. `https://api.resend.com` remained reachable. Refreshing an attachment through its individual Resend API endpoint still returned the failing download origin.

The implementation keeps TLS verification enabled and does not rewrite signed URLs to another hostname. It retries the documented individual attachment endpoint when a list-supplied URL fails. Durable recovery stores each completed file, backs off after failure, and exposes owner-authorized retry. A pending attachment is never replaced with a fabricated URL or marked complete before its bytes reach storage.

## Convex reviewer outcome

The final review used the Convex reviewer skill's security, query, schema, and code-quality checklist.

- Public mailbox functions validate arguments and returns and resolve ownership from the authenticated token identifier. The public session query returns an anonymous setup state without exposing mailbox data. Bootstrap requires an explicitly configured owner; the verified-email option is an enrollment allowlist, while ongoing mailbox access uses the persisted identity and mailbox grants.
- Provider actions, ingestion, staging, outbound workers, recovery, and scheduled targets are internal. The obsolete public ingestion routes and legacy exported mail/crypto APIs are retired. The old authentication helper that matched the Clerk subject without its issuer was removed.
- Queries use indexes or search indexes. Message pagination caps both requested rows and bytes read. No unbounded database `.collect()` or database `.filter()` is used. Snooze transitions are mutations driven by the product cron, so inbox queries do not depend on a nonreactive clock read.
- Receipt completion, recipient routing, and queue state changes are transactional. Partial-body updates preserve mailbox flags; successful attachment completion explicitly clears the pending flag and error. A failed acknowledgement after a committed receipt cannot recreate a failed import.
- Provider requests share an account-scoped reservation. Poll leases, persistent page cursors, per-file staging, and a separate recovery queue make interruptions resumable. Review also identified and fixed recovery from an unavailable saved provider cursor.
- Outbound retries retain an immutable snapshot and provider key, stop after bounded send attempts, and avoid retrying after the safe idempotency window. Sent metadata recovery performs GET requests only.

No unresolved authorization or message-replay defect was found in the reviewed pilot paths. The external attachment TLS failure remains a live acceptance gap. Automated tests do not establish hosted performance, sustained load capacity, or recovery of content already expired or removed by the provider. Search indexes the first 100 KB of composed subject/sender/recipient/body text; status totals and convenience draft listings are bounded views, not an account-wide analytics system.

## Owner handoff before personal dogfooding

The current local mailbox belongs to the explicitly allowlisted QA identity. It is not automatically available to a different Clerk login, and the first person to sign up cannot claim it.

For the intended owner's account, configure the correct Clerk issuer and either `HUSTLEMAIL_OWNER_TOKEN_IDENTIFIER` or a verified `HUSTLEMAIL_OWNER_EMAIL`. Preserve the QA evidence, then use a fresh local deployment for that identity or perform a deliberate administrative ownership transfer. Merely changing the allowlist does not overwrite the domain's existing owner or mailbox grants. Keep `RESEND_API_KEY` on the backend and use a stable `RESEND_ACCOUNT_ID` for its deduplication namespace.

Before hosted or daily-use acceptance, repeat the signed-user flow under the intended owner and complete a real inbound attachment download after the provider download endpoint is reachable.

## Native authentication bridge review

The native WebKit client uses a Rust HTTPS transport for Clerk's Frontend API because browser-cookie authentication did not work reliably in the embedded webview. This review covered `apps/native/src-tauri/src/clerk.rs`, `apps/native/src/clerk-transport.ts`, their installation in `main.tsx`, and the native content security policy.

The destination is bound to the host decoded from the publishable key selected by the trusted bundled JavaScript. Rust independently requires that exact host, HTTPS on port 443, and a `/v1/` API path; it rejects credentials embedded in the URL and follows no redirects. This is a per-request key/host pairing, not a separately pinned native configuration. Credential-store entries are separated by that same normalized host. Treat the bundled renderer and its selected configuration as trusted; this transport is not a general untrusted-renderer sandbox.

The long-lived native client credential is read and updated in the operating system credential store. JavaScript cannot supply an Authorization header or cookie to the Rust request, and the response's Authorization header is not returned through the bridge. The ordinary short-lived session JWT required by Clerk and Convex still reaches their JavaScript clients. There is no plaintext credential fallback when Keychain or Secret Service is unavailable.

The review found and fixed a rotation recovery bug: previously, a truncated response body could prevent persistence of a replacement client token already issued by Clerk. The bridge now persists the rotation immediately after headers, before reading the body, while holding the request-serialization mutex. An invalid credential header or failed credential-store write fails the request without releasing a successful response to the renderer.

- `cargo test --manifest-path apps/native/src-tauri/Cargo.toml --lib clerk::tests`: **4 passed**.
- Rust formatting passed for the reviewed file.
- The new regression uses a loopback HTTP fixture that sends a rotation header and then truncates its declared response body. It confirms the credential update occurred even though the body read failed. The fixture uses no real credential store or external service and does not weaken the production transport's HTTPS requirement.
- The root agent observed actual native email/password plus test-OTP sign-in, mailbox reading, and session restoration after process restart on Linux. These runtime checks establish the tested development Clerk flow; final packaging is recorded with the native platform validation.

**Remaining production configuration gap:** native setup accepts custom Clerk frontend hosts, but the current packaged content security policy permits Clerk scripts only from `*.clerk.accounts.dev` and `*.clerk.com`. The installed Clerk script loader derives its script origin from the decoded frontend API host, so a typical custom production host such as `clerk.example.com` can be accepted by setup and then blocked from loading. The pilot uses the tested `clerk.accounts.dev` development host. Before supporting a custom production host, explicitly configure its trusted script origin or bundle Clerk's JavaScript SDK; do not describe arbitrary production publishable keys as validated by this pilot.

The JavaScript wrapper observes aborts before dispatch and after the native response. It does not cancel a Rust request already running or queued. A cancelled UI operation therefore does not guarantee that Clerk has not processed the request; credential rotation persistence remains necessary in that case.
