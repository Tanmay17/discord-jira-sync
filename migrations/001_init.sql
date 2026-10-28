CREATE TABLE IF NOT EXISTS events (
 id text PRIMARY KEY, payload jsonb NOT NULL, state text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_pending ON events(available_at, created_at) WHERE state='pending';
CREATE TABLE IF NOT EXISTS mutations (
 id text PRIMARY KEY, state text NOT NULL, result jsonb, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS threads (id text PRIMARY KEY, issue_key text NOT NULL);
