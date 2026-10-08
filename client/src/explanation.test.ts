import { it, expect } from "vitest";
import worker from "../../worker/src/index";
const origin = "https://example.pages.dev";
function request(body: unknown, allowed = origin) {
  return new Request("https://example.workers.dev", {
    method: "POST",
    headers: { Origin: allowed, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const valid = {
  estimate: 60000,
  lower: 30000,
  upper: 110000,
  year: 2024,
  effects: [],
};
it("rejects foreign origins and invalid numbers before contacting AI", async () => {
  let calls = 0;
  const env = {
    ALLOWED_ORIGIN: origin,
    AI: {
      run: async () => {
        calls++;
        return { response: "text" };
      },
    },
  };
  expect(
    (await worker.fetch(request(valid, "https://wrong.example"), env)).status,
  ).toBe(403);
  expect(
    (await worker.fetch(request({ ...valid, lower: 70000 }), env)).status,
  ).toBe(422);
  expect(calls).toBe(0);
});
it("localizes daily exhaustion through an explicit UTC reset timestamp", async () => {
  const env = {
    ALLOWED_ORIGIN: origin,
    AI: {
      run: async () => {
        throw Error("daily allocation exceeded");
      },
    },
  };
  const response = await worker.fetch(request(valid), env);
  expect(response.status).toBe(429);
  const data = await response.json();
  const reset = new Date(data.resetAt);
  expect(reset.getUTCHours()).toBe(0);
  expect(reset.getTime()).toBeGreaterThan(Date.now());
});
it("does not label provider outages as daily exhaustion", async () => {
  const env = {
    ALLOWED_ORIGIN: origin,
    AI: {
      run: async () => {
        throw Error("upstream unavailable");
      },
    },
  };
  const response = await worker.fetch(request(valid), env);
  expect(response.status).toBe(503);
  expect((await response.json()).resetAt).toBeUndefined();
});
