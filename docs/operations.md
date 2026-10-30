# Operations and safe reconciliation

Keep the database and its mutation journal together. Losing the journal can lose duplicate-prevention evidence. Reserve marker labels/body text from human edits. Never point a fresh database at an already-running integration without migration/reconciliation planning.

## Inspect failures

Use psql inside the compose db service. `SELECT id,state,error FROM events WHERE state <> 'done';` shows pending, failed and uncertain events. A failed or uncertain event blocks later events in its thread; unrelated threads continue. Check logs for scan permission errors. Missing projects must be created manually or intentionally left skipped.

## Definitive failure

For missing project/transition or permission errors, fix the underlying configuration first. Restart after user-map changes. Missing mappings now use Discord attribution without blocking; historical mapping failures can be requeued after upgrading. Change the specific failed event to pending and clear its error using a parameterized administrative client or a carefully quoted psql statement. Do not bulk reset the queue. A previous successful comment mutation remains done, so retrying a failed transition does not repeat that comment.

## Ambiguous write

1. Stop the bot, retaining Postgres. Inspect the event payload and corresponding journal IDs (`issue:THREAD_ID`, `comment:MESSAGE_ID`, `status:MESSAGE_ID`).
2. Inspect Jira remotely. Issues carry discord-thread-THREAD_ID labels; comments contain [discord-message:MESSAGE_ID]. Wait for Jira indexing before concluding that no issue exists. Check current status and blocked label for transitions.
3. Requeue the specific uncertain event. The engine only reconciles its journal against remote evidence; if found, it records completion without another write. If not found, it becomes uncertain again. A first missing marker is never treated as proof of failure.
4. Only if an operator can establish that no write occurred, and there is no in-flight process/request, delete that specific uncertain mutation intent and requeue the event. This explicitly authorizes a new attempt. Record the investigation; an incorrect determination can cause duplicates. Never delete completed mutations.

Restarts automatically pick up pending events. Uncertain events deliberately require operator action; this is the availability tradeoff documented in design-decisions.md. Jira does not supply an atomic external idempotency key for this integration.
