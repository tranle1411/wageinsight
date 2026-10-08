import { afterEach, beforeEach, expect, it, vi } from "vitest";
import worker from "../../worker/src/index";
const origin = "https://wageinsight.chantranle-2026.workers.dev";
const valid = {
  estimate: 60000,
  lower: 30000,
  upper: 110000,
  year: 2024,
  effects: [],
  token: "fresh-token",
};
function request(body: unknown, allowed = origin) {
  return new Request("https://example.workers.dev", {
    method: "POST",
    headers: {
      Origin: allowed,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.1",
    },
    body: JSON.stringify(body),
  });
}
function environment() {
  return {
    ALLOWED_ORIGIN: origin,
    TURNSTILE_HOSTNAME: "wageinsight.chantranle-2026.workers.dev",
    EXPLANATIONS_ENABLED: "true",
    TURNSTILE_SECRET_KEY: "test-secret",
    IP_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    AI_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    AI: {
      run: vi.fn(async () => ({
        response: "Historical estimate; uncertainty remains.",
      })),
    },
  };
}
function run(
  body: unknown,
  env = environment(),
  allowed = origin,
): Promise<Response> {
  return Reflect.apply(worker.fetch, worker, [request(body, allowed), env]);
}
const verify = vi.fn();
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  verify.mockReset();
  verify.mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        action: "explain",
        hostname: "wageinsight.chantranle-2026.workers.dev",
      }),
    ),
  );
  vi.stubGlobal("fetch", verify);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("rejects foreign origins, invalid context, null body, and missing token before AI", async () => {
  const env = environment();
  expect((await run(valid, env, "https://wrong.example")).status).toBe(403);
  expect((await run({ ...valid, lower: 70000 }, env)).status).toBe(422);
  expect((await run(null, env)).status).toBe(422);
  expect((await run({ ...valid, token: "" }, env)).status).toBe(403);
  expect(verify).not.toHaveBeenCalled();
  expect(env.AI.run).not.toHaveBeenCalled();
});
it.each([
  { success: false },
  {
    success: true,
    action: "signup",
    hostname: "wageinsight.chantranle-2026.workers.dev",
  },
  { success: true, action: "explain", hostname: "localhost" },
])(
  "requires success, exact action, and production hostname: %j",
  async (check) => {
    verify.mockResolvedValue(new Response(JSON.stringify(check)));
    const env = environment();
    expect((await run(valid, env)).status).toBe(403);
    expect(env.AI.run).not.toHaveBeenCalled();
  },
);
it("verifies before AI and rejects replay", async () => {
  verify
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          action: "explain",
          hostname: "wageinsight.chantranle-2026.workers.dev",
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["timeout-or-duplicate"],
        }),
      ),
    );
  const env = environment();
  expect((await run(valid, env)).status).toBe(200);
  expect((await run(valid, env)).status).toBe(403);
  expect(env.AI.run).toHaveBeenCalledTimes(1);
  const body = verify.mock.calls[0][1].body as URLSearchParams;
  expect(body.get("response")).toBe("fresh-token");
  expect(body.get("secret")).toBe("test-secret");
  expect(JSON.stringify(env.AI.run.mock.calls)).not.toContain("fresh-token");
});
it("fails closed on verification outage, disabled service, or absent secret", async () => {
  const env = environment();
  verify.mockRejectedValue(Error("offline"));
  expect((await run(valid, env)).status).toBe(503);
  expect(
    (await run(valid, { ...env, EXPLANATIONS_ENABLED: "false" })).status,
  ).toBe(503);
  expect((await run(valid, { ...env, TURNSTILE_SECRET_KEY: "" })).status).toBe(
    503,
  );
  expect(env.AI.run).not.toHaveBeenCalled();
});
it("rate limits before verification and before AI without reporting daily exhaustion", async () => {
  const env = environment();
  env.IP_LIMITER.limit.mockResolvedValue({ success: false });
  const r = await run(valid, env);
  expect(r.status).toBe(429);
  expect(r.headers.get("Retry-After")).toBe("60");
  expect(verify).not.toHaveBeenCalled();
  env.IP_LIMITER.limit.mockResolvedValue({ success: true });
  env.AI_LIMITER.limit.mockResolvedValue({ success: false });
  expect((await run(valid, env)).status).toBe(429);
  expect(env.AI.run).not.toHaveBeenCalled();
});
it("rejects oversized bodies even without Content-Length", async () => {
  expect((await run({ ...valid, token: "x".repeat(9000) })).status).toBe(413);
  expect(verify).not.toHaveBeenCalled();
});
it("localizes daily exhaustion with an explicit UTC reset timestamp", async () => {
  const env = environment();
  env.AI.run.mockRejectedValue(Error("daily allocation exceeded"));
  const response = await run(valid, env);
  expect(response.status).toBe(429);
  const data = (await response.json()) as { resetAt: string };
  const reset = new Date(data.resetAt);
  expect(reset.getUTCHours()).toBe(0);
  expect(reset.getTime()).toBeGreaterThan(Date.now());
});
it("does not label provider outages as daily exhaustion", async () => {
  const env = environment();
  env.AI.run.mockRejectedValue(Error("upstream unavailable"));
  const response = await run(valid, env);
  expect(response.status).toBe(503);
  expect(
    ((await response.json()) as { resetAt?: string }).resetAt,
  ).toBeUndefined();
});
it("passes labeled contrasts and relevant sourced facts to AI, without the token", async () => {
  const env = environment();
  const input = {
    ...valid,
    variant: "demographic",
    effects: [
      {
        field: "EDUCD",
        selected: "Master's degree",
        reference: "Bachelor's degree",
        delta: 5000,
      },
      { field: "SEX", selected: "Female", reference: "Male", delta: -3000 },
    ],
  };
  expect((await run(input, env)).status).toBe(200);
  const calls = JSON.stringify(env.AI.run.mock.calls);
  expect(calls).toContain("Master's degree");
  expect(calls).toContain("flexibility");
  expect(calls).toContain("not proof");
  expect(calls).not.toContain("fresh-token");
  expect((await run({ ...input, variant: "career" }, env)).status).toBe(422);
});
it("rejects invented group medians and falls back to approved research passages", async () => {
  const env = environment();
  env.AI.run.mockResolvedValue({
    response: "The median income of all business graduates is $111458.",
  });
  const response = await run(
    {
      ...valid,
      effects: [
        {
          field: "EDUCD",
          selected: "Bachelor's degree",
          reference: "Bachelor's degree",
          delta: 0,
        },
      ],
    },
    env,
  );
  const output = (await response.json()) as {
    text: string;
    selectionMethod: string;
  };
  expect(output.text).not.toContain("111458");
  expect(output.text).toContain("[education]");
  expect(output.selectionMethod).toBe("curated-fallback");
  expect(JSON.stringify(env.AI.run.mock.calls)).not.toContain('"estimate":');
});
it("returns personalized commentary with canonical citations and no salary arithmetic in AI", async () => {
  const env = environment();
  env.AI.run.mockResolvedValue({
    response: JSON.stringify({
      insights: [
        {
          field: "EDUCD",
          interpretation:
            "Your Master's degree selection connects to research on education and earnings. Broad population patterns cannot establish your personal return to education.",
          sourceIds: ["education"],
        },
      ],
    }),
  });
  const response = await run(
    {
      ...valid,
      effects: [
        {
          field: "EDUCD",
          selected: "Master's degree",
          reference: "Bachelor's degree",
          delta: 3000,
        },
      ],
    },
    env,
  );
  const output = (await response.json()) as {
    text: string;
    selectionMethod: string;
    sources: { url: string }[];
  };
  expect(output.selectionMethod).toBe("grounded-ai");
  expect(output.text).toContain("Your Master's degree");
  expect(output.sources[0].url).toBe(
    "https://www.bls.gov/emp/tables/unemployment-earnings-education.htm",
  );
  const prompt = JSON.stringify(env.AI.run.mock.calls);
  expect(prompt).toContain("higher modeled estimate");
  expect(prompt).not.toContain('"delta":');
  expect(prompt).not.toContain('"estimate":');
});
