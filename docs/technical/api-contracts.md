---
id: technical.api-contracts
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [technical.data-model]
code_ref: [src/booking-hotel-backend/src/main/java/com/hotelbooking/presentation]
tags: [technical, api, contract]
---

# Hợp đồng API — Booking Hotel (POC mentor)

Team B chưa có SRS/API doc trên Drive; hợp đồng này suy từ tài liệu "Frontend Folder Structure v1.0" của Team B (các mã FR/BR được nhắc) và **dùng lại quy ước API của Team A** (ApiResponse, mã lỗi, JWT + refresh rotation) để hai nhóm thống nhất một chuẩn.

## 1. Quy ước chung
- Base URL `http://localhost:8180/api/v1` (Hotel chạy cổng khác Tour để bật song song: web `3100`, API `8180`, MySQL `3308`). Swagger `/docs`.
- `ApiResponse {success, status, code, message, requestId, timestamp, data, errors}`; `PageResponse {content, page, size, totalElements, totalPages}`; enum `UPPER_SNAKE_CASE`; thời điểm ISO-8601 UTC; **ngày lưu trú là `LocalDate` dạng `YYYY-MM-DD`** (theo giờ Việt Nam, không có giờ); tiền là số nguyên VND.
- Mã lỗi như Tour: `VALIDATION_FAILED, BAD_REQUEST (400)`, `UNAUTHORIZED, INVALID_CREDENTIALS, TOKEN_EXPIRED, INVALID_REFRESH_TOKEN, INVALID_SIGNATURE (401)`, `ACCESS_DENIED, ACCOUNT_DISABLED (403)`, `NOT_FOUND (404)`, `CONFLICT, ROOM_UNAVAILABLE, INVALID_TRANSITION, EMAIL_EXISTS, ALREADY_REVIEWED (409)`, `BUSINESS_RULE (422)`, `INTERNAL_ERROR (500)`.

## 2. Vai trò (FE structure §Introduction)
`CUSTOMER` · `HOTEL_OWNER` · `HOTEL_STAFF` (thuộc đúng 1 khách sạn) · `ADMIN`. Khách vãng lai không cần tài khoản vẫn đặt được (guest checkout, BR-BK-01).
**Cách ly theo khách sạn (NFR-SEC-05):** owner chỉ thao tác khách sạn mình sở hữu; staff chỉ khách sạn được gán. Sai phạm vi → 404 (không tiết lộ tồn tại).

## 3. Mô hình nghiệp vụ cốt lõi
- **Tồn kho theo đêm** `room_inventory(room_type_id, stay_date, total_rooms, booked_rooms, price_override)` UNIQUE(room_type_id, stay_date), CHECK `booked_rooms <= total_rooms`. Đây là nguồn sự thật cho tìm kiếm và đặt phòng. Dòng thiếu được tạo khi cần (`INSERT IGNORE`) với `total_rooms` = số phòng đang hoạt động của loại phòng.
- **Đặt phòng khoá mọi đêm** `[checkIn, checkOut)` bằng `SELECT … FOR UPDATE` theo thứ tự ngày, thiếu 1 đêm → 409 `ROOM_UNAVAILABLE`.
- **Giá niêm yết (BR-PR-01)** = giá cơ bản (hoặc `price_override` của đêm đó) × (1 + `platform.fee_percent`/100), làm tròn lên bội 1.000đ. Tổng = Σ các đêm × số phòng. `baseAmount` (phần khách sạn) và `feeAmount` (phí nền tảng) lưu riêng; payout cho khách sạn = `baseAmount`.
- **Booking**: `PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT`; nhánh `PENDING → CANCELLED | EXPIRED`, `CONFIRMED → CANCELLED | NO_SHOW`. Giữ chỗ `booking.payment_timeout_minutes` (15) rồi job hết hạn trả tồn kho.
- **Chính sách huỷ (BR-CN-01)** trên loại phòng: `FREE_BEFORE_DATE` + `freeCancelDays` (huỷ trước ngày nhận phòng ≥ N ngày → hoàn 100%, sau đó 0%) hoặc `NON_REFUNDABLE` (0%). Booking PENDING huỷ luôn miễn phí.
- **Khách sạn**: `PENDING_APPROVAL → ACTIVE | REJECTED`, `ACTIVE ↔ SUSPENDED`. Chỉ ACTIVE mới hiện với khách (FR-HTL-002).
- **Payout (FR-PO-004)**: sinh khi booking CHECKED_OUT, `PENDING → PAID` (admin đánh dấu).
- **Truy cập booking cho khách vãng lai**: booking có `bookingCode` (VD `HB-7K3F9Q`) + `accessKey` (chuỗi ngẫu nhiên 24 ký tự, chỉ trả lúc tạo và trong "Đơn của tôi"). Mọi thao tác phía khách trên một booking dùng `code` + `key`. Tra cứu lại bằng `code` + `email` (FR-BK-005) trả về cả `accessKey`.

## 4. DTO
```ts
type Role = "CUSTOMER" | "HOTEL_OWNER" | "HOTEL_STAFF" | "ADMIN";
type HotelStatus = "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";
type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "EXPIRED" | "NO_SHOW";
type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
type CancellationPolicy = "FREE_BEFORE_DATE" | "NON_REFUNDABLE";

interface UserDto { id; fullName; email; phone?; role: Role; hotelId?: number; hotelName?: string; active: boolean; createdAt }
interface AuthTokens { accessToken; refreshToken; expiresIn; user: UserDto }
interface FacilityDto { id; name; icon: string /* tên icon lucide, VD "wifi" */; categoryId; categoryName }
interface FacilityCategoryDto { id; name; facilities: FacilityDto[] }
interface HotelSummaryDto { id; name; city; address; starRating: 1..5; coverImageUrl?; status: HotelStatus;
  fromPrice?: number /* giá niêm yết/đêm thấp nhất còn trống cho khoảng ngày tìm */; ratingAverage?; ratingCount;
  availableRoomTypes: number; ownerName?: string }
interface RoomTypeDto { id; hotelId; name; description; capacity; bedInfo; areaM2; basePrice; listingPrice /* đêm đầu */;
  totalRooms /* số phòng hoạt động */; cancellationPolicy; freeCancelDays?; imageUrl?; facilities: FacilityDto[];
  availableRooms?: number /* chỉ khi truyền checkIn/checkOut */; nightlyPrices?: {date, basePrice, listingPrice}[]; stayTotal?: number }
interface HotelDetailDto extends HotelSummaryDto { description; checkInTime: "14:00"; checkOutTime: "12:00"; phone?; images: string[];
  roomTypes: RoomTypeDto[]; facilities: FacilityDto[] /* gộp của các loại phòng */ }
interface RoomDto { id; roomTypeId; roomTypeName; roomNumber; active: boolean; occupied: boolean }
interface BookingDto { id; bookingCode; accessKey?; status: BookingStatus; hotelId; hotelName; hotelCity; roomTypeId; roomTypeName;
  roomNumber?; checkIn: string; checkOut: string; nights; roomsCount; guests; guestName; guestEmail; guestPhone; note?;
  baseAmount; feeAmount; totalAmount; bookedAt; expiresAt?; cancelledAt?; cancelReason?; checkedInAt?; checkedOutAt?;
  cancellationPolicy; freeCancelDays?; paymentStatus?; invoice?: InvoiceDto;
  canPay; canCancel; canReview; refundPreview?: {percent, amount} }
interface InvoiceDto { id; invoiceCode; amount; baseAmount; feeAmount; createdAt; payments: PaymentDto[] }
interface PaymentDto { id; bookingCode; amount; refundAmount?; status: PaymentStatus; provider: "MOCK"|"STRIPE"|"MANUAL";
  transactionCode?; createdAt; paidAt?; checkoutUrl?; guestName }
interface ReviewDto { id; hotelId; bookingCode; guestName; rating; content; status: "VISIBLE"|"HIDDEN"; createdAt }
interface PayoutDto { id; hotelId; hotelName; bookingCode; amount; status: "PENDING"|"PAID"; createdAt; paidAt? }
interface NotificationDto { id; title; content; bookingCode?; read; createdAt }
```

## 5. Endpoint

### 5.1 Xác thực (giống Tour)
`POST /auth/register` (CUSTOMER) · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET/PUT /users/me`.

### 5.2 Công khai (Customer Site)
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/hotels/search?city&checkIn&checkOut&guests&rooms=1&minPrice&maxPrice&stars&facilityIds=1,2&sort&page&size` | FR-SRC-001/002. Chỉ ACTIVE. Có `checkIn/checkOut` thì chỉ trả khách sạn còn ≥ `rooms` phòng loại chứa được `guests` cho **mọi** đêm; `fromPrice` tính theo khoảng đó. `sort`: `price,asc` \| `price,desc` \| `rating` \| `stars`. Lỗi: checkOut ≤ checkIn, checkIn < hôm nay, > 30 đêm → 400 |
| GET | `/hotels/{id}?checkIn&checkOut&guests&rooms` | FR-SRC-003. `HotelDetailDto`; mỗi loại phòng có `availableRooms`, `nightlyPrices`, `stayTotal` |
| GET | `/hotels/{id}/reviews?page&size` | |
| GET | `/cities` | `string[]` thành phố có khách sạn ACTIVE |
| GET | `/facility-categories` | `FacilityCategoryDto[]` |

### 5.3 Đặt phòng phía khách
| Method | Path | Ghi chú |
|---|---|---|
| POST | `/bookings` | public, có token thì gắn user. `{roomTypeId, checkIn, checkOut, roomsCount 1..5, guests, guestName, guestEmail, guestPhone, note?}` → `BookingDto` 201 kèm `accessKey`. 409 `ROOM_UNAVAILABLE` khi hết phòng; 422 khi khách sạn không ACTIVE, `guests > capacity × roomsCount` |
| GET | `/bookings/code/{code}?key=` | public (đúng key) |
| POST | `/bookings/lookup` | `{bookingCode, email}` → `BookingDto` (kèm accessKey). Sai → 404 |
| POST | `/bookings/code/{code}/cancel?key=` | `{reason?}` |
| POST | `/bookings/code/{code}/payment?key=` | → `PaymentDto` có `checkoutUrl = {FRONTEND_URL}/pay/mock/{paymentId}?key={accessKey}` |
| GET | `/payments/{id}?key=` | key của booking |
| POST | `/payments/mock/{id}/complete?key=` | `{result: "SUCCESS"\|"FAILED"}` |
| POST | `/payments/webhook/mock` | header `X-Mock-Signature` HMAC-SHA256 như Tour |
| GET | `/users/me/bookings?status&page&size` | 🔒 CUSTOMER — kèm `accessKey` |
| POST | `/reviews` | public `{bookingCode, key, rating 1..5, content ≥ 10}`; chỉ khi `CHECKED_OUT` (FR-REV), mỗi booking 1 lần |

### 5.4 Hotel Portal (HOTEL_OWNER, HOTEL_STAFF theo phạm vi)
| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/portal/hotels` | Owner/Staff | khách sạn trong phạm vi |
| POST | `/portal/hotels` | Owner | `{name, city, address, description, starRating, phone?, checkInTime, checkOutTime, coverImageUrl?}` → `PENDING_APPROVAL` |
| PUT | `/portal/hotels/{id}` | Owner | sửa hồ sơ; khách sạn REJECTED sửa xong tự về PENDING_APPROVAL |
| GET/POST | `/portal/hotels/{id}/room-types` | Owner (GET cả Staff) | `{name, description, capacity, bedInfo, areaM2, basePrice, cancellationPolicy, freeCancelDays?, imageUrl?, facilityIds[]}` |
| PUT/DELETE | `/portal/room-types/{id}` | Owner | xoá khi còn booking tương lai → 409 |
| GET/POST | `/portal/room-types/{id}/rooms` | Owner | `{roomNumber}`; thêm/tắt phòng cập nhật `total_rooms` của các đêm tương lai (không xuống dưới `booked_rooms` → 409) |
| PUT | `/portal/rooms/{id}` | Owner | `{roomNumber, active}` |
| PUT | `/portal/room-types/{id}/prices` | Owner | `{from, to, price}` giá riêng theo ngày (mức 2) |
| GET | `/portal/bookings?hotelId&status&date&page&size` | Owner/Staff | `date` = ngày nhận hoặc trả phòng |
| GET | `/portal/bookings/{id}` | Owner/Staff | |
| POST | `/portal/bookings/{id}/check-in` | Owner/Staff | `{roomId}` — chỉ từ ngày nhận phòng, phòng đúng loại, không đang có khách → CHECKED_IN (FR-BK-006) |
| POST | `/portal/bookings/{id}/check-out` | Owner/Staff | → CHECKED_OUT, sinh payout, mời đánh giá (FR-BK-007) |
| POST | `/portal/bookings/{id}/no-show` | Owner/Staff | từ ngày nhận phòng + 1 → NO_SHOW (không hoàn tiền), trả tồn các đêm còn lại |
| GET/POST | `/portal/hotels/{id}/staff` | Owner | tạo tài khoản staff `{fullName, email, password, phone?}` (FR-USR-004/005) |
| PUT | `/portal/staff/{id}/active` | Owner | `{active}` |
| GET | `/portal/payouts?hotelId&status` | Owner | |

### 5.5 Admin Panel
| Method | Path | Ghi chú |
|---|---|---|
| GET | `/admin/dashboard` | `{hotels:{total, active, pending}, bookings:{<status>: n}, revenue:{gross, platformFee, refunded}, occupancyTonight: {booked, total}, users:{total}, recentBookings}` |
| GET | `/admin/hotels?status&page` | |
| POST | `/admin/hotels/{id}/approve` · `/reject {reason}` · `/suspend` · `/activate` | FR-HTL-002 |
| GET/POST/PUT/DELETE | `/admin/facility-categories`, `/admin/facilities` | FR-ROOM-007 |
| GET/PUT | `/admin/settings` | `platform.fee_percent`, `booking.payment_timeout_minutes` (FR-FEE) |
| GET/POST/PUT | `/admin/users`, `/admin/users/{id}/active` | FR-USR-002 |
| GET | `/admin/bookings`, `/admin/payments` | |
| POST | `/admin/payments/{id}/refund` | |
| GET | `/admin/payouts?status` · POST `/admin/payouts/{id}/paid` | |
| GET | `/admin/audit-logs` | |
| GET/POST | `/demo/clock`, POST `/demo/expire-now` | như Tour |

### 5.6 Thông báo
`GET /notifications`, `GET /notifications/unread-count`, `PUT /notifications/{id}/read`, `PUT /notifications/read-all` — cho người dùng đăng nhập (khách vãng lai nhận qua màn đơn).

## 6. Tài khoản mẫu (mật khẩu `12345678`)
| Vai trò | Email | Ghi chú |
|---|---|---|
| CUSTOMER | customer@example.com (Nguyễn Văn Hào) | có đơn CONFIRMED, CHECKED_OUT chưa đánh giá |
| CUSTOMER | mai.tran@example.com | |
| HOTEL_OWNER | owner@example.com (Trần Minh Khoa) | sở hữu 2 khách sạn Cần Thơ + 1 khách sạn chờ duyệt |
| HOTEL_OWNER | owner2@example.com (Lê Thị Thu) | khách sạn Hậu Giang, Phú Quốc |
| HOTEL_STAFF | staff@example.com (Phạm Văn Lộc) | lễ tân khách sạn Ninh Kiều Riverside |
| ADMIN | admin@example.com | |
Khách vãng lai mẫu: mã `HB-GUEST1`, email `guest@example.com`.
