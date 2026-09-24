# Bug Report

## Status
FIX APPLIED — AWAITING VERIFICATION

## Bug Title
Booking Hotel: bộ lọc chiếm ~2,4 màn hình trên mobile · ảnh khách sạn/phòng là SVG minh hoạ · deploy chạy theo mọi commit

## Bug Description
Kiểm tra 4 hạng mục theo yêu cầu mentor trên bản deploy https://tvt-poc-mini-booking-hotel.vercel.app (ngày 24/09/2026):

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Responsive mobile (375px) | ✅ 29 route (public, khách, chủ khách sạn, admin): không vỡ layout, không cuộn ngang. ❌ Bộ lọc ở `/hotels` quá dài; nút DEMO che nội dung |
| 2 | Bộ lọc khách sạn/phòng | ✅ **Không có lỗi**: thành phố, ngày + số khách/số phòng, giá, hạng sao, tiện nghi (1 và nhiều), sắp xếp (4 kiểu), thao tác UI tick + "Áp dụng" đều ra đúng dữ liệu |
| 3 | Ảnh khách sạn/phòng | SVG minh hoạ → đổi sang ảnh thật từ Unsplash |
| 4 | CI/CD | Deploy Production ở **mọi** push `main` + Preview ở mọi PR → yêu cầu chỉ deploy khi có tag release |

## Steps to Reproduce
1. Mở `/#/hotels` ở khổ 375px → form lọc cao 1.437px, khách sạn đầu tiên ở y≈1.957px (~2,4 màn hình).
2. Nút nổi "DEMO · hướng dẫn" đè lên form/nội dung ở góc dưới trái.

## Actual Result / Expected Result
- Thực tế: phải cuộn rất lâu mới thấy kết quả tìm kiếm trên điện thoại.
- Mong đợi: kết quả hiện ngay màn hình đầu; bộ lọc mở bằng nút "Bộ lọc (n)". Ảnh là ảnh thật. Chỉ deploy khi có tag release.

## Context
- **Environment**: Vercel (bản offline-demo) · Chrome 375×812 giả lập mobile
- **Bằng chứng bộ lọc**: `city=Cần Thơ`→2 · `minPrice=1000000`→1 · `maxPrice=800000`→2 · `stars=4,5`→2 · `facilityIds=9`→1 · `facilityIds=10,11`→2 · `guests=4&rooms=1`→2 · `guests=6&rooms=1`→0 (đúng sức chứa) · `sort=price,asc` đúng thứ tự


## Quyết định của mentor (24/09/2026)
- Duyệt F4 (link CDN), F5 (tag đầu tiên `v1.1.0`). Không có lỗi bộ lọc; F3 được thay bằng thiết kế mới ở **F6** (ui-ux-pro-max, nền mờ theo ảnh).

---

## Root Cause Analysis
**(1) Mobile**
- `src/booking-hotel-frontend/src/features/search/components/SearchFilters.tsx:95`: form lọc là cột dọc. Trên desktop nó là sidebar; dưới `lg` nó xếp **trên** danh sách, gồm 13 checkbox tiện nghi + 5 nút hạng sao + ô ngày/khách.
- `offline-demo/DemoPanel.tsx`: nút `fixed` góc dưới trái, trang không chừa khoảng trống phía dưới.

**(3) Ảnh**: seed ghi `/images/hotels/<slug>.svg` (`DemoDataSeeder.java:198`, mock `db.ts:138`). Ảnh phòng lấy theo tên (`lib/utils/images.ts` → `roomImageFor`), ảnh thành phố ở `app/(public)/page.tsx:16-20`. `HotelImage` là `<img>` thường, `onError` → ảnh dự phòng.

**(4) CI/CD**: `.github/workflows/ci-cd-vercel.yml` trigger `push: main` + `pull_request`, job deploy luôn chạy sau test.

## Proposed Fixes
**F3 — Mobile**
- `SearchFilters`: dưới `lg`, thu gọn thành thanh "Bộ lọc (n)" + tóm tắt (thành phố · ngày · khách). Bấm để mở toàn bộ form. Desktop giữ sidebar như cũ.
- `DemoPanel`: trên mobile chỉ còn nút tròn có icon; thêm `padding-bottom` cho trang demo.

**F4 — Ảnh Unsplash** (link CDN `images.unsplash.com/...&w=1200&q=75`; mất mạng → SVG dự phòng; lý do chọn xem báo cáo repo Tour):
- 5 khách sạn: Ninh Kiều Riverside (bến sông Cần Thơ), Cái Răng Homestay (nhà gỗ giữa vườn), Vị Thanh Green (hồ bơi, cây xanh), Sunset Bay Phú Quốc (hồ bơi lúc hoàng hôn), Mekong Lotus (toà khách sạn sau hoa giấy).
- 8 loại phòng: standard, superior, deluxe, suite, family, garden, villa, bungalow.
- Ảnh thành phố: Cần Thơ, Hậu Giang, Phú Quốc/Kiên Giang, Đồng Tháp (cánh đồng sen).
- Sửa seeder Java, mock `db.ts`, `roomImageFor`, `CITY_IMAGES`. DB MySQL đang chạy ở máy local cần `docker compose down -v` để seed lại.

**F5 — Deploy theo tag release**: giống repo Tour (push/PR chỉ test; tag `v*.*.*` trên `main` → deploy Production + tạo GitHub Release).

**F6 — Chỉnh lại thiết kế: nền mờ theo ảnh Unsplash** (theo phản hồi mentor, dùng skill ui-ux-pro-max; mockup: `scratchpad/mockup/index.html`)
- Giữ nguyên màu và font thương hiệu (`design-tokens.json`). Chỉ thêm 1 lớp hiệu ứng, không đổi layout nghiệp vụ.
- Component dùng chung `PhotoBackdrop`: đặt bản ảnh nhỏ (`w=64`, vài KB) phóng to + `blur(48px) saturate(1.4)`, trên phủ gradient màu nền (55%→100%) để chữ đạt tương phản ≥ 4.5:1. Cùng URL gốc nên ảnh được cache, không tải thêm ảnh lớn. Mất mạng thì nền dùng lại SVG dự phòng.
- Áp dụng:
  | Màn | Thiết kế |
  |---|---|
  | Trang chủ | Hero là ảnh thật full-bleed + gradient tối; form tìm kiếm là thẻ kính mờ (`backdrop-blur 16px`, nền trắng 72%) |
  | Danh sách | Nền trang mờ theo ảnh tour/khách sạn đầu tiên. Mobile: ô tìm kiếm + nút "Bộ lọc (n)" + "Sắp xếp" + chip điều kiện (bấm ✕ để bỏ) → bottom sheet chứa toàn bộ bộ lọc và nút "Xem N kết quả". Desktop giữ bố cục cũ |
  | Thẻ tour/khách sạn | Ảnh sắc nét phía trên; phần nội dung có sắc màu mờ của chính ảnh đó (phủ trắng 80%) |
  | Chi tiết | Nền đầu trang mờ theo ảnh cover; gallery nổi lên bằng shadow; thông tin chính trong thẻ kính. Mobile có thanh giá + nút CTA dính đáy (kính mờ) |
  | Đặt tour / Checkout | Thẻ tóm tắt đơn có nền mờ theo ảnh tour/khách sạn |
- A11y/hiệu năng: tôn trọng `prefers-reduced-motion`; `prefers-reduced-transparency` → dùng nền đặc; vùng bấm ≥ 44px; ảnh `loading="lazy"` trừ hero; giữ `aspect-ratio` để không nhảy layout. Khu quản trị không đổi (chỉ khu khách).
- DEMO: trên mobile nút thu thành hình tròn 44px, trang chừa `padding-bottom`.

## Verification Plan
- `npm run typecheck && npm test`, `./mvnw verify`, E2E offline 9/9.
- Quét lại 29 route ở 375px; chụp `/hotels` và chi tiết khách sạn trên mobile.
- CI: push `main` → chỉ test; đẩy tag → deploy + có GitHub Release; kiểm tra site hiện ảnh thật.

---

## Fix Applied
Ngày 24/09/2026 — F4 + F6 (+ DemoPanel) theo spec đã duyệt; F5 (workflow deploy theo tag) do người điều phối sửa `.github/`. Bộ lọc khách sạn không có lỗi → **giữ nguyên logic lọc**, chỉ đổi giao diện mobile.

### Files Changed
**Backend**
- `src/booking-hotel-backend/src/main/java/com/hotelbooking/infrastructure/seed/DemoDataSeeder.java` — `COVER_IMAGES` (5 khách sạn → link CDN Unsplash, ghi tác giả), fallback SVG cho slug lạ.
- `src/booking-hotel-backend/src/test/java/com/hotelbooking/infrastructure/seed/DemoDataSeederImagesTest.java` (mới) — URL là Unsplash, ≤ 255 ký tự.

**Frontend (`src/booking-hotel-frontend/`)**
- `src/lib/utils/images.ts` — `unsplash()`, `unsplashVariant(url, width, quality?)`, `unsplashSrcSet()`, `HOTEL_IMAGES`, `HERO_IMAGE`, `ROOM_IMAGES` (8 loại phòng, ghi tác giả); `roomImageFor` trả ảnh Unsplash.
- `src/lib/utils/tests/images.test.ts` (mới), `src/features/search/tests/SearchFilters.test.tsx` (mới).
- `src/components/shared/PhotoBackdrop.tsx` (mới), `src/components/shared/HotelImage.tsx` (thêm `width`, `srcSetWidths`, `sizes`; lỗi ảnh → SVG như cũ).
- `src/styles/globals.css` — `.glass` (72%, blur 16px), `.glass-pill`, `--shadow-glass`, `--shadow-float`, `prefers-reduced-transparency`, keyframe `sheet-up`, `body:has([data-sticky-cta])`.
- `src/app/(public)/page.tsx` — hero ảnh thật + gradient, form tìm kính mờ đè mép hero, `CITY_IMAGES` Unsplash.
- `src/app/(public)/hotels/page.tsx` — nền mờ theo khách sạn đầu tiên.
- `src/features/search/components/SearchFilters.tsx` — desktop giữ cột lọc (nền kính); mobile: ô tóm tắt + "Bộ lọc (n)" + "Sắp xếp" + chip ✕ + bottom sheet; `activeFilterChips()`.
- `src/features/search/components/FilterSheet.tsx` (mới) — bottom sheet a11y (dialog modal, Esc/nền/✕, focus trap, khoá cuộn, trả focus).
- `src/features/search/components/HotelCard.tsx` — ảnh w=800 + nền mờ riêng từng thẻ.
- `src/app/(public)/hotels/[id]/page.tsx`, `src/features/room-detail/components/HotelGallery.tsx` — đầu trang nền mờ, gallery nổi (srcSet), pill kính, khối chọn ngày `.glass`, thanh CTA dính đáy trên mobile.
- `src/features/booking/components/CheckoutForm.tsx`, `BookingSummaryCard.tsx` (prop `backdrop`, chỉ bật ở trang khách), `BookingDetailView.tsx` — thẻ tóm tắt đơn nền mờ.
- `src/features/hotel-management/components/HotelForm.tsx` — ảnh bìa gợi ý trỏ cùng URL Unsplash của seed (không đổi giao diện Portal).
- `offline-demo/mock/db.ts` — ảnh bìa Unsplash (ghi tác giả), `version: 2`; `offline-demo/DemoPanel.tsx` — mobile nút tròn 44px (`bottom-24`, nhãn "Mở hướng dẫn demo"); `offline-demo/index.html` — `pb-36 sm:pb-14`.

**E2E / tài liệu / demo**
- `src/e2e/offline/offline-demo.spec.ts` — ảnh chấp nhận Unsplash hoặc SVG dự phòng; +2 case (chặn Unsplash → SVG; bottom sheet mobile).
- `review-html/BookingHotel_Demo.html`, `review-html/screenshots/*` (10 ảnh mới).
- `docs/decisions.md` (D13–D16), `docs/ui-ux/design-system.md`, `docs/qa/test-results.md`, `docs/changelog.md` (v1.1.0), `docs/README.md` (sinh lại).

### Test Results
| Lệnh | Kết quả |
|---|---|
| `npm run typecheck && npm test` | tsc sạch; Vitest 13 file, **108/108 pass** |
| `./mvnw -B -ntp verify` | **70/70 pass** (55 unit + 15 IT Testcontainers), BUILD SUCCESS |
| `npm run build` (Next) | Pass |
| `npm run build:offline` | Pass → `review-html/BookingHotel_Demo.html` (724 KB) |
| `npx playwright test -c playwright.offline.config.ts` | **11/11 pass** |
| `docs-lint.sh --generate` + `docs-lint.sh` | OK |

### Verification
- Playwright 375×812 và 1280×800 trên bản offline: trang chủ, `/hotels` (đóng/mở bottom sheet), chi tiết, checkout, đơn khách — `scrollWidth - innerWidth = 0` mọi màn, không lỗi JS. Ảnh: `review-html/screenshots/`.
- `/hotels` mobile: khách sạn đầu tiên nằm trong màn đầu (trước đây y≈1.957px).
- Chưa làm: E2E full-stack (cần Docker Compose chạy); kiểm tra trên Vercel sau khi đẩy tag `v1.1.0` (người điều phối).

