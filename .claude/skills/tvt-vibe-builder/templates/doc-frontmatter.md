# Frontmatter Templates (Full mode)

Copy the block that applies at the top of any new `.md` file under `docs/` or `specs/`.

## Regular doc (product-design, ui-ux, domain, technical, qa, ops...)

```yaml
---
id: <domain>.<n>              # unique, mirrors the path — e.g. technical.security
status: draft | approved | deprecated
owner: <role or team>
last_updated: YYYY-MM-DD
dependencies: [<id>, <id>]
tags: [<tag>, <tag>]
---
```

## product-design / domain doc with a rule that lives in code

Add `code_ref` whenever the doc describes a pricing table, scoring formula, business constant, or any other rule that's actually enforced in code. The doc's prose covers intent/rationale only — the real value is never restated in the doc.

```yaml
---
id: domain.pricing
status: approved
owner: pricing-team
last_updated: YYYY-MM-DD
dependencies: [technical.event-contracts]
code_ref: [apps/web/src/domain/pricing, apps/web/src/domain/pricing/tiers-config.ts]
tags: [domain, pricing]
---
```

## Service doc (`docs/technical/services/<name>.md`)

`dependencies` answers "what docs should I read to understand this service." `service_dependencies` answers "what other services actually call this one, or get called by it" at runtime — these two lists are DIFFERENT, don't conflate them.

```yaml
---
id: services.<service-name>
status: approved
owner: <team>
last_updated: YYYY-MM-DD
dependencies: [technical.security, technical.event-contracts]
service_dependencies: [services.<other-service>]
code_ref: [services/<service-name>, services/<service-name>/api/openapi.yaml]
tags: [service, backend]
---
```

## Infra doc (`docs/technical/infra/*.md`)

```yaml
---
id: infra.<name>
status: approved
owner: platform
last_updated: YYYY-MM-DD
dependencies: [technical.security]
code_ref: [infra/ci-cd, infra/terraform/environments/prod]
tags: [infra, <name>]
---
```

## Standard Document Template (body, every doc type)

```markdown
0. Frontmatter
1. Purpose
2. Scope
3. Dependencies (doc ids, cross-referenced with frontmatter)
4. Rules
5. Examples
6. Acceptance Criteria
7. Related Documents
8. Changelog
```
