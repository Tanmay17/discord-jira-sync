# Local validation — 2026-10-28

Verified on the candidate's workspace:

- ESLint and strict TypeScript check: passed.
- TypeScript production build: passed.
- Vitest 5.0.5 full suite with a real Postgres 16 container: **20 passed** across four files. Includes duplicate concurrent ingestion, persistence across connections, completed-event replay, ambiguous issue/comment reconciliation, lagging Jira search, exact terminal comment markers and per-thread failure ordering.
- Docker Compose configuration: valid using example environment settings.
- Final multi-stage production Docker image: built successfully on Node 22.
- Runtime image smoke check: uid 1000 (non-root), connected to Postgres and applied migration successfully.
- Final image build audit: zero known vulnerabilities for installed production and development dependencies at validation time.
- The host's default Node 20.15 is below the selected toolchain requirement; local final tests used the bundled Node 24 runtime. Supported project baseline is Node 22.12+; Docker and CI use Node 22.

Reproduce with Node 22.12+:

```sh
npm ci
npm run lint
npm run build
npm test
# To include the six Postgres tests, provide a disposable database:
TEST_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/TEST_DATABASE npm test
```

Without TEST_DATABASE_URL, 14 unit tests run and six database integration tests are explicitly skipped. GitHub CI supplies a Postgres service and runs all tests. Database tests create an isolated temporary schema, then remove it.

Not yet verified: real Jira/Discord end-to-end behavior, real permissions, host/public health URL, reviewer invite/access, GitHub-hosted workflow results, Docker Hub publication/pull and the public live demo. These need the candidate's external accounts and secrets. Local mocks and container smoke tests are not substitutes for those acceptance steps.

## Clarification follow-up — 2026-10-30

Updated missing-user handling and added regression tests for mapped/unmapped reporters and unmapped comment authors. The new Jira tests were observed failing before implementation, then passing after the change. ESLint/typecheck and production build passed. Current unit run: **17 passed**; the six Postgres tests were explicitly skipped because TEST_DATABASE_URL was not configured for this run. The previous 20-test full validation remains historical evidence, not a claim that the updated 23-test suite has been fully rerun. Live account checks remain pending.

## Full local-account follow-up

Rebuilt the application and started Docker Compose with configured Jira/Discord accounts. Read-only checks verified Jira authentication, CHECKOUT, Story metadata, all six required Jira permissions, Discord authentication/guild access and proj-checkout discovery. Local health returned 200. Ran the current complete suite in the Node 22 build container against isolated schemas in the local Postgres service: **23 tests passed (17 unit + six integration), no skips**. See local-integration-2026-10-30.md for pending real-message acceptance checks.

## Resync regression and operations follow-up

Added a failing regression test for overlapping history scans, then changed concurrent resync calls to share one scan instead of rejecting the second call. Added failure-recovery coverage for a subsequent scan. Full suite after rebuilding: **25 passed** (19 unit + six Postgres tests). ESLint/typecheck and Docker build passed. Publishing workflow now also runs its tests against a Postgres service instead of skipping the integration suite.

Verified a local pg_dump restore into a disposable database: events=4, mutations=5, threads=1 matched the source snapshot. Temporary restore database removed; private backup retained under ignored .local/backups (also excluded from Docker context). Production Compose override with HTTPS proxy validated without starting a public endpoint.

GitHub API confirms private repository, not a fork; CI for bc1b543 succeeded. Publishing for that commit failed, with no Actions secrets configured at the time. Reviewer collaborator access remains unconfigured; branch-protection API returned 403 (no protection claim is made).

## Published artifact and command acceptance

- Hosted CI and Docker Hub publishing succeeded for 016a70f8f400c9487369725df9ae3c70272c1715. Public Docker Hub metadata confirms the SHA tag is active.
- Pulled the published linux/amd64 image, replaced the local-build container with it, verified health 200 and unchanged issue/comment counts. The Mac is ARM64, so Docker Desktop used platform emulation.
- Two human !resync commands each received a done: 9 reply. Jira re-read confirmed one issue and eight comments, with one marker match per message.
- Live To Do transition also passed on the published image. A subsequent command returned the test Story to Done.
- Caddy configuration validated using the official image; no public proxy was started.
- Transcript exporter now redacts OAuth callback query credentials in addition to common API-token patterns. A synthetic regression check passed; hidden analysis remains excluded.

### Native image verification — 2026-10-30

CI and publishing passed for 7946743. The linux/arm64 image pulled successfully and replaced the emulated AMD64 image locally. Jira verification after restart found CHECKOUT-2 in Done, 11 completed events, 10 comments and exactly one marker per message with author details. See evidence/native-image-check.json. Public VM deployment remains pending; Oracle signup was deferred by the user.
