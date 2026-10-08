import { test, expect } from "@playwright/test";
test("verification gates the AI request and sends a token without a raw profile", async ({
  page,
}) => {
  let calls = 0;
  await page.route(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.turnstile={render:(el,opts)=>{el.innerHTML='<button id="verify-test">Verify test challenge</button>';el.querySelector('button').onclick=()=>opts.callback('fresh-test-token');return 'widget-test'},remove:()=>{}};`,
      }),
  );
  await page.route("https://explanation.test/", async (route) => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body.token).toBe("fresh-test-token");
    expect(body.profile).toBeUndefined();
    expect(body.effects.length).toBeLessThanOrEqual(7);
    expect(
      body.effects.some((e: { field: string }) => e.field === "EDUCD"),
    ).toBeTruthy();
    expect(
      body.effects.some((e: { field: string }) => e.field === "OCC"),
    ).toBeTruthy();
    expect(body.effects[0].selected).toBeTruthy();
    expect(body.effects[0].reference).toBeTruthy();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        text: "Test AI explanation: historical association, not causation.",
        selectionMethod: "grounded-ai",
        sources: [{ id: "education" }],
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore my estimate" }).click();
  await page.getByRole("button", { name: "Explain this estimate" }).click();
  await expect(
    page.getByRole("button", { name: "Verify test challenge" }),
  ).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Verify test challenge" }).click();
  await expect(
    page.getByText(
      "Test AI explanation: historical association, not causation.",
    ),
  ).toBeVisible();
  expect(calls).toBe(1);
  await expect(
    page.getByText("AI-written commentary · cited research", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".citation-list")
      .getByRole("link", { name: /Education pays/ }),
  ).toHaveAttribute(
    "href",
    "https://www.bls.gov/emp/tables/unemployment-earnings-education.htm",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("failed widget load can be retried without sending an AI request", async ({
  page,
}) => {
  let loads = 0,
    calls = 0;
  await page.route("https://explanation.test/", (route) => {
    calls++;
    return route.abort();
  });
  await page.route(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    (route) => {
      if (++loads === 1) return route.abort();
      return route.fulfill({
        contentType: "application/javascript",
        body: `window.turnstile={render:el=>{el.textContent='Verification ready';return 'widget-test'},remove:()=>{}};`,
      });
    },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore my estimate" }).click();
  await page.getByRole("button", { name: "Explain this estimate" }).click();
  await expect(
    page.getByRole("button", { name: "Retry verification" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry verification" }).click();
  await expect(page.getByText("Verification ready")).toBeVisible();
  expect(calls).toBe(0);
  expect(loads).toBe(2);
});
