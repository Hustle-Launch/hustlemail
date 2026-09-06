# Configuration and provider CLI

Build with `npm run build --workspace=@hustlemail/config` followed by `npm run build --workspace=@hustlemail/cli`. Invoke the built entrypoint as `node packages/cli/dist/index.js`; a linked/package-installed binary is named `hustlemail`.

| Command                     | Default behavior                                                        | Explicit write                                                                   |
| --------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `setup [domain]`            | Create local pilot config if absent; otherwise validate and preserve it | Exclusive file creation only                                                     |
| `config validate`           | Read literals, validate schema and supported pilot scope                | None                                                                             |
| `config export`             | Print normalized JSON with credential references                        | `--output file.json` creates a new file, refusing overwrite                      |
| `config import source.json` | Plan a local create/replace/unchanged operation                         | `--apply`; replacing differs requires `--apply --replace` and preserves a backup |
| `status`                    | Read domain/capability status from Resend                               | None                                                                             |
| `dns`                       | Read exact DNS records returned by Resend                               | None                                                                             |
| `provision`                 | Inspect existing domain and show a creation plan if absent              | `--apply` creates a missing Resend domain                                        |
| `verify`                    | Show the domain verification request plan                               | `--apply` asks Resend to begin asynchronous verification                         |
| `test`                      | Read provider verification and capabilities                             | `--send --idempotency-key key` sends a probe to the pilot mailbox                |

`--config path` selects the config. The default is `mail.config.ts`. `.json` files are also supported. `config import` uses `--config` as the destination. Import/export are local operations and never create Convex accounts, modify mailbox state, or deploy polling schedules. The current bootstrap hard-codes `uncap.us`, `notify`, and the display name `Notifications`; `outbound.fromName` and box display names in an imported file are portable metadata, not applied runtime settings. Changing them does not change the sender header or an existing mailbox.

## Accepted file syntax

The TypeScript form is one literal default export, optionally passed to `defineMailConfig`, with an optional import of that helper from `@hustlemail/config`. Object/array/string/number/boolean/null literals are accepted. Environment lookups, other imports, executable expressions, getters, shorthand properties, spreads and computed keys are rejected rather than evaluated. Unknown settings are validation failures.

Credential values must already be available to the process through the configured environment reference. Resend invocations use a separate argument array and `shell: false`; secrets are passed through the environment. Child errors are reported without reproducing secret-bearing stderr or commands.

## Failure semantics

Status returns nonzero when the provider is absent or not ready. A missing API key, missing CLI, invalid response, failed request or incomplete domain listing is a failure, not a skipped success. Pagination is bounded; reaching the bound fails rather than creating a duplicate domain.

DNS records come from the provider, not hard-coded examples. No CLI command alters DNS. Provisioning preserves existing compatible domains. If capabilities on an existing domain need changes, the wrapper explains the Resend-dashboard action instead of pretending unsupported CLI flags succeeded.

A test-send reports provider acceptance only. The caller must inspect the actual inbox to establish delivery. Reuse a probe idempotency key only for retries of the same logical probe.

The old `deploy`, `logs` and `users` commands printed simulated results or mixed unrelated infrastructure changes. They are no longer exposed; unknown commands fail. Use actual Convex/platform tooling and the documented authenticated app workflow.
