---
id: constraints
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: []
tags: [governance, hard-rules]
---

# Luật cứng

- Không bao giờ tin trạng thái thanh toán từ trình duyệt; chỉ đổi PAID qua webhook đã xác minh chữ ký hoặc admin xác minh tay.
- Tồn kho phòng chỉ đổi trong giao dịch đã khoá các dòng `room_inventory` của mọi đêm liên quan; DB giữ CHECK `booked_rooms <= total_rooms` làm lớp chặn cuối.
- Thứ tự khoá toàn hệ thống: `room_inventory` (theo ngày tăng dần) → `bookings` → `payments`. Không khoá ngược chiều.
- Trạng thái booking/đợt/thanh toán chỉ đổi qua state machine trong domain; chuyển sai trả 409 `INVALID_TRANSITION`.
- Owner và staff chỉ truy cập dữ liệu khách sạn của mình, kiểm tra ở tầng service; sai phạm vi trả 404.
- Phân quyền kiểm tra ở API (SecurityConfig + @PreAuthorize), không chỉ ẩn nút ở giao diện.
- Secret chỉ ở biến môi trường (`src/.env`), không commit; `JWT_SECRET` ≥ 32 byte.
- Schema chỉ đổi qua migration Flyway mới; không `ddl-auto=update`.
- Không lưu refresh token thô, không lưu dữ liệu thẻ.
- Đồng hồ demo (`DEMO_TOOLS`) phải tắt ở môi trường thật.
