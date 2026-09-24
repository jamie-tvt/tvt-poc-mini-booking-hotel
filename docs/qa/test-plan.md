---
id: qa.test-plan
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [technical.api-contracts, technical.state-machine]
tags: [qa, test-plan, gate-2]
---

# Test plan — ba tầng

Công cụ và lệnh như POC Tour: `./mvnw test` (JUnit + Testcontainers MySQL 8), `npm test` (Vitest), `npx playwright test` ở `src/e2e` với stack Docker đang chạy (web 3100, API 8180).

| Mã | Kịch bản | Tầng | Kỳ vọng |
|---|---|---|---|
| IT-01 | **10 khách vãng lai đồng thời đặt phòng cuối 2 đêm** | Integration | Đúng 1 thành công, 9 × 409 `ROOM_UNAVAILABLE`, `booked = total` |
| IT-02 | Khoảng ngày giao nhau bị chặn, khoảng ngày kề nhau được đặt | Integration | Đêm checkout không tính |
| IT-03 | Giữ phòng quá hạn | Integration | EXPIRED, trả tồn kho |
| IT-04 | Webhook sai chữ ký, gửi lại | Integration | 401; idempotent; CONFIRMED |
| IT-05 | Nhận phòng → trả phòng → đánh giá; đánh giá sớm và lần 2 | Integration | 422 / 409; payout sinh ra |
| IT-06 | Owner A truy cập khách sạn B; staff ngoài phạm vi; khách vào `/portal` | Integration | 404 / 404 / 403 |
| IT-07 | Khách sạn chờ duyệt không hiện; admin duyệt thì hiện | Integration | — |
| IT-08 | Tra cứu mã + email sai; key sai | Integration | 404 |
| E2E-01 | Khách vãng lai xem Ninh Kiều → Superior tối nay → giữ phòng → cổng giả lập → lễ tân nhận phòng (chọn số phòng) → trả phòng → khách mở lại link đánh giá 5 sao | E2E | Chạy trọn desktop và iPhone |
| E2E-02 | Tra cứu HB-GUEST1 + guest@example.com | E2E | Mở trang đơn có key |
| E2E-03 | Khách vào `/portal/front-desk` | E2E | Báo không có quyền |

Checklist UI (MASTER.md): không emoji làm icon, cursor-pointer, tương phản ≥ 4.5:1, focus nhìn thấy, reduced-motion, responsive 375–1440 không tràn ngang.

## v1.2.0 — Catalog 200 chỗ nghỉ miền Tây (GATE 2 đã duyệt 24/09/2026)
| Mã | Kịch bản | Tầng | Kỳ vọng |
|---|---|---|---|
| CAT-01 | `MekongCatalogTest`: 200 chỗ nghỉ, tên không trùng, đủ 13 tỉnh, trạng thái ACTIVE/PENDING_APPROVAL | Unit BE | Pass |
| CAT-02 | Giá trị vừa cột DB và quy tắc domain (sức chứa 1–20, giá > 0, ngày huỷ 0–60, số phòng không trùng trong 1 khách sạn), khoá tiện nghi hợp lệ | Unit BE | Pass |
| CAT-03 | Chủ cơ sở `chunhaNN@example.com` là tài khoản mới; ảnh bìa/gallery/loại phòng là link CDN Unsplash có ghi công | Unit BE | Pass |
| CAT-04 | `offline-demo/mock/catalog.test.ts`: seed demo có 205 khách sạn, owner@example.com vẫn chỉ 3 khách sạn, tiện nghi dân dã không nhân đôi | Unit FE | Pass |
| CAT-05 | Chạy stack Docker với DB trống → seeder tạo đủ khách sạn/loại phòng/phòng; tìm theo tỉnh Bến Tre, Cà Mau có kết quả và giá niêm yết đúng BR-PR-01 | Thủ công + API | Seeder không lỗi |
| CAT-06 | Toàn bộ test cũ (unit/IT Testcontainers/E2E offline) chạy lại | Hồi quy | Pass; E2E phụ thuộc danh sách thì cập nhật |
| CAT-07 | Bản offline: trang chủ (13 điểm đến có ảnh), danh sách lọc tỉnh, chi tiết homestay/resort mới, đặt phòng ở chỗ nghỉ mới — desktop + mobile | UI | Không vỡ layout, không ảnh lỗi |
| CAT-08 | Tag `v1.2.0` → GitHub Actions xanh → Vercel production có dữ liệu mới | CI/CD | Deploy thành công |
