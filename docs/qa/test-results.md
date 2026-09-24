---
id: qa.test-results
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [qa.test-plan]
tags: [qa, test-results]
---

# Kết quả test — 23/09/2026

| Bộ test | Số test | Kết quả |
|---|---|---|
| Demo offline 1 file HTML qua `file://` (`src/e2e/offline/offline-demo.spec.ts`, 24/09) | 9 | Pass — gồm E2E-01 (khách vãng lai → lễ tân → đánh giá), tra cứu đơn, huỷ hoàn 100%, admin duyệt khách sạn + payout, hết hạn bằng đồng hồ demo, phân quyền, 26 màn không tràn ngang ở 390px, không lỗi JS |
| Backend unit (`StateMachineTest` 29, `PricingTest` 14, `RefundRuleTest` 11) | 54 | Pass |
| Backend integration (`InventoryConcurrencyIT` 3, `PaymentAndExpiryIT` 3, `TenantIsolationIT` 3, `StayFlowIT` 2, `HotelApprovalIT` 2, `GuestAccessIT` 2) | 15 | Pass (MySQL 8.0 Testcontainers); test tranh phòng cuối chạy lại 4 lần ổn định |
| Frontend unit (Vitest, 11 file) | 96 | Pass; `tsc --noEmit` sạch; `next build` pass |
| E2E Playwright (Desktop Chrome + iPhone 14 Pro) | 6 | Pass |
| Screenshot (5 ảnh, DB sạch) | 5 | Đã soát — `review-html/screenshots/` |

## Còn hạn chế
- Chưa có ESLint frontend; màn lễ tân lấy tối đa 100 đơn mỗi danh sách, chưa phân trang.
- Tab "Giá theo ngày" chỉ hiện giá vừa áp trong phiên (chưa có API đọc lại).
- Vài chỗ trên giao diện ghi cứng "15 phút" dù hạn giữ phòng đổi được trong Cài đặt.
- Đường Stripe thật chưa chạy thử.
