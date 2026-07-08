---
phase: 9
slug: complete-audit-record-approval
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-07
audited: 2026-07-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node built-in) — `node --test "dist-test/**/*.test.js"` |
| **Config file** | none — `package.json` scripts (`pretest` builds, `test` runs) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (c8 coverage via `npm run test:coverage`) |
| **Estimated runtime** | ~15–20 seconds (420 tests) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

Filled by planner; each task maps to one of the invariants below. Threat refs are advisory for this contracts phase (no network/IPC); the real trust boundary is malformed-input hard-fail.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-xx | 01 | 1 | APPR-01 | T-09-01-01/02 | malformed approval request → hard fail; D-07 anti-auto-approve | unit | `npm test` | ✅ | ✅ green |
| 9-02-xx | 02 | 1 | AUDIT-04 | — | model-authored narration rejected; D-03/D-04 hard-fail | unit | `npm test` | ✅ | ✅ green |
| 9-03-xx | 03 | 2 | AUDIT-03/05/06 | — | v1 byte-identical regeneration; v2 const bump forward-incompatible | unit | `npm test` | ✅ | ✅ green |
| 9-04-xx | 04 | 2 | AUDIT-06 / GATE-05 | — | pending/rejected approval → ship block (D-08 fail-closed) | unit | `npm test` | ✅ | ✅ green |
| 9-05-xx | 05 | 2 | AUDIT-04 | T-09-05-01 | production caller for parseTapSummary/writeTestEvidence; D-03/D-04 enforced in production path | unit + integration | `npm test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/governance/approval-store.test.ts` — APPR-01 store round-trip + `assertApproval` guard + malformed hard-fail + D-07 anti-auto-approve (4 tests)
- [x] `src/enforcement/validate-approval.test.ts` — APPR-01 schema acceptance/rejection (38 cases) + D-07 invariant
- [x] `src/governance/test-evidence.test.ts` — AUDIT-04 TAP parse + D-03 narration rejection + D-04 missing-summary rejection + determinism + store round-trip (17 tests)
- [x] `src/governance/audit-enrich.test.ts` — AUDIT-03/05/06 v2 enrichment helpers (extractRequirementsCovered + collectRemainingRisks + summarizeApprovals) (10 tests)
- [x] `src/governance/audit-artifact.test.ts` — AUDIT-03 v2 schema (v1-rejects-v2, v2-accept) + v1 byte-stability string-compare (4 new tests)
- [x] `src/governance/ship-gate-hook.test.ts` — AUDIT-06/GATE-05 fail-closed on `pending`/`rejected`; proceed on `approved`/`waived`; D-07 pending-only writes; ship-evidence isolation (6 new tests)
- [x] `src/governance/capture-test-evidence.test.ts` — AUDIT-04 producer path (orchestrator + D-04 pre-persist guard + D-03 summary-line guard + end-to-end GOVERNANCE.md tests_executed + production-caller grep evidence) (6 tests)

*Existing infrastructure (node:test + Ajv + tsc build) covers framework needs. No Wave 0 install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| none | — | all invariants are unit-testable (pure functions over fixtures); integration smoke run via CLI covered by capture-test-evidence.test.ts end-to-end test | — |

---

## Validation Architecture (from RESEARCH.md)

Invariants every test must prove:
1. **v1 byte-stability** — v2 bump appends 4 optional fields AFTER the existing 7 and sets `schema_version.const: 2`; a v1-shaped input regenerated under v2 must be byte-identical for the v1 subset. Prove with `Buffer.compare` / string equality, not deep-equal. *(audit-artifact.test.ts — string `===` compare test, GREEN)*
2. **Malformed runner output hard-fail** (AUDIT-04) — test-evidence parser throws on non-TAP / narration / missing summary block; never warn-and-continue. *(test-evidence.test.ts + capture-test-evidence.test.ts — D-03/D-04 guards, GREEN)*
3. **Approval fail-closed at ship** (GATE-05 mirror) — ship gate blocks on `pending` or `rejected`; proceeds only on `approved`/`waived`. *(ship-gate-hook.test.ts — all 4 decision values tested, GREEN)*
4. **Schema-valid GateResult from human-approval adapter** — `runAdapter(human-approval, request)` output passes `validateGateResult`; approval `decision` enum (`pending|approved|rejected|waived`) stays distinct from `GateResult.status` (`pass|fail|waived`). *(approval-store.test.ts + validate-approval.test.ts — enum-distinctness + D-07 invariant, GREEN; approval lifecycle does NOT route through runAdapter for v2.0 per the D-06/D-12 rationale in 09-01-PLAN.md)*

---

## Validation Audit 2026-07-08

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Plans audited | 5 (01–05) |
| Requirements covered | APPR-01, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06, GATE-05 |
| Test files green | 7 (validate-approval, approval-store, test-evidence, audit-enrich, audit-artifact, ship-gate-hook, capture-test-evidence) |
| Full suite | 420 tests, 417 pass, 3 skipped, 0 fail |

**Audit note:** Per-Task Map was stale (Plan 05 missing; all rows showed `❌ W0 / ⬜ pending`). Updated to reflect executed state: 5 plans, all green, all Wave 0 files present. No test generation required — planner's TDD RED→GREEN cycle already produced green automated verification for every requirement. `nyquist_compliant: true`, `wave_0_complete: true`.