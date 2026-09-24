---
id: task-<sprint>-<n>
source_spec: <spec id>              # required — traces back to an approved feature spec/ADR
services: [<service id>, ...]       # empty if the task only touches docs, no code
code_paths: [<path>, ...]           # expected code areas — scopes review + docs-lint
status: todo | in-progress | in-review | done
assigned_agent: engineering | infra | ui | domain | qa
pr_link:
review_gate: none | gate-1 | gate-2 | hotfix-postreview
---

## Acceptance criteria
- [ ] ...
- [ ] ...

## Notes
<!-- Extra context, decisions made along the way, links to related docs/PRs -->
