import { defineConfig, devices } from "@playwright/test";

// Kiểm bản demo 1 file HTML qua file:// — không cần Docker. Build trước: (frontend) npm run build:offline
export default defineConfig({
  testDir: "./offline",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
});
