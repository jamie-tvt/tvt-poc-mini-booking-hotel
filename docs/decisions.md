---
id: decisions
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [constraints]
tags: [governance, adr, gate]
---

# Quyết định

| # | Ngày | Quyết định | Lý do | Người duyệt |
|---|---|---|---|---|
| D1 | 23/09/2026 | POC full-stack khớp stack chung của khoá (Spring Boot 3 + Next.js + MySQL 8 + Docker) | So sánh với cả hai nhóm trên cùng nền | User (mentor lead) |
| D2 | 23/09/2026 | POC nội bộ, không báo giá | Mục đích đào tạo | User |
| D3 | 23/09/2026 | Làm sau Tour trong cùng tuần; không kịp thì hạ xuống demo HTML offline | Mốc 1 tuần | User |
| D4 | 23/09/2026 | Người duyệt các cổng: mentor lead | — | User |
| D5 | 23/09/2026 | Phạm vi suy từ tài liệu FE của Team B (mã FR/BR được nhắc); SRS v1.1 chưa có trên Drive | Chờ đối chiếu khi Team B nộp | Mentor |
| D6 | 23/09/2026 | Tồn kho theo đêm `room_inventory` là nguồn sự thật; khoá dòng các đêm khi đặt | Không tính phòng trống bằng cách đếm booking trong code | Mentor |
| D7 | 23/09/2026 | Hạn giữ phòng 15 phút; phí nền tảng 10% (setting) | FR-FEE chưa có số | User duyệt mặc định |
| D8 | 23/09/2026 | Tiện nghi lưu MySQL (bảng + bảng nối), không dùng MongoDB | Một CSDL đủ cho POC; FE doc Team B ghi "facilities from MongoDB" — điểm thảo luận | User duyệt mặc định |
| D9 | 23/09/2026 | Ba mặt tiền (Customer Site, Hotel Portal, Admin) trong một ứng dụng Next.js chia layout | Khớp stack chung; Team B đề xuất React Router + Zustand + AntD — so sánh theo nguyên tắc, không theo framework | User duyệt mặc định |
| D10 | 23/09/2026 | Font Playfair Display + Be Vietnam Pro thay Playfair Display SC + Karla của MASTER.md | Hai font gốc thiếu dấu tiếng Việt | Mentor |
| D11 | 23/09/2026 | Khách vãng lai truy cập đơn bằng mã đơn + access key; tra cứu lại bằng mã + email | BR-BK-01 guest checkout; POC lưu key thô, production nên lưu hash và gửi link qua email | Mentor |
| D12 | 23/09/2026 | Cổng Hotel khác Tour (web 3100, API 8180, MySQL 3308) | Chạy song song hai demo trên một máy | Mentor |
| D13 | 24/09/2026 | Ảnh khách sạn/loại phòng/điểm đến/hero dùng link CDN Unsplash (`images.unsplash.com/<photo-id>?auto=format&fit=crop&w=1200&q=75`, ≤ 255 ký tự); đổi kích thước qua `unsplashVariant()`; SVG cũ trong `public/images` giữ làm ảnh dự phòng khi mất mạng; tác giả ghi cạnh URL (Unsplash License) | SVG minh hoạ không giống sản phẩm thật (BUG_REPORT F4) | User (mentor lead) |
| D14 | 24/09/2026 | Thiết kế "nền mờ theo ảnh" (F6): `PhotoBackdrop` (ảnh w=64 blur + phủ màu nền), thẻ kính `.glass`, hero ảnh thật; giữ nguyên màu/font thương hiệu; khu quản trị không đổi | Phản hồi mentor, dùng ui-ux-pro-max; mockup đã duyệt | User (mentor lead) |
| D15 | 24/09/2026 | Mobile (< lg) `/hotels`: thanh gọn (tóm tắt thành phố · ngày · khách + "Bộ lọc (n)" + "Sắp xếp" + chip ✕) mở bottom sheet chứa đủ bộ lọc; desktop giữ cột lọc. Logic lọc không đổi (không có lỗi lọc) | Form lọc cũ cao ~2,4 màn hình trên điện thoại | User (mentor lead) |
| D16 | 24/09/2026 | Deploy chỉ khi đẩy tag release `v*.*.*` (tag đầu `v1.1.0`); push/PR chỉ chạy test. Workflow do người điều phối sửa | Tránh deploy Production ở mọi commit (F5) | User (mentor lead) |
| D17 | 24/09/2026 | Catalog 200 chỗ nghỉ là 1 file JSON sinh bởi script có kết quả cố định (`src/seed-catalog/`), backend và bản demo offline cùng đọc; 5 khách sạn demo gốc và đơn mẫu giữ nguyên; chỗ nghỉ mới chưa có đơn (tồn kho trống) | Không để 2 nguồn seed lệch nhau; kịch bản demo/E2E cũ không bị ảnh hưởng | User (v1.2.0) |
| D18 | 24/09/2026 | Tên chỗ nghỉ hư cấu (ghép tên gọi dân dã + địa danh), địa danh có thật; ảnh chỉ Unsplash miễn phí, loại ảnh chụp ngoài miền Tây / ảnh có tên khách sạn thật | Bản demo công khai trên Vercel — tránh gán giá/mô tả bịa cho doanh nghiệp có thật | User (v1.2.0) |
