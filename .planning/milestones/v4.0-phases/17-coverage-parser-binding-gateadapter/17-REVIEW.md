---
phase: 17-coverage-parser-binding-gateadapter
reviewed: 2026-07-12T15:25:00Z
depth: deep
prior_review: .planning/phases/17-coverage-parser-binding-gateadapter/17-REVIEW.md
remediation_commits:
  - 1ccdbcb
  - 4e8836b
  - 8413d12
  - 4940d4b
  - 397fb71
files_reviewed: 25
files_reviewed_list:
  - .gitignore
  - src/enforcement/parse-jacoco.ts
  - src/enforcement/parse-lcov.ts
  - src/enforcement/coverage-report.ts
  - src/enforcement/parse-jacoco.test.ts
  - src/enforcement/parse-lcov.test.ts
  - src/enforcement/coverage-report.test.ts
  - aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md
  - aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md
  - src/select/java-spring-coverage.test.ts
  - src/index/precedence.test.ts
  - src/select/starter-examples.test.ts
  - test/fixtures/coverage/jacoco/pass-70.xml
  - test/fixtures/coverage/jacoco/fail-below-70.xml
  - test/fixtures/coverage/jacoco/zero-lines.xml
  - test/fixtures/coverage/jacoco/malformed-structure.xml
  - test/fixtures/coverage/jacoco/malformed-dtd.xml
  - test/fixtures/coverage/jacoco/duplicate-root-line.xml
  - test/fixtures/coverage/jacoco/negative-counter.xml
  - test/fixtures/coverage/lcov/pass-70.info
  - test/fixtures/coverage/lcov/fail-below-70.info
  - test/fixtures/coverage/lcov/zero-lines.info
  - test/fixtures/coverage/lcov/malformed.info
  - test/fixtures/coverage/lcov/duplicate-lf.info
  - test/fixtures/coverage/lcov/lh-gt-lf.info
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: clean
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-12T15:25:00Z
**Depth:** deep
**Files Reviewed:** 25
**Status:** clean
**Prior review:** iteration 2 (1 critical CR-02 / 1 warning WR-07 / 3 info)
**Remediation commits:** `1ccdbcb`, `4e8836b`, `8413d12`, `4940d4b`, `397fb71`

## Summary

Deep re-review of Phase 17 after claimed CR-02 + WR-07 fixes on main `397fb71` (agent worktree was still at `8413d12`; review target was main HEAD with rebuilt `dist/`).

Focused suite: 62 tests, 58 pass, 0 fail, 4 symlink skips (EPERM). Rule/inventory suite: 26 pass. Runtime probes against rebuilt parsers + `runAdapter`.

**Verified fixed (do not re-open):**

| Prior | Result |
|-------|--------|
| CR-01 comment/CDATA | Still fixed — comment-only / CDATA-only fake root counters throw; real root + commented sample OK; false-close depth OK; unterminated comment/CDATA throw |
| CR-02 PI residual | **Fixed** in `4940d4b` — PI-only fake root throws; real root + PI sample → 70/100; unterminated PI throws; PI false-close does not alter depth; nested `<!--` inside comment throws |
| WR-01/02 bounded read | Still fixed — `openSync` + post-open revalidation + `readSync` cap `MAX+1`; oversized / directory fail closed |
| WR-03 LCOV endings | Still fixed — CR-only + indented LF/LH accepted |
| WR-04 rule selection | Still fixed — empty/other rules → `coverage-report:binding-rule-not-selected`; `deriveRuleGateStatuses` no false attribution |
| WR-05 symlink tests | Still present; skip only EPERM/EACCES/ENOTSUP/EOPNOTSUPP |
| WR-06 no-record | Still fixed — non-LCOV → `no complete records`; forced lcov-on-xml → malformed, not zero-line |
| WR-07 path identity | **Fixed** in `397fb71` — post-open re-realpath + containment + fd/path `dev`/`ino` match; escape / mismatch / re-resolve fail closed via `runAdapter`; residual concurrent TOCTOU documented (`ponytail`) |

All reviewed files meet quality standards for critical/warning severity. Remaining items are documented ceilings only.

**Boundaries preserved:** adapter name `coverage-report`; factory-only seam (not in `STUB_NAMES`/`ADAPTERS`/`ECHO_ADAPTERS`, size 7); threshold `covered * 100 >= total * 70` (7/10 pass, 69/100 fail); 8 MiB cap; finding id `java-spring-unit-line-coverage:coverage-report`; `runAdapter` schema + identity validation; Phase 18 wiring absent (`verifyGateHook` default still `generic-exit-ci`); zero new dependencies (`ajv`/`ajv-formats`/`gray-matter`/`picomatch` only); package `main` does not re-export coverage module.

## Narrative Findings (AI reviewer)

### Info

### IN-01: Residual post-open TOCTOU under hostile concurrent mutation

**File:** `src/enforcement/coverage-report.ts:148-155,157-203`
**Issue:** After `openSync`, identity/containment is re-checked, then bytes are read from the fd. A hostile concurrent rename/swap between the identity check and `readSync` remains possible. Code documents this Node stdlib ceiling (`ponytail`: no `openat2` / `O_PATH` / fd-based realpath).
**Fix:** No action required for Phase 17. Upgrade path already named: platform `openat2+RESOLVE_BENEATH` or fd-based realpath when available. Do not treat as open defect.

### IN-02: `CoverageAdapterInternals` is a published export on the deep module

**File:** `src/enforcement/coverage-report.ts:53-64,240-242` (`dist/enforcement/coverage-report.d.ts`)
**Issue:** Test seam (`afterOpen` / `postOpenRealpath` / `postOpenStat`) is an `export interface` and optional second arg of `createCoverageAdapter`. Module ships under `package.json` `files: ["dist", …]`. Package `main` (`dist/index.js`) does not re-export it; Phase 18 is expected to deep-import the factory. Callers who pass untrusted objects as the second arg can weaken post-open checks — same trust boundary as controlling the factory call site.
**Fix:** Optional later hygiene: stop exporting the interface (type-only import in tests via relative path), or brand/omit second arg from `.d.ts` consumer surface. Not a gate correctness bug.

### IN-03: Outer `TypeError`/`RangeError` rethrow vs open-path fail-closed

**File:** `src/enforcement/coverage-report.ts:323-343,379-387`
**Issue:** Outer `evaluate` catch rethrows `TypeError`/`RangeError`, but errors thrown inside `readBoundedRegularFile` (including test-seam `TypeError` from `afterOpen`) are caught by the inner open/read `catch` and mapped to schema-valid `status: "fail"`. Net effect is fail-closed durable evidence, which matches the gate contract; only TypeErrors outside that block (e.g. hostile `rules` proxy) still throw.
**Fix:** None required. If programming-fault loudness is desired later, rethrow `TypeError`/`RangeError` in the inner open/read catch before mapping — optional, not a correctness defect.

---

## Probe Log (high level)

- CR-02: PI-only throw; real+PI 70/100; unterminated PI throw; nested comment throw; PI false-close depth OK
- CR-01: comment/CDATA-only throw; DTD/entity reject
- Direct-root: nested-only throw; package counters ignored; root LINE 7/10
- LCOV: empty/ws → zero; CR/CRLF/indent OK; overflow aggregate throw; no-record throw
- Adapter via `runAdapter`: pass/fail/zero/PI-malformed/two-reports/oversized/dir/absolute/traversal/unknown suffix/thresholds
- WR-07: post-open escape fail; identity mismatch fail; re-resolve fail; zero-ino escape still fails containment first
- WR-04: empty rules → `binding-rule-not-selected`; `deriveRuleGateStatuses` no false fail on binding id
- Stubs size 7; no `coverage-report` in ADAPTERS; deps unchanged; Phase 18 not wired
- Host Windows: non-zero `ino`/`dev`; fd vs path identity match

## Counts

| Severity | Count |
|----------|------:|
| Critical | 0 |
| Warning  | 0 |
| Info     | 3 |
| **Total**| **3** |

---

_Reviewed: 2026-07-12T15:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_HEAD reviewed: 397fb71_
