---
phase: 4
slug: gsd-capability-integration-persistence
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-06
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node ≥22 built-in) + c8 coverage; integration tests via `gsd-tools loop render-hooks` / `gsd-tools capability` |
| **Config file** | tsconfig.json / tsconfig.build.json (compile to dist-test/); no separate test-runner config |
| **Quick run command** | `npm test` (runs pretest build then `node --test "dist-test/**/*.test.js"`) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2–4 seconds (integration tests spawn `gsd-tools` subprocesses) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` (full suite — cheap)
- **Before `/gsd-verify-work`:** Full suite green, including the reload-after-boundary test and the capability-discovery integration test
- **Max feedback latency:** ~4 seconds

---

## Per-Task Verification Map

Projected against the ROADMAP sub-plans (04-01 capability manifest + discuss gate, 04-02 execute gate + persistence, 04-03 first-run consent). Exact task IDs finalized by the planner.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-* | 01 | 1 | GATE-01 | T-4-CONSENT | Manifest valid; consent honored (CB-3) | unit + integration | `npm test` + `gsd-tools capability list` | ❌ W0 | ⬜ pending |
| 4-02-* | 02 | 2 | GATE-02, ENF-01 | — | Reload persisted selection (no re-derive); atomic writes | unit + integration | `npm test` | ❌ W0 | ⬜ pending |
| 4-03-* | 03 | 2 | GATE-01 (consent) | T-4-CONSENT | Overlay inactive until consent recorded | integration | `gsd-tools loop render-hooks` (pre/post consent) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Validation Dimensions (from 04-RESEARCH.md § Validation Architecture)

| Dimension | Gate? | Test |
|-----------|-------|------|
| **Capability discovery (criterion 1)** | assert | `gsd-tools loop render-hooks discuss:pre/execute:pre` shows governance hooks active (post-consent) |
| Manifest validity | assert | `gsd-tools capability list` includes `aidlc-governance` active (post-consent) |
| **Discuss gate (criterion 2, GATE-01)** | assert | discuss-hook unit test: STATE + signal → fragment + risk tier |
| Risk → subscription | assert | auth-keyword signal subscribes security domain (selection includes rules baseline omits) |
| **Execute gate (criterion 3, GATE-02)** | assert | execute-hook unit test: persisted state (no signal) → identical fragment |
| **Persistence (criterion 4, ENF-01)** | assert | reload-after-boundary test: write → fresh reload → byte-identical selection |
| Budget continuity | assert | persisted budgetExceeded:true → execute-hook surfaces it (non-zero) |
| Determinism | assert | no clock in persisted selection; reload byte-identical |
| **Consent (CB-3)** | assert | pre-consent render-hooks does NOT show governance; post-consent it does |
| Core-purity preserved | review | select/renderInjection remain the sole governance-logic call sites |

---

## Wave 0 Requirements

- [ ] `.gsd/capabilities/aidlc-governance/capability.json` — the manifest (04-01)
- [ ] `.claude/skills/aidlc-governance-discuss/SKILL.md` + `aidlc-governance-execute/SKILL.md` — the skill entry points (04-01/02)
- [ ] `src/governance/discuss-hook.ts`, `execute-hook.ts`, `state-store.ts`, `risk.ts` + `*.test.ts` — hook adapters + persistence (04-01/02)
- [ ] Integration test fixtures: a temp project root with `.gsd/`, `.planning/STATE.md`, `rule-index.json` for the render-hooks/capability tests
- [ ] fast-check already installed (Phase 1 dev dep) — no new install needed

*Existing node:test + c8 infrastructure from Phase 1-3 covers the runner; only phase-specific modules, the manifest, the skills, and integration fixtures are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification.* The capability-discovery, gate-hook, persistence-reload, and consent tests are all machine-checkable via `gsd-tools` + node:test.

---

## Validation Sign-Off

- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-06 (plans will carry `<automated>` verify blocks; sampling continuity holds; no watch-mode flags; feedback latency ~2–4s — slightly higher than prior phases due to `gsd-tools` subprocess spawns in integration tests)
