import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "turnstile.spec.ts",
  use: { baseURL: "http://127.0.0.1:5174" },
  webServer: {
    command: "pnpm start --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    env: {
      VITE_EXPLANATION_URL: "https://explanation.test/",
      VITE_TURNSTILE_SITE_KEY: "test-public-site-key",
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1365, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
});
