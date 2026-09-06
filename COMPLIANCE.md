# Engineering readiness

The February “73% compliance” report measured coding conventions and included unverified claims. It is [archived](docs/archive/2026-02-COMPLIANCE.md); its score is not a security audit or release certification.

Current acceptance is based on observable behavior:

- The configured owner alone can bootstrap and access the pilot mailbox.
- Receiving stores messages idempotently; finite polling records failures without inventing successful ingestion.
- Sending validates mailbox ownership and distinguishes queued, accepted, delivered and failed states.
- Client rendering treats email content as untrusted, and credentials stay on the server.
- The CLI validates declarative data, preserves existing config, performs read-only inspection by default, and requires explicit flags for provider writes and probes.
- Web and each native target have separate build, runtime and distribution evidence.

See [the implementation checklist](TODO.md) and [validation record](docs/VALIDATION.md). Passing automated checks does not replace live provider, owner-isolation or signed-device validation.

Styling conventions such as folder placement or send-button alignment are not substitutes for reliable delivery and access control. Historical business projections and example domains are not current requirements.
