# Assignment requirement audit — 2026-10-30

Source: https://github.com/jumeaucapital/engineer-hiring-exercises/tree/main/engineer-2/node/task-1-discord-jira-sync

Scope override: candidate relayed that the hiring team now requires implementation, local testing, repository check-in and sharing only. Public deployment is waived. Candidate will handle repository invitations and submission.

| Requirement | Assessment and evidence |
| --- | --- |
| Node.js, strict TypeScript, Postgres | Implemented: package.json, tsconfig.json, src/store.ts, migrations/. |
| Private independent repository, incremental commits | Previously verified private/non-fork; incremental git history present. Reviewer invitation remains candidate-owned. Original README names tech@jumeaucapital.com as collaborator. |
| Channel → existing Jira project | src/domain.ts and src/jira.ts. No project creation. Missing/inaccessible projects fail visibly and block that thread, while other threads can progress; this is the documented interpretation of logs/skips. |
| Thread → Story; reporter mapping | Implemented; Story creation verified live. Mapped reporter tested with mocked Jira requests, not live. Approved unmapped fallback verified live. |
| Message → attributed comment | Implemented and verified live. Approved bot account posts original author details. |
| Status tokens and dynamic transitions | Implemented; To Do, In Progress, Done and blocked-label clearing verified live. Unavailable-transition path is visible failure; not demonstrated live. |
| !resync summary, create missing, never delete | Implemented. Two live commands replied; existing event/issue/comment counts stayed unchanged. Scan completion queues asynchronous processing; summary describes durable states, not final completion of every write. |
| Startup/live ingestion and durable queue | Implemented with Postgres inbox, gateway and paginated scans. Live offline recovery and repeated restart verified. |
| Active/public/private archived history | Implemented; private/archived behavior not verified live. Current Discord tests cover overlapping/failed scans, not comprehensive pagination or gateway routing. |
| Idempotency and crash recovery | Journal + stable markers + reconciliation, with unit and real-Postgres tests. Live restarts/offline replay verified without duplicates. Unresolved ambiguous writes pause for operator review; automatic eventual delivery after every crash is not guaranteed. Live process-kill during an in-flight Jira request not verified. |
| Typed Jira wrapper | Implemented lookup/create/comment/status boundary in src/jira.ts. |
| Vitest/Jest, test-driven work | Vitest present. Initial tests were developed alongside implementation; historical red/green TDD is not claimed. Earlier full suite: 25 passed, including six real-Postgres tests. |
| Dockerfile and local Compose | Implemented and previously built/run, durable Postgres and non-root image. |
| GitHub CI and Docker Hub publication | Implemented; successful CI/publish evidence recorded, immutable image pulled and run locally. |
| Public host, public URL, host recovery | Waived by revised scope. Optional deployment assets retained. |
| Discord invite / sandbox demo access | Not supplied. No hosted demo required under revised scope; reviewer-owned account setup is documented. Provide access/evidence if specifically requested by the team. |
| Independent reviewer instance | README setup and published image available. A truly separate Jira/Discord integration has not been exercised. |
| Design decisions and path to production | Root design-decisions.md and README cover alternatives, scaling limits, secrets, rate limits, recovery, monitoring, migrations, security and cost. |
| Proposal, questions, daily updates | Proposal/update drafts exist. Candidate confirmed sending questions and provided answers. Sending initial proposal/daily updates is not independently confirmed; cannot be retroactively claimed. |
| AI prompts and chats | prompts/ contains visible-message/tool export and notes; exporter excludes hidden reasoning/system instructions and redacts known credential formats. Refresh and review before sharing; coverage of any other tools/sessions must be confirmed by candidate. |
| Share repository | Candidate will grant access and send the URL. Not marked completed on their behalf. |

## Fresh checks during this audit

- Lint, strict type checking and build passed.
- `npm test`: 19 passed, six database tests skipped because TEST_DATABASE_URL was not set.
- Attempted full Docker/Postgres suite could not start: Docker daemon was unavailable. This is a rerun limitation; earlier 25-test success remains historical evidence, not a fresh result.
- No running local service or health status was reverified in this audit; Docker is currently unavailable.

## Assessment

The core prototype and repository deliverable are implemented and have substantial recorded local end-to-end evidence. Do not describe every original requirement as verified: deployment was explicitly waived, reviewer access/sharing belongs to the candidate, process communication is only partially confirmed, and the live/testing limitations above remain. None of these should be concealed in the handoff.

## Follow-up after Docker restart

The database container was stopped. Started Postgres, then reran the full Docker test suite successfully: five test files, 25 tests passed, including all six real-Postgres integration tests. This supersedes the earlier database rerun limitation above.

Recreated the bot container to restore database DNS resolution. Local health returned 200. Live Jira verification: CHECKOUT-2 in Done, 11 completed events, 10 comments, exactly one marker and original author details per message; counts unchanged after recovery.
