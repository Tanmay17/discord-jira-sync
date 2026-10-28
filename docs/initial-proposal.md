Subject: Discord → Jira assignment — understanding, questions and proposed approach

Hi team,

My understanding: build and deploy a TypeScript service that mirrors project threads into existing Jira Cloud projects, backfills history, processes live messages, supports status commands and resync, and survives restarts without duplicate mutations.

Questions before implementation:
1. Is attribution in the comment body acceptable? Jira API-token authentication creates comments as the integration account; true impersonation requires a different authorization model.
2. For blocked, may I use a discord-blocked label, removing it on the next supported status command?
3. For missing user mappings, may I hold the event for operator intervention rather than silently choose a reporter?
4. Are public threads sufficient for the demo? Private threads require explicit bot visibility or Manage Threads.
5. Jira does not provide a general idempotency key for these writes. In an ambiguous network failure, may I stop automatic retries and reconcile remotely before allowing another write? This prioritizes no duplicate writes over unattended availability.

Proposed approach: discord.js gateway plus startup and periodic paginated history scans; Postgres durable inbox and per-mutation journal; a serialized worker; a thin typed Jira REST client; deterministic Jira markers for reconciliation; Docker and CI/CD. Existing projects only. No edits, deletes, renames, attachments upload, or bot messages in v1. Status transitions are discovered dynamically. Comments contain original author, timestamp, source link and message text.

I will proceed with the above documented assumptions while awaiting clarification. The prototype intentionally uses one worker/ingestor; the design notes will explain scaling and the correctness gap at the external API boundary. I will report progress daily with done/next/blocked and small commits.

Regards,
Tanmay Srivastava
