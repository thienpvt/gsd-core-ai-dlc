---
phase: 10
slug: selection-quality-harness
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-08
validated: 2026-07-08
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in) — `node --test "dist-test/**/*.test.js"` |
| **Config file** | none — `package.json` scripts (`pretest` builds, `test` runs) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (coverage via `npm run test:coverage`) |
| **Standing harness command** | `npm run eval` (new — `node dist/select/eval-cli.js`) |
| **Estimated runtime** | ~15–25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + `npm run eval` (prove harness runs)
- **Before `/gsd-verify-work`:** Full suite green + `npm run eval` exits 0
- **Max feedback latency:** ~25 seconds

---

## Per-Task Verification Map

Filled by planner; each task maps to one of the invariants below.
Audited 2026-07-08 — all rows verified green against `npm test` (420 tests, 417 pass, 0 fail, 3 skipped) + `node --test` over the 3 Phase-10 files (50 tests, 50 pass, 0 fail).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SEL-06 | T-10-07 | critical miss → exit 2 + ship block | unit | `npm test` | ✅ `eval-cli.test.ts:365` + `ship-gate-hook.test.ts:492` | ✅ green |
| 10-01-02 | 01 | 1 | SEL-06 | T-10-04 | determinism: byte-identical report + corpus hash | unit | `npm test` | ✅ `eval-cli.test.ts:309` | ✅ green |
| 10-01-03 | 01 | 1 | SEL-06 | — | precision reported, not blocked | unit | `npm test` | ✅ `eval-cli.test.ts:291` | ✅ green |
| 10-01-04 | 01 | 1 | SEL-06 | T-10-01 | malformed report → Ajv hard-fail | unit | `npm test` | ✅ `validate-eval-report.test.ts` (15 cases) | ✅ green |
| 10-01-05 | 01 | 1 | SEL-06 | T-10-11 | end-to-end: eval-cli + ship-gate read | smoke | `npm run eval` + `npm test` | ✅ `eval-cli.test.ts:345` + `ship-gate-hook.test.ts:478,506` | ✅ green |
| 10-02-01 | 02 | 2 | SEL-06 | T-10-09 | ship-gate forward-scoping (legacy phase < 10 skip) | unit | `npm test` | ✅ `ship-gate-hook.test.ts:531` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/select/eval-cli.test.ts` — harness CLI + evidence persistence + ship-gate fail-closed (10 cases)
- [x] `src/enforcement/validate-eval-report.test.ts` — Ajv 2020 closed-schema boundary (15 cases)
- [x] Extend `src/governance/ship-gate-hook.test.ts` — `readEvalOrFail`/`assertNoFailedEval` + forward-scoping cases (4 cases)

*Existing infrastructure (node:test + Ajv + tsc build + eval-harness.ts pure fns) covers framework needs. No Wave 0 install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| none | — | all invariants unit/smoke-testable | — |

---

## Validation Architecture (from RESEARCH.md)

Invariants every test must prove:
1. **Critical-recall gate (D-05)** — a held-out eval case expecting a `critical` rule that `select()` misses → harness exits 2, persists FAILED eval evidence under `.planning/governance/eval/{NN}.json`, ship gate (`assertNoFailedEval`) blocks. A passing run (criticalRecall === 1.0) exits 0.
2. **Determinism (D-14)** — same corpus + same index → byte-identical report (string-compare, NOT deep-equal); corpus hash pinned into the report. Deterministic case ordering (sort by name).
3. **Precision reported-not-blocked (D-06)** — a case with over-injection (selected-but-not-expected) → reported in precision offenders list, exit still 0 when no critical miss. Never blocks on precision.
4. **Malformed report hard-fail (D-11)** — eval-report.schema.json (draft 2020-12 + x-binding) validated via Ajv; malformed evidence record rejected by `validateEvalReport` (7th validate instance). Matches the validate-approval/validate-gate-result boundary.
5. **End-to-end** — `node dist/select/eval-cli.js 10` produces `.planning/governance/eval/10-report.md` + `10.json`; ship-gate reads via `readEvalOrFail`; verify:post SKILL.md invokes eval step after capture-test-evidence.
6. **Ship-gate forward-scoping (RESEARCH Open Q2)** — `readEvalOrFail` does NOT retroactively fail phases < 10 (no eval evidence expected before Phase 10); forward-looking guard (phase ≥ 10).

---

## Validation Audit 2026-07-08

State A audit (VALIDATION.md existed, plans 10-01 + 10-02 complete). Cross-referenced each invariant to test files by name + test description, then ran the suites to confirm green.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Invariants audited | 6 |
| Invariants COVERED | 6 |

**Verification run:**
- `npm test` → 420 tests, 417 pass, 0 fail, 3 skipped (pre-existing skips unchanged).
- `node --test dist-test/select/eval-cli.test.js dist-test/enforcement/validate-eval-report.test.js dist-test/governance/ship-gate-hook.test.js` → 50 tests, 50 pass, 0 fail.
- `node dist/select/eval-cli.js 10` → exit 0, persists `.planning/governance/eval/10.json` + `10-report.md`, criticalRecall=1.0, microPrecision=1.0.

**Invariant → test cross-reference (all COVERED, no gaps):**

| Invariant | Test anchor | Verdict |
|-----------|-------------|---------|
| 1. Critical-recall gate (D-05) | `eval-cli.test.ts:365` (exit 2 + persisted fail) + `ship-gate-hook.test.ts:492` (ship block) | COVERED |
| 2. Determinism (D-14) | `eval-cli.test.ts:309` (byte-identical + corpusHash) | COVERED |
| 3. Precision reported-not-blocked (D-06) | `eval-cli.test.ts:291` | COVERED |
| 4. Malformed report hard-fail (D-11) | `validate-eval-report.test.ts` (15 cases: missing fields, unknown keys, bad enum, NaN/Infinity, range) | COVERED |
| 5. End-to-end (D-09/D-13) | `eval-cli.test.ts:345` (dist E2E) + `ship-gate-hook.test.ts:478,506` (readOrFail) | COVERED |
| 6. Ship-gate forward-scoping (Open Q2) | `ship-gate-hook.test.ts:531` (legacy phase < 10 skip) | COVERED |

No gaps → `gsd-nyquist-auditor` not spawned (per workflow Step 3: no gaps → skip to Step 6). Phase 10 is Nyquist-compliant.
