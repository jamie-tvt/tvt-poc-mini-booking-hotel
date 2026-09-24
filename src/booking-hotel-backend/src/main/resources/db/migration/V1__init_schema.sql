-- Booking Hotel — schema v1 (POC mentor)
-- Suy từ "Frontend Folder Structure v1.0" của Team B + hợp đồng docs/technical/api-contracts.md.
-- Mỗi ràng buộc có ghi chú lý do: DB là lớp chặn cuối nếu code có lỗi.

CREATE TABLE user_roles (
  id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL,
  CONSTRAINT uq_user_roles_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id       BIGINT       NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NULL,
  hotel_id      BIGINT       NULL,              -- chỉ HOTEL_STAFF: thuộc đúng 1 khách sạn (FK thêm sau khi có bảng hotels)
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME(6)  NOT NULL,
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES user_roles(id),
  INDEX ix_users_hotel (hotel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT      NOT NULL,
  token_hash  VARCHAR(64) NOT NULL,           -- SHA-256, không lưu token thô
  family_id   VARCHAR(36) NOT NULL,           -- chuỗi xoay vòng; dùng lại token cũ → thu hồi cả chuỗi
  expires_at  DATETIME(6) NOT NULL,
  revoked_at  DATETIME(6) NULL,
  created_at  DATETIME(6) NOT NULL,
  CONSTRAINT uq_refresh_hash UNIQUE (token_hash),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_refresh_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hotels (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_id        BIGINT       NOT NULL,
  name            VARCHAR(160) NOT NULL,
  city            VARCHAR(80)  NOT NULL,
  address         VARCHAR(255) NOT NULL,
  description     TEXT         NOT NULL,
  star_rating     INT          NOT NULL,
  phone           VARCHAR(20)  NULL,
  check_in_time   VARCHAR(5)   NOT NULL,        -- "14:00" giờ địa phương
  check_out_time  VARCHAR(5)   NOT NULL,
  cover_image_url VARCHAR(255) NULL,
  status          VARCHAR(20)  NOT NULL,
  reject_reason   VARCHAR(255) NULL,
  created_at      DATETIME(6)  NOT NULL,
  updated_at      DATETIME(6)  NOT NULL,
  CONSTRAINT fk_hotels_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT ck_hotels_star CHECK (star_rating BETWEEN 1 AND 5),
  CONSTRAINT ck_hotels_status CHECK (status IN ('PENDING_APPROVAL','ACTIVE','REJECTED','SUSPENDED')),
  INDEX ix_hotels_status_city (status, city),   -- tìm kiếm luôn lọc ACTIVE + thành phố
  INDEX ix_hotels_owner (owner_id)              -- cách ly tenant: mọi truy vấn portal lọc theo owner
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users ADD CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id);

CREATE TABLE hotel_images (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  hotel_id   BIGINT       NOT NULL,
  image_url  VARCHAR(255) NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  CONSTRAINT fk_hotel_images_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE facility_categories (
  id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  CONSTRAINT uq_facility_categories_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE facilities (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT      NOT NULL,
  name        VARCHAR(80) NOT NULL,
  icon        VARCHAR(40) NOT NULL,              -- tên icon lucide, VD "wifi"
  CONSTRAINT fk_facilities_category FOREIGN KEY (category_id) REFERENCES facility_categories(id),
  CONSTRAINT uq_facilities_name UNIQUE (category_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE room_types (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  hotel_id            BIGINT       NOT NULL,
  name                VARCHAR(120) NOT NULL,
  description         TEXT         NOT NULL,
  capacity            INT          NOT NULL,      -- số khách tối đa / phòng
  bed_info            VARCHAR(120) NOT NULL,
  area_m2             INT          NOT NULL,
  base_price          BIGINT       NOT NULL,      -- giá/đêm phần khách sạn nhận (VND, không phần lẻ)
  cancellation_policy VARCHAR(20)  NOT NULL,
  free_cancel_days    INT          NULL,
  image_url           VARCHAR(255) NULL,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,   -- xoá mềm: booking cũ vẫn tham chiếu được
  created_at          DATETIME(6)  NOT NULL,
  updated_at          DATETIME(6)  NOT NULL,
  CONSTRAINT fk_room_types_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  CONSTRAINT ck_room_types_capacity CHECK (capacity BETWEEN 1 AND 20),
  CONSTRAINT ck_room_types_area CHECK (area_m2 > 0),
  CONSTRAINT ck_room_types_price CHECK (base_price > 0),
  CONSTRAINT ck_room_types_policy CHECK (
    (cancellation_policy = 'FREE_BEFORE_DATE' AND free_cancel_days IS NOT NULL AND free_cancel_days BETWEEN 0 AND 60)
    OR (cancellation_policy = 'NON_REFUNDABLE' AND free_cancel_days IS NULL)),
  INDEX ix_room_types_hotel (hotel_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE room_type_facilities (
  room_type_id BIGINT NOT NULL,
  facility_id  BIGINT NOT NULL,
  PRIMARY KEY (room_type_id, facility_id),        -- chống gán trùng tiện nghi
  CONSTRAINT fk_rtf_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_rtf_facility FOREIGN KEY (facility_id) REFERENCES facilities(id),
  INDEX ix_rtf_facility (facility_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rooms (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  hotel_id     BIGINT      NOT NULL,              -- lặp lại từ room_types để UNIQUE số phòng trong khách sạn
  room_type_id BIGINT      NOT NULL,
  room_number  VARCHAR(10) NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   DATETIME(6) NOT NULL,
  CONSTRAINT fk_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  CONSTRAINT fk_rooms_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  CONSTRAINT uq_rooms_number UNIQUE (hotel_id, room_number),   -- 2 phòng "101" trong cùng khách sạn → lễ tân nhầm
  INDEX ix_rooms_type (room_type_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tồn kho theo đêm: nguồn sự thật cho tìm kiếm và đặt phòng.
-- Đặt phòng khoá (FOR UPDATE) mọi dòng [check_in, check_out) theo stay_date tăng dần rồi tăng booked_rooms.
CREATE TABLE room_inventory (
  id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  room_type_id   BIGINT NOT NULL,
  stay_date      DATE   NOT NULL,                 -- đêm bắt đầu từ ngày này (giờ Việt Nam)
  total_rooms    INT    NOT NULL,                 -- = số phòng active của loại phòng
  booked_rooms   INT    NOT NULL DEFAULT 0,       -- phòng đang bị giữ bởi booking PENDING/CONFIRMED/CHECKED_IN (và đã ở)
  price_override BIGINT NULL,                     -- giá cơ bản riêng cho đêm này (mức 2), NULL = dùng base_price
  CONSTRAINT fk_inventory_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  CONSTRAINT uq_inventory_night UNIQUE (room_type_id, stay_date),        -- INSERT IGNORE dựa vào khoá này
  CONSTRAINT ck_inventory_booked CHECK (booked_rooms >= 0 AND booked_rooms <= total_rooms),   -- chống overbook ở tầng DB
  CONSTRAINT ck_inventory_total CHECK (total_rooms >= 0),
  CONSTRAINT ck_inventory_price CHECK (price_override IS NULL OR price_override > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_code        VARCHAR(16)  NOT NULL,      -- mã hiển thị cho khách, VD HB-7K3F9Q
  access_key          VARCHAR(32)  NOT NULL,      -- POC lưu thô để "Đơn của tôi"/tra cứu trả lại được; production: lưu hash + gửi link qua email
  user_id             BIGINT       NULL,          -- NULL = khách vãng lai (guest checkout BR-BK-01)
  hotel_id            BIGINT       NOT NULL,
  room_type_id        BIGINT       NOT NULL,
  check_in            DATE         NOT NULL,
  check_out           DATE         NOT NULL,
  nights              INT          NOT NULL,
  rooms_count         INT          NOT NULL,
  guests              INT          NOT NULL,
  guest_name          VARCHAR(120) NOT NULL,
  guest_email         VARCHAR(160) NOT NULL,
  guest_phone         VARCHAR(20)  NOT NULL,
  note                VARCHAR(500) NULL,
  base_amount         BIGINT       NOT NULL,      -- phần khách sạn (payout)
  fee_amount          BIGINT       NOT NULL,      -- phí nền tảng
  total_amount        BIGINT       NOT NULL,
  cancellation_policy VARCHAR(20)  NOT NULL,      -- chụp lại lúc đặt: đổi chính sách sau không ảnh hưởng đơn cũ
  free_cancel_days    INT          NULL,
  status              VARCHAR(16)  NOT NULL,
  booked_at           DATETIME(6)  NOT NULL,
  expires_at          DATETIME(6)  NULL,          -- hạn thanh toán của booking PENDING
  cancelled_at        DATETIME(6)  NULL,
  cancel_reason       VARCHAR(255) NULL,
  checked_in_at       DATETIME(6)  NULL,
  checked_out_at      DATETIME(6)  NULL,
  CONSTRAINT uq_bookings_code UNIQUE (booking_code),
  CONSTRAINT uq_bookings_access_key UNIQUE (access_key),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  CONSTRAINT fk_bookings_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id),
  CONSTRAINT ck_bookings_dates CHECK (check_out > check_in AND nights = DATEDIFF(check_out, check_in)),
  CONSTRAINT ck_bookings_rooms CHECK (rooms_count BETWEEN 1 AND 5),
  CONSTRAINT ck_bookings_guests CHECK (guests >= 1),
  CONSTRAINT ck_bookings_amount CHECK (base_amount >= 0 AND fee_amount >= 0 AND total_amount = base_amount + fee_amount),
  CONSTRAINT ck_bookings_status CHECK (status IN ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED','NO_SHOW')),
  INDEX ix_bookings_user (user_id, booked_at),
  INDEX ix_bookings_status_exp (status, expires_at),      -- job hết hạn quét PENDING quá hạn
  INDEX ix_bookings_hotel_in (hotel_id, check_in),         -- lễ tân lọc theo ngày nhận phòng
  INDEX ix_bookings_hotel_out (hotel_id, check_out),
  INDEX ix_bookings_email (guest_email)                    -- tra cứu code + email
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phòng cụ thể được gán khi check-in (booking nhiều phòng → nhiều dòng)
CREATE TABLE booking_rooms (
  booking_id BIGINT NOT NULL,
  room_id    BIGINT NOT NULL,
  PRIMARY KEY (booking_id, room_id),
  CONSTRAINT fk_br_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_br_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  INDEX ix_br_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_id   BIGINT      NOT NULL,
  invoice_code VARCHAR(20) NOT NULL,
  amount       BIGINT      NOT NULL,
  base_amount  BIGINT      NOT NULL,
  fee_amount   BIGINT      NOT NULL,
  created_at   DATETIME(6) NOT NULL,
  CONSTRAINT uq_invoices_booking UNIQUE (booking_id),       -- mỗi booking đúng 1 hoá đơn
  CONSTRAINT uq_invoices_code UNIQUE (invoice_code),
  CONSTRAINT fk_invoices_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT ck_invoices_amount CHECK (amount = base_amount + fee_amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice 1:N payment để thanh toán lại sau khi thất bại
CREATE TABLE payments (
  id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  invoice_id       BIGINT       NOT NULL,
  amount           BIGINT       NOT NULL,
  refund_amount    BIGINT       NULL,
  provider         VARCHAR(16)  NOT NULL,
  transaction_code VARCHAR(80)  NULL,            -- UNIQUE → webhook gửi lại không tạo giao dịch thứ hai
  payment_method   VARCHAR(32)  NULL,
  status           VARCHAR(16)  NOT NULL,
  note             VARCHAR(255) NULL,
  created_at       DATETIME(6)  NOT NULL,
  paid_at          DATETIME(6)  NULL,
  CONSTRAINT uq_payments_txn UNIQUE (transaction_code),
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT ck_payments_amount CHECK (amount >= 0 AND (refund_amount IS NULL OR refund_amount BETWEEN 0 AND amount)),
  CONSTRAINT ck_payments_provider CHECK (provider IN ('MOCK','STRIPE','MANUAL')),
  CONSTRAINT ck_payments_status CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED','CANCELLED')),
  INDEX ix_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  hotel_id   BIGINT       NOT NULL,
  booking_id BIGINT       NOT NULL,
  user_id    BIGINT       NULL,                  -- khách vãng lai cũng đánh giá được (qua code + key)
  guest_name VARCHAR(120) NOT NULL,
  rating     INT          NOT NULL,
  content    TEXT         NOT NULL,
  status     VARCHAR(16)  NOT NULL DEFAULT 'VISIBLE',
  created_at DATETIME(6)  NOT NULL,
  updated_at DATETIME(6)  NOT NULL,
  CONSTRAINT uq_reviews_booking UNIQUE (booking_id),        -- mỗi booking chỉ đánh giá 1 lần, kể cả khi 2 request song song
  CONSTRAINT fk_reviews_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT ck_reviews_status CHECK (status IN ('VISIBLE','HIDDEN')),
  INDEX ix_reviews_hotel (hotel_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tiền trả khách sạn (FR-PO-004): sinh khi CHECKED_OUT, amount = base_amount của booking
CREATE TABLE payouts (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  hotel_id   BIGINT      NOT NULL,
  booking_id BIGINT      NOT NULL,
  amount     BIGINT      NOT NULL,
  status     VARCHAR(16) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  paid_at    DATETIME(6) NULL,
  paid_by    BIGINT      NULL,
  CONSTRAINT uq_payouts_booking UNIQUE (booking_id),        -- không trả 2 lần cho một booking
  CONSTRAINT fk_payouts_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  CONSTRAINT fk_payouts_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_payouts_user FOREIGN KEY (paid_by) REFERENCES users(id),
  CONSTRAINT ck_payouts_amount CHECK (amount >= 0),
  CONSTRAINT ck_payouts_status CHECK (status IN ('PENDING','PAID')),
  INDEX ix_payouts_hotel (hotel_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  booking_id BIGINT       NULL,
  title      VARCHAR(160) NOT NULL,
  content    TEXT         NOT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at DATETIME(6)  NOT NULL,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notif_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  INDEX ix_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT       NULL,                -- NULL: hệ thống (job, webhook) hoặc khách vãng lai
  action      VARCHAR(40)  NOT NULL,
  entity_type VARCHAR(40)  NOT NULL,
  entity_id   BIGINT       NULL,
  result      VARCHAR(16)  NOT NULL,
  detail      VARCHAR(500) NULL,
  created_at  DATETIME(6)  NOT NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX ix_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  setting_key   VARCHAR(80)  NOT NULL,
  setting_value TEXT         NULL,
  description   VARCHAR(255) NULL,
  updated_by    BIGINT       NULL,
  updated_at    DATETIME(6)  NOT NULL,
  CONSTRAINT uq_settings_key UNIQUE (setting_key),
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
