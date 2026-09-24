---
id: qa.test-plan
status: approved
owner: mentor-team
last_updated: 2026-09-23
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
