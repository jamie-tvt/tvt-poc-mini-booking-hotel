---
id: ui-ux.design-system
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: []
code_ref: [design-tokens.json, design-system/booking-hotel/MASTER.md, src/booking-hotel-frontend/src/styles/globals.css, src/booking-hotel-frontend/src/components/shared/PhotoBackdrop.tsx]
tags: [ui-ux, design-system]
---

# Design system

Sinh bằng UI UX Pro Max cho ngành khách sạn (`design-system/booking-hotel/MASTER.md`, trang `admin-dashboard`). Mentor đổi font sang Playfair Display + Be Vietnam Pro vì bộ gốc thiếu dấu tiếng Việt (D10). Thương hiệu demo: "Mekong Stay".

## Nền mờ theo ảnh, kính mờ, bottom sheet (F6 — 24/09/2026, D14–D15)
Chỉ áp dụng khu khách (trang chủ, tìm phòng, chi tiết, checkout, đơn của khách); Portal và Admin giữ nguyên.

- **`PhotoBackdrop`** (`components/shared/PhotoBackdrop.tsx`, không hook → dùng được trong Server Component): bản ảnh nhỏ `w=64&q=40` phóng to + `blur(48px) saturate(1.4)`, phủ lớp màu. `tone="page"`: gradient màu nền trang 55% → 82% → 100% (đầu trang danh sách/chi tiết); `tone="card"`: trắng 80% (thẻ khách sạn, thẻ tóm tắt đơn). Cha cần `relative isolate`, nội dung đặt `relative` hoặc có z-index.
- **`.glass`** (`globals.css`): trắng 72% + `backdrop-filter: blur(16px) saturate(1.2)`, viền trắng 60%, bóng `--shadow-glass`, bo 16px — form tìm ở hero, cột lọc desktop, khối chọn ngày ở chi tiết, thanh CTA dính đáy. **`.glass-pill`**: badge hạng sao / điểm đánh giá. Chỉ viết `backdrop-filter` không tiền tố (Lightning CSS tự thêm `-webkit-`).
- **Ảnh**: thẻ `w=800` (lazy), ảnh bìa chi tiết srcSet 800/1200/1600, hero eager + `fetchpriority="high"`; ảnh nổi dùng `--shadow-float`, bo 16px; giữ `aspect-ratio` 16/10.
- **Bottom sheet bộ lọc** (`features/search/components/FilterSheet.tsx`): `role="dialog" aria-modal`, nền `bg-ink/35 backdrop-blur-[3px]`, đóng bằng Esc / nút ✕ / bấm nền, giữ focus trong sheet, khoá cuộn trang, trả focus về nút mở; nút "Xoá tất cả" + "Áp dụng". Trượt lên 200ms.
- **Thanh CTA dính đáy** (chi tiết khách sạn, < lg): `.glass` + "Giá từ / đêm" + nút "Chọn phòng" cuộn tới `#rooms`; trang tự chừa `padding-bottom` qua `body:has([data-sticky-cta])`.
- **A11y**: vùng bấm ≥ 44px trên mobile; `prefers-reduced-transparency` → ẩn ảnh mờ, kính thành nền trắng đặc; `prefers-reduced-motion` → tắt animation; ảnh trang trí `alt=""` + `aria-hidden`.
