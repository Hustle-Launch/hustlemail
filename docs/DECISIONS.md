# Accepted product decisions

Accepted from the user on 2026-09-06. These decisions supersede the documents in `docs/archive`.

| Decision                                      | Consequence                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Product: Hustlemail                           | The active repository is `~/Projects/hustlemail`                                      |
| No AI                                         | No classifiers, assistants, AI settings or external model calls                       |
| Resend for all send/receive                   | No SMTP server to host and no external Gmail/Outlook account connections              |
| Finite Convex polling                         | Each scheduled job performs bounded work and returns                                  |
| Sole pilot mailbox: `notify@uncap.us`         | Bootstrap and operational config validation enforce the pilot boundary                |
| Superhuman-style shortcuts                    | Keyboard navigation and command help are part of the client                           |
| Web, iOS, macOS and Linux native applications | Every target needs its own build/runtime validation; Apple targets need Apple tooling |

Configuration portability means normalized data and credential references can be exported and reviewed. It does not imply account signup, automatic DNS authority, cloud deployment, or native signing can be performed without their prerequisites.
