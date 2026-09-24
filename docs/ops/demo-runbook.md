---
id: ops.demo-runbook
status: approved
owner: mentor-team
last_updated: 2026-09-24
dependencies: [technical.architecture]
code_ref: [src/docker-compose.yml, src/.env.example, src/booking-hotel-frontend/offline-demo]
tags: [ops, demo, runbook]
---

# Runbook demo

## Cách nhanh: 1 file HTML, không cần Docker
Mở `review-html/BookingHotel_Demo.html` bằng Chrome/Edge/Safari (bấm đúp là chạy, không cần mạng — có mạng thì tải thêm font).
- Là **chính giao diện Next.js** trong `src/booking-hotel-frontend/src`, build bằng Vite; backend được thay bằng API giả lập trong trình duyệt (`offline-demo/mock/`) bám hợp đồng API và nghiệp vụ của các `*Service.java` (tồn kho theo đêm, giá niêm yết gồm phí, khách vãng lai dùng mã + key, cách ly theo khách sạn, payout), cùng dữ liệu mẫu với `DemoDataSeeder`.
- Dữ liệu lưu ở localStorage của trình duyệt đang mở; mở 2 tab cùng file thì dùng chung dữ liệu. Nút **DEMO · hướng dẫn** (góc dưới trái): vào nhanh theo vai trò, mở đơn khách vãng lai `HB-GUEST1`, kịch bản gợi ý, **Đặt lại dữ liệu**.
- Khác bản full-stack: không có khoá dòng DB thật, JWT thật, webhook HMAC thật, Swagger — phần đó demo bằng Docker.
- Build lại sau khi sửa frontend: `cd src/booking-hotel-frontend && npm run build:offline`. Kiểm: `cd src/e2e && npx playwright test -c playwright.offline.config.ts`.

```bash
cd src
cp .env.example .env        # đổi mật khẩu và secret
docker compose up -d --build
```
Web http://localhost:3100 · API http://localhost:8180/api/v1 · Swagger http://localhost:8180/docs. Chạy song song được với POC Tour (3000/8080). Làm sạch: `docker compose down -v && docker compose up -d`.

Tài khoản (mật khẩu `12345678`): customer@ · mai.tran@ · owner@ · owner2@ · staff@ · admin@ (đuôi `@example.com`). Khách vãng lai: tra cứu `HB-GUEST1` + `guest@example.com`.

## Kịch bản trình bày (15 phút)
1. **Khách vãng lai**: tìm "Cần Thơ" 2 đêm → Ninh Kiều → so sánh loại phòng (giá đã gồm phí, chính sách huỷ) → đặt Superior không cần tài khoản → cổng giả lập → hoá đơn tách tiền phòng và phí nền tảng.
2. **Tồn kho theo đêm**: đặt Family (3 phòng) cho đến khi hết một đêm → đổi khoảng ngày thấy còn/hết. Mở `InventoryConcurrencyIT`.
3. **Lễ tân** (staff@): Lễ tân → khách đến hôm nay (đơn của Nguyễn Văn Hào) → Nhận phòng, chọn số phòng → tab Đang ở → Trả phòng.
4. **Chủ khách sạn** (owner@): khách sạn Mekong Lotus đang chờ duyệt; thêm loại phòng, thêm phòng; payout.
5. **Admin**: duyệt Mekong Lotus → khách tìm thấy ngay; đổi phí nền tảng 10% → 12% và xem giá niêm yết đổi; công cụ demo dời giờ để đơn giữ phòng hết hạn.
6. **Cách ly dữ liệu**: owner2@ mở đường dẫn đơn của khách sạn owner@ → không thấy.
