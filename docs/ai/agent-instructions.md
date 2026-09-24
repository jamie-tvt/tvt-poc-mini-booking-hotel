---
id: ai.agent-instructions
status: approved
owner: mentor-team
last_updated: 2026-09-23
dependencies: [constraints, technical.architecture]
tags: [ai, agent]
---

# Hướng dẫn cho agent

1. Đọc `docs/README.md`, `docs/constraints.md`, rồi tài liệu có tag liên quan.
2. Thay đổi nghiệp vụ: sửa domain (entity/enum) trước, service sau, controller cuối; cập nhật `technical.api-contracts` cùng PR.
3. Mọi thay đổi schema là migration Flyway mới (`V<n>__*.sql`), không sửa migration đã phát hành.
4. Chạy `./mvnw test` (cần Docker), `npm run typecheck && npm test` ở frontend, `npx playwright test` ở `src/e2e` với stack đang chạy.
