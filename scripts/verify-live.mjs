// Read-only verification of persisted Discord messages against linked Jira issues.
import { Store } from './dist/store.js';
import { Jira } from './dist/jira.js';
import { hasMessageMarker } from './dist/domain.js';
const store=new Store(process.env.DATABASE_URL);
const jira=new Jira(process.env.JIRA_BASE_URL.replace(/\/$/,''),process.env.JIRA_EMAIL,process.env.JIRA_API_TOKEN,{});
try {
  const links=await store.db.query('SELECT id,issue_key FROM threads');
  for(const link of links.rows) {
    const issue=await jira.request(`/issue/${link.issue_key}?fields=status,issuetype,labels`);
    const events=await store.db.query("SELECT id,state,payload FROM events WHERE payload->'thread'->>'id'=$1 ORDER BY created_at",[link.id]);
    const comments=[];
    for(let startAt=0;;) {
      const page=await jira.request(`/issue/${link.issue_key}/comment?startAt=${startAt}&maxResults=100`);
      comments.push(...page.comments);startAt+=page.comments.length;
      if(startAt>=page.total) break;
      if(!page.comments.length) throw new Error('Comment pagination stalled');
    }
    const messages=events.rows.filter(row=>row.payload.message);
    console.log(JSON.stringify({issue:link.issue_key,issueType:issue.fields.issuetype.name,status:issue.fields.status.name,blocked:issue.fields.labels.includes('discord-blocked'),events:events.rows.length,allEventsDone:events.rows.every(row=>row.state==='done'),jiraCommentCount:comments.length,messages:messages.map(row=>({id:row.payload.message.id,markerMatches:comments.filter(c=>hasMessageMarker(c.body,row.payload.message.id)).length,originalAuthorPresent:comments.filter(c=>hasMessageMarker(c.body,row.payload.message.id)).some(c=>JSON.stringify(c.body).includes(row.payload.message.authorId))}))}));
  }
} finally {await store.db.end();}
