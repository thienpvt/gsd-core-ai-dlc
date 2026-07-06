---
phase: 03-summary-injection-lazy-detail-loading
plan: 01
subsystem: injection
tags: [selection-result, governance-fragment, fast-check, cli, severity-ordinal, anti-bloat]

requires:
  - phase: 02-selection-engine
    provides: SelectionResult (selected[]/skipped[]/budgetExceeded/budget), select() pure core
  - phase: 01-rule-pack-format-index
    provides: buildIndex body-quarantine (PACK-04), no-body.property.test.ts fast-check pattern
provides:
  - "renderInjection(result): pure SEL-02 core rendering the <governance> summary fragment (summaries + rule-detail hints only, no file-read path)"
  - "SEVERITY_ORDINAL (critical=0..low=3) — the injector's own severity axis, single-sourced"
  - "governance inject CLI (stdin/--input, loud shape-check, budget-continuity exit) wired into dispatch"
  - "no-body-canary fast-check property (success criterion 3) proving no rule body reaches the fragment"
affects: [phase-04-gate-wiring, GATE-01, GATE-02, rule-detail-SEL-03]

tech-stack:
  added: []
  patterns:
    - "Structural no-file-read guarantee: injector imports only ../types.js (no node:fs, no gray-matter) so summary-only injection is true by construction, proven belt-and-suspenders by a fast-check no-body property"
    - "Pure-core + thin-CLI split mirrored from select.ts: renderInjection stays pure/deterministic; the CLI maps budgetExceeded -> process.exitCode=1 (never process.exit) after emitting the fragment"

key-files:
  created:
    - src/inject/inject.ts
    - src/inject/inject.test.ts
    - src/inject/inject.property.test.ts
    - src/cli/commands/inject.ts
    - src/cli/inject.smoke.test.ts
  modified:
    - src/cli/index.ts

key-decisions:
  - "Fragment micro-format: <governance> tag + one-line header + one bullet per rule as `- [severity] id: summary (run \\`governance rule-detail <id>\\` for the full rule)`, trailing newline — greppable and deterministic"
  - "Empty selection renders the <governance> frame around a single 'No governance rules apply to this task.' line (never an empty string) so Phase 4 inject/strip stays uniform"
  - "SEVERITY_ORDINAL declared in inject.ts (critical=0,high=1,medium=2,low=3) — its own axis, NOT the scope ORDINAL from scope.ts (Pitfall 6)"
  - "inject CLI uses a lightweight structural shape guard (selected[]+skipped[] arrays) rather than a full Ajv SelectionResult schema — the guard's job is only to reject malformed input loudly (Pitfall 7); full schema deferred"

patterns-established:
  - "No-file-read structural guarantee proven both structurally (source-text import assertion) and by fast-check property — mirrors Phase 1's dual PACK-04 proof"
  - "Budget-continuity at the CLI boundary: emit the observable fragment FIRST, then warn to stderr + set process.exitCode=1 on budgetExceeded (SEL-05, CR-02)"

requirements-completed: [SEL-02]

coverage:
  - id: D1
    description: "renderInjection renders a deterministic <governance> block — per-rule [severity]/id/summary/rule-detail hint, severity-desc then id-asc ordering via SEVERITY_ORDINAL, skip reasons excluded, empty-selection strippable block, byte-identical repeated runs, and a structural no-file-read-path assertion"
    requirement: SEL-02
    verification:
      - kind: unit
        ref: "src/inject/inject.test.ts (7 tests: shape, ordering, skip-exclusion, empty, determinism, structural no-fs/no-gray-matter import)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No rule body canary ever appears in the rendered fragment across arbitrary generated corpora (buildIndex -> select -> renderInjection), ROADMAP success criterion 3"
    requirement: SEL-02
    verification:
      - kind: unit
        ref: "src/inject/inject.property.test.ts (fast-check no-body-canary property, numRuns:30)"
        status: pass
    human_judgment: false
  - id: D3
    description: "governance inject reads a SelectionResult (stdin/--input), shape-checks it loud, writes the <governance> fragment to stdout, and on budgetExceeded warns to stderr + exits 1 while still emitting the fragment (SEL-05 continuity); malformed input fails non-zero"
    requirement: SEL-02
    verification:
      - kind: e2e
        ref: "src/cli/inject.smoke.test.ts (4 cases: in-budget exit 0, stdin parity, over-budget exit 1 + fragment on stdout, malformed non-zero)"
        status: pass
      - kind: e2e
        ref: "printf SelectionResult | node dist/cli/index.js inject -> <governance> fragment, exit 0"
        status: pass
    human_judgment: false

duration: 11min
completed: 2026-07-06
status: complete
---

# Phase 3 Plan 01: Summary Injector Summary

**Pure renderInjection renders a deterministic <governance> summary fragment with no file-read path, proven body-free by a fast-check no-body property, plus a governance inject CLI that honors the SEL-05 budget signal**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-06T00:31:36Z
- **Completed:** 2026-07-06T00:42:34Z
- **Tasks:** 3
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- `renderInjection(result: SelectionResult): string` — a pure, deterministic SEL-02 core that renders the selected rules' summaries into a single tagged `<governance>` block (per-rule `[severity]` + id + summary + a `governance rule-detail <id>` hint), sorted severity-descending via its own `SEVERITY_ORDINAL` then id-ascending, with skip reasons excluded. Summary-only injection is true by construction: the module imports only `../types.js` (no `node:fs`, no `gray-matter`), so there is no body-read path at all.
- The no-body-canary fast-check property (ROADMAP success criterion 3) confirms no per-rule body canary reaches the rendered fragment across 30 arbitrary generated corpora, chaining the real `buildIndex -> select -> renderInjection` stages — the belt-and-suspenders proof on top of the structural guarantee.
- `governance inject` wired into the CLI dispatch: reads a SelectionResult from `--input <file>` or stdin, shape-checks it loud (malformed input fails non-zero, never a silent empty fragment), emits the fragment to stdout, and on `budgetExceeded` writes a stderr warning naming offenders and sets `process.exitCode = 1` (never `process.exit`) while still emitting the fragment — SEL-05 continuity.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Unit + no-body property suites** - `8dc698b` (test)
2. **Task 2 (GREEN): Implement renderInjection** - `4429604` (feat)
3. **Task 3: Wire the governance inject CLI + smoke test** - `66d6413` (feat)

_TDD sequence: RED test commit (`8dc698b`) precedes the GREEN implementation commit (`4429604`), satisfying the plan-level `type: tdd` gate._

## Files Created/Modified
- `src/inject/inject.ts` - Pure `renderInjection` core + `SEVERITY_ORDINAL`; no file-read path, deterministic
- `src/inject/inject.test.ts` - Unit suite: shape, ordering, skip-exclusion, empty block, determinism, structural no-fs/no-gray-matter import
- `src/inject/inject.property.test.ts` - fast-check no-body-canary property over arbitrary corpora (numRuns:30)
- `src/cli/commands/inject.ts` - `governance inject` command: parseArgs `--input`/stdin, loud shape-check, budget-continuity exit
- `src/cli/inject.smoke.test.ts` - spawnSync smoke test: in-budget, stdin parity, over-budget, malformed
- `src/cli/index.ts` - Added `case "inject"` (lazy import) + inject in the usage string

## Decisions Made
- Fragment micro-format: `<governance>` tag, a one-line header, then one bullet per rule `- [severity] id: summary (run \`governance rule-detail <id>\` for the full rule)`, ending with a trailing newline. Greppable and deterministic (03-CONTEXT gave Claude discretion here).
- Empty selection renders the `<governance>` frame around a single `No governance rules apply to this task.` line — never an empty string — so Phase 4's inject/strip logic is uniform.
- `SEVERITY_ORDINAL` (critical=0, high=1, medium=2, low=3) is declared in `inject.ts` as the injector's own axis, deliberately NOT reusing the scope `ORDINAL` from `scope.ts` (different axis — Pitfall 6).
- The inject CLI uses a lightweight structural shape guard (require `selected[]` + `skipped[]` arrays) rather than a full Ajv `SelectionResult` schema; the guard's only job is to reject malformed input loudly (Pitfall 7). A full schema is deferred.

## Deviations from Plan

None - plan executed exactly as written.

The only in-task adjustment was tightening two test assertions to match imports rather than bare substrings: the structural no-read-path check matches an actual `from "gray-matter"` / `require("gray-matter")` statement (not the word appearing in the module docstring), consistent with how the `node:fs` checks were already written. This is inside the RED test authored in Task 1 and did not alter any behavior or deliverable — it corrected a false-positive assertion before the RED commit.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SEL-02 is complete and invokable end-to-end: `governance select ... | governance inject` renders a `<governance>` fragment for the real index.
- `renderInjection` is a pure function Phase 4 can call programmatically to inject the fragment at the discuss/execute gates (GATE-01/GATE-02).
- Remaining Phase 3 work is plan 03-02: the lazy detail loader `governance rule-detail <id>` (SEL-03 + D-06/D-07/D-08 + the IN-05 traversal guard) — the one sanctioned place a rule body surfaces.

## Self-Check: PASSED

All claimed files exist on disk:
- `src/inject/inject.ts`, `src/inject/inject.test.ts`, `src/inject/inject.property.test.ts`
- `src/cli/commands/inject.ts`, `src/cli/inject.smoke.test.ts`, `src/cli/index.ts`
- `.planning/phases/03-summary-injection-lazy-detail-loading/03-01-SUMMARY.md`

All task commits exist in git history: `8dc698b` (RED), `4429604` (GREEN), `66d6413` (CLI wiring).
