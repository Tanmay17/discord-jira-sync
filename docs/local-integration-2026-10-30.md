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

## First real-message acceptance check

After the candidate created a human-owned thread and posted test messages:

- Linked Jira issue: CHECKOUT-2, type Story, status Done.
- Four durable events completed; no failed or uncertain events.
- Three Discord messages matched exactly three Jira comments, each with one exact marker and original-author Discord details.
- Gracefully restarted the bot; health returned 200 after startup scan.
- Reread Jira and Postgres: same linked Story, same three comments, no duplicate marker matches, status still Done.

Machine-readable observed results: evidence/local-live-check.json. Verification script: `docker compose exec -T bot node --input-type=module < scripts/verify-live.mjs`.

Still pending: explicit !resync reply/repeat test, blocked-label addition/removal, posting while bot is stopped, private/archived coverage, mapped reporter, published image and public deployment.

## Extended acceptance and operations

- Blocked command verified: status remained Done; discord-blocked label present.
- In Progress command verified: label removed and workflow moved to In Progress.
- Stopped bot with six events/five comments, candidate posted additional messages, then restarted. Recovered nine events/eight comments, all done, every marker present exactly once, final status Done, no failed/uncertain events.
- GitHub authenticated API confirms private non-fork repository and successful hosted CI for bc1b543. Publishing failed with no Actions secrets configured; secret setup requested from candidate.
- Local database backup/restore passed. Production HTTPS Compose override validated but not deployed.
- Full automated suite after resync concurrency fix: 25 passed.

## Published image and resync acceptance

The published image tanmays321/discord-jira-sync:016a70f8f400c9487369725df9ae3c70272c1715 was pulled and started using the existing local configuration. Health returned 200. Two !resync commands received bot replies with done: 9, and Jira counts remained unchanged. To Do was subsequently tested successfully. Public hosting remains pending account/VM availability; no laptop tunnel is presented as deployment.
