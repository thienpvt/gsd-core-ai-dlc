---
phase: 12-onboarding-rule-authoring-docs
plan: 02
subsystem: docs
tags: [governance, rule-authoring, frontmatter, selection, readme]

requires:
  - phase: 12-onboarding-rule-authoring-docs
    provides: docs/onboarding.md and docs/governance-workflow.md cross-referenced from README and rule-authoring guide
provides:
  - DOC-03 rule-authoring guide for Markdown+frontmatter governance rules
  - Root README documentation landing page linking onboarding, workflow, and authoring docs
affects: [docs, onboarding, governance-workflow, rule-authoring, selection]

tech-stack:
  added: []
  patterns:
    - Schema-grounded documentation using src/schema/frontmatter.schema.json as source of truth
    - Selector verification examples that assert selected[].id membership instead of grepping whole JSON

key-files:
  created: [docs/rule-authoring.md, README.md]
  modified: []

key-decisions:
  - "Used require-mfa only as the 6-base-field plus classification example; the all-fields example is a separate billing-review rule with detailPath."
  - "Placed example detail files under details/ because the loader skips details/ subtrees during rule indexing; root-level Markdown detail files are parsed as rules."
  - "Verification examples parse JSON and inspect selected[].id because skipped[] intentionally retains non-matching rule ids."

patterns-established:
  - "Rule authoring docs must distinguish summary-only rules from detailPath-backed rules."
  - "Docs-to-CLI examples must be runnable against bin/governance.cjs after npm run build."

requirements-completed: [DOC-03]

coverage:
  - id: D1
    description: "Rule Authoring Guide documents frontmatter fields, scope placement, trigger axes, worked examples, and runnable selector verification loop."
    requirement: DOC-03
    verification:
      - kind: manual_procedural
        ref: "npm run build; node bin/governance.cjs build-index; temp billing-review positive select; wrong-keyword negative select; wrong-phase negative select; docs grep assertions"
        status: pass
    human_judgment: false
  - id: D2
    description: "Root README links onboarding, governance workflow, and rule authoring docs from a Documentation section."
    requirement: DOC-03
    verification:
      - kind: manual_procedural
        ref: "README grep assertions for ## Documentation and docs/onboarding.md, docs/governance-workflow.md, docs/rule-authoring.md"
        status: pass
    human_judgment: false

metrics:
  duration: 16min
  completed: 2026-07-08
status: complete
---

# Phase 12 Plan 02: Rule Authoring Docs Summary

**Schema-grounded rule-authoring guide with runnable selector verification plus root README documentation entrypoint**

## Performance

- **Duration:** 16 min
- **Started:** 2026-07-08T19:15:05Z
- **Completed:** 2026-07-08T19:30:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `docs/rule-authoring.md` covering all required frontmatter fields, `classification`, optional `enforcement`, scope precedence, trigger axes, worked examples, and verify loop.
- Created `README.md` as concise repo landing page with Documentation links to onboarding, governance workflow, and rule-authoring guides.
- Verified temp `billing-review` rule selection with positive keyword/phase match and two negative cases that assert `selected[]` exclusion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write docs/rule-authoring.md (DOC-03)** - `5265703` (docs)
2. **Task 2: Create README.md with Documentation section** - `6301312` (docs)

**Plan metadata:** pending final metadata commit

## Files Created/Modified

- `docs/rule-authoring.md` - Rule authoring guide for frontmatter fields, scope placement, trigger axes, examples, and verify-the-rule-fires loop.
- `README.md` - Root landing page with install, Documentation, CLI, and development sections.

## Decisions Made

- Used `require-mfa` only as the summary-only example: six base fields plus `classification: advisory`, no `detailPath`.
- Used separate `billing-review` example as the complete all-fields sample with `detailPath`.
- Put detail files under `enterprise/details/` in examples because `buildIndex` skips `details/` subtrees but indexes root-level `.md` files as rules.
- Used JSON parsing checks against `selected[].id` for negative selection cases because skipped rules retain the same ids in `skipped[]`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Moved example detail file under `details/`**
- **Found during:** Task 1 (Write docs/rule-authoring.md)
- **Issue:** The planned temp pack placed `billing-review-detail.md` directly under `enterprise/`; `buildIndex` recursively indexes root-level `.md` files and failed because the detail body had no rule frontmatter.
- **Fix:** Documented and verified `detailPath: ./details/billing-review-detail.md` with the detail body under `enterprise/details/`, matching the loader's documented skip behavior for detail files.
- **Files modified:** `docs/rule-authoring.md`
- **Verification:** `npm run build`, `node bin/governance.cjs build-index`, temp `billing-review` index build, positive select, wrong-keyword negative select, wrong-phase negative select.
- **Committed in:** `5265703`

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** The change was required for documented commands to run. No scope creep; examples still demonstrate the planned `billing-review` rule and `detailPath` behavior.

## Issues Encountered

- Initial verification failed when the temp detail Markdown file was indexed as a rule. Resolved by placing detail Markdown under `details/`, the loader's skipped subtree for non-rule detail bodies.

## User Setup Required

None - no external service configuration required.

## Auth Gates

None.

## Known Stubs

None.

## Next Phase Readiness

- Phase 12 docs are now discoverable from the root README.
- Rule authors can follow `docs/rule-authoring.md` to create, index, select, and regression-check a new governance rule.
- No blockers remain for phase verification.

## Self-Check: PASSED

- `docs/rule-authoring.md` exists.
- `README.md` exists.
- Task commit `5265703` exists.
- Task commit `6301312` exists.
- Overall verification passed: build, default index build, temp `billing-review` positive select, wrong-keyword negative select, wrong-phase negative select, docs greps, and README greps.

---
*Phase: 12-onboarding-rule-authoring-docs*
*Completed: 2026-07-08*
