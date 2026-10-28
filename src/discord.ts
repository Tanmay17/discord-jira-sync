import {
  Client,
  GatewayIntentBits,
  ChannelType,
  type ThreadChannel,
  type Message,
  type TextChannel,
} from "discord.js";
import { projectKey, type Thread } from "./domain.js";
import type { Store } from "./store.js";
export class Discord {
  readonly client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  ready = false;
  scanning = false;
  constructor(
    private store: Store,
    private guildId: string,
  ) {}
  async thread(t: ThreadChannel): Promise<Thread | undefined> {
    if (t.guildId !== this.guildId) return;
    const parent = t.parent ?? (await t.guild.channels.fetch(t.parentId!));
    if (!parent || !("name" in parent)) return;
    const project = projectKey(parent.name);
    if (!project || !t.ownerId) return;
    const owner = await this.client.users.fetch(t.ownerId);
    if (owner.bot) return;
    return {
      id: t.id,
      guildId: t.guildId,
      channelId: t.parentId!,
      project,
      title: t.name,
      authorId: t.ownerId,
    };
  }
  async message(m: Message) {
    if (m.author.bot || m.guildId !== this.guildId) return;
    if (m.channel.isThread()) {
      const thread = await this.thread(m.channel);
      if (!thread) return;
      await this.store.enqueue({
        id: `message:${m.id}`,
        thread,
        message: {
          id: m.id,
          authorId: m.author.id,
          author: m.author.tag,
          content: m.content,
          timestamp: m.createdAt.toISOString(),
        },
      });
    } else if (
      m.content.trim() === "!resync" &&
      "name" in m.channel &&
      projectKey(m.channel.name ?? "")
    ) {
      await this.scan();
      const summary = await this.store.db.query(
        "SELECT state,count(*) FROM events WHERE payload->'thread'->>'channelId'=$1 GROUP BY state",
        [m.channelId],
      );
      await m.reply({
        content: `Resync history queued; existing events deduplicated. ${summary.rows.map((r: { state: string; count: string }) => `${r.state}: ${r.count}`).join(", ")}. Completion is asynchronous; run !resync again for updated counts.`,
        allowedMentions: { parse: [] },
      });
    }
  }
  async scanChannel(channel: TextChannel) {
    const active = await channel.threads.fetchActive();
    const seen = new Set<string>();
    const process = async (t: ThreadChannel) => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      const thread = await this.thread(t);
      if (!thread) return;
      await this.store.enqueue({ id: `thread:${t.id}`, thread });
      let before: string | undefined;
      const history: Message[] = [];
      for (;;) {
        const page = await t.messages.fetch({
          limit: 100,
          ...(before ? { before } : {}),
        });
        history.push(...page.values());
        if (page.size < 100) break;
        before = page.last()!.id;
      }
      for (const m of history.reverse()) await this.message(m);
    };
    for (const t of active.threads.values()) await process(t);
    for (const type of ["public", "private"] as const) {
      let before: Date | undefined;
      for (;;) {
        const page = await channel.threads.fetchArchived({
          type,
          limit: 100,
          ...(before ? { before } : {}),
        });
        for (const t of page.threads.values()) await process(t);
        if (!page.hasMore) break;
        const next = page.threads.last()?.archiveTimestamp;
        if (!next || (before && next >= before.getTime()))
          throw new Error("Archived pagination stalled");
        before = new Date(next);
      }
    }
  }
  async scan() {
    if (this.scanning)
      throw new Error("History scan already running; retry shortly");
    this.scanning = true;
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const channels = await guild.channels.fetch();
      for (const c of channels.values())
        if (c?.type === ChannelType.GuildText && projectKey(c.name))
          await this.scanChannel(c);
      this.ready = true;
    } finally {
      this.scanning = false;
    }
  }
  async start(token: string) {
    const report = (error: unknown) =>
      console.error({
        event: "discord_ingestion_failed",
        error: String(error),
      });
    this.client.on("threadCreate", (t) => {
      void this.thread(t)
        .then(
          (thread) =>
            thread && this.store.enqueue({ id: `thread:${t.id}`, thread }),
        )
        .catch(report);
    });
    this.client.on("messageCreate", (m) => {
      void this.message(m).catch(report);
    });
    this.client.once("ready", () => {
      void this.scan().catch(report);
    });
    await this.client.login(token);
  }
}
