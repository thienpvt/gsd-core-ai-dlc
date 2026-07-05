---
phase: 02-selection-engine
plan: 03
subsystem: selection-engine
tags: [recall-gate, token-budget, fast-check, eval-harness, cli, precision, tdd, picomatch, node-test]

requires:
  - phase: 01-rule-pack-format-index
    provides: buildIndex, RuleIndex/RuleIndexRecord/Severity/Phase types, validate.ts Ajv 2020 harness, no-body.property.test fast-check pattern
  - phase: 02-selection-engine
    plan: 01
    provides: controlled eval-rules corpus (10 winners + 1 superseded loser), 12 labeled ground-truth cases with verified expectedRuleIds
  - phase: 02-selection-engine
    plan: 02
    provides: pure select(index, signal, config) core, TaskSignal/SelectionConfig/SelectionResult types (budget fields pre-declared), validateSignal boundary
provides:
  - "estimateTokens(text) = ceil(length/4) + PER_RULE_OVERHEAD constant (deterministic zero-dep token estimator, SEL-05)"
  - "Budget computation wired into pure select(): sums selected summaries, flags budgetExceeded + budget{used,limit,offenders} on overflow, NEVER truncates"
  - "eval-harness.ts pure measurement (scoreCase/runCases/aggregate) — micro recall/precision + ground-truth-severity-partitioned recall"
  - "recall.test.ts build-gating Core-Value test: criticalRecall===1.0 && highRecall>=0.9 fails the build; precision reported never gated"
  - "select.property.test.ts — 4 fast-check invariants over arbitrary buildIndex corpora (selected⊆triggered, stable ordering, total accounting, exclude-wins)"
  - "governance select CLI command wired into dispatch: --input/stdin signal, validateSignal, budget resolution (flag>config>2000), JSON/text output, non-zero exit on overflow"
affects: [phase-3-inject, phase-5-audit, capability-wiring, selection-engine]

tech-stack:
  added: []
  patterns:
    - "Token budget as a fail-loud guard-rail: select() flags budgetExceeded + offenders on overflow but NEVER slices/drops a selected rule (Pitfall 6); the CLI owns the process.exit(1), keeping the core pure + testable"
    - "Recall-gated, precision-reported: the build-gating test asserts criticalRecall===1.0 && highRecall>=0.9 but only PRINTS precision — gating precision would pressure the engine toward under-injection (02-CONTEXT rejects it)"
    - "Severity partition on the EXPECTED rule's ground-truth index severity (not the selection), keyed per (case,id) so the same id expected in two cases counts as two independent occurrences a miss in either is caught"
    - "fast-check corpora via real buildIndex temp .md files (import * as fc, fc.stringMatching not hexaString, numRuns 30); generated YAML keyword tokens are quoted so all-digit/boolean tokens stay strings"
    - "CLI budget resolution order --budget flag > config.json governance.token_budget (read defensively, optional) > default 2000; emit full result THEN exit non-zero so observability (SEL-04) survives the loud signal (SEL-05)"

key-files:
  created:
    - src/select/tokens.ts
    - src/select/tokens.test.ts
    - src/select/eval-harness.ts
    - src/select/recall.test.ts
    - src/select/select.property.test.ts
    - src/cli/commands/select.ts
    - src/cli/select.smoke.test.ts
  modified:
    - src/select/select.ts
    - src/cli/index.ts

key-decisions:
  - "PER_RULE_OVERHEAD = 6, single-sourced in tokens.ts and documented as refinable by Phase 3 once the actual injection framing is known (02-CONTEXT Claude's-discretion)"
  - "select() defaults the budget limit to 2000 when config.budget is undefined so the pure core is self-contained (the property tests pass no budget); the CLI still resolves the real order flag>config>2000"
  - "Recall subset scoring keys each expected occurrence as `${caseName}::${id}` so a rule expected in multiple cases is measured per-case (a miss in any one case lowers that severity's recall) rather than collapsed by bare id"
  - "empty-expected recall is vacuously 1 and empty denominators (no expected / no selected) score 1, so silent-by-design cases never drag the aggregate (02-RESEARCH ties/empty scoring)"
  - "governance select reads the --index path as a prebuilt JSON artifact (from build-index); the CLI does not compile a rule store on the fly — matches the SEL-02/audit integration contract"

patterns-established:
  - "Core-Value build gate: a single node:test assertion (criticalRecall===1.0) turns under-injection of a critical rule into a red build — the concrete enforcement of 'enough governance to be safe' (T-2-UNDERINJECT-GATE mitigation)"
  - "Never-truncate budget: overflow is a loud flag + non-zero CLI exit, never a silent rule drop — proven by a test asserting selected.length is identical over-budget vs in-budget (T-2-BUDGET-TRUNCATE mitigation)"
  - "Property invariants over arbitrary corpora: the matching core is proven on generated stores, not just the curated 12 cases — selected⊆triggered independently re-derived, total accounting, stable ordering, exclude-wins"

requirements-completed: [SEL-04, SEL-05]

coverage:
  - id: D1
    description: "estimateTokens(text) = Math.ceil(text.length/4) deterministic zero-dep estimator + single-sourced PER_RULE_OVERHEAD constant (SEL-05 token estimator)"
    requirement: "SEL-05"
    verification:
      - kind: unit
        ref: "src/select/tokens.test.ts#estimateTokens is ceil(length / 4) at the empty / exact / remainder boundaries"
        status: pass
      - kind: unit
        ref: "src/select/tokens.test.ts#PER_RULE_OVERHEAD is a single-sourced positive integer constant"
        status: pass
    human_judgment: false
  - id: D2
    description: "select() computes the budget over selected summaries, flags budgetExceeded + budget{used,limit,offenders} on overflow, and NEVER truncates a selected rule (Pitfall 6 — dropping a rule could drop a critical one)"
    requirement: "SEL-05"
    verification:
      - kind: unit
        ref: "src/select/tokens.test.ts#budget overflow: a tiny budget trips budgetExceeded with offenders and never truncates (SEL-05, Pitfall 6)"
        status: pass
      - kind: unit
        ref: "src/select/tokens.test.ts#no false trip: a generous budget leaves budgetExceeded false with an empty offenders list"
        status: pass
    human_judgment: false
  - id: D3
    description: "The build-gating Core-Value recall test: micro recall/precision + severity-partitioned recall over the 02-01 labeled set, asserting criticalRecall===1.0 and highRecall>=0.9 (fails the build otherwise) while precision is reported never gated (SEL-01 acceptance evidence, the milestone's most important test)"
    requirement: "SEL-04"
    verification:
      - kind: unit
        ref: "src/select/recall.test.ts#CORE-VALUE GATE: criticalRecall === 1.0 and highRecall >= 0.9 over the labeled eval set (SEL-01)"
        status: pass
      - kind: integration
        ref: "node --test dist-test/select/recall.test.js prints [recall-gate] microPrecision=1.000 microRecall=1.000 recall{critical=1.000, high=1.000, medium=1.000, low=1.000}"
        status: pass
    human_judgment: false
  - id: D4
    description: "fast-check invariants over arbitrary buildIndex-generated corpora: selected⊆triggered (independently re-derived), stable byte-identical ordering, total accounting (selected+skipped===winners+Σsuperseded), and exclude-wins (positive+exclude match => skipped out-of-scope-by-trigger)"
    requirement: "SEL-04"
    verification:
      - kind: unit
        ref: "src/select/select.property.test.ts#invariant 1 — selected ⊆ triggered: every selected rule genuinely passes its gates and selected/skipped are disjoint"
        status: pass
      - kind: unit
        ref: "src/select/select.property.test.ts#invariant 2 — stable ordering: repeated select() is byte-identical and both arrays are ascending by id"
        status: pass
      - kind: unit
        ref: "src/select/select.property.test.ts#invariant 3 — total accounting: selected + skipped === winners + Σ superseded (nothing vanishes)"
        status: pass
      - kind: unit
        ref: "src/select/select.property.test.ts#invariant 4 — exclude-wins: a rule matching a positive axis AND an exclude axis is skipped out-of-scope-by-trigger"
        status: pass
    human_judgment: false
  - id: D5
    description: "The governance select CLI command: reads a TaskSignal from --input/stdin, validateSignal loud, resolves budget (flag>config>2000), emits the full observable SelectionResult as JSON (or --format text), exits non-zero on budget overflow — wired into dispatch (SEL-04 surfaced, SEL-05 loud signal)"
    requirement: "SEL-04"
    verification:
      - kind: e2e
        ref: "src/cli/select.smoke.test.ts#Case A (in budget): governance select exits 0 with a valid JSON SelectionResult and >=1 selected rule"
        status: pass
      - kind: e2e
        ref: "src/cli/select.smoke.test.ts#Case B (--budget 1 overflow): governance select exits 1 with a non-empty stderr and budgetExceeded true (SEL-05)"
        status: pass
      - kind: integration
        ref: "printf '{...}' | node dist/cli/index.js select --index ./.tmp-eval-index.json --phase construction (3 selected incl. critical secrets-management, budgetExceeded false, exit 0)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-05
status: complete
---

# Phase 2 Plan 03: Recall Gate + Token Budget + governance select CLI Summary

**The two halves of the Core Value made concrete: a build-gating recall test that fails the build if a critical rule is ever under-injected (criticalRecall===1.0, highRecall>=0.9, precision reported-not-gated), a never-truncating char/4 token budget with a loud overflow signal (SEL-05), four fast-check invariants proving the matching core on arbitrary corpora, and the `governance select` CLI wired end-to-end (SEL-04).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-05T16:14:55Z
- **Completed:** 2026-07-05T16:40:00Z
- **Tasks:** 3 (RED -> GREEN -> CLI)
- **Files touched:** 9 (7 created + select.ts / cli/index.ts modified)

## Accomplishments

- Built the milestone's single most important test: `recall.test.ts` runs every 02-01 labeled case through the pure `select()` over the controlled eval corpus, computes micro recall/precision + severity-partitioned recall via a pure `eval-harness.ts`, and ASSERTS `criticalRecall === 1.0` and `highRecall >= 0.9` — a missed critical rule now fails the build. Precision is REPORTED via a console line but never asserted, so the engine is never pressured toward under-injection (02-CONTEXT rejects gating precision).
- Implemented the token budget (SEL-05): `estimateTokens = Math.ceil(text.length / 4)` (deterministic, zero-dep) + a single-sourced `PER_RULE_OVERHEAD = 6`, summed over the selected rules' summaries inside the pure `select()`. On overflow it sets `budgetExceeded` + `budget{used,limit,offenders}` but NEVER slices or drops a selected rule (Pitfall 6 — dropping a rule could drop a critical one). A test proves `selected.length` is identical over-budget vs in-budget.
- Wrote four fast-check invariants over arbitrary `buildIndex`-generated corpora (following Phase 1's `no-body.property.test.ts` exactly — `import * as fc`, `fc.stringMatching`, temp .md files, `numRuns: 30`): selected⊆triggered (with the gates independently re-derived, not reusing select()'s code), stable byte-identical ordering, total accounting, and a guaranteed exclude-wins target rule per corpus.
- Wired the `governance select` CLI command into dispatch: reads a `TaskSignal` from `--input <file>` or stdin, `validateSignal`s it loud before `select()`, resolves the budget in order (`--budget` flag > `config.json` `governance.token_budget` > default 2000), emits the full observable `SelectionResult` as canonical JSON (or a `--format text` summary), and calls `process.exit(1)` AFTER emitting on overflow — so SEL-04 observability survives the SEL-05 loud signal.
- Executed strictly test-first per active MVP+TDD: a RED `test(02-03)` commit (token/budget tests failing against the throwing stub + un-budgeted core) precedes the GREEN `feat(02-03)` implementation; Task 3's smoke test was RED (dispatch exit 2) before the command was wired. Full suite ends 79/79 green.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Token estimator stub + budget + fast-check invariants** - `befdae5` (test)
2. **Task 2 (GREEN): estimateTokens + never-truncate budget in select() + eval-harness + build-gating recall test** - `0dfe78c` (feat)
3. **Task 3: governance select CLI command + dispatch wiring + smoke test** - `36a9554` (feat)

## Files Created/Modified

- `src/select/tokens.ts` - CREATED: `estimateTokens(text) = Math.ceil(text.length/4)` + `PER_RULE_OVERHEAD = 6` (single-sourced, refinable by Phase 3).
- `src/select/tokens.test.ts` - CREATED: char/4 boundaries; budget-trip (offenders non-empty, used>limit, selected.length unchanged); no-false-trip.
- `src/select/select.ts` - MODIFIED (additive): after sorting selected[], sums `estimateTokens(summary)+PER_RULE_OVERHEAD`, sets `budgetExceeded` + `budget{used,limit,offenders}` field-by-field, never truncates; defaults limit to 2000 when `config.budget` absent. Purity preserved (no clock/random/I/O).
- `src/select/eval-harness.ts` - CREATED: pure `scoreCase`/`runCases`/`aggregate` — micro recall/precision + per-severity recall on ground-truth severity, empty subsets vacuously 1, precision never gated.
- `src/select/recall.test.ts` - CREATED: the build-gating Core-Value test asserting criticalRecall===1.0 && highRecall>=0.9, printing precision.
- `src/select/select.property.test.ts` - CREATED: 4 fast-check invariants via real buildIndex temp corpora; generated YAML keyword tokens quoted so all-digit/boolean tokens stay strings.
- `src/cli/commands/select.ts` - CREATED: the `governance select` command (parseArgs, allowPositionals:false, --phase required+enum-checked, stdin/--input signal, validateSignal, budget resolution, JSON/text output, non-zero exit on overflow).
- `src/cli/index.ts` - MODIFIED: added `case "select"` lazy-import to dispatch, updated usage string.
- `src/cli/select.smoke.test.ts` - CREATED: spawns the built CLI — Case A in-budget exit 0 + valid JSON + >=1 selected; Case B --budget 1 exit 1 + non-empty stderr + budgetExceeded true.

## Decisions Made

- **`PER_RULE_OVERHEAD = 6`**, single-sourced in `tokens.ts` and documented as refinable by Phase 3 once the actual injection framing is known (02-CONTEXT Claude's-discretion).
- **`select()` defaults the budget limit to 2000** when `config.budget` is undefined, so the pure core is self-contained (the property tests pass no budget); the CLI still resolves the real order flag > config > 2000.
- **Recall subset scoring keys each expected occurrence as `${caseName}::${id}`** so a rule expected in multiple cases is measured per-case (a miss in any one case lowers that severity's recall), rather than collapsed by a bare id set.
- **Empty-expected recall is vacuously 1**, and empty denominators (no expected / no selected) score 1, so silent-by-design cases never drag the aggregate (02-RESEARCH ties/empty scoring).
- **`governance select` reads `--index` as a prebuilt JSON artifact** (from `build-index`) rather than compiling a rule store on the fly — matches the SEL-02/audit integration contract that consumes the index.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Quote generated YAML keyword tokens in the property test**
- **Found during:** Task 1 (fast-check property test authoring) and again in the full-suite run during Task 2
- **Issue:** `fc.stringMatching(/^[a-z0-9]{4,12}$/)` (the Phase-1-mandated generator, Pitfall 4) can produce all-digit tokens (e.g. `123456`) or YAML boolean words (`true`/`false`). Emitted as bare YAML scalars into generated rule frontmatter, these parse as numbers/booleans and fail the frontmatter string-array schema inside `buildIndex`, crashing the property with a schema error instead of exercising the invariant. Phase 1's `no-body.property.test.ts` never hit this because its tokens only appeared in the Markdown body, never in frontmatter.
- **Fix:** Quote every generated keyword token (`- "${k}"`) in both the positive-rule builder and the guaranteed exclude-wins builder so the value is always a YAML string regardless of content.
- **Files modified:** src/select/select.property.test.ts
- **Verification:** All 4 invariants pass across 30 generated corpora; full suite 79/79 green.
- **Committed in:** `befdae5` (positive builder, Task 1) and `0dfe78c` (exclude builder, surfaced by a different seed in the Task 2 full-suite run)

---

**Total deviations:** 1 auto-fixed (1 blocking, split across two commits as different fast-check seeds surfaced the same class of issue)
**Impact on plan:** The fix keeps the mandated generator (Pitfall 4 / Pitfall 5 honored — `fc.stringMatching`, `import * as fc`, no `fc.hexaString`) while making it interop with the real frontmatter schema. No scope creep; the invariants and their assertions are exactly as planned.

## TDD Gate Compliance

- **RED gate:** `befdae5` `test(02-03): ...` — token estimator stub throws and the budget-trip case fails against the un-budgeted 02-02 core (confirmed failing via `node --test` before any implementation). The 4 property invariants pass here because they depend on the 02-02 core (not the budget) — they are the definitive determinism/accounting proofs, correctly green pre-implementation.
- **GREEN gate:** `0dfe78c` `feat(02-03): ...` — implemented `estimateTokens` + the budget computation + the eval harness + the recall gate, turning all token/budget/recall assertions green.
- **Task 3 RED->GREEN:** the smoke test was confirmed RED (dispatch default exit 2) before the `case "select"` wiring, then GREEN after.
- MVP+TDD runtime gate satisfied: the `test(02-03)` RED commit precedes both `feat(02-03)` commits; no `feat` landed before the failing test.

## Issues Encountered

The YAML token-coercion issue (documented as the deviation above) surfaced twice — once at Task 1 authoring in the positive-rule generator, once during the Task 2 full-suite run when a different fast-check seed produced an all-digit/boolean token in the exclude-rule generator. Both were the same root cause (bare YAML scalars) and fixed the same way (quoting). No other issues; `npm run build` (production) and `npm test` (79/79) both pass.

## User Setup Required

None - no external service configuration required. `estimateTokens` and the eval harness are pure zero-dep functions; the CLI uses only Node built-ins + the already-installed Ajv (via validateSignal) and picomatch (via select).

## Next Phase Readiness

- **The Core Value is proven and guarded.** The selection engine is complete: deterministic matching with per-rule reasons (SEL-01), full selected/skipped observability (SEL-04), and a per-request token budget with a loud, non-truncating overflow signal (SEL-05). The build-gating recall test is the standing enforcement of "enough governance to be safe"; the budget signal enforces "little enough to avoid context bloat".
- **Phase 3 (inject, SEL-02/SEL-03)** consumes the selected records' `summary` fields — the exact text the token budget counts. `PER_RULE_OVERHEAD` is the documented refinement point once Phase 3's actual injection framing is known.
- **Phase 5 (audit, AUDIT-01/02)** consumes the full `SelectionResult` (selected + skipped with reasons) that `governance select` now emits as canonical JSON.
- **Phase 4 (capability wiring)** invokes `governance select` at the discuss/execute gates; the budget resolution reads `config.json` `governance.token_budget` defensively (optional key) so a project can tune the budget without a code change.
- No blockers. The `governance.token_budget` config key is not yet present in `.planning/config.json` (read defensively, falls back to 2000); a project sets it when it wants a non-default budget.

---
*Phase: 02-selection-engine*
*Completed: 2026-07-05*
