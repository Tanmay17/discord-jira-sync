// Read-only account checks. Run inside the configured bot container.
const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, DISCORD_TOKEN, DISCORD_GUILD_ID } = process.env;
async function read(url, authorization) {
  try {
    const response = await fetch(url, { headers: { Authorization: authorization, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    return { status: response.status, body: response.ok ? await response.json() : undefined };
  } catch { return { status: 'connection-failed' }; }
}
const discordAuth = `Bot ${DISCORD_TOKEN}`;
const jiraAuth = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`;
const jiraBase = `${JIRA_BASE_URL.replace(/\/$/,'')}/rest/api/3`;
const discordBase = 'https://discord.com/api/v10';
const identity = await read(`${jiraBase}/myself`, jiraAuth);
console.log(JSON.stringify({ check: 'jira-authentication', status: identity.status }));
const bot = await read(`${discordBase}/users/@me`, discordAuth);
console.log(JSON.stringify({ check: 'discord-authentication', status: bot.status }));
const guild = await read(`${discordBase}/guilds/${DISCORD_GUILD_ID}`, discordAuth);
console.log(JSON.stringify({ check: 'discord-server-access', status: guild.status }));
const channels = await read(`${discordBase}/guilds/${DISCORD_GUILD_ID}/channels`, discordAuth);
if (channels.status !== 200) console.log(JSON.stringify({ check: 'discord-channels', status: channels.status }));
const projects = (Array.isArray(channels.body) ? channels.body : []).filter(c => c.type === 0 && /^proj-[a-z][a-z0-9]*$/i.test(c.name));
console.log(JSON.stringify({ check: 'project-channel-discovery', count: projects.length, channels: projects.map(c => c.name) }));
for (const channel of projects) {
  const project = channel.name.slice(5).toUpperCase();
  const result = await read(`${jiraBase}/project/${project}`, jiraAuth);
  console.log(JSON.stringify({ check: 'jira-project', project, status: result.status }));
  if (result.status !== 200) continue;
  const types = await read(`${jiraBase}/issue/createmeta/${project}/issuetypes`, jiraAuth);
  const issueTypes = types.body?.issueTypes ?? types.body?.values ?? [];
  console.log(JSON.stringify({ check: 'jira-story-type', project, status: types.status, available: issueTypes.some(t => t.name?.toLowerCase() === 'story'), responseKeys: types.body ? Object.keys(types.body) : [] }));
  const permissions = await read(`${jiraBase}/mypermissions?projectKey=${project}&permissions=BROWSE_PROJECTS,CREATE_ISSUES,ADD_COMMENTS,EDIT_ISSUES,TRANSITION_ISSUES,MODIFY_REPORTER`, jiraAuth);
  console.log(JSON.stringify({ check: 'jira-permissions', project, status: permissions.status, permissions: Object.fromEntries(Object.entries(permissions.body?.permissions ?? {}).map(([name,value]) => [name,value.havePermission])) }));
}
