import { afterEach, expect, it, vi } from "vitest";
import { Discord } from "../src/discord.js";
import type { Store } from "../src/store.js";
const clients: Discord[] = [];
afterEach(() => {
  for (const discord of clients) discord.client.destroy();
  clients.length = 0;
});
it("coalesces overlapping resync scans and lets every requester finish", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const discord = new Discord({} as Store, "123");
  clients.push(discord);
  const channels = {
    fetch: vi.fn(async () => {
      await gate;
      return new Map();
    }),
  };
  const fetch = vi
    .spyOn(discord.client.guilds, "fetch")
    .mockResolvedValue({ channels } as never);
  const first = discord.scan();
  const second = discord.scan();
  release();
  await expect(Promise.all([first, second])).resolves.toEqual([
    undefined,
    undefined,
  ]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(discord.ready).toBe(true);
  expect(discord.scanning).toBe(false);
});
it("releases a failed scan so a later recovery scan can proceed", async () => {
  const discord = new Discord({} as Store, "123");
  clients.push(discord);
  const fetch = vi
    .spyOn(discord.client.guilds, "fetch")
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValue({ channels: { fetch: async () => new Map() } } as never);
  await expect(discord.scan()).rejects.toThrow("temporary failure");
  expect(discord.scanning).toBe(false);
  await expect(discord.scan()).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledTimes(2);
});
