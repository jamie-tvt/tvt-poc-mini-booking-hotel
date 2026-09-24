INSERT INTO user_roles (name) VALUES ('CUSTOMER'), ('HOTEL_OWNER'), ('HOTEL_STAFF'), ('ADMIN');

INSERT INTO system_settings (setting_key, setting_value, description, updated_at) VALUES
 ('platform.fee_percent', '10', 'Phí nền tảng cộng vào giá cơ bản (%), giá niêm yết làm tròn lên bội 1.000đ (BR-PR-01)', NOW(6)),
 ('booking.payment_timeout_minutes', '15', 'Thời gian giữ phòng chờ thanh toán (phút)', NOW(6));
