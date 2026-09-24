---
id: technical.security
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [constraints]
code_ref: [src/booking-hotel-backend/src/main/java/com/hotelbooking/infrastructure/security]
tags: [technical, security, privacy]
---

# Bảo mật

Giống POC Tour (JWT xoay vòng, BCrypt, `@PreAuthorize`, webhook HMAC, audit). Thêm:
- **Cách ly theo khách sạn (NFR-SEC-05)**: mọi thao tác `/portal/**` kiểm tra quyền sở hữu hoặc `hotel_id` của staff ở tầng service; sai phạm vi trả 404 để không lộ dữ liệu tồn tại. Có `TenantIsolationIT`.
- **Khách vãng lai**: mã đơn + access key 24 ký tự, so sánh hằng thời gian; sai key trả 404. POC lưu key thô để hiện lại ở tra cứu; production nên lưu hash và gửi link qua email (D11).
- Chưa làm: rate limit tra cứu đơn (chống dò mã + email), xác minh email.
