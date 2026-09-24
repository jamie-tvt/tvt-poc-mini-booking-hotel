---
id: technical.data-model
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: []
code_ref: [src/booking-hotel-backend/src/main/resources/db/migration/V1__init_schema.sql, src/booking-hotel-backend/src/main/resources/db/migration/V2__reference_data.sql]
tags: [technical, data-model, database]
---

# Mô hình dữ liệu

Team B chưa nộp Database Design nên mô hình do mentor đề xuất, bám các entity mà tài liệu FE của Team B liệt kê (`types/`: hotel, roomType, room, booking, invoice, payment, payout, review, platformFeeConfig).

Bảng chính: `users` (có `hotel_id` cho staff), `hotels` (owner, trạng thái duyệt), `facility_categories`, `facilities`, `room_types` (giá gốc, sức chứa, chính sách huỷ), `room_type_facilities`, `rooms`, **`room_inventory`**, `bookings` (guest checkout: `user_id` NULL, `booking_code`, `access_key`), `invoices`, `payments`, `payouts`, `reviews`, `notifications`, `audit_logs`, `system_settings`, `refresh_tokens`.

Ràng buộc nên chỉ cho intern:
- `room_inventory`: UNIQUE `(room_type_id, stay_date)`, CHECK `booked_rooms <= total_rooms`.
- `bookings`: CHECK `check_out > check_in`, trạng thái trong danh sách, `total = base + fee`.
- `payments.transaction_code` UNIQUE (webhook idempotent), `reviews.booking_id` UNIQUE, `payouts.booking_id` UNIQUE.
- Tiện nghi lưu MySQL qua bảng nối, không cần MongoDB (D8).
