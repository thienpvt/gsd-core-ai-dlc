---
phase: 3
slug: summary-injection-lazy-detail-loading
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-05
---

# Phase 3 — Validation Strategy

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
- **Before `/gsd-verify-work`:** Full suite green, including the no-body-leak injection property
- **Max feedback latency:** ~3 seconds

---

## Per-Task Verification Map

Projected against the ROADMAP sub-plans (03-01 summary injector, 03-02 lazy detail loader). Exact task IDs finalized by the planner.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-* | 01 | 1 | SEL-02 | — | Injector has NO body-read path; summary-only fragment | unit + property | `npm test` | ❌ W0 | ⬜ pending |
| 3-02-* | 02 | 2 | SEL-03 | T-3-TRAVERSAL | rule-detail reads one body; detailPath traversal guard (abs/`..` rejected) | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Validation Dimensions (from 03-RESEARCH.md § Validation Architecture)

| Dimension | Gate? | Test |
|-----------|-------|------|
| **Summary-only injection (SEL-02)** | assert | fast-check no-body-canary property over arbitrary corpora (criterion 3) + structural (injector has no file-read import) |
| Fragment shape (`<governance>`, id+severity+summary+detail-hint, no skip reasons) | assert | unit test on fragment structure |
| Fragment ordering (severity-desc then id, deterministic) | assert | mixed-severity unit test + repeated-run byte-identity |
| **Lazy load (SEL-03)** | assert | rule-detail returns exactly one body, pre-fetches nothing |
| D-06 summary-only rule | assert | no-detailPath rule returns summary + clear no-detail signal |
| D-08 resolution base | assert | rule in subdir + relative detailPath resolves correctly |
| D-07 build-time validation | assert | negative fixture: missing detailPath target → buildIndex throws (id+path) |
| IN-05 traversal guard | assert | negative fixtures: absolute path + `..`-escape rejected loudly |
| Budget continuity (SEL-05) | assert | over-budget SelectionResult → `governance inject` warns + non-zero exit, never silent |
| Purity/determinism | review + assert | renderInjection has no clock/random/IO; repeated-run byte-identity |

---

## Wave 0 Requirements

- [ ] `src/inject/inject.ts` (or `src/select/inject.ts`) + `*.test.ts` — pure `renderInjection` core + no-leak property (03-01)
- [ ] `src/cli/commands/inject.ts`, `src/cli/commands/rule-detail.ts` — CLI wrappers (03-01/03-02)
- [ ] `src/rules/detail-path.ts` + tests — shared detailPath resolver with traversal guard (03-02)
- [ ] eval/detail fixtures: a rule WITH a valid detailPath + detail file, plus negative fixtures (missing target, absolute path, `..` escape)
- [ ] fast-check already installed (Phase 1 dev dep) — no new install needed

*Existing node:test + c8 + fast-check infrastructure from Phase 1/2 covers the runner; only phase-specific modules and fixtures are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification.* The `governance inject` fragment, the `governance rule-detail <id>` body fetch, the traversal guard, and the no-leak property are all machine-checkable.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 3s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-05 (both plans carry `<automated>` verify blocks; sampling continuity holds — no 3 consecutive tasks without an automated verify; no watch-mode flags; feedback latency ~1–3s)
