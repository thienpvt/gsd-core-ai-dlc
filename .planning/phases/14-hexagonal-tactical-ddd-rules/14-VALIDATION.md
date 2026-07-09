---
phase: 14
slug: hexagonal-tactical-ddd-rules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` + `node:assert/strict` (TypeScript via `tsc`) |
| **Config file** | `tsconfig.json` → `dist-test/` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–90 seconds |

---

## Sampling Rate

- **After every task commit:** `npm test`
- **After every plan wave:** `npm test`
- **Before verify:** Full suite green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|---------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | JAVA-HEX-01 | T-14-01 | Path-primary hex selects when subscribed; inject summary only | unit | `npm test` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | JAVA-DDD-01 | T-14-01 | Path-primary ddd selects; no bare-entity false positives | unit | `npm test` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | JAVA-HEX-01 / JAVA-DDD-01 | T-14-02 | domains=[] / docs / README / inception do not select | unit | `npm test` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | JAVA-HEX-01 | — | Content + detail makes hex suite GREEN | unit | `npm test` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | JAVA-DDD-01 | — | Content + detail makes ddd suite GREEN | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/select/java-spring-hex-ddd.test.ts` — HEX/DDD matrices + CR-style negatives
- [ ] `aidlc-rules/domain/java-spring/java-spring-hex-layering.md` + detail
- [ ] `aidlc-rules/domain/java-spring/java-spring-ddd-tactical.md` + detail
- [ ] Rebuild `rule-index.json` after content lands
- [ ] Framework install: none

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Optional CLI smoke | JAVA-HEX-01 | Confidence only | select with domains java-spring + domain path |

*Core phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 deps
- [ ] Sampling continuity OK
- [ ] Wave 0 covers MISSING refs
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` after green suite

**Approval:** pending
