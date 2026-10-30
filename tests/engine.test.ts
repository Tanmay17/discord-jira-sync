import { expect, it, vi } from "vitest";
import { Engine, once } from "../src/engine.js";
import { UncertainWrite } from "../src/domain.js";
function store(state?: { state: string; result: unknown }) {
  return {
    forget: vi.fn(async () => {
      state = undefined;
    }),
    mutation: vi.fn(async () => state),
    prepare: vi.fn(async () => {
      state = { state: "uncertain", result: null };
    }),
    complete: vi.fn(async (_id: string, result: unknown) => {
      state = { state: "done", result };
    }),
  };
}
it("never repeats a completed write", async () => {
  const s = store();
  const write = vi.fn(async () => "KEY-1");
  await once(s, "x", async () => undefined, write);
  expect(await once(s, "x", async () => undefined, write)).toBe("KEY-1");
  expect(write).toHaveBeenCalledTimes(1);
});
it("reconciles a write accepted before a crash", async () => {
  const s = store({ state: "uncertain", result: null });
  const write = vi.fn(async () => true);
  expect(await once(s, "x", async () => true, write)).toBe(true);
  expect(write).not.toHaveBeenCalled();
});
it("holds an unresolved outcome instead of risking duplicates", async () => {
  const write = vi.fn(async () => true);
  await expect(
    once(
      store({ state: "uncertain", result: null }),
      "x",
      async () => undefined,
      write,
    ),
  ).rejects.toBeInstanceOf(UncertainWrite);
  expect(write).not.toHaveBeenCalled();
});
it("journals intent before attempting a remote write", async () => {
  const s = store();
  await expect(
    once(
      s,
      "x",
      async () => undefined,
      async () => {
        expect(s.prepare).toHaveBeenCalled();
        throw new Error("crash");
      },
    ),
  ).rejects.toThrow("crash");
  expect(s.complete).not.toHaveBeenCalled();
});

it("syncs unmapped authors with their Discord details in the comment", async () => {
  const journal = { ...store(), issue: vi.fn(async () => "TEST-1") };
  const jira = {
    account: vi.fn(() => undefined),
    comment: vi.fn(async () => {}),
  };
  const engine = new Engine(
    journal as unknown as import("../src/store.js").Store,
    jira as unknown as import("../src/jira.js").Jira,
  );
  await engine.sync({
    id: "message:42",
    thread: {
      id: "1",
      guildId: "2",
      channelId: "3",
      project: "TEST",
      title: "Milestone",
      authorId: "99",
    },
    message: {
      id: "42",
      authorId: "100",
      author: "Original Person",
      content: "hello",
      timestamp: "2026-10-30T00:00:00Z",
    },
  });
  expect(jira.comment).toHaveBeenCalledWith(
    "TEST-1",
    expect.stringContaining(
      "Original Person (Discord 100; no Jira account mapped)",
    ),
  );
});
