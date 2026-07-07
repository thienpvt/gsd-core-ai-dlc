---
phase: 02-selection-engine
plan: 01
subsystem: testing
tags: [eval-set, recall, fixtures, buildIndex, ground-truth, node-test]

requires:
  - phase: 01-rule-pack-format-index
    provides: buildIndex, resolvePrecedence (D-11 superseded), Frontmatter/Triggers/RuleIndex types, frontmatter.schema.json
provides:
  - Controlled eval-rules corpus (11 fixture rules → 10 winners) isolated from live aidlc-rules/
  - Labeled (signal, phase, scopeConfig) → expectedRuleIds case set (12 cases) covering the full selection matrix
  - Ground-truth integrity test proving every expected id resolves to a real buildIndex winner before select() exists
affects: [02-02, 02-03, selection-engine, recall-gate, audit]

tech-stack:
  added: []
  patterns:
    - "Eval corpus as dedicated fixture store under test/fixtures/eval/ (never src/, never live aidlc-rules/) so ground truth cannot drift"
    - "Ground-truth integrity test validates LABELS only (imports buildIndex, not select()) — decouples eval-set correctness from engine existence"
    - "Precedence collision authored via shared id across tiers to produce a real superseded loser instead of a hand-written rule-index.json"

key-files:
  created:
    - test/fixtures/eval/eval-rules/enterprise/secrets-management.md
    - test/fixtures/eval/eval-rules/enterprise/input-validation.md
    - test/fixtures/eval/eval-rules/enterprise/test-coverage.md
    - test/fixtures/eval/eval-rules/enterprise/iac-review.md
    - test/fixtures/eval/eval-rules/enterprise/api-contract.md
    - test/fixtures/eval/eval-rules/enterprise/logging-standard.md
    - test/fixtures/eval/eval-rules/enterprise/ops-runbook.md
    - test/fixtures/eval/eval-rules/enterprise/data-retention.md
    - test/fixtures/eval/eval-rules/domain/security/threat-model.md
    - test/fixtures/eval/eval-rules/domain/payments/pci-scope.md
    - test/fixtures/eval/eval-rules/project/data-retention.md
    - test/fixtures/eval/cases/eval-cases.json
    - src/select/eval-fixtures.test.ts
  modified: []

key-decisions:
  - "Chose taskType refactor (not feature) for the keywords-only isolation case so api-contract's taskType [feature] axis does not fire and pollute the keyword-axis proof"
  - "Every construction-phase case includes secrets-management in expectedRuleIds because triggers {} makes it always-in-phase within [construction, inception] (D-03) — encoding the never-miss critical into the ground truth"
  - "Integrity test asserts an exact winner count of 10 (11 files minus the data-retention collision) as a structural guard that the precedence collapse actually happened"

patterns-established:
  - "Eval corpus isolation: labeled acceptance evidence lives in a dedicated fixture store, decoupled from production rules (T-2-EVALDRIFT mitigation)"
  - "Ground-truth-before-engine: the integrity suite proves label consistency using only Phase 1 primitives, so the Wave-3 recall gate measures against verified truth (T-2-EVALINTEGRITY mitigation)"

requirements-completed: [SEL-01]

coverage:
  - id: D1
    description: "Controlled eval-rules corpus (11 fixture rules across enterprise/domain/project) that builds through Phase 1 buildIndex to exactly 10 winners, covering every severity, every trigger axis, multi-axis OR, exclude carve-out, empty-triggers always-in-phase critical (D-03), out-of-phase, domain gating, and a project>enterprise precedence collision yielding one superseded loser (D-11)"
    requirement: "SEL-01"
    verification:
      - kind: unit
        ref: "src/select/eval-fixtures.test.ts#the eval corpus builds through Phase 1 buildIndex into exactly 10 winner records"
        status: pass
      - kind: integration
        ref: "node dist/cli/index.js build-index --root test/fixtures/eval/eval-rules --out ./.tmp-eval-index.json (10 rules, data-retention project winner + 1 superseded enterprise loser)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Labeled case set (test/fixtures/eval/cases/eval-cases.json) of 12 behavior-isolating (name, signal{taskType,keywords,paths}, phase, scopeConfig{domains}, expectedRuleIds) cases spanning the coverage matrix, including an empty-expected silent case and two critical rules under test"
    requirement: "SEL-01"
    verification:
      - kind: unit
        ref: "src/select/eval-fixtures.test.ts#the case set parses as a JSON array of ~12 fully-formed labeled cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ground-truth integrity suite proving the labels are internally consistent before select() exists: every expectedRuleId resolves to a real index winner id, the empty-expected case is present, and at least one critical rule is under test (SEL-01 acceptance-evidence foundation, T-2-EVALINTEGRITY guard)"
    requirement: "SEL-01"
    verification:
      - kind: unit
        ref: "src/select/eval-fixtures.test.ts#every expectedRuleId across all cases resolves to a real index winner id (no typo can silently pass the recall gate)"
        status: pass
      - kind: unit
        ref: "src/select/eval-fixtures.test.ts#an empty-expected silent case is present (proves the engine must be allowed to stay silent — precision)"
        status: pass
      - kind: unit
        ref: "src/select/eval-fixtures.test.ts#at least one critical rule is under test in some expected set (the Wave-3 critical-recall gate has a target)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-05
status: complete
---

# Phase 2 Plan 01: Labeled Eval Set + Ground-Truth Integrity Summary

**A controlled 11-file eval-rules corpus (→10 winners) plus a 12-case labeled ground-truth set, with an integrity test that proves every expected rule id resolves to a real buildIndex winner before the selection engine exists.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-05T15:38:17Z
- **Completed:** 2026-07-05T15:42:37Z
- **Tasks:** 2
- **Files modified:** 13 (11 fixture rules + eval-cases.json + eval-fixtures.test.ts)

## Accomplishments
- Authored a dedicated, isolated eval-rules corpus covering the full selection matrix: all four severities, each trigger axis (taskType/keywords/paths), a multi-axis OR rule, an exclude carve-out, an empty-triggers always-in-phase critical (D-03), an out-of-phase rule, two domain rules, and a project>enterprise `data-retention` collision that produces a real superseded loser via Phase 1's `resolvePrecedence` (D-11).
- Encoded 12 behavior-isolating labeled cases into `eval-cases.json`, each pinning one selection behavior, including an empty-expected silent case (precision) and two critical rules under test (`secrets-management`, `pci-scope`).
- Wrote `eval-fixtures.test.ts`, which reuses Phase 1 `buildIndex` to prove the ground truth is internally consistent — every `expectedRuleId` is a real winner id, the winner count is exactly 10, the empty-expected case exists, and a critical rule is under test — so a typo cannot silently defeat the Wave-3 recall gate.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the controlled eval-rules corpus** - `d58a036` (test)
2. **Task 2: Author the labeled case set + ground-truth integrity test** - `60dfa0a` (test)

_Note: this plan is `type: execute` with data + an integrity test (no behavior-adding source), so the MVP+TDD gate did not fire; both commits are `test(...)` because the artifacts are fixtures and a test._

## Files Created/Modified
- `test/fixtures/eval/eval-rules/enterprise/secrets-management.md` - critical, `triggers: {}` always-in-phase never-miss rule (D-03), phases [construction, inception]
- `test/fixtures/eval/eval-rules/enterprise/input-validation.md` - high, keywords-only axis
- `test/fixtures/eval/eval-rules/enterprise/test-coverage.md` - medium, taskType-only axis
- `test/fixtures/eval/eval-rules/enterprise/iac-review.md` - low, paths-only axis (picomatch globs)
- `test/fixtures/eval/eval-rules/enterprise/api-contract.md` - high, multi-axis OR (taskType + keywords + paths)
- `test/fixtures/eval/eval-rules/enterprise/logging-standard.md` - medium, exclude carve-out (exclude-wins D-02)
- `test/fixtures/eval/eval-rules/enterprise/ops-runbook.md` - high, operations phase (the out-of-phase rule)
- `test/fixtures/eval/eval-rules/enterprise/data-retention.md` - medium, the precedence loser (superseded)
- `test/fixtures/eval/eval-rules/domain/security/threat-model.md` - high, `security` domain gating rule
- `test/fixtures/eval/eval-rules/domain/payments/pci-scope.md` - critical, `payments` domain rule (second critical)
- `test/fixtures/eval/eval-rules/project/data-retention.md` - medium, project WINNER of the data-retention collision (D-11)
- `test/fixtures/eval/cases/eval-cases.json` - 12 labeled ground-truth cases
- `src/select/eval-fixtures.test.ts` - ground-truth integrity suite (5 tests, node:test)

## Decisions Made
- Used `taskType: refactor` for the keywords-only isolation case (case 1) so that `api-contract`'s `taskType: [feature]` axis does not fire under D-04 enum-equality + D-02 OR-combine and pollute the keyword-axis proof. `feature` is reserved for the cases where `api-contract` is intentionally expected (4, 7, 12).
- Included `secrets-management` in `expectedRuleIds` for every construction-phase case, since its empty `triggers` make it always-in-phase within `[construction, inception]` (D-03) — the never-miss critical is baked into the ground truth rather than treated as an edge case.
- Asserted an exact winner count of 10 in the integrity test as a structural guard that the `data-retention` collision actually collapsed (11 files − 1 collision = 10).

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. `.tmp-eval-index.json` written during Task 1 verification was removed in the same command; the working tree carries no stray artifacts.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The stable, isolated acceptance evidence for SEL-01 is in place: 02-02 can implement `select()` and 02-03 can build the recall/precision gate directly against this verified ground truth.
- The corpus supplies a genuine `superseded` skip case (project>enterprise `data-retention`) for Wave 2/3 without any hand-written `rule-index.json`.
- No blockers. No Phase 1 source or live `aidlc-rules/` file was touched — the eval set is fully isolated.

## Self-Check: PASSED

All 13 created files verified present on disk; both task commits (`d58a036`, `60dfa0a`) verified in git history.

---
*Phase: 02-selection-engine*
*Completed: 2026-07-05*
