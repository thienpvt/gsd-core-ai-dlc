---
phase: 18-verify-ship-wire-consumer-docs
plan: 02
subsystem: governance-documentation
tags: [java-spring, coverage-report, capability-config, consumer-docs, tdd]

requires:
  - phase: 18-verify-ship-wire-consumer-docs
    plan: 01
    provides: config-backed java-spring domain selection and binding-rule coverage-report routing
  - phase: 17-coverage-parser-binding-gateadapter
    provides: JaCoCo/LCOV parser, fixed inclusive 70% threshold, and fail-closed report-path boundary
provides:
  - governance.domains and governance.coverage_report_path capability declarations
  - focused Java/Spring coverage consumer guide
  - README, onboarding, and workflow discovery links
  - static capability and documentation contract regression
  - full-suite regression evidence for Phase 18
affects:
  - consumer onboarding
  - capability config federation
  - verify and ship operator guidance

tech-stack:
  added: []
  patterns:
    - stdlib-only static contract tests over manifest and Markdown
    - dotted capability settings federate string values into nested project governance config
    - consumer CI owns report production; overlay only reads evidence

key-files:
  created:
    - src/governance/phase-18-contract.test.ts
    - docs/java-spring-coverage.md
  modified:
    - .gsd/capabilities/aidlc-governance/capability.json
    - README.md
    - docs/onboarding.md
    - docs/governance-workflow.md

key-decisions:
  - Kept governance.domains host-facing as a comma-separated string while documenting effective SelectionConfig.domains array semantics
  - Documented suffix-based format inference and fixed inclusive 70% threshold; added no format or threshold setting
  - Kept producer commands as consumer CI examples only; tests inspect text and never invoke Java tooling
  - Skipped optional skill edits because existing skill prose was not demonstrably inaccurate

patterns-established:
  - One focused consumer guide is linked from three entrypoints instead of duplicating setup prose
  - Contract canaries lock security-relevant config types, fail-closed semantics, discovery, and no-Java-tool ownership

requirements-completed: [JAVA-DOC-01]

coverage:
  - id: D1
    description: Capability manifest declares both governance settings as strings with empty defaults while retaining existing settings
    requirement: JAVA-DOC-01
    verification:
      - kind: unit
        ref: src/governance/phase-18-contract.test.ts#phase 18 capability declares additive string settings
        status: pass
    human_judgment: false
  - id: D2
    description: Java/Spring guide covers subscription, producer-owned JaCoCo/LCOV reports, evidence, ship blocking, fixed threshold, and troubleshooting
    requirement: JAVA-DOC-01
    verification:
      - kind: unit
        ref: src/governance/phase-18-contract.test.ts#Java Spring coverage guide documents the complete consumer contract
        status: pass
    human_judgment: false
  - id: D3
    description: README, onboarding, and governance workflow documentation discover the focused guide
    requirement: JAVA-DOC-01
    verification:
      - kind: unit
        ref: src/governance/phase-18-contract.test.ts#all documentation entrypoints link the focused guide
        status: pass
    human_judgment: false
  - id: D4
    description: Phase 18 runtime wiring and existing project behavior remain regression-free
    requirement: JAVA-DOC-01
    verification:
      - kind: integration
        ref: npm test (630 pass, 7 platform skips, 0 fail)
        status: pass
      - kind: integration
        ref: Phase 18 runtime focused suite (63 pass, 0 fail)
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-12
status: complete
---

# Phase 18 Plan 02: Java/Spring Coverage Consumer Docs Summary

**Capability-owned domain/report settings plus a test-locked Java/Spring JaCoCo/LCOV guide discoverable from all consumer documentation entrypoints.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-12T17:05:14Z
- **Completed:** 2026-07-12T17:15:21Z
- **Tasks:** 3/3
- **Files changed:** 6

## Accomplishments

- Declared `governance.domains` and `governance.coverage_report_path` as additive string capability settings with empty defaults.
- Added a focused Java/Spring guide covering domain subscription, Gradle/Maven JaCoCo and LCOV producer paths, fixed inclusive 70% evaluation, durable verify evidence, ship blocking, and fail-closed troubleshooting.
- Linked the guide from README, onboarding, and governance workflow entrypoints.
- Locked the capability and documentation contract with a stdlib-only test; no Java tooling or report adapter executes in that suite.
- Passed the Phase 18 runtime regression and full project suite without dependency or frozen-file drift.

## Task Commits

| Task | Commit | Message |
| --- | --- | --- |
| 1 RED | `7e48c65` | `test(18-02): RED phase-18 capability and docs contract` |
| 2 GREEN | `de1fc05` | `docs(18-02): java-spring coverage consumer guide and capability config` |
| 3 regression gate | No file commit | Verification-only task; results recorded below |

## Files Created/Modified

- `src/governance/phase-18-contract.test.ts` — locks manifest settings, focused-guide canaries, and three discovery links.
- `docs/java-spring-coverage.md` — complete consumer setup and troubleshooting guide.
- `.gsd/capabilities/aidlc-governance/capability.json` — declares the two capability-owned string settings.
- `README.md` — adds root documentation discovery.
- `docs/onboarding.md` — links domain subscription and report configuration guidance.
- `docs/governance-workflow.md` — links binding coverage evidence guidance from the gate chain.

## RED Failure Evidence

The RED suite compiled successfully, then failed all 3 behavioral tests:

1. Capability declaration test: `governance.domains` was `undefined`.
2. Guide contract test: `docs/java-spring-coverage.md` did not exist.
3. Discovery test: README lacked `docs/java-spring-coverage.md`.

This proved missing behavior rather than a compile or import failure.

## Verification

- Focused contract after GREEN: **3 pass, 0 fail**.
- Phase 18 runtime focused regression: **63 pass, 0 fail**.
- Full `npm test`: **637 tests; 630 pass, 7 platform skips, 0 fail**.
- Dependency maps: unchanged from `99c11c8`.
- `package.json` blob: `f0e9539cc2d77b0069532268b74a1f082e0376b8` unchanged.
- `package-lock.json` blob: `715c35df73d581d6ab58736361c0db95b50eec65` unchanged.
- Frozen enforcement files, gate schemas, and `src/governance/ship-gate-hook.ts`: unchanged from `99c11c8`.
- Maven, Gradle, Java, and JDK commands: never invoked.

## Decisions Made

- Preserved the host capability schema contract: `domains` remains a comma-separated string, with effective array semantics documented explicitly.
- Kept report format inferred from `.xml`, `.info`, or `.lcov`; threshold remains fixed inclusive 70%.
- Kept report generation consumer-owned and examples documentation-only.
- Omitted optional skill edits: current prose did not make inaccurate claims about domain defaults or verify routing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Initial isolated checkout predated Phase 18. After the checkout guard stopped execution, coordinator-directed `git merge --ff-only 99c11c8` supplied the required base; all guards then passed before edits.
- The harness removed the stopped worktree registration and branch. The same isolated branch was recreated at its recorded `8413d12` base, then advanced only with the authorized fast-forward. No reset or rebase occurred.
- The project governance capability was inactive (`no user consent record`), so no execute hook was active; absent persisted selection state caused no governance bypass.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat register. Changes add manifest declarations, static tests, and documentation only; no endpoint, auth path, file-read runtime, schema trust boundary, or enforcement implementation was introduced.

## Next Phase Readiness

- Plan 18-02 is ready for coordinator cherry-pick and phase verification.
- `--no-transition` honored: no Phase 18 completion or transition action performed.

## Self-Check: PASSED

- Found all six created/modified implementation and documentation files.
- Found Task 1 commit `7e48c65` and Task 2 commit `de1fc05`.
- Parsed frontmatter successfully with `status: complete`.
