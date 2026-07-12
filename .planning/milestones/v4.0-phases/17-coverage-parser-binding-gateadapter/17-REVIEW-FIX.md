---
phase: 17
fixed_at: 2026-07-12T18:45:00Z
review_path: .planning/phases/17-coverage-parser-binding-gateadapter/17-REVIEW.md
fix_scope: critical_warning
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
iteration: 2
---

# Phase 17: Code Review Fix Report

**Fixed at:** 2026-07-12T18:45:00Z
**Source review:** .planning/phases/17-coverage-parser-binding-gateadapter/17-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 2 (CR-02, WR-07)
- Fixed: 2
- Skipped: 0
- Status: all_fixed

## Prior iteration disposition (iteration 1)

| ID | Disposition |
|----|-------------|
| CR-01 | Fixed in `1ccdbcb` (comment/CDATA strip). Residual PI path reopened as CR-02. |
| WR-01 / WR-02 | Fixed in `8413d12` (fd-bounded read). Residual path identity reopened as WR-07. |
| WR-03 | Fixed in `4e8836b` |
| WR-04 | Fixed in `8413d12` |
| WR-05 | Fixed in `8413d12` (EPERM skip host-local) |
| WR-06 | Fixed in `4e8836b` / `8413d12` |

## Fixed Issues

### CR-02: parseJacoco treats processing-instruction body text as real tags

**Files modified:** `src/enforcement/parse-jacoco.ts`, `src/enforcement/parse-jacoco.test.ts`
**Commit:** `4940d4b`
**Applied fix:** Extended `stripIgnoredRegions` to skip complete `<?...?>` processing instructions (including the XML declaration). Unterminated PI throws malformed. Nested `<!--` inside a comment throws rather than leaving an illegal live tail. Existing comment/CDATA/DTD/entity/direct-root behavior preserved.
**Tests:** PI-only fake root counter throws missing root LINE; real root + PI sample returns real root; unterminated PI throws; PI false close/nested counter does not alter depth; nested comment marker throws.

### WR-07: Residual path TOCTOU between realpath and open

**Files modified:** `src/enforcement/coverage-report.ts`, `src/enforcement/coverage-report.test.ts`
**Commit:** `397fb71`
**Applied fix:** After `openSync` of the already-canonical candidate, re-resolve that path, re-check containment against canonical root, `fstat` the fd, `stat` the post-open real path, and compare stable identity (`dev`+`ino`) where meaningful. Any re-resolution / containment / identity failure returns a schema-valid fail result before content is used. Bounded `MAX+1` read and `finally` close retained. Non-public `CoverageAdapterInternals` seam (`afterOpen` / `postOpenRealpath` / `postOpenStat`) keeps residual-race tests deterministic without exposing consumer config. `ponytail:` documents Node stdlib ceiling and `openat2`/handle-based upgrade path.
**Tests:** post-open containment escape fail; identity mismatch fail; re-resolve failure fail. Existing symlink/oversized/directory/rule-selection cases preserved.

## Skipped Issues

None — both in-scope findings fixed.

## Verification

- Focused suite: `node --test dist-test/enforcement/parse-jacoco.test.js dist-test/enforcement/coverage-report.test.js` → 49 tests, 45 pass, 0 fail, 4 skipped (WR-05 symlink EPERM).
- Full suite: `npm test` → 609 tests, 602 pass, 0 fail, 7 skipped.
- Boundaries preserved: `runAdapter` identity, adapter name `coverage-report`, 70% threshold, 8 MiB cap, factory-only seam, GateRequest schema unchanged, STUB_NAMES/ADAPTERS/ECHO_ADAPTERS size 7, Phase 18 wiring untouched, zero new dependencies.

## Commits

1. `4940d4b` fix(17): CR-02 ignore XML processing instructions in parseJacoco
2. `397fb71` fix(17): WR-07 revalidate post-open path identity and containment

---

_Fixed: 2026-07-12T18:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
