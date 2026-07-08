---
phase: 7
slug: enforcement-contracts-adapter-stubs
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-08
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed State B from 4 SUMMARYs + existing green test suite (417 pass / 0 fail / 3 skipped at reconstruction time).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 22 built-in runner) |
| **Config file** | tsconfig.json (test compile via `tsc -p tsconfig.json` → `dist-test/`); tsconfig.build.json (prod → `dist/`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

Tests live under `src/` (tsconfig compiles `src/**` only — Phase 6 lesson). Runner: `node --test "dist-test/**/*.test.js"`.

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ENF-02, ENF-04 | T-07-01, T-07-02, T-07-03 | 3 draft 2020-12 schemas compile under Ajv 2020 strict; x-binding annotation marks gate-request/gate-result binding + audit-artifact advisory | unit | `npm test` | ✅ | ✅ green |
| 07-01-02 | 01 | 1 | ENF-02 | — | 5 TS types mirror schemas; GateRequest.rules reuses AuditAppliedRule (DRY) | unit | `npm run build` | ✅ | ✅ green |
| 07-01-03 | 01 | 1 | ENF-02, ENF-04 | T-07-01 | 6 schema-compile + valid-fixture cases pass under local Ajv 2020 strict | unit | `npm test` | ✅ | ✅ green |
| 07-02-01 | 02 | 2 | ENF-02 | T-07-04 | 12 RED tests pin validator contract (missing required, out-of-enum, bad ISO-8601, extra property) | unit | `npm test` | ✅ | ✅ green |
| 07-02-02 | 02 | 2 | ENF-02 | T-07-04, T-07-05 | validateGateResult asserts result is GateResult; compile-once at module load; throws `invalid gate-result:` with formatErrors | unit | `npm test` | ✅ | ✅ green |
| 07-03-01 | 03 | 2 | ENF-03 | T-07-07, T-07-08, T-07-09 | 20 RED tests pin GateAdapter interface, 7 stub names, noop/echo variants, static Maps | unit | `npm test` | ✅ | ✅ green |
| 07-03-02 | 03 | 2 | ENF-03 | T-07-07, T-07-08 | GateAdapter interface + STUB_NAMES (semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval) + ADAPTERS/ECHO_ADAPTERS ReadonlyMaps, no dynamic loader | unit | `npm test` | ✅ | ✅ green |
| 07-04-01 | 04 | 3 | ENF-02, ENF-04 | T-07-10, T-07-11 | 8 RED tests pin runAdapter hard-fail boundary (malformed output throws, evaluate() errors propagate) | unit | `npm test` | ✅ | ✅ green |
| 07-04-02 | 04 | 3 | ENF-02, ENF-04 | T-07-10, T-07-11, T-07-13 | runAdapter: await evaluate → validateGateResult → return; no try/catch around evaluate | unit | `npm test` | ✅ | ✅ green |
| 07-04-03 | 04 | 3 | ENF-02, ENF-04 | T-07-10 | 9 malformed-fixture + boundary cases appended to gate-contracts.test.ts (15 total) | unit | `npm test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Requirement Coverage Trace

| Requirement | Test Files | Invariants Verified |
|-------------|-----------|---------------------|
| **ENF-02** (JSON Schema draft 2020-12 contracts + Ajv runtime validation, malformed = hard fail) | `src/governance/gate-contracts.test.ts` (15 cases), `src/enforcement/validate-gate-result.test.ts` (12 cases), `src/enforcement/run-adapter.test.ts` (8 cases) | 3 schemas compile under Ajv 2020 strict; valid fixtures accepted; missing required / out-of-enum / bad ISO-8601 / extra property / malformed findings all hard-fail with actionable `invalid gate-result:` errors; runAdapter validates every GateResult before return |
| **ENF-03** (GateAdapter interface + 7 named no-op/echo stubs, no first-class integrations) | `src/enforcement/adapters.test.ts` (20 cases) | GateAdapter interface shape; STUB_NAMES exactly [semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval]; noop returns pass + empty findings; echo mirrors request.rules as findings; ADAPTERS + ECHO_ADAPTERS ReadonlyMaps size 7; no dynamic loader (grep gate) |
| **ENF-04** (binding routes through named contracts; x-binding marks binding vs advisory) | `src/governance/gate-contracts.test.ts`, `src/enforcement/run-adapter.test.ts`, `src/enforcement/validate-gate-result.test.ts` | gate-request + gate-result schemas carry `x-binding: "binding"`; audit-artifact carries `x-binding: "advisory"`; runAdapter enforces the binding gate-result contract at the boundary (malformed throws, never reaches consumer); markdown steering never crosses the boundary |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs needed — test framework (node:test) and deps (ajv, ajv-formats) were already present from earlier phases.

- [x] `src/governance/gate-contracts.test.ts` — schema-compile + valid-fixture + malformed-fixture + runAdapter boundary (15 cases)
- [x] `src/enforcement/validate-gate-result.test.ts` — validator contract (12 cases)
- [x] `src/enforcement/adapters.test.ts` — GateAdapter stubs + registry (20 cases)
- [x] `src/enforcement/run-adapter.test.ts` — hard-fail boundary (8 cases)
- [x] Framework already installed (node:test built into Node 22; ajv + ajv-formats existing deps)

---

## Manual-Only Verifications

All phase behaviors have automated verification. The x-binding advisory/binding distinction is enforced structurally (annotation present in schema JSON, validated by schema-compile tests) and behaviorally (runAdapter hard-fail on malformed binding contract output). No manual judgment required.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-08 (reconstructed State B from SUMMARYs + green suite 417 pass / 0 fail / 3 skipped)