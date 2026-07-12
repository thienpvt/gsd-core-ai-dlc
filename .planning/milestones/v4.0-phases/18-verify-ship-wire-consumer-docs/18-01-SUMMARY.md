---
phase: 18-verify-ship-wire-consumer-docs
plan: 01
subsystem: governance
tags: [config, coverage-report, verify-gate, ship-gate, java-spring, tdd]

requires:
  - phase: 17-coverage-parser-binding-gateadapter
    provides: createCoverageAdapter factory, COVERAGE_FINDING_ID, durable fail-closed report evaluation
provides:
  - GovernanceProjectConfig + readGovernanceConfig fail-loud project config reader
  - discuss/plan config-backed baseDomains defaults with explicit override
  - verifyGateHook binding-rule routing to coverage-report
  - ship regression for coverage fail evidence
affects:
  - 18-02 consumer docs and capability config declarations
  - verify/ship lifecycle consumers of java-spring domain

tech-stack:
  added: []
  patterns:
    - fail-loud config parse (no silent under-select)
    - binding rule id forces factory-created real adapter
    - injected map only wins when exact coverage-report key present

key-files:
  created:
    - src/governance/config.ts
    - src/governance/config.test.ts
  modified:
    - src/governance/discuss-hook.ts
    - src/governance/plan-hook.ts
    - src/governance/verify-gate-hook.ts
    - src/governance/discuss-hook.test.ts
    - src/governance/plan-hook.test.ts
    - src/governance/verify-gate-hook.test.ts
    - src/governance/ship-gate-hook.test.ts

key-decisions:
  - Config domains split/trim/first-seen dedupe, case-preserving; never lowercase
  - Nullish coalescing only for baseDomains so explicit [] overrides config
  - Binding selected + injected map without coverage-report falls back to factory
  - Empty coverage_report_path still uses real adapter for durable fail evidence
  - Production ship-gate-hook.ts frozen; ship block proven by regression only

patterns-established:
  - Shared readGovernanceConfig trust boundary for discuss/plan/verify
  - Stable selected rule id is the enforcement discriminator (not classification field)

requirements-completed: [JAVA-DOC-01]

coverage:
  - id: D1
    description: Fail-loud governance config reader with empty defaults for missing file/key
    requirement: JAVA-DOC-01
    verification:
      - kind: unit
        ref: src/governance/config.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Discuss/plan use config domains unless explicit baseDomains override
    requirement: JAVA-DOC-01
    verification:
      - kind: unit
        ref: src/governance/discuss-hook.test.ts#uses config domains when baseDomains omitted
        status: pass
      - kind: unit
        ref: src/governance/plan-hook.test.ts#uses config domains when baseDomains omitted
        status: pass
    human_judgment: false
  - id: D3
    description: Verify routes binding rule to coverage-report with pass/fail/empty-path/bypass/fallback
    requirement: JAVA-DOC-01
    verification:
      - kind: integration
        ref: src/governance/verify-gate-hook.test.ts
        status: pass
    human_judgment: false
  - id: D4
    description: Ship blocks failed coverage verify evidence without production ship changes
    requirement: JAVA-DOC-01
    verification:
      - kind: integration
        ref: src/governance/ship-gate-hook.test.ts#blocks failed coverage verify evidence
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-12
status: complete
---

# Phase 18 Plan 01: Verify/Ship Wire Runtime Summary

**Config-backed domains plus binding-rule verify routing to createCoverageAdapter; ship blocks durable coverage fail evidence.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-12T16:51:12Z
- **Completed:** 2026-07-12T16:57:04Z
- **Tasks:** 3/3
- **Files modified:** 9

## Accomplishments

- Added readGovernanceConfig with empty defaults for missing config/key and loud throws for malformed/wrong-typed governance values.
- Wired discuss/plan baseDomains defaults through config while preserving explicit empty-array override.
- Forced verifyGateHook onto coverage-report when selected rules include java-spring-unit-line-coverage.
- Rejected non-coverage adapterName bypass before any verify evidence write.
- Proved empty report path still yields durable fail evidence via real adapter (not generic-exit-ci).
- Locked ship-chain regression on finding id java-spring-unit-line-coverage:coverage-report without touching production ship hook.
- Zero new npm dependencies; frozen enforcement files and ship production clean.

## Task Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | e070111 | test(18-01): RED config discuss plan verify ship coverage wire |
| 2 GREEN config/domains | da25cd1 | feat(18-01): implement config reader and discuss/plan domain defaults |
| 3 GREEN verify routing | fd1e83f | feat(18-01): route verify to coverage-report when binding selected |

## RED Failure Capture (Task 1)

Focused suite after RED commit compiled, then failed on behavior (not missing modules):

| Suite | Failed tests (names) |
|-------|----------------------|
| config.test | missing config file returns empty defaults; missing governance key; domains trim/dedupe; coverage path preserve; empty strings; malformed JSON; governance array/null; domains/coverage number; unreadable config; root array |
| discuss-hook.test | uses config domains when baseDomains omitted |
| plan-hook.test | uses config domains when baseDomains omitted |
| verify-gate-hook.test | routes binding pass fixture; routes binding fail fixture; empty coverage_report_path durable fail; rejects non-coverage adapterName; uses injected coverage-report; injected map without coverage-report falls back to factory |
| ship-gate-hook.test | (regression already green against production assertNonBlocking) |

Failure modes observed: Error not implemented (config stub), missing java-spring domain selection, binding path still on generic-exit-ci / missing adapter when injected map incomplete.

## Tests

- Focused after GREEN: 63/63 pass
- Full suite: 627 pass, 0 fail
- Command: npm run build:test && node --test focused governance suites
- Full: npm test

## Deviations from Plan

None - plan executed exactly as written for runtime half of JAVA-DOC-01.

Notes:
- Ship production unchanged (D-08/D-09); existing assertNonBlocking already blocked fail status.
- Existing selected rule records lack classification/enforcement fields; routing keys on stable id java-spring-unit-line-coverage.
- Injected adapters map lacking exact coverage-report falls back to factory (only exact injected coverage-report used).

## Known Stubs

None.

## Threat Flags

None beyond plan register - no new endpoints/auth paths; config trust boundary mitigations T-18-01..05 applied.

## Self-Check: PASSED

- FOUND: src/governance/config.ts
- FOUND: src/governance/config.test.ts
- FOUND: commits e070111, da25cd1, fd1e83f
- FOUND: frozen ship/enforcement paths clean
