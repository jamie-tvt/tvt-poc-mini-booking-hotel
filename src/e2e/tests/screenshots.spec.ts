import { devices, expect, test } from "@playwright/test";
import { uiLogin, vnDate } from "./helpers";

const OUT = "../../review-html/screenshots";
const mobile = { ...devices["iPhone 14 Pro"], browserName: "chromium" as const };
test.describe.configure({ mode: "serial" });

test("1 — trang chủ (desktop)", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: `${OUT}/1-trang-chu-desktop.png` });
  await page.close();
});

test("2 — kết quả tìm phòng (mobile)", async ({ browser }) => {
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`/hotels?city=${encodeURIComponent("Cần Thơ")}&checkIn=${vnDate(3)}&checkOut=${vnDate(5)}&guests=2&rooms=1`);
  await expect(page.getByText(/Ninh Kiều/).first()).toBeVisible();
  await page.screenshot({ path: `${OUT}/2-tim-phong-mobile.png` });
  await ctx.close();
});

test("3 — chi tiết khách sạn, loại phòng (mobile)", async ({ browser }) => {
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto(`/hotels/1?checkIn=${vnDate(3)}&checkOut=${vnDate(5)}&guests=2&rooms=1`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByText(/Deluxe/).first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -120));
  await page.screenshot({ path: `${OUT}/3-chi-tiet-khach-san-mobile.png` });
  await ctx.close();
});

test("4 — đơn khách vãng lai (mobile)", async ({ browser }) => {
  const ctx = await browser.newContext(mobile);
  const page = await ctx.newPage();
  await page.goto("/booking/HB-GUEST1?key=demo-guest-key-000000001");
  await expect(page.getByText("HB-GUEST1").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/4-don-khach-vang-lai-mobile.png` });
  await ctx.close();
});

test("5 — lễ tân (desktop)", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await uiLogin(page, "staff@example.com");
  await page.goto("/portal/front-desk");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT}/5-le-tan-desktop.png` });
  await page.close();
});
