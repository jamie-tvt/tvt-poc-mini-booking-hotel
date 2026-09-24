---
id: qa.test-results
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [qa.test-plan]
tags: [qa, test-results]
---

# Kết quả test — cập nhật 24/09/2026 (v1.2.0)

## v1.2.0 — catalog 200 chỗ nghỉ miền Tây

| Bộ test | Số test | Kết quả |
|---|---|---|
| Backend `./mvnw verify` (unit + IT Testcontainers, thêm `MekongCatalogTest` 4) | 74 | Pass |
| Frontend Vitest (thêm `offline-demo/mock/catalog.test.ts` 4) | 108 | Pass; `tsc --noEmit` sạch |
| E2E demo offline (test duyệt khách sạn chọn tab "Chờ duyệt" vì danh sách admin nay 205 dòng) | 11 | Pass |
| Seeder trên MySQL 8 trống (CAT-05) | — | 205 khách sạn, 532 loại phòng, 1.733 phòng; `/cities` 13 tỉnh; tìm Bến Tre 20, Cà Mau 12; giá niêm yết đúng BR-PR-01 (360.000 → 396.000) |
| Link ảnh Unsplash dùng trong catalog | 269 | HTTP 200 |
| Soát giao diện trang chủ (13 điểm đến có ảnh), chi tiết chỗ nghỉ mới | — | Không vỡ layout |

## v1.1.0

| Bộ test | Số test | Kết quả |
|---|---|---|
| Demo offline 1 file HTML qua `file://` (`src/e2e/offline/offline-demo.spec.ts`, 24/09 — v1.1.0) | 11 | Pass — E2E-01 (khách vãng lai → lễ tân → đánh giá), tra cứu đơn, huỷ hoàn 100%, admin duyệt khách sạn + payout, hết hạn bằng đồng hồ demo, phân quyền, 26 màn không tràn ngang ở 390px, bảng DEMO; **mới**: chặn Unsplash → ảnh tự đổi sang SVG dự phòng; mobile 375px: kết quả trong màn đầu, bottom sheet (Esc trả focus, Áp dụng, chip ✕ bỏ lọc) |
| Backend unit (`StateMachineTest` 29, `PricingTest` 14, `RefundRuleTest` 11, **`DemoDataSeederImagesTest` 1**) | 55 | Pass |
| Backend integration (`InventoryConcurrencyIT` 3, `PaymentAndExpiryIT` 3, `TenantIsolationIT` 3, `StayFlowIT` 2, `HotelApprovalIT` 2, `GuestAccessIT` 2) | 15 | Pass (MySQL 8.0 Testcontainers) — `./mvnw -B -ntp verify` 70/70, BUILD SUCCESS |
| Frontend unit (Vitest, 13 file — mới: `images.test.ts` 7, `SearchFilters.test.tsx` 5) | 108 | Pass; `tsc --noEmit` sạch (cả `offline-demo/tsconfig.json`); `next build` pass; `npm run build:offline` → `review-html/BookingHotel_Demo.html` |
| E2E Playwright full-stack (Desktop Chrome + iPhone 14 Pro) | 6 | Pass ở v1 (23/09); v1.1.0 chưa chạy lại vì cần stack Docker Compose đang chạy |
| Kiểm tra trực quan 375px + 1280px (bản offline: trang chủ, danh sách đóng/mở bottom sheet, chi tiết, checkout, đơn khách) | 10 ảnh | Không cuộn ngang, không lỗi JS — `review-html/screenshots/` (ảnh `5-le-tan-desktop.png` giữ từ v1) |

## Còn hạn chế
- Chưa có ESLint frontend; màn lễ tân lấy tối đa 100 đơn mỗi danh sách, chưa phân trang.
- Tab "Giá theo ngày" chỉ hiện giá vừa áp trong phiên (chưa có API đọc lại).
- Vài chỗ trên giao diện ghi cứng "15 phút" dù hạn giữ phòng đổi được trong Cài đặt.
- Đường Stripe thật chưa chạy thử.
