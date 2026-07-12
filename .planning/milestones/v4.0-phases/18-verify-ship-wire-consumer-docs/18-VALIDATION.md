---
phase: 18
slug: verify-ship-wire-consumer-docs
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-12
verified: 2026-07-13
---

# Phase 18 — Validation Strategy

> Nyquist audit for runtime wiring, consumer packaging, and documentation.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node 22 built-in `node:test` + `node:assert/strict` |
| **Config file** | `package.json` scripts + `tsconfig.json`; no test-runner config |
| **Quick run command** | `npm run build:test && node --test "dist-test/governance/config.test.js" "dist-test/governance/discuss-hook.test.js" "dist-test/governance/plan-hook.test.js" "dist-test/governance/verify-gate-hook.test.js" "dist-test/governance/ship-gate-hook.test.js" "dist-test/governance/phase-18-contract.test.js" "dist-test/governance/capture-test-evidence.test.js" "dist-test/cli/commands/eval.test.js" "dist-test/cli/cli.smoke.test.js"` |
| **Full suite command** | `npm test` |
| **Observed runtime** | ~18 seconds full on 2026-07-13 |

## Sampling Rate

- After every task commit: focused tests for changed surfaces.
- After every plan wave: `npm test`.
- Before phase verification: full suite green.
- Max feedback latency target: 60 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 18-01-01 | 01 | 1 | JAVA-DOC-01 | T-18-02 | Config defaults, parsing, dedupe, and wrong-type/malformed rejection | unit | `node --test "dist-test/governance/config.test.js"` | ✅ green |
| 18-01-02 | 01 | 1 | JAVA-DOC-01 | T-18-02 | Discuss/plan use configured domains; explicit API overrides remain deterministic | unit | `node --test "dist-test/governance/discuss-hook.test.js" "dist-test/governance/plan-hook.test.js"` | ✅ green |
| 18-01-03 | 01 | 1 | JAVA-DOC-01 | T-18-01, T-18-03, T-18-05 | Binding forces coverage-report; bypass rejected; empty path creates durable fail | integration | `node --test "dist-test/governance/verify-gate-hook.test.js"` | ✅ green |
| 18-01-04 | 01 | 1 | JAVA-DOC-01 | T-18-04 | Failed coverage verify blocks ship; stale pass cannot survive rejection | regression | `node --test "dist-test/governance/verify-gate-hook.test.js" "dist-test/governance/ship-gate-hook.test.js"` | ✅ green |
| 18-01-05 | review | 1 | JAVA-DOC-01 | T-18-01 | Plan provenance/status/phase/binding/timestamp correlation fails closed while legitimate signal/provenance variance passes | integration | `node --test "dist-test/governance/verify-gate-hook.test.js"` | ✅ green |
| 18-02-01 | 02 | 2 | JAVA-DOC-01 | T-18-08, T-18-09 | Capability string settings and focused guide contract | contract | `node --test "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-02-02 | 02 | 2 | JAVA-DOC-01 | T-18-10, T-18-11 | Three docs entrypoints, producer ownership, fixed threshold, no Java-tool execution | contract | `node --test "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-02-03 | review | 2 | JAVA-DOC-01 | T-18-SC | Package includes capability, six skills, docs, CLI, and eval corpus | package | `node --test "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-02-04 | review | 2 | JAVA-DOC-01 | T-18-08 | Isolated GSD install activates skills/hooks and executes consumer discuss/plan/verify | integration | `node --test "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-WR-01 | review | 2 | JAVA-DOC-01 | T-18-04 | Zero-test capture fails before evidence persistence | unit/integration | `node --test "dist-test/governance/capture-test-evidence.test.js" "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-WR-02 | review | 2 | JAVA-DOC-01 | T-18-08 | Skill commands use `npx --no-install governance`; no shell substitution/registry fallback | contract | `node --test "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-WR-03 | review | 2 | JAVA-DOC-01 | T-18-02 | Discuss CLI rejects `--domains`; project config is the CLI source of truth | smoke | `node --test "dist-test/cli/cli.smoke.test.js"` | ✅ green |
| 18-CR-01 | review | 2 | JAVA-DOC-01 | T-18-SC | Eval corpus resolves from package and writes evidence under consumer root | integration | `node --test "dist-test/select/eval-cli.test.js" "dist-test/cli/commands/eval.test.js" "dist-test/governance/phase-18-contract.test.js"` | ✅ green |
| 18-ENV | review | 2 | JAVA-DOC-01 | T-18-09 | Environment fixture poisoning cannot alter case count or corpus hash | integration | `node --test "dist-test/select/eval-cli.test.js"` | ✅ green |

## Wave 0 Requirements

All planned and review-discovered test surfaces exist and pass:

- [x] `src/governance/config.test.ts`
- [x] `src/governance/discuss-hook.test.ts`
- [x] `src/governance/plan-hook.test.ts`
- [x] `src/governance/verify-gate-hook.test.ts`
- [x] `src/governance/ship-gate-hook.test.ts`
- [x] `src/governance/phase-18-contract.test.ts`
- [x] `src/governance/capture-test-evidence.test.ts`
- [x] `src/select/eval-cli.test.ts`
- [x] `src/cli/commands/eval.test.ts`
- [x] `src/cli/cli.smoke.test.ts`
- [x] `docs/java-spring-coverage.md`

No framework installation required.

## Manual-Only Verifications

None. Maven/Gradle commands are documentation examples and MUST NOT execute in this repository.

## Validation Audit 2026-07-13

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

Gap resolved by `src/cli/cli.smoke.test.ts`: discuss CLI now has an executable regression proving `--domains` is rejected.

## Validation Sign-Off

- [x] Every planned behavior has automated verification.
- [x] Review-discovered lifecycle/package/evidence behaviors have automated verification.
- [x] Wave 0 surfaces exist.
- [x] No watch-mode flags.
- [x] Feedback latency target met.
- [x] `nyquist_compliant: true`.

**Current counts:** full suite 667 tests; 660 passed, 7 platform/environment skips, 0 failed. Final focused convergence suite 65 passed, 0 failed; Nyquist gap smoke suite 3 passed, 0 failed.

**Approval:** verified — 2026-07-13
