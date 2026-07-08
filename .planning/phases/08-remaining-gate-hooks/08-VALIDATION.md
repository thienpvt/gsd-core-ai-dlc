---
phase: 08
slug: remaining-gate-hooks
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-07
validated: 2026-07-08
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
| 08-W0-01 | 01 | 0 | GATE-03/04/05 | T-08-01 | Evidence store rejects malformed/missing data loudly | unit | `npm run build:test && node --test "dist-test/governance/gate-evidence-store.test.js"` | ✅ | green |
| 08-W0-02 | 02 | 0 | GATE-03 | T-08-02 | Plan gate does not overwrite execute selection state | unit + manifest | `npm run build:test && node --test "dist-test/governance/plan-hook.test.js"` | ✅ | green |
| 08-W0-03 | 03 | 0 | GATE-04 | T-08-03 | Verify gate uses `runAdapter()` and hard-fails malformed adapter output | unit | `npm run build:test && node --test "dist-test/governance/verify-gate-hook.test.js" "dist-test/enforcement/run-adapter.test.js"` | ✅ | green |
| 08-W0-04 | 04 | 0 | GATE-05 | T-08-04 | Ship gate fails closed on missing/failing prior evidence | unit + manifest | `npm run build:test && node --test "dist-test/governance/ship-gate-hook.test.js"` | ✅ | green |
| 08-W0-05 | 05 | 0 | GATE-03/04/05 | T-08-05 | Capability manifest exposes correct hook refs and onError policy | manifest integration | `npm run build:test && node --test "dist-test/governance/audit-hook-contract.test.js" "dist-test/governance/consent*.test.js"` | ✅ | green |

*Status: green · red · flaky*

---

## Wave 0 Requirements

- [x] `src/governance/gate-evidence-store.test.ts` — evidence read/write/null/malformed/fixed path behavior for `.planning/governance/gates/{NN}-{gate}.json`.
- [x] `src/governance/plan-hook.test.ts` — GATE-03 selection/render/evidence/no-selection-state-overwrite behavior.
- [x] `src/governance/verify-gate-hook.test.ts` — GATE-04 `runAdapter()` path and malformed adapter hard-fail behavior.
- [x] `src/governance/ship-gate-hook.test.ts` — GATE-05 missing/fail/pass matrix.
- [x] Extend `src/governance/audit-hook-contract.test.ts` and consent render-hooks tests for new skill refs/points/onError.

---

## Manual-Only Verifications

All Phase 8 behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing test files.
- [x] No watch-mode flags.
- [x] Feedback latency < 30 seconds for targeted checks.
- [x] `nyquist_compliant: true` set in frontmatter after Wave 0 is implemented.

**Approval:** passed

---

## Validation Audit 2026-07-08

State A audit (VALIDATION.md existed, stale draft). Reconciled against executed artifacts.

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

### Audit Evidence

- All 5 Wave 0 test files present in `src/governance/` and `src/enforcement/` (built to `dist-test/`).
- Targeted run: `gate-evidence-store`, `plan-hook`, `verify-gate-hook`, `ship-gate-hook`, `audit-hook-contract`, `run-adapter` → 54 tests, 53 pass, 0 fail, 1 skipped (14.0s).
- Consent run: `consent`, `consent-verify-post` → 5 tests, 5 pass, 0 fail (14.5s).
- `08-VERIFICATION.md` corroborates: 15/15 observable truths VERIFIED, 0 behavior-unverified, 0 anti-patterns, full-suite `npm test` 289 total / 286 pass / 0 fail / 3 skipped.
- Per-Task Map: 5 pending → 5 green; File Exists 4×`❌ W0` + 1 extend → 5×`✅`; Plan IDs `TBD` → 01–05.
- Frontmatter: `status: draft→complete`, `nyquist_compliant: false→true`, `wave_0_complete: false→true`.
- No auditor spawn required (zero gaps to fill).
