---
phase: 08
slug: remaining-gate-hooks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-07
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` |
| **Config file** | `package.json`, `tsconfig.json`, `tsconfig.build.json` |
| **Quick run command** | `npm run build:test && node --test "dist-test/governance/*gate*.test.js" "dist-test/enforcement/run-adapter.test.js"` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20-30 seconds targeted; full suite measured by executor |

---

## Sampling Rate

- **After every task commit:** Run the targeted `node --test` command for the touched hook/evidence test.
- **After every plan wave:** Run `npm test`.
- **Before `$gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** one task commit.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-W0-01 | TBD | 0 | GATE-03/04/05 | T-08-01 | Evidence store rejects malformed/missing data loudly | unit | `npm run build:test && node --test "dist-test/governance/gate-evidence-store.test.js"` | ❌ W0 | pending |
| 08-W0-02 | TBD | 0 | GATE-03 | T-08-02 | Plan gate does not overwrite execute selection state | unit + manifest | `npm run build:test && node --test "dist-test/governance/plan-hook.test.js"` | ❌ W0 | pending |
| 08-W0-03 | TBD | 0 | GATE-04 | T-08-03 | Verify gate uses `runAdapter()` and hard-fails malformed adapter output | unit | `npm run build:test && node --test "dist-test/governance/verify-gate-hook.test.js" "dist-test/enforcement/run-adapter.test.js"` | ❌ W0 | pending |
| 08-W0-04 | TBD | 0 | GATE-05 | T-08-04 | Ship gate fails closed on missing/failing prior evidence | unit + manifest | `npm run build:test && node --test "dist-test/governance/ship-gate-hook.test.js"` | ❌ W0 | pending |
| 08-W0-05 | TBD | 0 | GATE-03/04/05 | T-08-05 | Capability manifest exposes correct hook refs and onError policy | manifest integration | `npm run build:test && node --test "dist-test/governance/audit-hook-contract.test.js" "dist-test/governance/consent*.test.js"` | ✅ existing, extend | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `src/governance/gate-evidence-store.test.ts` — evidence read/write/null/malformed/fixed path behavior for `.planning/governance/gates/{NN}-{gate}.json`.
- [ ] `src/governance/plan-hook.test.ts` — GATE-03 selection/render/evidence/no-selection-state-overwrite behavior.
- [ ] `src/governance/verify-gate-hook.test.ts` — GATE-04 `runAdapter()` path and malformed adapter hard-fail behavior.
- [ ] `src/governance/ship-gate-hook.test.ts` — GATE-05 missing/fail/pass matrix.
- [ ] Extend `src/governance/audit-hook-contract.test.ts` and consent render-hooks tests for new skill refs/points/onError.

---

## Manual-Only Verifications

All Phase 8 behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing test files.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 30 seconds for targeted checks.
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 is implemented.

**Approval:** pending
