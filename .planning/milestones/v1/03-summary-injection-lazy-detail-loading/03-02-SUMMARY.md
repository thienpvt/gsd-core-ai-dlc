---
phase: 03-summary-injection-lazy-detail-loading
plan: 02
subsystem: lazy-detail-loader
tags: [detail-path, traversal-guard, in-05, d-06, d-07, d-08, sel-03, gray-matter, cli, single-source]

requires:
  - phase: 01-rule-pack-format-index
    provides: "detailPath frontmatter field (optional), buildIndex + toRecord detailPath carry, findRuleFiles details/ skip, the deferred D-06/D-07/D-08 decisions, DETAILPATH_STORE fixture"
  - phase: 03-summary-injection-lazy-detail-loading
    plan: 01
    provides: "the case \"inject\" dispatch edit in src/cli/index.ts this plan coexists with (shared-file serialization)"
provides:
  - "resolveDetailPath(sourceFile, detailPath, packRoot): the SINGLE-SOURCED D-08 resolver + IN-05 traversal guard (pure path math, no file read), imported by BOTH build.ts and rule-detail.ts so the guards cannot drift"
  - "buildIndex D-07 build-time validation: every declared detailPath must resolve in-pack (store root) AND exist on disk, else the build throws naming id + path"
  - "governance rule-detail <id> CLI: lazy single-body fetch (SEL-03), D-06 no-detail signal, unknown-id fail-loud, IN-05 fetch-time backstop — the ONE sanctioned place a rule body surfaces"
affects: [phase-04-gate-wiring, phase-05-audit, rule-detail-consumers]

tech-stack:
  added: []
  patterns:
    - "Single-sourced resolve+guard: ONE resolveDetailPath called at BOTH build time (D-07 primary, store-scoped) and fetch time (IN-05 backstop, cwd-scoped) so a traversal guard cannot drift between the two sites (Pitfall 8)"
    - "Isolated body-read surface: rule-detail.ts is the only module besides load.ts that reads a rule body (via gray-matter matter().content), and it opens exactly ONE resolved target — index/select/inject stay body-free (SEL-03)"
    - "Layered containment boundaries: build-time uses the narrow STORE root (absRoot) as the authoritative guard; fetch-time uses the coarser repo/cwd root as a documented backstop, never claiming to match the build-time boundary"

key-files:
  created:
    - src/rules/detail-path.ts
    - src/rules/detail-path.test.ts
    - src/cli/commands/rule-detail.ts
    - src/cli/rule-detail.smoke.test.ts
    - test/fixtures/detailpath-store/enterprise/details/with-detail.md
    - test/fixtures/detail-missing-store/enterprise/missing-target.md
    - test/fixtures/detail-absolute-store/enterprise/absolute-detail.md
    - test/fixtures/detail-escape-store/enterprise/escape-detail.md
  modified:
    - src/index/build.ts
    - src/index/build-guards.test.ts
    - src/cli/index.ts

key-decisions:
  - "resolveDetailPath is pure path math (reads NO file) so it is reusable at both build and fetch time; existence checks live in the callers, not the resolver (Pitfall 8 single-source)"
  - "IN-05 guard rejects an absolute detailPath outright, then computes path.relative(packRoot, resolved) and rejects `..`, `../`-prefix, `..<sep>`-prefix, or an absolute rel — the containment check runs BEFORE any readFileSync"
  - "D-07 build-time validation is the PRIMARY guard (scoped to the store root absRoot); the fetch-time guard in rule-detail is an INTENTIONAL COARSE BACKSTOP scoped to process.cwd() — documented as looser, never claimed to match the build boundary"
  - "D-06 no-detail signal: rule-detail prints the summary + a plain pipe-friendly line `(no separate detail file for <id> — the summary above is the full rule)` and exits 0 — not an error"
  - "The three negative fixtures live in SEPARATE single-rule stores (detail-missing/absolute/escape) so each breaks its own build in isolation without polluting the positive detailpath-store build"

patterns-established:
  - "Single-sourced security guard imported by every call site (build + fetch) so the check cannot drift — proven by both unit tests (detail-path.test.ts) and negative build fixtures (build-guards.test.ts)"
  - "One-body-only lazy fetch: rule-detail finds a record by id and opens ONLY that target, never iterating the index — the smoke test's detailpath-store has exactly one rule so a pre-fetch would be observable"

requirements-completed: [SEL-03]

coverage:
  - id: D1
    description: "resolveDetailPath is the single-sourced D-08 resolver + IN-05 traversal guard: a relative detailPath resolves against the declaring rule file's directory; an absolute path and a `..`-escape are rejected before returning; a valid nested path stays contained in packRoot"
    requirement: SEL-03
    verification:
      - kind: unit
        ref: "src/rules/detail-path.test.ts (4 tests: D-08 relative resolution, in-pack containment, IN-05 absolute rejection, IN-05 ..-escape rejection)"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildIndex enforces D-07 at index-build time: a declared detailPath must resolve in-pack (store root) AND exist on disk; missing target names id + path, absolute + `..`-escape rejected via the shared guard; the no-detailPath corpora (aidlc-rules, eval) stay a no-op (backward compatible)"
    requirement: SEL-03
    verification:
      - kind: integration
        ref: "src/index/build-guards.test.ts (detailpath-store builds valid + carries pointer verbatim; detail-missing/absolute/escape stores each throw naming the bad path)"
        status: pass
    human_judgment: false
  - id: D3
    description: "governance rule-detail <id> fetches exactly one rule body by id (SEL-03), returns the D-06 summary + no-detail signal for a summary-only rule, fails loud on an unknown id, and never pre-fetches another rule's body — wired into CLI dispatch"
    requirement: SEL-03
    verification:
      - kind: e2e
        ref: "src/cli/rule-detail.smoke.test.ts (Case A has-detail body exit 0, Case B require-mfa summary+no-detail exit 0, Case C unknown id non-zero + stderr)"
        status: pass
      - kind: e2e
        ref: "node dist/cli/index.js build-index --root test/fixtures/detailpath-store --out .tmp && rule-detail with-detail --index .tmp -> prints body, exit 0"
        status: pass
      - kind: e2e
        ref: "node dist/cli/index.js rule-detail require-mfa --index rule-index.json -> summary + no-detail signal (D-06), exit 0"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-07-06
status: complete
---

# Phase 3 Plan 02: Lazy Detail Loader Summary

**A single-sourced resolveDetailPath resolver+traversal guard enforced at both build (D-07) and fetch time (IN-05), plus governance rule-detail — the one sanctioned place a rule body surfaces, fetching exactly one body on demand (SEL-03)**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-06T00:48:15Z
- **Completed:** 2026-07-06T01:01:00Z
- **Tasks:** 3
- **Files modified:** 11 (8 created, 3 modified)

## Accomplishments
- `resolveDetailPath(sourceFile, detailPath, packRoot)` — the single-sourced resolver + traversal guard. It resolves a relative detailPath against the declaring rule file's DIRECTORY (D-08) and, BEFORE returning any path, rejects an absolute detailPath and any `..`-escape that leaves `packRoot` (IN-05). It is pure path math (reads no file), so the exact same function is imported by both `buildIndex` (build-time D-07 validation) and `rule-detail` (fetch-time backstop) — the two guards cannot drift (Pitfall 8).
- `buildIndex` now validates every rule that declares a detailPath at index-build time (D-07): the target must resolve inside the store root AND exist on disk, else the build throws loudly naming the rule id + bad path. This is the PRIMARY guard, catching a typo/moved detail file at author time. It is a no-op on the no-detailPath corpora (require-mfa, the eval set), so it is backward compatible.
- `governance rule-detail <id>` — the lazy detail loader (SEL-03) and the ONE sanctioned place a rule body surfaces. It reads the index, finds the one record by id (unknown id -> loud non-zero), returns the summary + a clear no-detail signal for a summary-only rule (D-06, exit 0), and otherwise resolves the detailPath through the shared guard, reads ONLY that one target's body via gray-matter, and writes it to stdout. It never iterates the index or opens any other rule's detail file.
- The cross-phase break this plan owned is resolved: Task 1 authored the previously-absent `details/with-detail.md` target, and Task 2 updated the now-stale Phase 1 assertion (`buildIndex(DETAILPATH_STORE)` must not throw) + its head-comment to the new D-07 build-valid + reject expectations.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author detail fixtures (valid target + three negative stores)** - `61ce2da` (test)
2. **Task 2 (RED): failing resolveDetailPath + guard specs** - `d71fb2e` (test)
3. **Task 2 (GREEN): resolveDetailPath guard + D-07 build-time validation** - `82c280e` (feat)
4. **Task 3 (RED): failing rule-detail smoke test** - `d9caa99` (test)
5. **Task 3 (GREEN): wire governance rule-detail lazy one-body fetch** - `3d94090` (feat)

_TDD sequence honored: Task 2 RED (`d71fb2e`) precedes GREEN (`82c280e`); Task 3 RED (`d9caa99`) precedes GREEN (`3d94090`). Both satisfy the plan-level `type: tdd` gate and the MVP+TDD runtime gate (no `feat` commit landed before its `test` commit)._

## Files Created/Modified
- `src/rules/detail-path.ts` - Single-sourced `resolveDetailPath` (D-08 resolution + IN-05 guard, pure path math)
- `src/rules/detail-path.test.ts` - Unit suite: D-08 relative resolution, in-pack containment, IN-05 absolute + `..`-escape rejection
- `src/index/build.ts` - Added the D-07 per-winner detailPath validation loop (resolve via shared guard + existsSync), imports `existsSync` + `resolveDetailPath`
- `src/index/build-guards.test.ts` - Updated the stale D-06 "target absent" assertion to build-valid + verbatim-pointer; added the three negative-store rejection tests; refreshed the stale head-comment
- `src/cli/commands/rule-detail.ts` - The `governance rule-detail <id>` command: readIndex -> find by id -> D-06 signal OR guarded resolve -> read one body -> stdout
- `src/cli/rule-detail.smoke.test.ts` - spawnSync smoke test: has-detail body, D-06 no-detail signal, unknown-id fail-loud
- `src/cli/index.ts` - Added `case "rule-detail"` (lazy import) + the rule-detail usage line
- `test/fixtures/detailpath-store/enterprise/details/with-detail.md` - The previously-absent detail target (no frontmatter — under details/, skipped by findRuleFiles); carries a DETAIL_BODY_CANARY the smoke test asserts against
- `test/fixtures/detail-missing-store/enterprise/missing-target.md` - Negative fixture: dangling detailPath (D-07 build rejection)
- `test/fixtures/detail-absolute-store/enterprise/absolute-detail.md` - Negative fixture: absolute detailPath `/etc/passwd` (IN-05 rejection)
- `test/fixtures/detail-escape-store/enterprise/escape-detail.md` - Negative fixture: `../../escape.md` (IN-05 `..`-escape rejection)

## Decisions Made
- `resolveDetailPath` reads no file — existence checks live in the callers — so the resolver is reusable verbatim at both build and fetch time (single-source, Pitfall 8).
- The IN-05 containment check rejects an absolute detailPath first, then computes `path.relative(packRoot, resolved)` and rejects `..`, a `../` or `..<sep>` prefix, or an absolute rel — always BEFORE any `readFileSync`.
- Build-time D-07 (scoped to the store root `absRoot`) is the authoritative guard; the fetch-time guard in rule-detail is an intentional coarse backstop scoped to `process.cwd()`, documented in-code as looser and explicitly NOT claimed to match the build boundary.
- The D-06 no-detail signal is a plain, pipe-friendly line printed after the summary; rule-detail output is plain body text (no framed header) so it pipes cleanly.
- The three negative fixtures each live in their own single-rule store so each breaks its own build in isolation, keeping the positive detailpath-store build valid.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SEL-02 (03-01) + SEL-03 (this plan) complete the anti-bloat loop end-to-end: `index -> select -> inject summaries -> rule-detail <id>` fetches exactly one body on demand, and rule-detail is the only place a body surfaces.
- Phase 4 can wire `renderInjection` (03-01) into the discuss/execute gates (GATE-01/02) and invoke `governance rule-detail <id>` when a summary is insufficient; both are pure-core + thin-CLI so they are callable programmatically.
- The IN-05 traversal guard and D-07 build-time validation are in place, so a downstream consumer of a built index can trust every detailPath resolves in-pack and exists.

## Self-Check: PASSED

All claimed files exist on disk:
- `src/rules/detail-path.ts`, `src/rules/detail-path.test.ts`
- `src/cli/commands/rule-detail.ts`, `src/cli/rule-detail.smoke.test.ts`
- `test/fixtures/detailpath-store/enterprise/details/with-detail.md`
- `test/fixtures/detail-missing-store/enterprise/missing-target.md`
- `test/fixtures/detail-absolute-store/enterprise/absolute-detail.md`
- `test/fixtures/detail-escape-store/enterprise/escape-detail.md`
- `src/index/build.ts`, `src/index/build-guards.test.ts`, `src/cli/index.ts`
- `.planning/phases/03-summary-injection-lazy-detail-loading/03-02-SUMMARY.md`

All task commits exist in git history: `61ce2da` (Task 1 fixtures), `d71fb2e` (Task 2 RED), `82c280e` (Task 2 GREEN), `d9caa99` (Task 3 RED), `3d94090` (Task 3 GREEN).
