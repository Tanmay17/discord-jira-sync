import {
  PermanentError,
  RetryableError,
  UncertainWrite,
  statusOf,
  type Event,
} from "./domain.js";
import type { Jira } from "./jira.js";
import type { Store } from "./store.js";
export async function once<T>(
  store: Pick<Store, "mutation" | "prepare" | "complete" | "forget">,
  id: string,
  reconcile: () => Promise<T | undefined>,
  write: () => Promise<T>,
): Promise<T> {
  const previous = await store.mutation(id);
  if (previous?.state === "done") return previous.result as T;
  if (previous) {
    const found = await reconcile();
    if (found !== undefined) {
      await store.complete(id, found);
      return found;
    }
    throw new UncertainWrite(
      `Unresolved mutation ${id}; inspect Jira before operator retry`,
    );
  }
  await store.prepare(id);
  try {
    const result = await write();
    await store.complete(id, result);
    return result;
  } catch (error) {
    // Definitive rejection is safe to retry after remediation. Network errors remain journaled.
    if (error instanceof PermanentError || error instanceof RetryableError)
      await store.forget(id);
    throw error;
  }
}
export class Engine {
  constructor(
    private store: Store,
    private jira: Jira,
  ) {}
  async sync(event: Event) {
    const thread = event.thread;
    this.jira.account(thread.authorId);
    if (event.message) this.jira.account(event.message.authorId);
    let key = await this.store.issue(thread.id);
    if (!key) {
      key = await once(
        this.store,
        `issue:${thread.id}`,
        () => this.jira.findIssue(thread),
        async () =>
          (await this.jira.findIssue(thread)) ??
          (await this.jira.create(thread)),
      );
      await this.store.link(thread.id, key);
    }
    const message = event.message;
    if (!message) return;
    await once(
      this.store,
      `comment:${message.id}`,
      async () =>
        (await this.jira.hasComment(key!, message.id)) ? true : undefined,
      async () => {
        await this.jira.comment(
          key!,
          `${message.author} (Discord ${message.authorId}; Jira ${this.jira.account(message.authorId)}) at ${message.timestamp}\n${message.content}\nhttps://discord.com/channels/${thread.guildId}/${thread.id}/${message.id}\n[discord-message:${message.id}]`,
        );
        return true;
      },
    );
    const status = statusOf(message.content);
    if (status)
      await once(
        this.store,
        `status:${message.id}`,
        async () =>
          (await this.jira.hasStatus(key!, status)) ? true : undefined,
        async () => {
          await this.jira.status(key!, status);
          return true;
        },
      );
  }
}
