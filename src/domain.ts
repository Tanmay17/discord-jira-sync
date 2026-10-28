export type Status = "todo" | "in_progress" | "done" | "blocked";
export interface Thread {
  id: string;
  guildId: string;
  channelId: string;
  project: string;
  title: string;
  authorId: string;
}
export interface Event {
  id: string;
  thread: Thread;
  message?: {
    id: string;
    authorId: string;
    author: string;
    content: string;
    timestamp: string;
  };
}
export function projectKey(name: string): string | undefined {
  const match = /^proj-([a-z][a-z0-9]*)$/i.exec(name);
  return match?.[1]?.toUpperCase();
}
export function statusOf(content: string): Status | undefined {
  const matches = [
    ...content.matchAll(/\bstatus:\s*(todo|in_progress|done|blocked)\b/gi),
  ];
  return matches.at(-1)?.[1]?.toLowerCase() as Status | undefined;
}
export const adf = (text: string) => ({
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: text || "(empty message)" }],
    },
  ],
});
export class UncertainWrite extends Error {}
export class PermanentError extends Error {}
export class RetryableError extends Error {}

/** Only the terminal marker written by the integration is reconciliation evidence. */
export function hasMessageMarker(body: unknown, id: string): boolean {
  function text(value: unknown): string {
    if (!value || typeof value !== "object") return "";
    const node = value as { text?: unknown; content?: unknown };
    if (typeof node.text === "string") return node.text;
    return Array.isArray(node.content) ? node.content.map(text).join("\n") : "";
  }
  return text(body).trimEnd().endsWith(`[discord-message:${id}]`);
}
