# Local integration status — 2026-10-30

## Verified against configured accounts

- Built and started the bot and Postgres using Docker Compose.
- Local /health returned HTTP 200 with status ok; containers healthy.
- Jira authentication succeeded (HTTP 200).
- Discord bot authentication and configured guild access succeeded (HTTP 200).
- Found the proj-checkout text channel.
- Jira CHECKOUT project exists and Story issue type is available.
- Jira permissions confirmed: Browse Projects, Modify Reporter, Edit Issues, Add Comments, Create Issues and Transition Issues.
- Removed example user mapping; empty mapping intentionally uses approved Discord attribution fallback. Mapped reporter behavior still needs a real user mapping to test.
- Generated a local database password and kept credentials in ignored .env.
- Restored .env.example to placeholders after finding the bot token copied there. The configured token was already preserved in .env; no token value was printed or committed during these checks.

- Current complete suite rerun against local Postgres: **23 passed**, no skips.

## Pending live behavior

At the first check, the event inbox and issue mapping table were empty: no human-created milestone threads were available to process. Candidate was asked to create an Integration test thread in proj-checkout and post a normal message plus status: done.

Still to verify: actual Story/comment creation and transitions, blocked-label clearing, !resync reply and deduplication, offline history recovery, private/archived thread access, mapped reporter, public deployment and image publication. Health 200 demonstrates readiness, not completed Jira mutations.

Read-only diagnostics can be rerun with:

```sh
docker compose exec -T bot node --input-type=module < scripts/check-connections.mjs
```

This prints HTTP status/permission results, not credentials. Keep the local bot running while conducting the manual Discord acceptance checks.
