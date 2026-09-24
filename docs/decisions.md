---
id: decisions
status: approved
owner: mentor-team
last_updated: 2026-09-23
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
