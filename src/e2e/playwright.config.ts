import { defineConfig, devices } from "@playwright/test";

// Chạy trên stack Docker đang bật: docker compose up -d (web :3000, API :8080)
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3100",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Ảnh gửi kèm chỉ chụp khi chạy `npm run screenshots` trên DB sạch (tránh lẫn dữ liệu E2E)
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: process.env.SCREENSHOTS ? undefined : /screenshots/ },
    { name: "mobile", use: { ...devices["iPhone 14 Pro"], browserName: "chromium" }, testIgnore: /screenshots/ },
  ],
});
