#!/usr/bin/env python3
"""
docs-lint for TVT Vibe Builder (Full mode)

Validates the AI-First Documentation Architecture v4 conventions:
  - every doc under docs/ has valid frontmatter (id, status, owner)
  - status is one of draft | approved | deprecated
  - no duplicate ids
  - dependencies resolve to existing ids
  - no circular dependencies
  - no `status: approved` doc depends on a `status: deprecated` doc
  - code_ref paths exist in the repo
  - service_dependencies point to existing service ids
  - every task's source_spec resolves to an existing doc/spec id
  - docs/README.md manifest matches what regenerating it from frontmatter
    would produce (structural drift check)

No third-party dependencies (no PyYAML) — frontmatter is parsed with a
small line-based parser that covers the subset of YAML this template uses:
  key: value
  key: [a, b, c]
  key:
    - a
    - b

Usage:
  python3 docs_lint.py                # check only, prints a report, exits 1 on failure
  python3 docs_lint.py --generate     # also (re)write docs/README.md from frontmatter
  python3 docs_lint.py --root <path>  # run against a repo root other than cwd
"""

import argparse
import re
import sys
from pathlib import Path

VALID_STATUS = {"draft", "approved", "deprecated"}
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)


def parse_frontmatter(text):
    """Small YAML-subset parser: flat key: value, key: [a, b], and
    key:\n  - a\n  - b list forms. Good enough for this template's schema."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    raw = m.group(1)
    data = {}
    lines = raw.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.strip().startswith("#"):
            i += 1
            continue
        kv = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if not kv:
            i += 1
            continue
        key, val = kv.group(1), kv.group(2).strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            data[key] = [x.strip() for x in inner.split(",") if x.strip()] if inner else []
            i += 1
        elif val == "":
            # possible block list on following lines
            items = []
            j = i + 1
            while j < len(lines) and re.match(r"^\s*-\s+.+$", lines[j]):
                items.append(re.sub(r"^\s*-\s+", "", lines[j]).strip())
                j += 1
            if items:
                data[key] = items
                i = j
            else:
                data[key] = ""
                i += 1
        else:
            data[key] = val.strip('"').strip("'")
            i += 1
    return data


def find_docs(root, subdir):
    base = root / subdir
    if not base.exists():
        return []
    out = []
    for p in sorted(base.rglob("*.md")):
        if p.name == "README.md":
            continue
        if p.name.endswith("_template.md"):
            continue
        text = p.read_text(encoding="utf-8", errors="replace")
        fm = parse_frontmatter(text)
        out.append((p, fm))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--generate", action="store_true", help="regenerate docs/README.md from frontmatter")
    ap.add_argument("--root", default=".", help="repo root (default: cwd)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    errors = []
    warnings = []

    doc_entries = find_docs(root, "docs")
    spec_entries = find_docs(root, "specs")
    task_entries = find_docs(root, "tasks")

    all_ids = {}          # id -> path
    doc_ids = {}           # id -> (path, frontmatter)  (docs/ only, for manifest + service checks)
    duplicate_ids = []

    for path, fm in doc_entries + spec_entries:
        if fm is None:
            errors.append(f"[frontmatter] {path.relative_to(root)}: no YAML frontmatter found (---...---)")
            continue
        for req in ("id", "status", "owner"):
            if req not in fm or not fm.get(req):
                errors.append(f"[frontmatter] {path.relative_to(root)}: missing required field '{req}'")
        doc_id = fm.get("id")
        status = fm.get("status")
        if status and status not in VALID_STATUS:
            errors.append(f"[status] {path.relative_to(root)}: status='{status}' is invalid (must be draft|approved|deprecated)")
        if doc_id:
            if doc_id in all_ids:
                duplicate_ids.append(doc_id)
                errors.append(f"[duplicate id] '{doc_id}' appears in both {all_ids[doc_id].relative_to(root)} and {path.relative_to(root)}")
            else:
                all_ids[doc_id] = path

    for path, fm in doc_entries:
        if fm and fm.get("id"):
            doc_ids[fm["id"]] = (path, fm)

    # dependency resolution + cycle detection (docs/ + specs/ ids share the same id namespace)
    graph = {}
    for doc_id, path in all_ids.items():
        fm = next((f for p, f in doc_entries + spec_entries if p == path), None)
        deps = fm.get("dependencies", []) if fm else []
        if isinstance(deps, str):
            deps = [deps] if deps else []
        graph[doc_id] = deps

    for doc_id, deps in graph.items():
        for dep in deps:
            if dep not in all_ids:
                errors.append(f"[broken dependency] '{doc_id}' -> '{dep}' (id does not exist)")

    # cycle detection (DFS)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {k: WHITE for k in graph}

    def has_cycle(node, path_stack):
        color[node] = GRAY
        for dep in graph.get(node, []):
            if dep not in color:
                continue
            if color[dep] == GRAY:
                errors.append(f"[circular dependency] {' -> '.join(path_stack + [node, dep])}")
                return True
            if color[dep] == WHITE:
                if has_cycle(dep, path_stack + [node]):
                    return True
        color[node] = BLACK
        return False

    for node in list(graph.keys()):
        if color.get(node) == WHITE:
            has_cycle(node, [])

    # approved must not depend on deprecated
    for doc_id, (path, fm) in doc_ids.items():
        if fm.get("status") != "approved":
            continue
        for dep in graph.get(doc_id, []):
            dep_entry = doc_ids.get(dep)
            if dep_entry and dep_entry[1].get("status") == "deprecated":
                errors.append(f"[deprecated dependency] '{doc_id}' (approved) depends on '{dep}' (deprecated)")

    # code_ref existence
    for doc_id, (path, fm) in doc_ids.items():
        code_refs = fm.get("code_ref", [])
        if isinstance(code_refs, str):
            code_refs = [code_refs] if code_refs else []
        for ref in code_refs:
            if not (root / ref).exists():
                errors.append(f"[code_ref] {path.relative_to(root)}: code_ref '{ref}' does not exist in the repo")

    # service_dependencies must point to existing service ids
    service_ids = {i for i in doc_ids if i.startswith("services.")}
    for doc_id, (path, fm) in doc_ids.items():
        svc_deps = fm.get("service_dependencies", [])
        if isinstance(svc_deps, str):
            svc_deps = [svc_deps] if svc_deps else []
        for sd in svc_deps:
            if sd not in service_ids:
                errors.append(f"[service_dependencies] {path.relative_to(root)}: '{sd}' does not match any service id under docs/technical/services/")

    # task source_spec resolution
    spec_and_doc_ids = set(all_ids.keys())
    for path, fm in task_entries:
        if fm is None:
            warnings.append(f"[task frontmatter] {path.relative_to(root)}: could not read frontmatter, skipping")
            continue
        source_spec = fm.get("source_spec")
        if not source_spec:
            errors.append(f"[task] {path.relative_to(root)}: missing 'source_spec'")
        elif source_spec not in spec_and_doc_ids:
            errors.append(f"[task] {path.relative_to(root)}: source_spec '{source_spec}' does not resolve to any doc/spec id")
        status = fm.get("status")
        if status and status not in {"todo", "in-progress", "in-review", "done"}:
            errors.append(f"[task] {path.relative_to(root)}: status='{status}' is invalid")

    # manifest generation / drift check
    manifest_rows = []
    for doc_id in sorted(doc_ids.keys()):
        path, fm = doc_ids[doc_id]
        rel_path = path.relative_to(root).as_posix()
        status = fm.get("status", "")
        owner = fm.get("owner", "")
        tags = fm.get("tags", [])
        if isinstance(tags, str):
            tags = [tags] if tags else []
        manifest_rows.append((doc_id, rel_path, status, owner, ", ".join(tags)))

    generated_lines = [
        "# Documentation Manifest",
        "",
        "> This file is GENERATED by `docs-lint.sh --generate` from the frontmatter of every doc under `docs/`.",
        "> Do NOT hand-edit - edit frontmatter on the source doc, then re-run `--generate`.",
        "",
        "| id | path | status | owner | tags |",
        "|---|---|---|---|---|",
    ]
    for row in manifest_rows:
        generated_lines.append("| " + " | ".join(row) + " |")
    generated_content = "\n".join(generated_lines) + "\n"

    manifest_path = root / "docs" / "README.md"
    if args.generate:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(generated_content, encoding="utf-8")
        print(f"[generate] Wrote {manifest_path.relative_to(root)} ({len(manifest_rows)} doc(s)).")
    else:
        if not manifest_path.exists():
            errors.append("[manifest] docs/README.md does not exist yet - run with --generate to create it")
        else:
            existing = manifest_path.read_text(encoding="utf-8")
            raw_matches = re.findall(r"^\|\s*([A-Za-z0-9_.\-]+)\s*\|", existing, re.MULTILINE)
            # drop the table header ("id") and separator row ("---") artifacts
            existing_ids = {m for m in raw_matches if m != "id" and not re.match(r"^-+$", m)}
            expected_ids = {row[0] for row in manifest_rows}
            missing_in_manifest = expected_ids - existing_ids
            stale_in_manifest = existing_ids - expected_ids
            if missing_in_manifest:
                errors.append(f"[manifest drift] docs with frontmatter but missing from docs/README.md: {sorted(missing_in_manifest)} -> run --generate")
            if stale_in_manifest:
                errors.append(f"[manifest drift] docs/README.md has ids with no matching doc: {sorted(stale_in_manifest)} -> run --generate")

    # ---- report ----
    print(f"docs-lint: {len(doc_entries)} doc(s) under docs/, {len(spec_entries)} spec(s), {len(task_entries)} task(s)")
    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        print(f"\nFAILED - {len(errors)} error(s):")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\nOK - no errors.")
        sys.exit(0)


if __name__ == "__main__":
    main()
