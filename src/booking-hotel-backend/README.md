# booking-hotel-backend — POC mentor "Booking Hotel"

Spring Boot 3.5 / Java 17 / MySQL 8 / Flyway. Hợp đồng API: `docs/technical/api-contracts.md`.
Khuôn mẫu bám theo POC Tour (`poc-mini-booking-tour/src/booking-tour-backend`): cùng ApiResponse, mã lỗi, JWT + refresh xoay vòng, StateMachine, TimeProvider, cổng thanh toán giả lập có chữ ký HMAC.

## Chạy

```bash
# Toàn bộ stack (từ thư mục src/): MySQL 3308, API 8180, web 3100
cp .env.example .env           # hoặc dùng .env đã sinh sẵn (secret ngẫu nhiên)
docker compose up -d --build mysql backend
curl http://localhost:8180/actuator/health
# Swagger: http://localhost:8180/docs

# Test (cần Docker cho Testcontainers mysql:8.0)
./mvnw test                    # unit (*Test) + integration (*IT)
```

Chạy lại dữ liệu mẫu từ đầu: `docker compose down -v && docker compose up -d mysql backend`.

## Tài khoản mẫu (mật khẩu `12345678`)

| Vai trò | Email | Dữ liệu demo |
|---|---|---|
| CUSTOMER | customer@example.com | CONFIRMED nhận phòng **hôm nay** (Ninh Kiều Deluxe), CONFIRMED sau 10 ngày (huỷ hoàn 100%), CHECKED_OUT tuần trước chưa đánh giá |
| CUSTOMER | mai.tran@example.com | 2 đơn đã ở + đã đánh giá, 1 đơn đang ở (CHECKED_IN phòng 201) |
| HOTEL_OWNER | owner@example.com | Ninh Kiều Riverside, Cái Răng Homestay, Mekong Lotus (chờ duyệt) |
| HOTEL_OWNER | owner2@example.com | Vị Thanh Green, Sunset Bay Phú Quốc |
| HOTEL_STAFF | staff@example.com | Lễ tân Ninh Kiều Riverside |
| ADMIN | admin@example.com | |

Khách vãng lai: tra cứu `HB-GUEST1` + `guest@example.com` (accessKey `demo-guest-key-000000001`).

## Kiến trúc

```
presentation/   controller + Dtos/DtoMapper + GlobalExceptionHandler (ApiResponse, PageResponse)
application/    use case: booking, inventory, hotel (catalog/portal/admin/scope), payment, payout, review, auth, user…
domain/         entity + luật thuần: StateMachine trong enum, Pricing (BR-PR-01), RefundRule (BR-CN-01), RoomInventory
infrastructure/ JPA repo, security (JWT), cổng thanh toán (mock/stripe), seed, config
```

### Những điểm nghiệp vụ trọng tâm
- **Tồn kho theo đêm** `room_inventory` UNIQUE(room_type_id, stay_date), CHECK `booked_rooms <= total_rooms`.
  Đặt phòng = 2 giao dịch: (1) `ensureNights` INSERT IGNORE các đêm còn thiếu (giao dịch ngắn riêng — tránh
  deadlock nâng khoá S→X của INSERT IGNORE); (2) `SELECT … FOR UPDATE ORDER BY stay_date` mọi đêm
  `[checkIn, checkOut)`, kiểm từng đêm `total − booked ≥ roomsCount`, tăng `booked_rooms`. Thiếu 1 đêm → 409 `ROOM_UNAVAILABLE`.
- **Thứ tự khoá toàn hệ thống**: `room_type` (mutex số phòng) → `room` → `inventory` (ngày tăng dần) → `booking` → `payment`.
  Isolation **READ COMMITTED**. Kiểm quyền trước khi khoá bằng `BookingRef` (projection, không nạp entity) để entity
  luôn được nạp lần đầu bằng `FOR UPDATE` — tránh Hibernate trả lại instance cũ trong persistence context.
- **Thêm/tắt phòng** giữ khoá X trên dòng `room_types`, cập nhật `total_rooms` các đêm từ hôm nay; đêm đã bán nhiều hơn → 409.
  Tạo dòng tồn kho giữ khoá S trên cùng dòng đó → không bao giờ đếm theo số phòng cũ.
- **Giá niêm yết** = base (hoặc `price_override` của đêm) × (1 + fee%) làm tròn lên bội 1.000đ, toàn số nguyên.
  Booking và invoice lưu `base_amount`, `fee_amount`, `total_amount`; payout = `base_amount`.
- **Huỷ** theo chính sách chụp lại lúc đặt (đổi chính sách loại phòng sau không ảnh hưởng đơn cũ). PENDING huỷ miễn phí.
- **Cách ly tenant** ở `HotelScope`: owner theo `owner_id`, staff theo `users.hotel_id`; ngoài phạm vi → 404.
  Việc chỉ owner làm được chặn thêm ở `SecurityConfig` (403 trước cả validate body) + `@PreAuthorize`.
- "Hôm nay" luôn là `LocalDate` theo `Asia/Ho_Chi_Minh` từ `TimeProvider` (dời được bằng `/demo/clock`).

## Chỗ lệch / bổ sung so với hợp đồng

| # | Nội dung | Lý do |
|---|---|---|
| 1 | `access_key` lưu thô (UNIQUE), so sánh bằng `MessageDigest.isEqual` | POC cần trả lại key ở "Đơn của tôi"/tra cứu. Production: lưu hash + gửi link qua email |
| 2 | Check-in nhận thêm `roomIds[]` (ngoài `roomId`); phải gán đúng `roomsCount` phòng; `roomNumber` trả "201, 202" | Đơn tối đa 5 phòng — một `roomId` không đủ |
| 3 | Staff được `GET /portal/room-types/{id}/rooms` | Lễ tân cần chọn phòng khi check-in |
| 4 | Thêm `GET /portal/hotels/{id}`, `GET /admin/hotels/{id}`, `GET /admin/bookings/{id}`, `GET /admin/facilities`, `POST /payments/stripe/webhook`; `PUT /admin/users/{id}` | Màn chi tiết / cổng Stripe như Tour |
| 5 | DTO thêm trường: `HotelSummaryDto.rejectReason`, `BookingDto.hotelCoverImageUrl`, `PaymentDto.note` | Hiển thị lý do từ chối, ảnh ở "Đơn của tôi", ghi chú giao dịch |
| 6 | `fromPrice` khi có ngày = trung bình giá niêm yết/đêm/phòng của cả kỳ ở (làm tròn lên 1.000đ) của loại phòng rẻ nhất còn đặt được | Giá có thể khác nhau theo đêm (`price_override`) |
| 7 | `facilityIds`: phải có ít nhất 1 loại phòng đặt được chứa đủ các tiện nghi; `city` so khớp chứa, không phân biệt hoa thường | Tiện nghi gắn trên loại phòng |
| 8 | Tìm kiếm không có ngày vẫn loại khách sạn không có loại phòng nào đủ sức chứa/đủ số phòng | Tránh hiện khách sạn không đặt được |
| 9 | `PUT /portal/room-types/{id}/prices`: `to` tính **cả** ngày đó; `price: null` = bỏ giá riêng; trả `{updatedNights}` | Hợp đồng chưa nói rõ |
| 10 | `DELETE /portal/room-types/{id}` là xoá mềm (`is_active=false`) | Booking cũ vẫn tham chiếu |
| 11 | Huỷ đơn CONFIRMED được tới hết ngày nhận phòng; sau đó 422 | Hợp đồng chưa nói mốc chặn |
| 12 | Trả phòng sớm: trả tồn các đêm từ `max(hôm nay, checkIn+1)`, không hoàn tiền, payout đủ `baseAmount`. No-show: trả tồn từ hôm nay (đêm đã qua giữ nguyên), không hoàn, không sinh payout | Payout chỉ sinh khi CHECKED_OUT theo hợp đồng |
| 13 | Chủ đơn đăng nhập mở `/bookings/code/{code}` không cần `key` | Tiện cho "Đơn của tôi"; khách vãng lai vẫn bắt buộc key |
| 14 | `PUT /admin/settings` body `{items:[{key,value}]}` như Tour; `platform.fee_percent` mặc định 10 | Giữ chuẩn Tour |
| 15 | Chờ khoá quá lâu / deadlock → 409 `CONFLICT` | Không lộ 500 |
| 16 | `GET /portal/bookings` thêm `q` (mã đơn/tên/SĐT) | Lễ tân tìm nhanh |

## Test

- Unit: `StateMachineTest` (Booking/Hotel/Payment/Payout), `PricingTest` (làm tròn, báo giá, tồn kho), `RefundRuleTest` (BR-CN-01).
- Integration (Testcontainers `mysql:8.0` dùng chung container static):
  `InventoryConcurrencyIT` (10 khách tranh phòng cuối 2 đêm; ngày giao nhau vs kề nhau; tắt phòng dưới số đã bán),
  `PaymentAndExpiryIT` (webhook sai chữ ký 401, gửi lại idempotent; hết hạn trả tồn; huỷ theo chính sách),
  `StayFlowIT` (check-in → check-out → payout → review; review sớm 422, lần 2 409; ngày check-in, no-show),
  `TenantIsolationIT` (owner A/B 404, staff đúng khách sạn, customer vào portal 403),
  `HotelApprovalIT` (PENDING ẩn khỏi search, approve thì hiện; lỗi khoảng ngày 400),
  `GuestAccessIT` (lookup code+email, key sai 404, "Đơn của tôi" có accessKey).
