import pg from 'pg';
import { readFile } from 'node:fs/promises';
import type { Event } from './domain.js';
export class Store {
  readonly db: pg.Pool;
  constructor(url: string) { this.db = new pg.Pool({ connectionString: url }); }
  async init() { await this.db.query(await readFile(new URL('../migrations/001_init.sql', import.meta.url), 'utf8')); }
  async enqueue(event: Event) { await this.db.query('INSERT INTO events(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING', [event.id, event]); }
  async issue(id: string): Promise<string | undefined> { return (await this.db.query('SELECT issue_key FROM threads WHERE id=$1', [id])).rows[0]?.issue_key; }
  async link(id: string, key: string) { await this.db.query('INSERT INTO threads VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET issue_key=excluded.issue_key', [id,key]); }
  async mutation(id: string): Promise<{state:string;result:unknown} | undefined> { return (await this.db.query('SELECT state,result FROM mutations WHERE id=$1',[id])).rows[0]; }
  async prepare(id: string) { await this.db.query("INSERT INTO mutations(id,state) VALUES($1,'uncertain') ON CONFLICT DO NOTHING",[id]); }
  async forget(id:string) { await this.db.query("DELETE FROM mutations WHERE id=$1 AND state='uncertain'",[id]); }
  async complete(id:string,result:unknown) { await this.db.query("UPDATE mutations SET state='done',result=$2,updated_at=now() WHERE id=$1",[id,JSON.stringify(result)]); }
}
