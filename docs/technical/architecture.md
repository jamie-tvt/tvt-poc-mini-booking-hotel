---
id: technical.architecture
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [technical.data-model, technical.api-contracts]
code_ref: [src/docker-compose.yml, src/booking-hotel-backend/src/main/java/com/hotelbooking]
tags: [technical, architecture, poc]
---

# Kiến trúc

```mermaid
flowchart LR
  G[Khách vãng lai / khách hàng] -->|HTTPS| FE[Next.js :3100<br/>Customer Site · /portal · /admin]
  O[Chủ khách sạn / lễ tân] --> FE
  A[Admin] --> FE
  FE -->|server-side fetch| API[Spring Boot :8180 /api/v1]
  G -->|mã đơn + access key / Bearer JWT| API
  API --> DB[(MySQL 8 · Flyway<br/>room_inventory theo đêm)]
  GW[Cổng thanh toán giả lập / Stripe] -->|webhook HMAC| API
```

Cùng khuôn với POC Tour: backend 4 lớp theo module (`presentation → application → domain`, `infrastructure` cài đặt), cùng `ApiResponse`, JWT xoay vòng, `PaymentGateway`, `TimeProvider`/đồng hồ demo, audit, thông báo.

## Khác biệt so với Tour
| Chủ đề | Cách làm |
|---|---|
| Tồn kho | `room_inventory(room_type_id, stay_date)`; đặt phòng `INSERT IGNORE` đủ các đêm rồi `SELECT … FOR UPDATE ORDER BY stay_date` |
| Thứ tự khoá | `room_type → room → room_inventory (ngày tăng dần) → booking → payment`; hai khoá đầu chỉ dùng khi thêm/tắt phòng và check-in |
| Đọc trước khi khoá | Kiểm quyền và lấy id bằng projection (`BookingRef`), không nạp entity trước khi khoá |
| Isolation | READ COMMITTED |
| Đa bên | Owner/staff chỉ thấy khách sạn của mình (kiểm ở service, sai phạm vi → 404) |
| Khách vãng lai | Mã đơn + access key; tra cứu bằng mã + email |
| Tiền | `base_amount` (của khách sạn) + `fee_amount` (phí nền tảng) = `total_amount`; payout = base khi CHECKED_OUT |

Chi tiết luồng và 16 điểm lệch so với hợp đồng: `src/booking-hotel-backend/README.md`.
