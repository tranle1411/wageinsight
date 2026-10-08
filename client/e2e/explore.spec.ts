import { test, expect } from "@playwright/test";
test("guest prediction, comparison, export, and reload privacy", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore my estimate" }).click();
  await expect(
    page.getByText("ESTIMATED ANNUAL WAGE INCOME", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByText("PROFILE 1", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toBe(
    "wageinsight-scenarios.json",
  );
  await page.reload();
  await expect(page.getByText("PROFILE 1", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("ESTIMATED ANNUAL WAGE INCOME", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) =>
        /profile|prediction|scenario/i.test(k),
      ),
    ),
  ).toEqual([]);
});
test("responsive form and local explanation work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore my estimate" }).click();
  await page.getByRole("button", { name: "Explain this estimate" }).click();
  await expect(
    page.getByRole("heading", { name: "Reading your estimate" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".feature-explanation")
      .getByText(/Matching reference categories:/),
  ).toBeVisible();
  await expect(
    page
      .locator(".feature-explanation")
      .getByText(/No degree-field contrast is shown:/),
  ).toBeVisible();
  await expect(
    page.getByText("Demographics were not used in this estimate.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/" + test.info().project.name + "-results.png",
    fullPage: true,
  });
});
test("demographic interpretation includes labeled contrasts and research without AI", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByText("Explore demographic associations", { exact: false })
    .click();
  await page.getByLabel("Include demographics in this estimate").check();
  await page
    .getByLabel("Sex recorded in survey", { exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "Explore my estimate" }).click();
  await page.getByRole("button", { name: "Explain this estimate" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Demographic associations",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator(".feature-explanation")
      .getByText(/Female:.*relative to|Female:.*higher|Female:.*lower/),
  ).toBeVisible();
  await page.getByText("Research context and sources", { exact: true }).click();
  await expect(page.getByRole("link", { name: /Goldin/ })).toBeVisible();
  await expect(page.getByText(/not proof of the cause/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
