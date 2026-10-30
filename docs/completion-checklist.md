# Assignment completion checklist

Review date: 2026-10-30. See local-integration-2026-10-30.md for account checks; core live mutations and offline recovery verified; publishing verified; public host remains pending. This is a status inventory, not a fresh rerun of validation.

Legend: checked = completed with available evidence; unchecked = pending or unverified. Implementation does not imply real-account acceptance. Local validation recorded on 2026-10-28: 20 tests passed, ESLint/typecheck/build passed, Compose validated, production image built and connected to Postgres as a non-root user. See validation.md.

## 1. Requirements and communication

- [x] Read the assignment README and identify required deliverables.
- [x] Draft initial understanding, design, assumptions, questions and scope cuts.
- [x] Prepare clarification email covering attribution, blocked status, missing mappings, private threads and ambiguous Jira writes.
- [x] Candidate reports sending the clarification questions to the hiring team.
- [x] Receive and record clarification answers (2026-10-30).
- [ ] Confirm whether the full initial design proposal was also shared.
- [x] Update missing-user behavior, regression tests and clarification documentation.
- [x] Bot attribution, unmapped authors and blocked-label clearing verified on real accounts.
- [ ] Verify remaining command/private-thread/mapped-reporter cases.
- [x] Draft a progress update.
- [ ] Send actual daily updates during remaining work; the saved draft is not a sent update.
- [x] Record design choices and accepted tradeoffs in design-decisions.md.

## 2. Repository and developer setup

- [x] Connect to Tanmay17/discord-jira-sync and preserve the initial commit.
- [x] Push incremental implementation/documentation commits to main.
- [x] Configure TypeScript strict mode, ESLint, build and test scripts.
- [x] Specify Node 22.12+ and provide .nvmrc.
- [x] Commit package lockfile for reproducible installs.
- [x] Provide environment and user-map examples; ignore real .env and mapping files.
- [x] Confirm private repository and not a fork via authenticated GitHub API.
- [ ] Grant hiring-team repository access; obtain GitHub username if email invite is unavailable.
- [x] GitHub-hosted CI passed for bc1b543; rerun/check latest pushed changes.
- [ ] Configure branch protection / required checks.

## 3. Jira client and sync engine — implementation complete, live verification pending

- [x] Implement thin typed Jira Cloud REST v3 wrapper.
- [x] Resolve existing project; do not create projects.
- [x] Find/create Story for milestone thread and map reporter account.
- [x] Persist Discord-thread to Jira-issue link.
- [x] Create author-attributed comment bodies with timestamp and source URL.
- [x] Parse supported status commands; keep the comment before applying status.
- [x] Discover transitions dynamically by destination name.
- [x] Represent blocked with discord-blocked label; clear it on another supported status.
- [x] Preserve Discord details for unmapped users; detect definitive API failures visibly.
- [x] Journal mutation intent before remote writes; remember completed writes.
- [x] Reconcile stable issue/comment markers and expected status after ambiguous outcomes.
- [x] Hold unresolved writes instead of blindly retrying them.
- [ ] Validate all of the above against real Jira permissions, fields and workflows.
- [x] Record hiring-team attribution, blocked and read-before-retry guidance.
- [ ] Validate recovery against real Jira; unresolved absent markers still require operator review.
- [ ] Harden Retry-After handling if needed; current retry uses capped exponential backoff with jitter rather than honoring server delay exactly.

## 4. Discord ingestion — implementation complete, live verification pending

- [x] Listen for relevant thread/message events using discord.js.
- [x] Allowlist configured guild and map supported proj-* text channels to Jira keys.
- [x] Scan history on startup and periodically for recovery.
- [x] Enumerate active and archived public/private threads with pagination.
- [x] Fetch message history in pages and enqueue oldest first.
- [x] Ignore bot messages and bot-created threads.
- [x] Implement !resync scan and in-channel durable queue summary.
- [ ] Verify gateway intents, thread visibility and permissions on a real server.
- [x] Two resync commands received summaries explaining asynchronous processing; counts stayed unchanged.
- [x] Record delegated thread-scope decision: support visible public/private threads.
- [ ] Verify permissions and unsupported project channel handling live.

## 5. Postgres durability and recovery

- [x] Add initial schema for durable events, mutation journal and issue mappings.
- [x] Deduplicate queued events by stable Discord IDs.
- [x] Use a dedicated advisory lock for one active process per database.
- [x] Serialize work and hold later messages behind unresolved earlier events in the same thread.
- [x] Allow unrelated threads to continue while one thread is held.
- [x] Add retry scheduling and inspectable failed/uncertain states.
- [x] Document operator reconciliation and graceful shutdown.
- [x] Test real Postgres ingestion deduplication, persistence, replay, ambiguous issue/comment recovery and ordering.
- [x] Stop/offline-post/restart recovery verified: events grew from 6 to 9; comments from 5 to 8, one per message.
- [ ] Test process termination during a real remote write and inspect/reconcile outcome.
- [x] Local backup restored into temporary database with matching row counts.
- [ ] Verify production host storage and backup/restore after deployment.

## 6. Local testing and packaging

- [x] Current suite: 19 unit tests and six real-Postgres integration tests passed (25 total).
- [x] Six real-Postgres integration tests passed at recorded validation.
- [x] ESLint and strict TypeScript check passed.
- [x] Production TypeScript build passed.
- [x] Docker Compose configuration validated.
- [x] Multi-stage production Docker image built on Node 22.
- [x] Production image ran as uid 1000 and applied migration/connected to Postgres.
- [x] Dependency audit reported zero known vulnerabilities at validation time.
- [x] Full current suite after resync fix: 25 passed (19 unit + six Postgres); lint/typecheck and Docker build passed.

## 7. External accounts and configuration

- [x] Create/configure Jira Cloud sandbox and CHECKOUT software project.
- [x] Verify Story type and required Jira permissions.
- [ ] Verify actual reporter, labels and workflow transitions through live writes.
- [x] Configure Jira authentication; required project permissions verified.
- [ ] Review least-privilege account/token scope before deployment.
- [x] Create Discord test server, application and bot.
- [x] Bot connects and startup scan succeeds.
- [x] Real human-posted thread messages were read, synced and transitioned successfully.
- [ ] Verify private/archived thread permissions live.
- [x] Create proj-checkout text channel; verified via Discord API.
- [x] Create human-owned test thread; CHECKOUT-2 Story and three comments verified.
- [ ] Populate real Discord-to-Jira user mappings.
- [x] Configure ignored local .env with real credentials.
- [ ] Configure deployment host secrets.
- [x] Docker Hub account/repository and publishing token configured.
- [ ] Select persistent public deployment host or request the offered VM.

## 8. CI/CD and deployment

- [x] Commit push/PR CI workflow with Postgres service, lint, full tests and build.
- [x] Commit main-branch Docker Hub build/push workflow with latest and SHA tags.
- [x] Implement /health readiness endpoint and Docker health check.
- [x] Provide Compose with persistent Postgres volume and restart policy.
- [x] Write host deployment and rollback runbook.
- [x] Set both Docker Hub repository secrets; confirmed names without reading values.
- [x] CI and Docker Hub publishing passed for 7946743; image includes linux/amd64 and linux/arm64.
- [x] Docker Hub API confirms public repository and active full-SHA image tag.
- [x] Published full-SHA image pulled and run against configured accounts: health 200, unchanged Jira counts.
- [ ] Deploy image with real secrets, mappings and durable Postgres storage.
- [ ] Configure HTTPS/firewall; keep database private.
- [ ] Verify public /health returns 200 and degraded dependencies produce appropriate readiness behavior.
- [x] Graceful local bot restart: health 200, same issue/comment counts after backfill.
- [x] New messages posted during local bot downtime recovered once, and a further restart preserved counts.
- [ ] Verify deployment host restart recovery.
- [ ] Record actual public URL and image reference in README.
- [ ] Automate host rollout only if desired; current CD publishes an image, while host deployment is manual.

## 9. Reviewer acceptance — all must be verified live

- [ ] Reviewer can visit public /health and receive 200.
- [ ] Reviewer can join the test Discord server.
- [x] Human-owned thread creates one Jira Story (CHECKOUT-2).
- [ ] Verify explicitly mapped reporter; current live test uses approved unmapped fallback.
- [x] Each of three Discord messages has exactly one Jira comment with author details.
- [x] Test status command recorded as comment and CHECKOUT-2 verified in Done.
- [x] blocked adds label, in_progress removes it and transitions; done verified.
- [x] To Do transition verified live on the published image.
- [x] Two !resync commands each received a done: 9 summary.
- [x] Jira counts unchanged after repeated resync: one issue, eight comments, nine completed events.
- [x] Messages posted while bot was stopped recovered once on restart.
- [ ] Archived/private-thread coverage is verified to the agreed scope.
- [ ] Missing project/user mapping and unavailable transition behavior is demonstrated.
- [ ] Fresh clone + published image + independent configured integration works from README.
- [ ] Capture redacted Jira screenshots or a short demo recording.

## 10. Documentation, AI record and final handoff

- [x] README includes architecture, setup, limitations, further advancements and production-readiness discussion.
- [x] Document secrets, rate limits, recovery, monitoring gaps, migrations, security and cost.
- [x] Commit actual visible-message/tool transcript snapshot and export script in prompts/.
- [x] Exclude hidden model reasoning and system/developer messages from export.
- [ ] Export subsequent conversation/work before final submission and review all exports for secrets.
- [ ] Add live health URL, valid Discord invite, published image and demo evidence.
- [ ] Update progress/status documents after accounts, clarification and deployment are complete.
- [x] Update current documentation to reflect received clarification replies; retain dated historical drafts.
- [ ] Candidate reviews architecture, failure modes, code and operational limits for interview discussion.
- [ ] Final clean-install/checks, reviewer access check and submission message.

## Recommended next order

1. Finish Docker Hub/GitHub secret setup and choose a public host.
2. Verify real !resync replies and remaining status/thread/reporter cases.
3. Publish the image after full CI checks; pull it independently.
4. Deploy publicly, verify health/recovery and collect screenshots.
5. Finish invite/reviewer access, URLs, transcripts and submission review.

Overall: core implementation and recorded local validation are done. Real integration, hosted delivery and submission acceptance remain open. No numerical completion percentage is assigned because those open steps can reveal implementation changes.

Hosting decision: Oracle account setup deferred by the user on 2026-10-30. Public deployment, DNS/TLS and reviewer access remain pending until a VM is available.
