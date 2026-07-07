---
phase: 9
slug: complete-audit-record-approval
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-07
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
| **Estimated runtime** | ~10–20 seconds |

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
| 9-01-xx | 01 | 1 | APPR-01 | — | malformed approval request → hard fail | unit | `npm test` | ❌ W0 | ⬜ pending |
| 9-02-xx | 02 | 1 | AUDIT-04 | — | model-authored narration rejected | unit | `npm test` | ❌ W0 | ⬜ pending |
| 9-03-xx | 03 | 2 | AUDIT-03/05/06 | — | v1 byte-identical regeneration | unit | `npm test` | ❌ W0 | ⬜ pending |
| 9-04-xx | 04 | 2 | AUDIT-06 / GATE-05 | — | pending/rejected approval → ship block | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/governance/approval-store.test.ts` — APPR-01 store round-trip + `assertApproval` guard + malformed hard-fail
- [ ] `src/governance/test-evidence.test.ts` — AUDIT-04 TAP parse + narration rejection
- [ ] `src/governance/audit-enrich.test.ts` — AUDIT-03/05/06 v2 enrichment + v1 byte-stability (string-compare)
- [ ] `src/governance/ship-gate-approval.test.ts` (or extend existing) — fail-closed on `pending`/`rejected`

*Existing infrastructure (node:test + Ajv + tsc build) covers framework needs. No Wave 0 install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| none | — | all invariants are unit-testable (pure functions over fixtures) | — |

---

## Validation Architecture (from RESEARCH.md)

Invariants every test must prove:
1. **v1 byte-stability** — v2 bump appends 4 optional fields AFTER the existing 7 and sets `schema_version.const: 2`; a v1-shaped input regenerated under v2 must be byte-identical for the v1 subset. Prove with `Buffer.compare` / string equality, not deep-equal.
2. **Malformed runner output hard-fail** (AUDIT-04) — test-evidence parser throws on non-TAP / narration / missing summary block; never warn-and-continue.
3. **Approval fail-closed at ship** (GATE-05 mirror) — ship gate blocks on `pending` or `rejected`; proceeds only on `approved`/`waived`.
4. **Schema-valid GateResult from human-approval adapter** — `runAdapter(human-approval, request)` output passes `validateGateResult`; approval `decision` enum (`pending|approved|rejected|waived`) stays distinct from `GateResult.status` (`pass|fail|waived`). *(runAdapter-invocation half inherited from Phase 7 no-op stub tests — the adapter is unchanged in v2.0, re-asserted via enum-distinctness test in Plan 09-01; approval lifecycle does NOT route through runAdapter for v2.0 per the D-06/D-12 rationale in 09-01-PLAN.md.)*
