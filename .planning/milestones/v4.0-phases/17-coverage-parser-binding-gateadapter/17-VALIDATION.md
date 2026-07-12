---
phase: 17
slug: coverage-parser-binding-gateadapter
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-12
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node 22 built-in `node:test` + `node:assert/strict` |
| **Config file** | `package.json` scripts + `tsconfig.json`; no test-runner config |
| **Quick run command** | `npm run build:test && node --test "dist-test/enforcement/parse-jacoco.test.js" "dist-test/enforcement/parse-lcov.test.js" "dist-test/enforcement/coverage-report.test.js" "dist-test/select/java-spring-coverage.test.js"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20 seconds quick; ~60 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the focused quick command above.
- **After every plan wave:** Run `npm test`.
- **Before phase verification:** Full suite must be green.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | JAVA-COV-02 | T-17-04 | Malformed format input cannot create a pass | unit | `npm run build:test && node --test "dist-test/enforcement/parse-jacoco.test.js" "dist-test/enforcement/parse-lcov.test.js"` | ✅ | ✅ green |
| 17-01-02 | 01 | 1 | JAVA-COV-02, JAVA-COV-03 | T-17-01..05 | Traversal, symlink, size, missing, malformed, zero-line, and low coverage fail closed through `runAdapter()` | integration | `npm run build:test && node --test "dist-test/enforcement/coverage-report.test.js"` | ✅ | ✅ green |
| 17-02-01 | 02 | 1 | JAVA-COV-01 | — | Binding metadata names `coverage-report`; selective triggers avoid test-only circular obligation | unit | `npm run build:test && node --test "dist-test/select/java-spring-coverage.test.js"` | ✅ | ✅ green |
| 17-02-02 | 02 | 1 | JAVA-COV-01 | — | Real index inventory grows 10 → 11; starter examples remain excluded | regression | `npm run build:test && node --test "dist-test/index/precedence.test.js" "dist-test/select/starter-examples.test.js"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/enforcement/parse-jacoco.test.ts` — JaCoCo root LINE counter and malformed-input contract.
- [x] `src/enforcement/parse-lcov.test.ts` — LCOV LF/LH aggregation and malformed-record contract.
- [x] `src/enforcement/coverage-report.test.ts` — real adapter + `runAdapter()` fail-closed matrix.
- [x] `src/select/java-spring-coverage.test.ts` — binding rule metadata, triggers, lazy detail, body quarantine.
- [x] `test/fixtures/coverage/jacoco/*` — exactly-70, below-threshold, zero-line, malformed, duplicate-root, invalid-counter fixtures.
- [x] `test/fixtures/coverage/lcov/*` — exactly-70, below-threshold, zero-line, malformed, duplicate-summary, inconsistent-total fixtures.

No framework installation required.

---

## Validation Audit 2026-07-12

| Metric | Count |
|--------|------:|
| Requirements covered | 3/3 |
| Automated mapped checks | 4/4 |
| Focused tests | 84 pass / 4 platform skips / 0 fail |
| Full tests | 602 pass / 7 platform skips / 0 fail |
| Gaps found | 0 |
| Escalated | 0 |

Platform skips are symlink-creation tests on Windows without Developer Mode/admin privilege; deterministic post-open containment/identity tests cover those branches without requiring OS symlink permission.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All planned behaviors have an automated command or Wave 0 dependency.
- [x] Sampling continuity: every implementation task receives focused verification.
- [x] Wave 0 lists every missing test/fixture surface.
- [x] No watch-mode flags.
- [x] Feedback latency target < 60 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-12 (autonomous planning mode)
