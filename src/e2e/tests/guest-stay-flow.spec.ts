import { expect, test } from "@playwright/test";
import { API, uiLogin, vnDate } from "./helpers";

/**
 * Kịch bản nghiệm thu Mức 1 (docs/qa/test-plan.md E2E-01):
 * khách vãng lai (không tài khoản) chọn phòng hôm nay → giữ phòng → cổng giả lập → lễ tân nhận/trả phòng → khách đánh giá.
 */
test("khách vãng lai đặt phòng, thanh toán, lễ tân nhận/trả phòng, khách đánh giá", async ({ page, request }) => {
  const checkIn = vnDate(0);
  const checkOut = vnDate(1);
  const hotels = (await (await request.get(`${API}/hotels/search?city=${encodeURIComponent("Cần Thơ")}&checkIn=${checkIn}&checkOut=${checkOut}&guests=2&rooms=1`)).json()).data.content;
  const hotel = hotels.find((h: { name: string }) => h.name.includes("Ninh Kiều"));
  expect(hotel, "Ninh Kiều còn phòng tối nay").toBeTruthy();
  const email = `guest-${Date.now()}@example.com`;

  await test.step("Xem khách sạn và chọn phòng Superior", async () => {
    await page.goto(`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=2&rooms=1`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ninh Kiều");
    await page.getByRole("link", { name: /Đặt phòng này: Superior/ }).or(page.getByRole("button", { name: /Đặt phòng này: Superior/ })).first().click();
    await expect(page).toHaveURL(/\/checkout/);
  });

  await test.step("Điền thông tin khách và giữ phòng", async () => {
    await page.getByLabel("Họ và tên").fill("Khách Vãng Lai E2E");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Số điện thoại").fill("0909123456");
    await page.getByRole("button", { name: /Giữ phòng/ }).click();
    await expect(page).toHaveURL(/\/booking\/HB-[A-Z0-9]+\?key=/);
    await expect(page.getByText(/Chờ thanh toán/).first()).toBeVisible();
  });
  const bookingUrl = page.url();
  const code = /\/booking\/(HB-[A-Z0-9]+)/.exec(bookingUrl)![1];

  await test.step("Thanh toán qua cổng giả lập", async () => {
    await page.getByRole("button", { name: /^Thanh toán/ }).first().click();
    await expect(page).toHaveURL(/\/pay\/mock\/\d+/);
    await page.getByRole("button", { name: /Thanh toán thành công/ }).click();
    await expect(page).toHaveURL(/\/booking\//);
    await expect(page.getByText(/Đã xác nhận/).first()).toBeVisible({ timeout: 15_000 });
  });

  await test.step("Lễ tân nhận phòng rồi trả phòng", async () => {
    await uiLogin(page, "staff@example.com");
    await page.goto("/portal/front-desk");
    await page.getByRole("button", { name: new RegExp(`Nhận phòng cho đơn .*${code}`) }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox", { name: "Số phòng trống" }).selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Xác nhận nhận phòng" }).click();
    await expect(page.getByText(new RegExp(`Đã nhận phòng .*${code}`)).first()).toBeVisible();
    await page.getByRole("tab", { name: /Đang ở/ }).or(page.getByRole("button", { name: /Đang ở/ })).first().click();
    await page.getByRole("button", { name: new RegExp(`Trả phòng cho đơn .*${code}`) }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Xác nhận trả phòng/ }).click();
    await expect(page.getByText(new RegExp(`${code}`)).first()).toBeVisible();
  });

  await test.step("Khách mở lại đơn bằng link và đánh giá", async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(bookingUrl.replace(/&paid=\d/, ""));
    await expect(page.getByText(/Đã trả phòng|Đã hoàn thành|Trả phòng/).first()).toBeVisible();
    await page.getByRole("radio", { name: "5 sao" }).check({ force: true });
    await page.getByLabel("Cảm nhận của bạn").fill("Phòng sạch, nhìn ra sông Hậu rất đẹp, lễ tân thân thiện.");
    await page.getByRole("button", { name: /Gửi đánh giá/ }).click();
    await expect(page.getByText(/Cảm ơn bạn đã gửi đánh giá/).first()).toBeVisible();
  });
});

test("tra cứu đơn khách vãng lai bằng mã và email", async ({ page }) => {
  await page.goto("/lookup");
  await page.getByLabel("Mã đơn").fill("HB-GUEST1");
  await page.getByLabel(/Email/).fill("guest@example.com");
  await page.getByRole("button", { name: /Tra cứu/ }).click();
  await expect(page).toHaveURL(/\/booking\/HB-GUEST1\?key=/);
  await expect(page.getByText("HB-GUEST1").first()).toBeVisible();
});

test("khách không vào được Hotel Portal", async ({ page }) => {
  await uiLogin(page, "customer@example.com");
  await page.goto("/portal/front-desk");
  await expect(page.getByText(/không có quyền|Không có quyền/).first()).toBeVisible();
});
