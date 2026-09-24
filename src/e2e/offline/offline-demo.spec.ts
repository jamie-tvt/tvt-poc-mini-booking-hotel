import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Kiểm bản demo offline (review-html/BookingHotel_Demo.html) mở bằng file:// — không cần Docker.
 * Cùng kịch bản E2E-01 như bản full-stack, chạy trên dữ liệu mẫu có sẵn.
 */
const FILE = "file://" + path.resolve(__dirname, "../../../review-html/BookingHotel_Demo.html");
const go = (page: Page, route: string) => page.goto(`${FILE}#${route}`);
const vnDate = (offset = 0) => new Date(Date.now() + 7 * 3600_000 + offset * 86400_000).toISOString().slice(0, 10);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Font Google / ảnh Unsplash (CDN) không tải được khi mất mạng → giao diện tự dùng font hệ thống / SVG dự phòng
    if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text()) && !/images\.unsplash\.com/.test(m.location().url)) errors.push(m.text());
  });
  return errors;
}

async function login(page: Page, email: string) {
  await go(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill("12345678");
  await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
  await expect(page).not.toHaveURL(/#\/login/);
}

const logout = (page: Page) => page.evaluate(() => localStorage.removeItem("hb.auth"));

test.beforeEach(async ({ page }) => {
  await go(page, "/");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem("hb.demo.panel-seen", "1"));
  await page.reload();
});

test("trang công khai: tìm theo ngày, chi tiết khách sạn, ảnh Unsplash (dự phòng SVG nhúng)", async ({ page }) => {
  const errors = watchErrors(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await go(page, `/hotels?city=${encodeURIComponent("Cần Thơ")}&checkIn=${vnDate(3)}&checkOut=${vnDate(5)}&guests=2&rooms=1`);
  await expect(page.getByText(/Ninh Kiều Riverside/).first()).toBeVisible();
  await expect(page.getByText(/Cái Răng Homestay/).first()).toBeVisible();
  await expect(page.getByText(/Mekong Lotus/)).toHaveCount(0); // chờ duyệt → không hiện
  await page.getByRole("link", { name: /Ninh Kiều Riverside/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ninh Kiều");
  await expect(page.getByText(/Deluxe hướng sông/).first()).toBeVisible();
  await expect(page.getByText(/Thang máy giờ cao điểm/)).toBeVisible(); // đánh giá có sẵn
  const img = page.getByRole("img", { name: /^Ảnh Ninh Kiều Riverside/ }).first();
  await expect(img).toHaveJSProperty("complete", true);
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  // Có mạng: ảnh CDN Unsplash bản 1200px; mất mạng: SVG dự phòng nhúng trong file
  expect(await img.getAttribute("src")).toMatch(/^(https:\/\/images\.unsplash\.com\/photo-.*w=1200|data:image\/svg)/);
  expect(errors).toEqual([]);
});

test("mất mạng (chặn Unsplash): ảnh khách sạn/phòng tự đổi sang SVG dự phòng nhúng offline", async ({ page }) => {
  await page.route("https://images.unsplash.com/**", (r) => r.abort());
  await go(page, `/hotels/1?checkIn=${vnDate(3)}&checkOut=${vnDate(5)}&guests=2&rooms=1`);
  const cover = page.getByRole("img", { name: /^Ảnh Ninh Kiều Riverside/ }).first();
  await expect(cover).toHaveAttribute("src", /^data:image\/svg/);
  await expect(cover).toHaveJSProperty("complete", true);
  expect(await cover.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  const room = page.locator("#rooms article img").first();
  await room.scrollIntoViewIfNeeded();
  await expect(room).toHaveAttribute("src", /^data:image\/svg/);
});

test("mobile: kết quả hiện ngay màn đầu; Bộ lọc mở bottom sheet, Áp dụng, bỏ điều kiện bằng chip", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await go(page, "/");
  await page.evaluate(() => localStorage.setItem("hb.demo.panel-seen", "1"));
  await go(page, `/hotels?city=${encodeURIComponent("Cần Thơ")}`);
  const firstCard = page.getByRole("link", { name: /Ninh Kiều Riverside/ }).first();
  await expect(firstCard).toBeVisible();
  expect((await page.locator("main article").first().boundingBox())!.y).toBeLessThan(812); // không phải cuộn mới thấy kết quả

  const openBtn = page.getByRole("button", { name: "Bộ lọc (1)" });
  await openBtn.click();
  const sheet = page.getByRole("dialog", { name: "Bộ lọc" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(openBtn).toBeFocused();

  await openBtn.click();
  await sheet.getByText("4 sao", { exact: true }).click();
  await sheet.getByRole("button", { name: "Áp dụng" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/stars=4/);
  await expect(page.getByRole("button", { name: "Bộ lọc (2)" })).toBeVisible();
  await expect(page.getByText(/Cái Răng Homestay/)).toHaveCount(0); // homestay 3 sao bị lọc
  await page.getByRole("button", { name: "Bỏ lọc 4 sao" }).click();
  await expect(page).not.toHaveURL(/stars=/);
  await expect(page.getByText(/Cái Răng Homestay/).first()).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test("E2E-01: khách vãng lai đặt, thanh toán → lễ tân nhận/trả phòng → khách đánh giá", async ({ page }) => {
  const errors = watchErrors(page);
  const email = `guest-${Date.now()}@example.com`;
  await go(page, `/hotels/1?checkIn=${vnDate(0)}&checkOut=${vnDate(1)}&guests=2&rooms=1`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ninh Kiều");
  await page.getByRole("link", { name: /Đặt phòng này: Superior/ }).or(page.getByRole("button", { name: /Đặt phòng này: Superior/ })).first().click();
  await expect(page).toHaveURL(/#\/checkout/);
  await page.getByLabel("Họ và tên").fill("Khách Vãng Lai Demo");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Số điện thoại").fill("0909123456");
  await page.getByRole("button", { name: /Giữ phòng/ }).click();
  await expect(page).toHaveURL(/#\/booking\/HB-[A-Z0-9]+\?key=/);
  await expect(page.getByText(/Chờ thanh toán/).first()).toBeVisible();
  const bookingUrl = page.url();
  const code = /\/booking\/(HB-[A-Z0-9]+)/.exec(bookingUrl)![1];

  await page.getByRole("button", { name: /^Thanh toán/ }).first().click();
  await expect(page).toHaveURL(/#\/pay\/mock\/\d+/);
  await page.getByRole("button", { name: /Thanh toán thành công/ }).click();
  await expect(page).toHaveURL(/#\/booking\//);
  await expect(page.getByText(/Đã xác nhận/).first()).toBeVisible();

  await login(page, "staff@example.com");
  await go(page, "/portal/front-desk");
  await page.getByRole("button", { name: new RegExp(`Nhận phòng cho đơn .*${code}`) }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Số phòng trống" }).selectOption({ index: 1 });
  await dialog.getByRole("button", { name: "Xác nhận nhận phòng" }).click();
  await expect(page.getByText(new RegExp(`Đã nhận phòng .*${code}`)).first()).toBeVisible();
  await page.getByRole("tab", { name: /Đang ở/ }).or(page.getByRole("button", { name: /Đang ở/ })).first().click();
  await page.getByRole("button", { name: new RegExp(`Trả phòng cho đơn .*${code}`) }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Xác nhận trả phòng/ }).click();
  await expect(page.getByRole("dialog")).toBeHidden(); // chờ xử lý xong rồi mới rời trang

  await logout(page);
  await page.goto(bookingUrl.replace(/&paid=\d/, ""));
  await page.reload();
  await expect(page.getByText(/Đã trả phòng/).first()).toBeVisible();
  await page.getByRole("radio", { name: "5 sao" }).check({ force: true });
  await page.getByLabel("Cảm nhận của bạn").fill("Phòng sạch, nhìn ra sông Hậu rất đẹp, lễ tân thân thiện.");
  await page.getByRole("button", { name: /Gửi đánh giá/ }).click();
  await expect(page.getByText(/Cảm ơn bạn đã gửi đánh giá/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("tra cứu đơn khách vãng lai bằng mã và email", async ({ page }) => {
  await go(page, "/lookup");
  await page.getByLabel("Mã đơn").fill("HB-GUEST1");
  await page.getByLabel(/Email/).fill("guest@example.com");
  await page.getByRole("button", { name: /Tra cứu/ }).click();
  await expect(page).toHaveURL(/#\/booking\/HB-GUEST1\?key=/);
  await expect(page.getByText("HB-GUEST1").first()).toBeVisible();
});

test("khách huỷ đơn còn hạn miễn phí → xem trước hoàn 100%, đơn chuyển Đã huỷ", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page, "customer@example.com");
  await go(page, "/my-bookings");
  await page.getByRole("link", { name: /Ninh Kiều Riverside/ }).first().click(); // đơn mới nhất: Superior sau 10 ngày
  await expect(page.getByText(/Superior/).first()).toBeVisible();
  await page.getByRole("button", { name: /Huỷ đặt phòng/ }).first().click();
  await expect(page.getByRole("dialog").getByText("(100%)")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận huỷ" }).click();
  await expect(page.getByText(/Đơn đã huỷ/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin duyệt khách sạn chờ duyệt → hiện ở trang tìm kiếm; đánh dấu đã chi trả payout", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page, "admin@example.com");
  await go(page, "/admin/hotels");
  await page.getByRole("button", { name: "Duyệt Mekong Lotus Hotel" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Duyệt", exact: true }).click();
  await expect(page.getByText(/Đã duyệt/).first()).toBeVisible();
  await go(page, "/admin/payouts");
  await page.getByRole("button", { name: /Đánh dấu đã trả khoản/ }).first().click();
  await page.getByRole("dialog").getByRole("button").last().click();
  await expect(page.getByText(/Đã đánh dấu chi trả/).first()).toBeVisible();
  await logout(page);
  await go(page, `/hotels?city=${encodeURIComponent("Cần Thơ")}`);
  await expect(page.getByText(/Mekong Lotus/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("phân quyền: khách không vào Portal, lễ tân không vào mục của chủ khách sạn", async ({ page }) => {
  await login(page, "customer@example.com");
  await go(page, "/portal/front-desk");
  await expect(page.getByText(/không có quyền/i).first()).toBeVisible();
  await logout(page);
  await login(page, "staff@example.com");
  await go(page, "/portal/payouts");
  await expect(page.getByText(/không có quyền/i).first()).toBeVisible();
});

test("công cụ demo: tua +15 phút → đơn chưa thanh toán tự hết hạn", async ({ page }) => {
  const errors = watchErrors(page);
  await go(page, `/hotels/2?checkIn=${vnDate(5)}&checkOut=${vnDate(6)}&guests=2&rooms=1`);
  await page.getByRole("link", { name: /Đặt phòng này/ }).or(page.getByRole("button", { name: /Đặt phòng này/ })).first().click();
  await page.getByLabel("Họ và tên").fill("Khách Quên Trả Tiền");
  await page.getByLabel("Email").fill("late@example.com");
  await page.getByLabel("Số điện thoại").fill("0909000111");
  await page.getByRole("button", { name: /Giữ phòng/ }).click();
  await expect(page.getByText(/Chờ thanh toán/).first()).toBeVisible();
  const bookingUrl = page.url();
  await login(page, "admin@example.com");
  await page.getByRole("button", { name: "+15 phút" }).click();
  await expect(page.getByTestId("demo-offset")).toContainText("15 phút");
  await logout(page);
  await page.goto(bookingUrl);
  await page.reload();
  await expect(page.getByText(/Đơn đã hết hạn giữ phòng/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("mọi màn chính mở được, không tràn ngang trên mobile", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = watchErrors(page);
  await go(page, "/");
  await page.evaluate(() => localStorage.setItem("hb.demo.panel-seen", "1"));
  const check = async (route: string) => {
    await go(page, route);
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `tràn ngang ở ${route}`).toBeLessThanOrEqual(1);
    await expect(page.getByText("Đã có lỗi xảy ra")).toHaveCount(0);
  };
  const stay = `checkIn=${vnDate(3)}&checkOut=${vnDate(5)}&guests=2&rooms=1`;
  for (const r of ["/", `/hotels?${stay}`, `/hotels/4?${stay}`, "/lookup", "/booking/HB-GUEST1?key=demo-guest-key-000000001", "/login", "/register"]) await check(r);
  await login(page, "customer@example.com");
  for (const r of ["/my-bookings", "/notifications", "/account"]) await check(r);
  await logout(page);
  await login(page, "owner@example.com");
  for (const r of ["/portal", "/portal/front-desk", "/portal/bookings", "/portal/hotels", "/portal/hotels/1", "/portal/hotels/new", "/portal/payouts"]) await check(r);
  await logout(page);
  await login(page, "admin@example.com");
  for (const r of ["/admin", "/admin/hotels", "/admin/bookings", "/admin/payments", "/admin/payouts", "/admin/facilities", "/admin/users", "/admin/settings", "/admin/audit-logs"]) await check(r);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("bảng DEMO: tự mở lần đầu, đổi vai trò 1 chạm, mở đơn khách vãng lai", async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const panel = page.getByRole("dialog", { name: "Hướng dẫn demo" });
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Lễ tân · Phạm Văn Lộc|Phạm Văn Lộc/ }).click();
  await expect(page).toHaveURL(/#\/portal$/);
  await page.getByRole("button", { name: "DEMO · hướng dẫn" }).click();
  await panel.getByRole("button", { name: /Đơn khách vãng lai HB-GUEST1/ }).click();
  await expect(page).toHaveURL(/#\/booking\/HB-GUEST1\?key=/);
  await expect(page.getByText("HB-GUEST1").first()).toBeVisible();
});
