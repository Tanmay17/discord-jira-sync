import { describe, expect, it } from "vitest";
import { projectKey, statusOf, adf, hasMessageMarker } from "../src/domain.js";
describe("Discord conventions", () => {
  it("maps valid Jira keys and rejects unsupported channel names", () => {
    expect(projectKey("proj-checkout")).toBe("CHECKOUT");
    for (const value of [
      "general",
      "proj-",
      "proj-check-out",
      "proj-x' OR 1=1",
    ])
      expect(projectKey(value)).toBeUndefined();
  });
  it("takes the last explicit supported status and respects word boundaries", () => {
    expect(statusOf("status: todo then STATUS: done")).toBe("done");
    expect(statusOf("status: doneish")).toBeUndefined();
    expect(statusOf("status: blocked")).toBe("blocked");
  });
});

it("reconciles only the exact terminal message marker", () => {
  expect(hasMessageMarker(adf("hi\n[discord-message:42]"), "42")).toBe(true);
  expect(hasMessageMarker(adf("hi\n[discord-message:420]"), "42")).toBe(false);
  expect(
    hasMessageMarker(
      adf("quoted [discord-message:42]\n[discord-message:99]"),
      "42",
    ),
  ).toBe(false);
});
