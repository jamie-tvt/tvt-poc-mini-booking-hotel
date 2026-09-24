#!/bin/bash
# Context Recovery Script for TVT Vibe Builder
# Triggered after context compaction to remind the agent of the workflow.
# Auto-detects Lite mode (PRD.md / IMPLEMENTATION_PLAN.md) vs Full mode
# (docs/README.md manifest) and prints progress accordingly.

MODE="unknown"

if [ -f "docs/README.md" ] && [ -d "docs" ]; then
    MODE="full"
elif [ -f "PRD.md" ] || [ -f "IMPLEMENTATION_PLAN.md" ]; then
    MODE="lite"
fi

if [ "$MODE" = "unknown" ]; then
    exit 0  # Not a TVT Vibe Builder project, skip
fi

echo "=== TVT VIBE BUILDER — CONTEXT RECOVERY (mode: $MODE) ==="
echo ""
echo "Context was compacted. Re-reading critical files to stay on track."
echo ""

echo "### WORKFLOW CHECKPOINTS (MANDATORY - DO NOT SKIP!)"
if [ "$MODE" = "lite" ]; then
    echo "| After Phase | Action |"
    echo "| --- | --- |"
    echo "| Phase 3 (Coding) complete | -> Create TEST_PLAN.md -> STOP for Human review |"
    echo "| Phase 4 (Test Plan) approved | -> Run tests autonomously |"
    echo "| Phase 5 (Testing) complete | -> Report results -> enter Phase 6 loop |"
else
    echo "| After Phase | Action |"
    echo "| --- | --- |"
    echo "| Phase 3 (Coding) complete | -> Create docs/qa/*.md -> STOP for GATE 2 |"
    echo "| Phase 4 (GATE 2 pre-check) approved | -> Run tests autonomously |"
    echo "| Phase 5 (Testing) complete | -> Report results -> enter Phase 6 loop |"
fi
echo ""

if [ "$MODE" = "lite" ]; then
    if [ -f "IMPLEMENTATION_PLAN.md" ]; then
        echo "### Current Progress (from IMPLEMENTATION_PLAN.md):"
        TOTAL=$(grep -c '^\s*- \[' IMPLEMENTATION_PLAN.md 2>/dev/null || echo "0")
        DONE=$(grep -c '^\s*- \[x\]' IMPLEMENTATION_PLAN.md 2>/dev/null || echo "0")
        echo "Tasks: $DONE / $TOTAL completed"
        if [ "$TOTAL" -gt 0 ] && [ "$DONE" -eq "$TOTAL" ]; then
            echo ""
            echo "*** ALL IMPLEMENTATION TASKS COMPLETE ***"
            echo "NEXT STEP: Create TEST_PLAN.md and STOP for Human review!"
        fi
        echo ""
    fi
    if [ -f "TEST_PLAN.md" ]; then
        echo "### TEST_PLAN.md exists"
        TESTS_TOTAL=$(grep -c '^\s*- \[' TEST_PLAN.md 2>/dev/null || echo "0")
        TESTS_DONE=$(grep -c '^\s*- \[x\]' TEST_PLAN.md 2>/dev/null || echo "0")
        echo "Tests: $TESTS_DONE / $TESTS_TOTAL completed"
        echo ""
    fi
else
    echo "### Current Progress (Full mode):"
    if [ -d "tasks" ]; then
        TOTAL_TASKS=$(grep -rl '^status:' tasks --include='*.md' 2>/dev/null | wc -l | tr -d ' ')
        DONE_TASKS=$(grep -rl '^status: done' tasks --include='*.md' 2>/dev/null | wc -l | tr -d ' ')
        echo "Tasks: $DONE_TASKS / $TOTAL_TASKS marked done (grep over frontmatter, may be slightly off)"
    fi
    if [ -f "docs/README.md" ]; then
        DOC_COUNT=$(grep -c '^|' docs/README.md 2>/dev/null || echo "0")
        echo "Manifest (docs/README.md): $DOC_COUNT line(s) (including header)"
    fi
    if [ -d "docs/qa" ]; then
        echo ""
        echo "*** docs/qa/ already exists -> likely in Phase 4/5, check task review_gate before running tests ***"
    fi
    echo ""
    echo "### REMINDER: run 'bash .claude/skills/tvt-vibe-builder/scripts/docs-lint.sh' before reporting a phase as complete."
fi

echo ""
echo "### CRITICAL REMINDER:"
echo "1. Re-read the skill: .claude/skills/tvt-vibe-builder/SKILL.md"
if [ "$MODE" = "lite" ]; then
    echo "2. Re-read IMPLEMENTATION_PLAN.md for current progress"
    echo "3. Re-read TEST_PLAN.md (if it exists) for test status"
else
    echo "2. Re-read docs/README.md (manifest), filtered to ids/tags relevant to the current task"
    echo "3. Re-read docs/constraints.md - hard rules that must not be violated"
fi
echo "4. Follow the workflow strictly - especially the checkpoints!"
echo ""
echo "=== END CONTEXT RECOVERY ==="
