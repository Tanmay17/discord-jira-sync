import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { Store } from '../src/store.js';
import { Engine } from '../src/engine.js';
import type { Jira } from '../src/jira.js';
import type { Event } from '../src/domain.js';
const database=process.env.TEST_DATABASE_URL;
describe.skipIf(!database)('Postgres durable integration',()=>{
 const schema=`test_${randomUUID().replaceAll('-','')}`;
 let store:Store;
 let connection:string;
 let admin:pg.Pool;
 const event:Event={id:'message:42',thread:{id:'123',guildId:'456',channelId:'789',project:'TEST',title:'Milestone',authorId:'user'},message:{id:'42',authorId:'user',author:'Person',content:'status: done',timestamp:'2026-10-28T00:00:00Z'}};
 beforeAll(async()=>{
  admin=new pg.Pool({connectionString:database});
  await admin.query(`CREATE SCHEMA ${schema}`);
  const url=new URL(database!);url.searchParams.set('options',`-c search_path=${schema}`);connection=url.toString();
  store=new Store(connection);await store.init();
 });
 afterAll(async()=>{await store?.db.end();await admin?.query(`DROP SCHEMA ${schema} CASCADE`);await admin?.end();});
 it('deduplicates concurrent ingestion and persists across a new connection',async()=>{
  await Promise.all(Array.from({length:8},()=>store.enqueue(event)));
  await store.db.end();store=new Store(connection);
  const rows=await store.db.query('SELECT payload FROM events');
  expect(rows.rowCount).toBe(1);expect(rows.rows[0].payload).toEqual(event);
 });
 it('replays a complete event without repeated Jira writes',async()=>{
  const jira={account:vi.fn(()=> 'mapped'),findIssue:vi.fn(async()=>undefined),create:vi.fn(async()=> 'TEST-1'),hasComment:vi.fn(async()=>false),comment:vi.fn(async()=>{}),hasStatus:vi.fn(async()=>true),status:vi.fn(async()=>{})};
  const engine=new Engine(store,jira as unknown as Jira);
  await engine.sync(event);await engine.sync(event);
  expect(jira.create).toHaveBeenCalledTimes(1);expect(jira.comment).toHaveBeenCalledTimes(1);expect(jira.status).toHaveBeenCalledTimes(1);
  expect(await store.issue('123')).toBe('TEST-1');
 });
 it('reconciles a remotely accepted issue after a crash without another create',async()=>{
  const crash={...event,id:'thread:999',thread:{...event.thread,id:'999'},message:undefined};
  await store.prepare('issue:999');
  const jira={account:vi.fn(()=> 'mapped'),findIssue:vi.fn(async()=> 'TEST-99'),create:vi.fn(async()=> 'DUPLICATE')};
  await new Engine(store,jira as unknown as Jira).sync(crash);
  expect(jira.create).not.toHaveBeenCalled();expect(await store.issue('999')).toBe('TEST-99');
 });
 it('does not create again when Jira search has not indexed an uncertain issue',async()=>{
  const crash={id:'thread:888',thread:{...event.thread,id:'888'}};
  await store.prepare('issue:888');
  const jira={account:vi.fn(()=> 'mapped'),findIssue:vi.fn(async()=>undefined),create:vi.fn()};
  await expect(new Engine(store,jira as unknown as Jira).sync(crash)).rejects.toThrow('Unresolved mutation');
  expect(jira.create).not.toHaveBeenCalled();
 });
});
