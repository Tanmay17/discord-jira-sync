# Service setup (candidate action required)

## Jira Cloud

1. Create an Atlassian Jira Cloud free sandbox and a software project with key CHECKOUT. Jira project creation is intentionally not implemented by the bot.
2. Confirm Story is available, reporter is editable and To Do / In Progress / Done exist. Create a scoped integration user with Browse Projects, Create Issues, Add Comments, Edit Issues, Transition Issues and Modify Reporter permissions for that project.
3. Create an API token and enter it directly in local .env or host secrets, not chat or Git. Use the sandbox HTTPS base URL and the token owner's email.
4. Copy each user's Atlassian account ID from their profile URL or the Jira user lookup API into config/users.json, keyed by Discord user ID. Map the person creating the thread as well as everyone posting messages.
5. The authenticated user creates all comments; Discord attribution is included in their bodies. If a token's scopes require Atlassian's gateway URL rather than the tenant URL, use a compatible token/auth configuration; this prototype uses tenant URL + Basic email/token authentication.

## Discord

1. Create a test server, enable Developer Mode and copy its server ID.
2. Create a Discord Developer Portal application and bot; enable Message Content Intent. Put the bot token directly in .env.
3. Invite the bot with View Channels, Read Message History, Send Messages, Send Messages in Threads and Manage Threads. Manage Threads is required for the implemented private archive scan; without it readiness may remain degraded.
4. Create a text channel proj-checkout; create public/private threads and verify bot access. Bot-created threads and all bot messages are ignored.
5. Make a server invite for the reviewers and replace the README placeholder. Do not expose the bot token in screenshots. Avoid inviting reviewers before the integration is ready.

## GitHub and Docker Hub

Use a private GitHub repo, not a fork. Invite the hiring team's GitHub account via repository access; GitHub may require their username rather than accepting tech@jumeaucapital.com, so request it if needed. Create a Docker Hub image repository and a write-scoped access token. Add DOCKERHUB_USERNAME and DOCKERHUB_TOKEN as GitHub Actions secrets. Protect main with the CI check, merge changes and verify the SHA-tagged image exists. Choose image visibility that allows reviewer access.

## Pending before submission

- Hiring-team clarification message sent by candidate, responses recorded.
- Jira and Discord configured with permissions and mappings.
- Real-account end-to-end walkthrough and screenshots.
- Docker Hub image published and pull tested.
- Public host deployed; health URL and Discord invite filled in README.
- Reviewer repository access granted.
- Full redacted AI conversation export committed.
