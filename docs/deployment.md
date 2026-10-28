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

Local typecheck/tests/build and Docker validation are recorded in docs/validation.md. Live health, Jira/Discord acceptance, CI execution in GitHub and Docker Hub publication remain pending until those external accounts are configured. A local Docker test is not proof of a public deployment.
