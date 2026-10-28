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
