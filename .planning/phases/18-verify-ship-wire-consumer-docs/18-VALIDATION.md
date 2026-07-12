---
phase: 18
slug: verify-ship-wire-consumer-docs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node 22 built-in `node:test` + `node:assert/strict` |
| **Config file** | `package.json` scripts + `tsconfig.json`; no test-runner config |
| **Quick run command** | `npm run build:test && node --test "dist-test/governance/config.test.js" "dist-test/governance/verify-gate-hook.test.js" "dist-test/governance/ship-gate-hook.test.js" "dist-test/governance/phase-18-contract.test.js"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20 seconds quick; ~60 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the focused quick command for files implemented so far.
- **After every plan wave:** Run `npm test`.
- **Before phase verification:** Full suite must be green.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | JAVA-DOC-01 | T-18-02, T-18-05 | Config strings parse deterministically; malformed/wrong-type values fail loud | unit | `npm run build:test && node --test "dist-test/governance/config.test.js"` | ❌ Wave 0 | ⬜ pending |
| 18-01-02 | 01 | 1 | JAVA-DOC-01 | T-18-01, T-18-03 | Selected binding rule cannot use generic stub; real coverage pass/fail persists through `runAdapter` | integration | `npm run build:test && node --test "dist-test/governance/verify-gate-hook.test.js"` | ✅ extend | ⬜ pending |
| 18-01-03 | 01 | 1 | JAVA-DOC-01 | T-18-04 | Failed coverage verify evidence blocks ship; no duplicate ship parser | regression | `npm run build:test && node --test "dist-test/governance/ship-gate-hook.test.js"` | ✅ extend | ⬜ pending |
| 18-02-01 | 02 | 2 | JAVA-DOC-01 | T-18-02, T-18-05 | Capability settings and guide contract remain discoverable and type-correct | contract | `npm run build:test && node --test "dist-test/governance/phase-18-contract.test.js"` | ❌ Wave 0 | ⬜ pending |
| 18-02-02 | 02 | 2 | JAVA-DOC-01 | — | Consumer guide covers config, report producers, evidence, failures; three entrypoints link it | docs | `npm run build:test && node --test "dist-test/governance/phase-18-contract.test.js"` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/governance/config.test.ts` — config defaults, parsing, deterministic dedup, malformed/wrong-type rejection.
- [ ] `src/governance/verify-gate-hook.test.ts` additions — binding routing, bypass rejection, missing/low/pass evidence, generic fallback.
- [ ] `src/governance/ship-gate-hook.test.ts` addition — failed coverage verify blocks ship.
- [ ] `src/governance/phase-18-contract.test.ts` — capability settings and docs content/link contract.
- [ ] `docs/java-spring-coverage.md` — focused consumer guide artifact.

No framework installation required.

---

## Manual-Only Verifications

All phase behaviors should have automated verification. Maven/Gradle commands are documentation examples and MUST NOT execute in this repository.

---

## Validation Sign-Off

- [ ] Every planned behavior has an automated command or Wave 0 dependency.
- [ ] Sampling continuity: every implementation task receives focused verification.
- [ ] Wave 0 lists every missing test/document surface.
- [ ] No watch-mode flags.
- [ ] Feedback latency target < 60 seconds.
- [ ] `nyquist_compliant: true` after execution audit.

**Approval:** pending execution
