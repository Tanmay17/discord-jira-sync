# Deployment runbook

Use a persistent Linux host with Docker Compose. This service maintains a long-lived Discord websocket; request the offered VM if free hosting cannot provide an always-on process and durable disk. No paid resources are provisioned by this repository.

1. Install Docker and Compose on the host. Allow HTTPS inbound through a reverse proxy; keep Postgres private. Configure firewall and SSH access.
2. Copy docker-compose.yml and .env.example plus config/users.example.json. Fill real secrets and mappings on the host. Protect .env with filesystem permissions. Do not copy secrets into Git or the image.
3. Set SYNC_IMAGE to the Docker Hub commit-SHA tag in .env. Authenticate Docker on the host if the image is private.
4. Run `docker compose pull` then `docker compose up -d --no-build`. Confirm logs show no failed scan/permission errors. Startup readiness waits for history enumeration.
5. Put a TLS reverse proxy in front of localhost:3000, forwarding /health only unless more endpoints are deliberately added. The compose default binds port 3000 on all interfaces; restrict it using the firewall or change the mapping to `127.0.0.1:3000:3000` behind the proxy.
6. Verify the public HTTPS /health endpoint, run the full README acceptance walkthrough and record its actual URL. Replace the Discord invite and image placeholders too.
7. Back up the Postgres volume using pg_dump before upgrades; test restore. Never run `docker compose down -v` on a live instance.

CI/CD publishes on main but host rollout is manual: update SYNC_IMAGE to the new SHA, pull, and recreate bot. A replacement process cannot become active until the prior process releases its database advisory lock. Roll back to the previous SHA only with a compatible schema. Initial migration is idempotent; a production migration tool is still required.

## Verification record

Local typecheck/tests/build and Docker validation are recorded in docs/validation.md. Local health and Jira/Discord acceptance, GitHub CI and public Docker Hub publication have been verified; see validation.md and evidence/. Public VM deployment is pending. Oracle signup was deferred by the user on 2026-10-30. A local Docker test is not proof of a public deployment.

## Included HTTPS reverse proxy

For an always-on VM with a domain pointing to its public IP, the repository includes compose.production.yml and deploy/Caddyfile. Requires Docker Compose 2.24.4+ for the !reset override. Set PUBLIC_HOST to the DNS hostname (without https:// or a path) and SYNC_IMAGE to the published SHA-tagged image in the host's .env. Allow TCP 80/443 for Caddy certificate issuance and HTTPS; keep Postgres and bot port 3000 private.

```sh
docker compose -f docker-compose.yml -f compose.production.yml pull
docker compose -f docker-compose.yml -f compose.production.yml up -d --no-build
curl -i https://YOUR_HOST/health
```

Use the same two -f arguments for future production restarts/logs/upgrades. The override removes the development port-3000 publication and exposes only the reverse proxy. Caddy forwards /health; other paths return 404. This configuration does not create a VM, register a domain, configure DNS, or replace the required live-host verification.

## Backup verification

Run `python3 scripts/backup-check.py` from the local compose workspace to save a restricted backup under ignored .local/backups and restore it into a new disposable database. It compares row counts and removes only the temporary database. The bot's database is not modified. Backups contain private Discord messages and mutation evidence: keep them private, encrypted on the deployment host, and out of Git and Docker build contexts. On a busy server, pause ingestion or choose a quiet window to compare a consistent snapshot.
