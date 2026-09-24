# Booking Hotel — Frontend (Next.js) · "Mekong Stay"

Frontend POC "Booking Hotel" của team mentor, gọi API Spring Boot theo `docs/technical/api-contracts.md`.
Bám khuôn frontend POC Tour (`poc-mini-booking-tour/src/booking-tour-frontend`): cùng api client, AuthProvider, guard, ui components, cách tổ chức `app/` + `features/`.

- Next.js 15.5 (App Router, `output: "standalone"`), React 19, TypeScript strict
- Tailwind CSS v4, lucide-react (icon), zod (validate), Vitest 3 + React Testing Library
- UI tiếng Việt; font **Playfair Display** (tiêu đề) + **Be Vietnam Pro** (nội dung) qua `next/font/google`, subset `vietnamese`
  (không dùng Playfair Display SC + Karla của MASTER.md vì thiếu dấu tiếng Việt — decisions D10)

> **≠ Team B:** tài liệu FE của Team B đề xuất React Router framework mode + Zustand + AntD. POC mentor dùng Next.js để khớp stack chung của khoá (D9),
> nhưng vẫn tách `features/<feature>` giống Team B để so sánh 1:1: `auth, search, room-detail, booking, my-bookings, review, hotel-management, booking-operations, payout, admin`
> (+ `account`, `notifications` dùng chung).

## Lệnh

```bash
npm install
npm run dev         # http://localhost:3100
npm run typecheck   # tsc --noEmit
npm test            # vitest run
npm run build       # next build (pass kể cả khi backend chưa chạy)
npm start           # next start -p 3100
```

## Biến môi trường

| Biến | Khi nào đọc | Mặc định | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **lúc build** (nhúng vào bundle) | `http://localhost:8180/api/v1` | URL trình duyệt gọi API |
| `API_INTERNAL_URL` | lúc chạy (server) | `NEXT_PUBLIC_API_URL` → mặc định trên | URL Server Component gọi API. Trong Docker: `http://backend:8080/api/v1` |

Docker: `src/docker/frontend/Dockerfile` (context = thư mục này), multi-stage node:22-alpine → `server.js` standalone, cổng 3000 trong container.

## Trang

| Khu vực | Route | Ghi chú |
|---|---|---|
| Customer (công khai, Server Component) | `/`, `/hotels`, `/hotels/[id]` | `dynamic = "force-dynamic"`, bộ lọc đồng bộ URL |
| Khách vãng lai (không cần đăng nhập) | `/checkout`, `/booking/[code]?key=`, `/pay/mock/[paymentId]?key=`, `/lookup` | mọi thao tác trên đơn dùng mã đơn + access key |
| Tài khoản | `/login`, `/register`, `/my-bookings` (CUSTOMER), `/account`, `/notifications` | khung tài khoản demo + gợi ý đơn khách vãng lai `HB-GUEST1` |
| Hotel Portal (HOTEL_OWNER, HOTEL_STAFF) | `/portal`, `/portal/front-desk`, `/portal/bookings[/id]`; owner: `/portal/hotels`, `/portal/hotels/new`, `/portal/hotels/[id]`, `/portal/payouts` | mục owner ẩn khỏi menu và chặn ở guard với staff |
| Admin Panel (ADMIN) | `/admin`, `/admin/hotels`, `/admin/facilities`, `/admin/bookings`, `/admin/payments`, `/admin/payouts`, `/admin/users`, `/admin/settings`, `/admin/audit-logs` | dashboard có công cụ demo đồng hồ |

## Cấu trúc

```
src/
  app/                    # chỉ định tuyến; page mỏng, render component của feature
    (public)/  (guest)/  (auth)/  (customer)/  portal/  admin/
  features/<feature>/{components,services,validators,context,tests}
  components/{layout,shared,ui}   # header/footer/sidebar, guard/lỗi/rỗng, Button/Field/Dialog/Tabs/QuantityStepper…
  lib/api                 # http.ts (bóc ApiResponse), client.ts (token + refresh), server.ts (RSC), hooks.ts
  lib/auth                # session (localStorage `hb.auth`), AuthProvider, roles
  lib/utils               # tiền VND, ngày giờ VN, ngày lưu trú (số đêm, chính sách huỷ, tách giá), nhãn trạng thái
public/images/hotels/*.svg, public/images/rooms/*.svg   # ảnh minh hoạ phẳng 16:10 (seed backend dùng /images/hotels/...)
```

## Quy ước chính

- **Server Component** cho trang công khai (`serverGet`, `no-store`); backend không chạy thì hiện trạng thái lỗi thân thiện, build không cần backend.
- **API client**: bóc `ApiResponse.data`, lỗi chuẩn hoá `ApiError {status, code, message, errors}`; `401 TOKEN_EXPIRED` → refresh **một lần** (khoá chống song song).
  Thêm chế độ `auth: "optional"` (≠ Tour) cho `POST /bookings`: có token thì gắn, refresh hỏng thì gọi lại không token thay vì đẩy khách về `/login`.
- **Ngày lưu trú** là `YYYY-MM-DD` → xử lý bằng chuỗi (không qua `Date` múi giờ); "hôm nay" theo Asia/Ho_Chi_Minh, Portal canh theo `GET /demo/clock`.
- **Chính sách huỷ** hiển thị "Miễn phí huỷ trước DD/MM" với DD/MM = ngày nhận − N + 1 (huỷ trước ≥ N ngày được hoàn 100%) hoặc "Không hoàn tiền".
- **A11y**: mọi input có `<label htmlFor>`, nút có tên truy cập rõ, badge trạng thái luôn có chữ, hộp thoại `<dialog>` (không `window.confirm`), focus-visible, `prefers-reduced-motion`.
- **Màu** (≥ 4.5:1): nút chính `#1E3A8A` chữ trắng; CTA `#A16207` chữ trắng (4,9:1 — đạt nên giữ), hover `#854D0E`; chữ `#1E293B`/`#0F172A`; viền trang trí `#BFDBFE`, viền ô nhập `#64748B`.

## Test (Vitest)

- `lib/utils/tests/format.test.ts`, `stay.test.ts`: tiền VND, ngày giờ VN, ngày lưu trú, số đêm, validate khoảng ngày, nhãn chính sách huỷ, tách giá/phí
- `lib/api/tests/client.test.ts`: bóc ApiResponse, lỗi có code (`ROOM_UNAVAILABLE`), refresh 401, khoá refresh, `auth: "optional"`
- `features/booking/tests/checkoutSchema.test.ts`: ngày trả > nhận, không quá khứ, ≤ 30 đêm, email, SĐT Việt Nam, sức chứa; tra cứu đơn
- `features/booking/tests/BookingStatusBadge.test.tsx`, `features/search/tests/StayPicker.test.tsx`, `components/ui/tests/QuantityStepper.test.tsx`
- `features/booking-operations/tests/availableActions.test.ts`, `features/auth/tests`, `features/admin/tests`, `lib/utils/tests/query.test.ts`
