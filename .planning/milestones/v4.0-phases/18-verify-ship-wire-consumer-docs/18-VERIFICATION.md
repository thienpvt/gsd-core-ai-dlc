---
phase: 18-verify-ship-wire-consumer-docs
verified: 2026-07-13
status: passed
score: 17/17
behavior_unverified: 0
overrides_applied: 0
---

# Phase 18: Verify/Ship Wire + Consumer Docs — Verification

## Goal

> Consumer can subscribe the Java domain pack and point the coverage gate at a real report path using docs alone; verify/ship uses `coverage-report` when binding coverage applies.

**Result:** achieved. **Requirement:** JAVA-DOC-01 complete.

## Must-Have Verification

### Plan 18-01 — Runtime wiring

| # | Truth | Evidence | Status |
|---|-------|----------|--------|
| 1 | Missing config/governance returns empty domains/path | `src/governance/config.ts`; config default tests | verified |
| 2 | Malformed JSON/shapes/types fail loud | `src/governance/config.ts`; malformed/wrong-type matrix | verified |
| 3 | Domain strings split, trim, dedupe first-seen, preserve case | `parseDomains`; config normalization test | verified |
| 4 | Discuss/plan use config domains when API override omitted; explicit `[]` wins | `src/governance/{discuss-hook,plan-hook}.ts`; focused tests | verified |
| 5 | Selected binding forces factory-created or exact injected `coverage-report` | `src/governance/verify-gate-hook.ts`; real-pack pass/fail tests | verified |
| 6 | Non-coverage adapter bypass rejects before verify evidence | bypass regression verifies no file | verified |
| 7 | Empty/missing report path still runs real adapter and writes durable fail | empty-path integration test | verified |
| 8 | Binding absent preserves explicit adapter or seven-stub `generic-exit-ci` default | fallback tests; adapter registry unchanged | verified |
| 9 | Failed/current-rejected verify blocks ship; stale pass is removed first | verify/ship regression; production ship hook frozen | verified |
| 10 | No dependency or gate-contract drift | package manifests; frozen enforcement surfaces | verified |

### Plan 18-02 — Capability and consumer docs

| # | Truth | Evidence | Status |
|---|-------|----------|--------|
| 11 | Capability declares domains/report-path as strings with empty defaults | capability manifest contract test | verified |
| 12 | Focused guide covers config, effective domains, report path, evidence, ship block, and no-Java ownership | `docs/java-spring-coverage.md`; content canaries | verified |
| 13 | Gradle JaCoCo, Maven JaCoCo, and LCOV producer examples remain consumer-owned | guide + no-process-spawn contract | verified |
| 14 | Troubleshooting covers absent rule/report, suffix, zero lines, threshold, and path escape | guide table + canaries | verified |
| 15 | README, onboarding, and workflow docs discover the guide | three-link contract test | verified |
| 16 | Static/package/install tests lock configuration and executable consumer surfaces | `src/governance/phase-18-contract.test.ts` | verified |
| 17 | No configurable format/threshold or new runtime dependency was introduced | negative doc assertions; package diff | verified |

## Review-Fix Convergence

- Authoritative plan evidence checks producer, evaluator, status, phase, binding identity, duplicates, and timestamp causality.
- Independently derived signals, advisory rules, and binding match provenance may legitimately differ.
- Existing same-phase verify evidence is removed before all current verification paths.
- Capability bundle is self-contained; isolated GSD install activates six skills and all declared hooks.
- Package CLI executes discuss, plan, verify, audit, capture, eval, execute, and ship entrypoints from consumer projects.
- Skill commands use `npx --no-install governance`; registry fallback and shell-specific substitution are absent.
- Eval uses the packaged corpus, not consumer cwd; environment corpus poisoning is ignored.
- Zero-test capture fails before evidence persistence.
- Discuss CLI rejects `--domains`; project config is the CLI source of truth.
- Summary injection remains body-free; full prose remains lazy through `detailPath`.
- No Maven, Gradle, Java, or JDK process is invoked.

## Automated Verification

| Suite | Result |
|-------|--------|
| Goal-verifier focused Phase 18 suites | 92 passed, 0 failed |
| Capture-test evidence suite | 7 passed, 0 failed |
| Final full suite | 668 total; 661 passed, 7 platform/environment skips, 0 failed |
| Nyquist validation | compliant; 1 discovered gap resolved |
| Security verification | 13/13 threats closed; `threats_open: 0` |
| Final adversarial code review | clean at `9b6786c`; later test-only Nyquist commit verified |

## Requirement Traceability

| Requirement | Source Plans | Evidence | Status |
|-------------|--------------|----------|--------|
| JAVA-DOC-01 | 18-01, 18-02 | Runtime config/routing tests, guide contracts, package/install/consumer execution | complete |

## Gaps and Human Verification

None. `behavior_unverified: 0`. All goal truths have executable automated evidence.

## Verdict

Phase 18 goal achieved. Consumer setup is documented and executable; selected Java/Spring binding coverage reaches real validated report evidence and blocks release on failure.
