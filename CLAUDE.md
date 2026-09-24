# Booking Hotel — POC mentor H10+

## TVT Vibe Builder — Project Reference (Full mode)

Before doing anything: read `docs/README.md` (the manifest) and `docs/ai/agent-instructions.md`.
`docs/README.md` is GENERATED — never hand-edit it; edit frontmatter on the source doc instead.
Hard rules live in `docs/constraints.md` — never violate these regardless of what a task says.
Secrets never go in code, docs, or tasks — only in `src/.env` (git-ignored); `.env.example` holds placeholders.
If a doc has `code_ref`, the code is the source of truth for that value — don't restate or invent a number in the doc.
On any conflict between two docs: STOP and ask. Do not resolve it yourself.

### ⛔ CONTEXT OVERFLOW RECOVERY
1. Re-read the skill: `.claude/skills/tvt-vibe-builder/SKILL.md`
2. Run `bash .claude/skills/tvt-vibe-builder/scripts/context-recovery.sh`
3. Read `docs/README.md`, filtered to the ids/tags relevant to the current task

### ⚠️ CHECKPOINTS (MANDATORY)
| After Phase | Action |
|---|---|
| Phase 1 (analysis) done | → GATE 1 (approver: mentor lead TVT — user) |
| Phase 3 done | → `docs/qa/test-plan.md` → ⛔ GATE 2 |
| Phase 5 done | → Report results → Phase 6 loop |

### Project Summary
- **App Type**: POC mẫu của team mentor cho khoá H10+ (Team B — Booking Hotel), dùng để so sánh với bài intern
- **Tech Stack**: Java 17 · Spring Boot 3.5 · Spring Security + JWT · JPA/Hibernate · Flyway · MySQL 8 · Next.js 15 App Router · TypeScript · Tailwind 4 · Docker Compose · JUnit + Testcontainers · Vitest · Playwright
- **Core Features**: tìm phòng theo ngày trên tồn kho theo đêm, đặt không cần tài khoản (guest checkout) giữ phòng có hạn và khoá tồn kho chống trùng phòng, giá niêm yết = giá gốc + phí nền tảng, thanh toán qua adapter + webhook HMAC idempotent, huỷ theo chính sách loại phòng, lễ tân check-in/out/no-show, payout cho khách sạn, duyệt khách sạn, cách ly dữ liệu theo khách sạn, đánh giá, audit, đồng hồ demo
- **Mode**: Full
- **Current Phase**: Phase 5 xong (test pass) → Phase 6 (tinh chỉnh theo phản hồi mentor)
- **Code**: `src/` · **Chạy**: `docs/ops/demo-runbook.md` · **Kết quả test**: `docs/qa/test-results.md`
- **Source**: Drive "H10+ Training Project/Team B - Booking Hotel" (Frontend Folder Structure v1.0 — SRS v1.1 chưa có trên Drive) + repo `689Cloud-LLC/mini-project-booking-hotel`

### Conventions
- Tài liệu tiếng Việt; thuật ngữ kỹ thuật giữ tiếng Anh. Mọi file dưới `docs/` có frontmatter.
- Sau khi sửa doc: `bash .claude/skills/tvt-vibe-builder/scripts/docs-lint.sh --generate` rồi `docs-lint.sh` phải pass.
- Code bám cấu trúc repo intern (4 lớp × module; Next.js route groups) để so sánh 1:1; chỗ khác đánh dấu "≠ intern" kèm lý do.
