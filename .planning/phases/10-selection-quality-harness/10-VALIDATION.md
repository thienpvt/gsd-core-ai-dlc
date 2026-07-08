---
phase: 10
slug: selection-quality-harness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-08
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-xx | 01 | 1 | SEL-06 | — | critical miss → exit 2 + ship block | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-xx | 01 | 1 | SEL-06 | — | determinism: byte-identical report + corpus hash | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-xx | 01 | 1 | SEL-06 | — | precision reported, not blocked | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-xx | 01 | 1 | SEL-06 | — | malformed report → Ajv hard-fail | unit | `npm test` | ❌ W0 | ⬜ pending |
| 10-01-xx | 01 | 1 | SEL-06 | — | end-to-end: eval-cli + ship-gate read | smoke | `npm run eval` + `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/select/eval-cli.test.ts` (or `src/governance/eval-evidence.test.ts`) — harness CLI + evidence persistence + ship-gate fail-closed
- [ ] Extend `src/governance/ship-gate-hook.test.ts` — `readEvalOrFail`/`assertNoFailedEval` cases

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
