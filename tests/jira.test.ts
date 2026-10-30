import { afterEach, describe, expect, it, vi } from "vitest";
import { Jira } from "../src/jira.js";
import {
  PermanentError,
  RetryableError,
  UncertainWrite,
} from "../src/domain.js";
const jira = () =>
  new Jira("https://example.atlassian.net", "user@example.com", "test-token", {
    "123": "account",
  });
afterEach(() => vi.unstubAllGlobals());
describe("Jira boundary", () => {
  it("does not retry an ambiguous write", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("lost response"));
    vi.stubGlobal("fetch", fetch);
    await expect(jira().comment("TEST-1", "hello")).rejects.toBeInstanceOf(
      UncertainWrite,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("distinguishes rate limiting and definite rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 429 })),
    );
    await expect(jira().comment("TEST-1", "hello")).rejects.toBeInstanceOf(
      RetryableError,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 403 })),
    );
    await expect(jira().comment("TEST-1", "hello")).rejects.toBeInstanceOf(
      PermanentError,
    );
  });
  it("treats a write 5xx as uncertain", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );
    await expect(jira().comment("TEST-1", "hello")).rejects.toBeInstanceOf(
      UncertainWrite,
    );
  });
  it("paginates all comments during reconciliation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ comments: [{ body: { text: "other" } }], total: 2 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          comments: [{ body: { text: "[discord-message:42]" } }],
          total: 2,
        }),
      );
    vi.stubGlobal("fetch", fetch);
    expect(await jira().hasComment("TEST-1", "42")).toBe(true);
    expect(fetch.mock.calls[1]?.[0]).toContain("startAt=1");
  });
  it("looks up transitions by destination name", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        Response.json({ fields: { status: { name: "To Do" } } }),
      )
      .mockResolvedValueOnce(
        Response.json({ transitions: [{ id: "987", to: { name: "Done" } }] }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await jira().status("TEST-1", "done");
    expect(JSON.parse(fetch.mock.calls[3]?.[1]?.body)).toEqual({
      transition: { id: "987" },
    });
  });
  it("does not transition blocked into an invented workflow state", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    await jira().status("TEST-1", "blocked");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body)).toEqual({
      update: { labels: [{ add: "discord-blocked" }] },
    });
  });
  it("allows an unmapped user without inventing a Jira identity", () => {
    expect(jira().account("unknown")).toBeUndefined();
  });
  it.each([true, false])(
    "creates a Story with mapped reporter when available: %s",
    async (mapped) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(Response.json({ key: "TEST" }))
        .mockResolvedValueOnce(
          Response.json({ issueTypes: [{ id: "100", name: "Story" }] }),
        )
        .mockResolvedValueOnce(Response.json({ key: "TEST-1" }));
      vi.stubGlobal("fetch", fetch);
      await jira().create({
        id: "456",
        guildId: "789",
        channelId: "111",
        project: "TEST",
        title: "Milestone",
        authorId: mapped ? "123" : "999",
        author: "Person",
      });
      const fields = JSON.parse(fetch.mock.calls[2]?.[1]?.body).fields;
      if (mapped) expect(fields.reporter).toEqual({ accountId: "account" });
      else expect(fields).not.toHaveProperty("reporter");
      expect(JSON.stringify(fields.description)).toContain("Person");
      expect(JSON.stringify(fields.description)).toContain(
        mapped ? "123" : "999",
      );
    },
  );
});
