# Discord → Jira sync

TypeScript/Node service that mirrors Discord project activity into existing Jira Cloud projects using Postgres as a durable inbox and mutation journal.

**Delivery status:** implemented locally; account setup and live acceptance are pending. Public health URL: **pending deployment**. Discord invite: **pending server setup**. Published Docker Hub image: **pending account/CI secrets**. Do not submit these placeholders as a completed live demo.

## Behavior

- `proj-checkout` maps to Jira project `CHECKOUT`; thread maps to a Story with the mapped thread creator as reporter when available; unmapped authors remain identified in the description and Jira supplies the reporter default.
- Human messages become comments with author, Jira account, source URL and timestamp. The actual Jira comment account is the integration account.
- `status: todo|in_progress|done` resolves available transitions by target status name. Last supported token wins.
- `status: blocked` adds `discord-blocked`; another supported status removes it.
- `!resync` scans project history and replies with durable queue counts. Processing is asynchronous. Existing events and successful mutations are deduplicated. Missing Jira projects fail visibly without project creation. Missing user mappings retain Discord author details and do not block sync.
- Startup and five-minute recovery scans enumerate active and archived public/private threads, replay messages oldest first, and ignore bot-created threads/bot messages. Only guild text project channels are supported. Channel suffixes must contain a letter followed by alphanumerics; unsupported names are skipped.

## Architecture and recovery

Discord gateway + paginated scans → Postgres `events` → ordered single worker → mutation journal → Jira REST v3. The database advisory lock permits only one active instance per database. Backfill completes before the worker starts processing.

An event ID and every mutation ID are stable Discord-derived keys. Completed writes do not repeat after replay. Issue labels and comment-body markers allow remote reconciliation. A crash after a remote write but before local commit leaves an ambiguous outcome: the service checks remote evidence and **does not blindly retry an unresolved write**. Uncertain events and later events in that thread are held for operator review. This favors no duplicates over unattended liveness. It does not claim an atomic transaction across Jira and Postgres. See [design decisions](design-decisions.md).

## Local setup

Requires Node 22.12+, Docker Compose, a Jira Cloud sandbox and a Discord application/server. See [service setup](docs/setup.md) for permissions and account creation.

```sh
cp .env.example .env
cp config/users.example.json config/users.json
# Fill .env and config/users.json; never commit credentials.
npm ci
npm run lint
npm test
# Optional real-Postgres integration suite (CI runs this automatically):
# TEST_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/TEST_DB npm test
npm run build
docker compose up --build -d
curl -i http://localhost:3000/health
docker compose logs -f bot
```

`POSTGRES_PASSWORD` must be URL-safe (hex is convenient). Database port is not published. For a host-based Node development run, provide a reachable DATABASE_URL, then `npm run dev`. A second independent integration must use its own database and Discord/Jira configuration. Do not run two independent databases against the same source channels.

To use the published image once CI is configured:

```sh
SYNC_IMAGE=YOUR_DOCKERHUB_USER/discord-jira-sync:COMMIT_SHA docker compose up -d --no-build
```

The image still requires .env, user mapping, Postgres and permissions. Configuration is mounted read-only; secrets are never baked into the image.

## Health and operations

`GET /health` returns 200 only after a successful scan, a ready Discord connection, a responsive database and a recent worker heartbeat; otherwise 503. It is a readiness check, not a guarantee of an empty queue or healthy Jira. Inspect failed/uncertain counts and oldest pending age separately.

```sh
docker compose exec db psql -U sync -d sync -c "SELECT state,count(*) FROM events GROUP BY state;"
docker compose exec db psql -U sync -d sync -c "SELECT id,state,error FROM events WHERE state IN ('failed','uncertain');"
```

For safe recovery, follow [operations](docs/operations.md); do not delete journals to retry blindly. SIGTERM stops ingestion, finishes the current event and closes connections. Compose allows 60 seconds before killing the process; longer partial writes remain reconcilable or held.

## CI/CD and deployment

Every push and PR runs type checking, tests and compilation. A push to main additionally builds/pushes Docker Hub `latest` and commit-SHA tags after checks. Set GitHub Actions secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. Protect main so updates require passing PR checks. Deploy the immutable SHA image on a persistent host behind HTTPS; see [deployment](docs/deployment.md). Publishing an image does not automatically roll out the host.

## Acceptance walkthrough

1. Complete service setup, deploy and replace pending URLs above. Verify public `/health` returns 200.
2. Create a thread in `proj-checkout` where Jira `CHECKOUT` already exists; confirm a Story with reporter and discord-thread-* label.
3. Post a normal message, then `wrapping this up, status: done`; verify exactly one comment per message and Done status.
4. Run `!resync` twice; inspect queue summary and confirm issue/comment counts do not increase.
5. Stop bot, post multiple messages (including in an archived thread), restart; confirm ordered comments and no duplicates after a second restart.
6. Exercise missing mappings/project, unavailable transitions and blocked-label clearing. Stop the process during a Jira request and follow operations reconciliation.
7. Pull the SHA-tagged image with a separate configured integration and repeat. Save Jira screenshots or a short recording under docs/evidence/ (redact private data).

## From prototype to production

- **First bottleneck:** full history rescans, per-thread history buffers, one worker, and comment reconciliation pagination. Replace with persisted per-thread cursors plus overlap, bounded streaming pages, partitioned workers, project-specific quotas and a reconciliation job. Do not increase concurrency without thread ordering and fencing.
- **Reliability:** unresolved writes require review; Discord events briefly unavailable to Postgres recover only if still readable in later history. Deleted messages before recovery cannot be recovered. Add durable gateway ingress, a dead-letter/reconciliation dashboard, backups and tested restore drills. Test process kills at each remote/local commit boundary on real infrastructure.
- **Rate limits:** discord.js manages Discord REST buckets. Jira 429s use capped exponential retry with jitter but do not yet honor Retry-After; implement shared per-tenant budgets and exact server-directed delays before higher volume. Timeouts/5xx writes are held, not retried blindly.
- **Secrets:** local .env is development only. Use host secret injection or a secret manager, rotate bot/API tokens, scope Jira permissions to demo projects and keep mappings private. Review prompt exports before committing.
- **Monitoring:** structured event/error logs exist; add metrics for oldest pending age, pending/failed/uncertain totals, gateway disconnects, scan age and Jira latency/429s. Page on sustained backlog, loss of ingestion, database failure or uncertain writes; do not rely on 200 health alone.
- **Migrations:** initial SQL is idempotent and applied at boot, not a versioned migration framework. Add numbered tracked migrations, deploy-time locks, backwards-compatible schema rollout, PITR and retention before real data. Queue payloads include personal message content and currently have no retention policy.
- **Security:** dedicated least-privilege Discord/Jira accounts, allowlisted guild, HTTPS Jira URL, parameterized SQL, non-root container and no public database port. Restrict public health via reverse proxy, patch/pin dependencies, scan images, prevent arbitrary untrusted channel mappings and define data access/retention policies. The prototype is not multi-tenant.
- **Cost:** one persistent host plus Postgres storage/backups is the baseline. Free sleeping hosts are unsuitable for a long-lived Discord gateway and persistent DB. Obtain a VM from the hiring team if needed. Measure scan API volume and storage growth before sizing; there is no validated capacity benchmark.

## Further advancements

Next week: real-account failure injection, incremental backfill, integration CI, accurate Retry-After handling, retention and a reconciliation CLI. Next month: partitioned workers, tenant isolation, migration/backup drills, dashboards and an OAuth-based attribution strategy if true impersonation is required. Each improves a measured correctness or operating gap before adding extra features.

## Process and AI use

The candidate sent clarification questions and supplied the hiring-team replies on 2026-10-30; decisions are in docs/clarifications-2026-10-30.md. Historical proposal/update drafts are retained in docs/; sending those drafts has not been independently confirmed. An actual visible-message/tool transcript snapshot and AI notes are in prompts/; regenerate the export before submission and review it for secrets. Current implementation was AI-assisted and must be reviewed and understood by the candidate. No fabricated commits, external demos or historical TDD claims.
