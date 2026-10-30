# Hiring-team clarifications — 2026-10-30

Responses supplied by the candidate in chat:

1. "The comment can come from a bot, mentioning details of the original author."
2. "Suggested option seems fine."
3. "Just add the user's details in case they do not have a Jira account."
4. "Feel free to take call on this."
5. "If Jira provides the ability to read the issue, check if the comment was posted and retry accordingly."

## Resulting decisions

- Bot-authenticated comments with original Discord author, ID, timestamp and source link are accepted.
- Keep discord-blocked label; clear it on another supported status.
- Missing user mapping no longer rejects an event. Include Discord user details in comment/issue description. If a thread author is mapped, set Jira reporter; otherwise omit reporter so Jira applies its authenticated-account/default behavior. Never invent an account mapping. New ingestion captures thread-owner display identity; previously queued events retain at least the Discord ID. Verify the reporter default in the live sandbox.
- Retain public and private thread coverage where the bot has visibility; document Manage Threads permission for private archived enumeration. No changes to edits/deletes/renames scope.
- Read paginated issue comments for the exact terminal message marker on recovery. If found, mark the write complete without another comment. Definitive rejected writes can retry after remediation/backoff. A read failure is not evidence of absence. An ambiguous request may still be executing even when a read finds no comment: unresolved outcomes remain held for operator-confirmed retry to preserve the assignment's no-duplicates constraint. This residual availability limitation remains explicit; the reply does not provide an atomic Jira idempotency mechanism.

## Validation

Regression tests added first for missing user mappings and reporter fallback, observed failing, then implementation updated. Tests also verify unmapped comment authors retain their Discord identity. See current test output and validation record; live Jira/Discord checks remain pending.
