import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 420, height: 800 }, // phone-ish portrait
    launchOptions: {
      // Pre-installed Chromium (pinned in this environment).
      executablePath: "/opt/pw-browsers/chromium",
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
    },
  },
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
