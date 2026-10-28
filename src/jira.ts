import {
  adf,
  hasMessageMarker,
  PermanentError,
  RetryableError,
  UncertainWrite,
  type Thread,
  type Status,
} from "./domain.js";
export class Jira {
  constructor(
    private base: string,
    private email: string,
    private token: string,
    private users: Record<string, string>,
  ) {}
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.base}/rest/api/3${path}`, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.email}:${this.token}`).toString("base64")}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      if (method !== "GET" && path !== "/search/jql")
        throw new UncertainWrite("Jira write outcome unknown");
      throw new Error("Jira read failed");
    }
    if (!response.ok) {
      if (method !== "GET" && path !== "/search/jql" && response.status >= 500)
        throw new UncertainWrite(`Jira ${response.status}: outcome unknown`);
      if (response.status === 429)
        throw new RetryableError(
          `Jira rate limited; Retry-After=${response.headers.get("retry-after") ?? "unknown"}`,
        );
      if (response.status >= 400 && response.status < 500)
        throw new PermanentError(
          `Jira ${response.status} on ${method} ${path}`,
        );
      throw new Error(`Jira ${response.status}`);
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }
  account(id: string) {
    const account = this.users[id];
    if (!account)
      throw new PermanentError(`Missing Jira user mapping for Discord ${id}`);
    return account;
  }
  async findIssue(thread: Thread): Promise<string | undefined> {
    const marker = `discord-thread-${thread.id}`;
    const result = await this.request<{ issues: { key: string }[] }>(
      "/search/jql",
      "POST",
      {
        jql: `project = "${thread.project}" AND labels = "${marker}"`,
        fields: ["key"],
        maxResults: 2,
      },
    );
    if (result.issues.length > 1)
      throw new PermanentError(`Multiple issues for ${thread.id}`);
    return result.issues[0]?.key;
  }
  async create(thread: Thread) {
    await this.request(`/project/${thread.project}`);
    const types = await this.request<{
      issueTypes: { id: string; name: string }[];
    }>(`/issue/createmeta/${thread.project}/issuetypes`);
    const story = types.issueTypes.find(
      (t) => t.name.toLowerCase() === "story",
    );
    if (!story) throw new PermanentError(`No Story type in ${thread.project}`);
    return (
      await this.request<{ key: string }>("/issue", "POST", {
        fields: {
          project: { key: thread.project },
          issuetype: { id: story.id },
          summary: thread.title.slice(0, 255),
          reporter: { accountId: this.account(thread.authorId) },
          labels: [`discord-thread-${thread.id}`],
          description: adf(
            `Discord milestone: https://discord.com/channels/${thread.guildId}/${thread.id}`,
          ),
        },
      })
    ).key;
  }
  async hasComment(key: string, id: string) {
    for (let startAt = 0; ;) {
      const page = await this.request<{
        comments: { body: unknown }[];
        total: number;
      }>(`/issue/${key}/comment?startAt=${startAt}&maxResults=100`);
      if (page.comments.some((c) => hasMessageMarker(c.body, id))) return true;
      startAt += page.comments.length;
      if (startAt >= page.total) return false;
      if (!page.comments.length) throw new Error("Comment pagination stalled");
    }
  }
  async comment(key: string, text: string) {
    await this.request(`/issue/${key}/comment`, "POST", { body: adf(text) });
  }
  async hasStatus(key: string, status: Status): Promise<boolean> {
    const issue = await this.request<{
      fields: { status: { name: string }; labels: string[] };
    }>(`/issue/${key}?fields=status,labels`);
    const blocked = issue.fields.labels.includes("discord-blocked");
    if (status === "blocked") return blocked;
    return (
      !blocked &&
      issue.fields.status.name.toLowerCase() ===
        { todo: "To Do", in_progress: "In Progress", done: "Done" }[
          status
        ].toLowerCase()
    );
  }
  async status(key: string, status: Status) {
    const blocked = status === "blocked";
    await this.request(`/issue/${key}`, "PUT", {
      update: { labels: [{ [blocked ? "add" : "remove"]: "discord-blocked" }] },
    });
    if (blocked) return;
    const name = { todo: "To Do", in_progress: "In Progress", done: "Done" }[
      status
    ];
    const issue = await this.request<{ fields: { status: { name: string } } }>(
      `/issue/${key}?fields=status`,
    );
    if (issue.fields.status.name.toLowerCase() === name.toLowerCase()) return;
    const available = await this.request<{
      transitions: { id: string; to: { name: string } }[];
    }>(`/issue/${key}/transitions`);
    const transition = available.transitions.find(
      (t) => t.to.name.toLowerCase() === name.toLowerCase(),
    );
    if (!transition)
      throw new PermanentError(`No transition to ${name} for ${key}`);
    await this.request(`/issue/${key}/transitions`, "POST", {
      transition: { id: transition.id },
    });
  }
}
