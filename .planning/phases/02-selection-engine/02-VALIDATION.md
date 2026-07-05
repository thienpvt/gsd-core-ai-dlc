---
phase: 2
slug: selection-engine
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-05
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node ≥22 built-in) + c8 coverage + fast-check ^4.8.0 |
| **Config file** | tsconfig.json / tsconfig.build.json (compile to dist-test/); no separate test-runner config |
| **Quick run command** | `npm test` (runs pretest build then `node --test "dist-test/**/*.test.js"`) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~1–3 seconds (property tests bounded at numRuns:30) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` (full suite — cheap)
- **Before `/gsd-verify-work`:** Full suite must be green, including the critical-recall gate test
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

Projected against the ROADMAP sub-plans (02-01 eval set, 02-02 selection pure-fn + reasons, 02-03 measurement + invariants + budget). Exact task IDs finalized by the planner.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-* | 01 | 1 | SEL-01 | — | N/A | fixtures | `npm test` | ❌ W0 | ⬜ pending |
| 2-02-* | 02 | 2 | SEL-01, SEL-04 | — | Deterministic select(); no clock/random in core | unit + property | `npm test` | ❌ W0 | ⬜ pending |
| 2-03-* | 03 | 3 | SEL-04, SEL-05 | — | Loud budget overflow (non-zero exit); never truncate | unit + property | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Validation Dimensions (from 02-RESEARCH.md § Validation Architecture)

| Dimension | Gate? | Test |
|-----------|-------|------|
| Determinism (identical inputs → identical output) | assert | repeated-run byte-identity + fast-check stable-ordering property |
| **Recall (critical) = 100%** | **build-gating** | eval-set test asserts `criticalRecall === 1.0` (the core-value gate) |
| Recall (high) ≥ 0.9 | build-gating | eval-set test asserts `highRecall >= 0.9` |
| Precision | report-only | micro precision reported, never asserted |
| Observability (every candidate selected/skipped w/ reason) | assert | total-accounting property + output-shape test |
| Skip-reason correctness (gate order) | assert | per-reason unit tests (out-of-phase / out-of-scope / out-of-scope-by-trigger / superseded) |
| Trigger semantics (OR, exclude-wins, empty=always, per-axis) | assert | D-04 unit tests + selected⊆triggered property + exclude-wins property |
| Token budget (loud, never truncate) | assert | budget-trip test asserts `budgetExceeded` + non-zero exit; no-false-trip case |
| Scope subscription | assert | domain-gating eval case + unit test |
| Purity (no clock/random/IO in core) | review + assert | determinism test would fail if a clock leaked in |

---

## Wave 0 Requirements

- [ ] `test/fixtures/eval/` — controlled `eval-rules/` corpus + labeled `(task, phase, scopeConfig) → expectedRuleIds` case fixtures (built by 02-01)
- [ ] `src/select/select.ts` + `src/select/*.test.ts` — pure-function core and its unit/property tests (02-02)
- [ ] fast-check already installed (Phase 1 dev dep) — no new install needed

*Existing node:test + c8 + fast-check infrastructure from Phase 1 covers the runner; only phase-specific fixtures and test files are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification.* The `governance select` CLI, the pure `select()` core, the eval-set recall/precision measurement, and the token-budget overflow are all machine-checkable.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-05 (all three plans carry `<automated>` verify blocks; sampling continuity holds — no 3 consecutive tasks without an automated verify; no watch-mode flags; feedback latency ~1–3s)
