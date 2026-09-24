---
id: changelog
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: []
tags: [changelog]
---

# Nhật ký thay đổi

- 2026-09-24 — Thêm bản demo offline `review-html/BookingHotel_Demo.html`: build chính frontend Next.js bằng Vite (shim `next/link`, `next/navigation`, router theo `#`) + API giả lập trong trình duyệt; mã ở `src/booking-hotel-frontend/offline-demo/`, test `src/e2e/offline/`. Không đổi code app.
- 2026-09-23 — Bản POC v1: backend 69 test, frontend 96 test, Docker Compose (3100/8180/3308), E2E luồng khách vãng lai → lễ tân → đánh giá trên desktop và iPhone, 5 screenshot. Thêm `basePrice` vào giá từng đêm để trang checkout tách đúng tiền phòng và phí.
