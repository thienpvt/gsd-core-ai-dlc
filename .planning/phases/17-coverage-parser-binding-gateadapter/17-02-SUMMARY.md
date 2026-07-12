---
phase: 17-coverage-parser-binding-gateadapter
plan: 02
subsystem: rules
tags: [java-spring, binding, coverage, selection, inventory, BODY_CANARY]

requires:
  - phase: 17-coverage-parser-binding-gateadapter
    provides: coverage-report GateAdapter + JaCoCo/LCOV parsers (plan 01)
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: classification binding requires enforcement (D-15)
  - phase: 13-domain-pack-service-classification-integrations
    provides: java-spring domain pack layout + selection patterns
provides:
  - binding rule id java-spring-unit-line-coverage (JS-COV-01)
  - paths-only positive triggers with docs/test/infra + test/generated/build/target excludes
  - real-corpus inventory lock 10 → 11
  - BODY_CANARY quarantine suite for coverage rule
affects:
  - 18 verify/ship wire of coverage-report when binding rule selected
  - future JAVA-COV-04 branch coverage

tech-stack:
  added: []
  patterns:
    - "Paths-only positives for Java production work (engine OR-combines positive axes)"
    - "Sibling suite pattern for binding rule (does not extend pack inventories)"
    - "Inventory lock dual-update: precedence expectedIds + starter INVENTORY_COUNT"

key-files:
  created:
    - aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md
    - aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md
    - src/select/java-spring-coverage.test.ts
  modified:
    - src/index/precedence.test.ts
    - src/select/starter-examples.test.ts

key-decisions:
  - "Paths-only positives — no positive taskType/keywords — is the only engine-compatible realization of Java-production-work intent under OR-combine axes"
  - "exclude.taskType docs/test/infra and exclude paths test/generated/build/target prevent circular coverage obligations"
  - "classification binding + enforcement coverage-report pairs with plan 01 finding id token"

patterns-established:
  - "Binding rule content-only plan: suite RED before authoring markdown; inventory locks move with content"
  - "Non-Java feature/bugfix/refactor negatives lock against OR-combine over-select"

requirements-completed: [JAVA-COV-01]

coverage:
  - id: D1
    description: "Index contains binding java-spring-unit-line-coverage with enforcement coverage-report, severity high, construction phase, one-sentence summary ≤160"
    requirement: JAVA-COV-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-coverage.test.ts#JAVA-COV-01: index contains binding coverage rule with enforcement coverage-report"
        status: pass
    human_judgment: false
  - id: D2
    description: "Paths-only positives select Java production paths; no positive taskType/keywords; docs/test/infra and test/generated/build/target excluded; non-Java feature/bugfix/refactor do not select"
    requirement: JAVA-COV-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-coverage.test.ts#positive/negative matrices"
        status: pass
    human_judgment: false
  - id: D3
    description: "BODY_CANARY java-spring-unit-line-coverage present in rule+detail; absent from index serialization and renderInjection"
    requirement: JAVA-COV-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-coverage.test.ts#JAVA-COV-01 hygiene"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-corpus inventory grows 10 → 11 in precedence.test.ts and starter-examples.test.ts"
    requirement: JAVA-COV-01
    verification:
      - kind: unit
        ref: "src/index/precedence.test.ts + src/select/starter-examples.test.ts inventory locks"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-12
status: complete
---

# Phase 17 Plan 02: Binding Coverage Rule Summary

**Binding `java-spring-unit-line-coverage` (JS-COV-01) with paths-only positives, coverage-report enforcement, BODY_CANARY quarantine, inventory 11**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-12T14:38:23Z
- **Completed:** 2026-07-12T14:45:00Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- Authored binding rule + lazy detail under `aidlc-rules/domain/java-spring/` with `classification: binding`, `enforcement: coverage-report`, severity high, construction-only.
- Paths-only positives (`**/src/main/java/**`, `**/src/main/**/*.java`) avoid OR-combine over-select; exclude docs/test/infra and test/generated/build/target.
- Sibling TDD suite locks metadata, selection matrices, non-Java negatives, and inject quarantine.
- Real-corpus inventory locks advanced 10 → 11 in both precedence and starter-examples tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — coverage rule suite + inventory locks expect 11** - `5ec7210` (test)
2. **Task 2: GREEN — author binding rule + detail; suite and inventory pass** - `62fd8f8` (feat)

**Plan metadata:** (this commit)

_Note: TDD RED → GREEN preserved as separate commits._

## Files Created/Modified

- `src/select/java-spring-coverage.test.ts` - Sibling suite for JAVA-COV-01 binding/selection/quarantine
- `src/index/precedence.test.ts` - expectedIds includes java-spring-unit-line-coverage; length 11
- `src/select/starter-examples.test.ts` - INVENTORY_COUNT = 11
- `aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md` - Binding rule frontmatter + body + canary
- `aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md` - Measurement contract detail + canary

## Decisions Made

- Paths-only positive triggers only — positive taskType/keywords would select non-Java feature/bugfix/refactor work because selection axes OR-combine.
- No production selector/loader/inject changes; content + inventory tests only.
- Zero dependency/package changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Claude Code tool isolation redirected Edit/Write to the worktree; primary-checkout writes used temporary node writers under `.claude/worktrees/agent-a45e098b2b0747f98/` (untracked, not committed).
- RED proof focused suite failed on missing rule + inventory mismatch as required (8 failing tests before GREEN).

## RED Failure Names (Task 1)

- real corpus emits non-colliding winners with no superseded key
- JAVA-COV-01: index contains binding coverage rule with enforcement coverage-report
- JAVA-COV-01: paths-only positives — no positive taskType or keywords triggers
- JAVA-COV-01 positive: src/main/java/...Foo.java under construction selects
- JAVA-COV-01 positive: src/main/Foo.java under construction selects
- JAVA-COV-01 positive: refactor taskType with Java path still selects (path-driven)
- JAVA-COV-01 hygiene: rule + detail carry BODY_CANARY; index and inject quarantine
- inventory regression: real corpus still has exactly 11 winners

## Verification

- Focused: `npm run build:test && node --test dist-test/select/java-spring-coverage.test.js dist-test/index/precedence.test.js dist-test/select/starter-examples.test.js` → pass 26/26 after GREEN
- Full: `npm test` → pass 580, fail 0 (583 tests, 3 skipped)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Binding rule selectable for Java production paths under construction.
- Plan 01 coverage-report adapter finding id token aligns with this rule id for Phase 18 verify/ship wire.
- No changes to verify-gate-hook or adapters registries in this plan.

## Self-Check: PASSED

- FOUND: aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md
- FOUND: aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md
- FOUND: src/select/java-spring-coverage.test.ts
- FOUND: commit 5ec7210
- FOUND: commit 62fd8f8
- FOUND: inventory 11 locks in precedence + starter-examples

---
*Phase: 17-coverage-parser-binding-gateadapter*
*Completed: 2026-07-12*
