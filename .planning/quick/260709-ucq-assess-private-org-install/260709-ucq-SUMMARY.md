---
phase: 260709-ucq-assess-private-org-install
plan: 01
subsystem: docs
tags: [private-install, org-model, onboarding, npm, git]

requires: []
provides:
  - Private-org install assessment (ORG-01..04)
  - Truthful private git / local install docs
affects: [onboarding, distribution]

tech-stack:
  added: []
  patterns:
    - "Private/self-hosted install: git clone or file: path after gsd-core; no public npm claim"

key-files:
  created:
    - .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md
  modified:
    - README.md
    - docs/onboarding.md

key-decisions:
  - "Overall verdict PARTIAL — capability model fits private org; install docs were the only real gap"
  - "Left package.json name @opengsd/gsd-aidlc-overlay unchanged; documented as aspirational / unowned on public npm"
  - "Primary install path is private git clone + npm install/build; consumer path uses file: or git+ssh placeholders"

patterns-established:
  - "Install docs never present npm install @opengsd/gsd-aidlc-overlay as a working public-registry command"

requirements-completed: [ORG-01, ORG-02, ORG-03, ORG-04]

coverage:
  - id: D1
    description: Assessment artifact with SATISFIED/GAP/PARTIAL for ORG-01..04 plus evidence paths
    requirement: ORG-01
    verification:
      - kind: other
        ref: "test -f .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md && grep ORG-0"
        status: pass
    human_judgment: false
  - id: D2
    description: Install docs rewritten to private git / local / file: path; no public-registry install claim
    requirement: ORG-03
    verification:
      - kind: other
        ref: "grep -n 'npm install @opengsd/gsd-aidlc-overlay' README.md docs/onboarding.md (expect none as working command)"
        status: pass
    human_judgment: false
  - id: D3
    description: package.json name left unchanged
    requirement: ORG-02
    verification:
      - kind: other
        ref: "node -e package.json name === @opengsd/gsd-aidlc-overlay"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-09
status: complete
---

# Phase 260709-ucq: Assess Private Org Install Summary

**Private-org install model assessed PARTIAL; install docs fixed to private git/local path with no public npm claim**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-09T14:55:19Z
- **Completed:** 2026-07-09T14:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Wrote `260709-ucq-ASSESSMENT.md` with ORG-01 SATISFIED, ORG-02 PARTIAL, ORG-03 PARTIAL, ORG-04 SATISFIED
- Removed false public `npm install @opengsd/gsd-aidlc-overlay` from README and onboarding
- Documented private git clone, local path, and `file:` / `git+ssh` consumer install after gsd-core
- Left `package.json` name `@opengsd/gsd-aidlc-overlay` unchanged; noted scope unowned on public npm
- Preserved Consent Flow (CB-3) and First-Run Smoke Check sections

## Task Commits

Each task was committed atomically:

1. **Task 1: Write private-org install assessment verdict** - `5597f73` (docs)
2. **Task 2: Fix install docs to private git/local path** - `102e6d0` (docs)

_Note: docs SUMMARY/STATE commit deferred to orchestrator per quick-task constraints._

## Files Created/Modified

- `.planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md` - ORG-01..04 verdict matrix
- `README.md` - Installation section private/self-hosted
- `docs/onboarding.md` - Installation section private/self-hosted; consent/smoke intact

## Decisions Made

- Overall PARTIAL: capability + rule authoring already fit private org; only install docs misclaimed public npm
- Do not rename package or invent publish pipeline
- Use placeholder `<org-host>/<team>` for private git URLs rather than inventing a public remote

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Install docs match private/self-hosted org model
- Optional follow-up: org-specific clone URL examples when a real host is chosen
- No package rename or publish work needed for private install

## Self-Check: PASSED

- FOUND: `.planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md`
- FOUND: `5597f73` Task 1 commit
- FOUND: `102e6d0` Task 2 commit
- FOUND: package.json name `@opengsd/gsd-aidlc-overlay` unchanged
- FOUND: zero bare public-registry install commands in README/onboarding

---
*Phase: 260709-ucq-assess-private-org-install*
*Completed: 2026-07-09*
