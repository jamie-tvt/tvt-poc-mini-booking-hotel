---
id: changelog
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: []
tags: [changelog]
---

# Nhật ký thay đổi

- 2026-09-24 — **v1.1.0** (BUG_REPORT F4/F5/F6): ảnh thật Unsplash (link CDN) cho 5 khách sạn, 8 loại phòng, điểm đến, hero — seed Java + mock offline, SVG cũ làm dự phòng; thiết kế nền mờ theo ảnh (`PhotoBackdrop`, `.glass`, hero ảnh thật, thẻ khách sạn có sắc màu của ảnh, chi tiết có gallery nổi + thanh CTA dính đáy trên mobile, thẻ tóm tắt đơn nền mờ); `/hotels` trên mobile thu gọn thành "Bộ lọc (n)" + "Sắp xếp" + chip ✕ + bottom sheet (logic lọc giữ nguyên); nút DEMO trên mobile thu thành nút tròn 44px, trang demo chừa `padding-bottom`; mock offline `version: 2` để trình duyệt đã mở demo cũ nạp lại dữ liệu có ảnh mới. Deploy theo tag release (workflow do người điều phối sửa).
- 2026-09-24 — Thêm bản demo offline `review-html/BookingHotel_Demo.html`: build chính frontend Next.js bằng Vite (shim `next/link`, `next/navigation`, router theo `#`) + API giả lập trong trình duyệt; mã ở `src/booking-hotel-frontend/offline-demo/`, test `src/e2e/offline/`. Không đổi code app.
- 2026-09-23 — Bản POC v1: backend 69 test, frontend 96 test, Docker Compose (3100/8180/3308), E2E luồng khách vãng lai → lễ tân → đánh giá trên desktop và iPhone, 5 screenshot. Thêm `basePrice` vào giá từng đêm để trang checkout tách đúng tiền phòng và phí.
