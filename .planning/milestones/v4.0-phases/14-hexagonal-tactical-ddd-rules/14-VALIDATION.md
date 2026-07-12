---
phase: 14
slug: hexagonal-tactical-ddd-rules
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-09
verified: 2026-07-13
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
| 14-01-01 | 01 | 1 | JAVA-HEX-01 | T-14-01 | Path-primary hex selects when subscribed; inject summary only | unit | focused HEX/DDD suite | ✅ | ✅ green |
| 14-01-02 | 01 | 1 | JAVA-DDD-01 | T-14-01 | Path-primary DDD selects; no bare-entity false positives | unit | focused HEX/DDD suite | ✅ | ✅ green |
| 14-01-03 | 01 | 1 | JAVA-HEX-01 / JAVA-DDD-01 | T-14-02 | domains=[] / docs / README / inception do not select | unit | focused HEX/DDD suite | ✅ | ✅ green |
| 14-02-01 | 02 | 2 | JAVA-HEX-01 | — | Content + detail makes hex suite GREEN | unit | focused HEX/DDD suite | ✅ | ✅ green |
| 14-02-02 | 02 | 2 | JAVA-DDD-01 | — | Content + detail makes DDD suite GREEN | unit | focused HEX/DDD suite | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/select/java-spring-hex-ddd.test.ts` — 36 HEX/DDD matrix and adversarial-negative tests.
- [x] `java-spring-hex-layering.md` + lazy detail.
- [x] `java-spring-ddd-tactical.md` + lazy detail.
- [x] Real-corpus precedence/inventory regression.
- [x] Framework install: none.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Optional CLI smoke | JAVA-HEX-01 | Confidence only | select with domains java-spring + domain path |

*Core phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity preserved.
- [x] Wave 0 complete.
- [x] No watch-mode flags.
- [x] Feedback latency target met.
- [x] `nyquist_compliant: true`.

**Audit 2026-07-13:** focused HEX/DDD 36/36; precedence 4/4; full 668 total, 661 pass, 7 skips, 0 fail; gaps 0.

**Approval:** verified 2026-07-13
