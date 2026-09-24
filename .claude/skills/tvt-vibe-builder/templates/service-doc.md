---
id: services.<service-name>
status: draft
owner: <team>
last_updated: YYYY-MM-DD
dependencies: [technical.security, technical.event-contracts]
service_dependencies: []
code_ref: [services/<service-name>, services/<service-name>/api/openapi.yaml]
tags: [service, backend]
---

# Service: <service-name>

Only create this file if the project actually has a backend split out into a
separate service. An app with just a frontend/mobile client, or a single
backend monolith, doesn't need a `docs/technical/services/` folder at all.

## 1. Purpose
<!-- What this service does, why it exists as a separate service -->

## 2. Scope
<!-- What is / isn't this service's responsibility -->

## 3. Dependencies
<!-- Which docs you need to read to understand this service — matches frontmatter `dependencies` -->

## 4. Contract
<!-- The actual API/event contract lives at code_ref (OpenAPI/proto) — this doc only links to it, never restates it -->

## 5. Runtime dependencies
<!-- Which services call / are called by this one — matches frontmatter `service_dependencies` -->

## 6. Rules
<!-- Service-specific constraints, if any beyond docs/constraints.md -->

## 7. Examples

## 8. Acceptance Criteria

## 9. Related Documents

## 10. Changelog
| Date | Change |
|---|---|
| YYYY-MM-DD | Doc created |
