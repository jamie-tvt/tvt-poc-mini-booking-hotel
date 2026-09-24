# Booking Hotel — POC mẫu của team Mentor (H10+ Training)

Bản mẫu để trình bày "doanh nghiệp làm dự án thật thế nào" và so sánh với bài của Team B.

- Kế hoạch & phạm vi: `proposal/` · Artifact: https://claude.ai/artifact/DHNrEoGzhmQ2ntP8qGU3mv
- Tài liệu: `docs/README.md` · hợp đồng API `docs/technical/api-contracts.md`
- Mã nguồn: `src/booking-hotel-backend` (Spring Boot), `src/booking-hotel-frontend` (Next.js), `src/docker`, `src/e2e`
- **Demo nhanh không cần cài gì**: mở `review-html/BookingHotel_Demo.html` (1 file, chạy offline)
- Chạy demo full-stack: `docs/ops/demo-runbook.md` · Kết quả test: `docs/qa/test-results.md` · Ảnh: `review-html/screenshots/`
- **CI/CD**: `.github/workflows/ci-cd-vercel.yml` — push `main` → test FE/BE rồi deploy bản demo lên Vercel (https://tvt-poc-mini-booking-hotel.vercel.app); PR → Preview. Vercel chỉ host bản demo static (API giả lập trong trình duyệt), không host Spring Boot/MySQL.
