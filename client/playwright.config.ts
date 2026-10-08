import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testIgnore: "turnstile.spec.ts",
  use: { baseURL: "http://127.0.0.1:5173" },
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1365, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
