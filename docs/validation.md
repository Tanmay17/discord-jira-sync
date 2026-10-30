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
