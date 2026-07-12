---
phase: 18
slug: verify-ship-wire-consumer-docs
status: verified
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-07-13
---

# Phase 18 — Security

> Threat verification for verify/ship wiring, consumer config, capability packaging, and docs.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| `.planning/config.json` → governance hooks | Consumer config enters selection and adapter routing | domains string, coverage report path |
| verify hook → adapter execution | Adapter choice controls real coverage evaluation | binding rule, adapter name/map |
| verify evidence → ship gate | Durable status/findings control release | `GateEvidence` |
| report path → filesystem | Phase 17 adapter validates consumer path | project-relative path |
| capability manifest → host config | Declared types constrain federation | string settings |
| docs → operator | Guidance controls config and producer actions | Markdown examples/links |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-18-01 | Elevation / Bypass | Verify adapter selection | high | mitigate | Reject non-coverage adapter before `runAdapter` and evidence write when binding selected | closed |
| T-18-02 | Tampering / Integrity | Governance config | high | mitigate | Fail loud on malformed JSON, non-object shapes, and wrong types | closed |
| T-18-03 | Spoofing / Bypass | Binding routing | high | mitigate | Stable binding ID forces factory-created `coverage-report`; generic fallback impossible | closed |
| T-18-04 | Elevation / Integrity | Verify-to-ship handoff | high | mitigate | Failed verify blocks ship; stale verify removed before rerun; zero-test capture fails before persistence | closed |
| T-18-05 | Tampering / Path | Coverage report path | high | mitigate | Config preserves string; Phase 17 lexical/canonical/post-open containment remains authoritative; empty path yields durable fail | closed |
| T-18-06 | Disclosure / DoS | Report read | medium | accept | Phase 17 retains 8 MiB ceiling and fail-closed read; Phase 18 adds no wider read surface | closed |
| T-18-07 | Denial of Service | Malformed config storms | low | accept | Loud throw fails closed; no retry loop added | closed |
| T-18-08 | Type confusion | Capability config | medium | mitigate | Host keys are string with empty defaults; runtime and contract tests lock types | closed |
| T-18-09 | Tampering / Misconfiguration | Docs and eval corpus | medium | mitigate | Guide canaries; package-owned immutable eval corpus; environment override ignored | closed |
| T-18-10 | Bypass via docs gap | Discovery entrypoints | medium | mitigate | README, onboarding, and workflow guide link focused consumer guide | closed |
| T-18-11 | Tool elevation | Producer examples | high | mitigate | Overlay never invokes Maven, Gradle, Java, or JDK; tests inspect documentation only | closed |
| T-18-12 | Information disclosure | Bypass guidance | low | mitigate | Docs state rejection at high level without a force-generic recipe | closed |
| T-18-SC | Supply chain / Tampering | Package/dependencies | high | mitigate | Zero new dependencies; `npx --no-install`; pack/install self-containment tests | closed |

*Blocking threshold: high. Open threats at or above this threshold count toward `threats_open`.*

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-18-01 | T-18-06 | Report size and read containment are already enforced by the Phase 17 adapter; Phase 18 only supplies the path | Phase 18 Plan 18-01 | 2026-07-12 |
| R-18-02 | T-18-07 | Malformed config fails closed immediately; no retry/backoff loop exists | Phase 18 Plan 18-01 | 2026-07-12 |

## Verification Evidence

- `src/governance/verify-gate-hook.ts`: adapter force, bypass rejection, authoritative plan correlation, stale verify deletion.
- `src/governance/config.ts`: fail-loud config boundary.
- `src/governance/ship-gate-hook.ts`: existing `assertNonBlocking`; production file frozen.
- `src/enforcement/coverage-report.ts`: Phase 17 path, identity, regular-file, size, and bounded-read controls.
- `src/governance/phase-18-contract.test.ts`: types, docs, package, install, skill, eval, and consumer execution contracts.
- `src/governance/capture-test-evidence.test.ts`: zero-test fail-close.
- `src/select/eval-cli.test.ts`: package corpus and environment-poisoning rejection.
- Final full suite: 667 tests; 660 passed, 7 platform/environment skips, 0 failed.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-13 | 13 | 13 | 0 | GSD security auditor, ASVS L1 |

## Sign-Off

- [x] All threats have a disposition.
- [x] Accepted risks limited to plan-authorized T-18-06 and T-18-07.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set.

**Approval:** verified 2026-07-13
