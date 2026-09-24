import { expect, Page } from "@playwright/test";

export const API = process.env.API_URL ?? "http://localhost:8180/api/v1";
export const PW = "12345678";

/** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vnDate(offsetDays = 0) {
  const d = new Date(Date.now() + 7 * 3600_000 + offsetDays * 86400_000);
  return d.toISOString().slice(0, 10);
}

export async function uiLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Mật khẩu/).fill(PW);
  await page.getByRole("button", { name: /^Đăng nhập$/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
