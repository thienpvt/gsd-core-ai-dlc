---
phase: 12-onboarding-rule-authoring-docs
plan: 01
subsystem: docs
tags: [onboarding, governance, cli, consent, audit]

requires:
  - phase: 04-gsd-capability-integration-persistence
    provides: consent-gated governance capability activation and persisted selection state
  - phase: 08-remaining-gate-hooks
    provides: plan, verify, audit, and ship gate hook wiring
  - phase: 10-selection-quality-harness
    provides: governance eval CLI and persisted eval evidence
provides:
  - End-user onboarding guide with install, CB-3 consent, activation toggle, and first-run smoke check
  - Governance workflow guide covering all five CLI commands plus audit and ship gate evidence paths
affects: [phase-12, docs, onboarding, governance-workflow, rule-authoring]

tech-stack:
  added: []
  patterns:
    - Source-grounded CLI documentation copied from command source signatures
    - Executable documentation examples verified against built bin/governance.cjs
    - CB-3 loader consent separated from governance.enabled runtime toggle

key-files:
  created:
    - docs/onboarding.md
    - docs/governance-workflow.md
  modified: []

key-decisions:
  - "Documented CB-3 as loader consent grant separate from governance.enabled activation toggle; both are required for governance hooks to fire."
  - "Kept CLI docs source-grounded to command source signatures and verified examples against the built bin/governance.cjs."

patterns-established:
  - "Documentation examples must dry-run against the built CLI when they describe executable commands."
  - "Onboarding flow uses install -> consent grant -> activation toggle -> smoke check -> workflow guide."

requirements-completed: [DOC-01, DOC-02]

coverage:
  - id: D1
    description: "End-user onboarding guide covering prerequisites, installation, CB-3 consent, governance.enabled activation, and require-mfa smoke check."
    requirement: DOC-01
    verification:
      - kind: other
        ref: "npm run build; node bin/governance.cjs build-index; node bin/governance.cjs select --phase inception --input task-signal.json; grep assertions for docs/onboarding.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "Governance workflow guide covering build-index, select, inject, rule-detail, eval, audit gate, and ship gate chain."
    requirement: DOC-02
    verification:
      - kind: other
        ref: "npm run build; node bin/governance.cjs build-index; select; inject; rule-detail require-mfa; eval 12 --json; grep assertions for docs/governance-workflow.md"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-07-08
status: complete
---

# Phase 12 Plan 01: Onboarding & Governance Workflow Docs Summary

**Source-grounded onboarding and CLI workflow docs with CB-3 consent, smoke checks, five commands, and gate evidence paths.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-07-08T18:47:42Z
- **Completed:** 2026-07-08T19:01:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `docs/onboarding.md` with prerequisites, install steps, two-step CB-3 consent flow, hook chain, and first-run smoke check.
- Created `docs/governance-workflow.md` with all five CLI signatures, flags, examples, sample outputs, exit codes, and end-to-end workflow.
- Documented audit and ship gate evidence paths so users can operate governance without reading source files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write docs/onboarding.md (DOC-01)** - `065b870` (docs)
2. **Task 2: Write docs/governance-workflow.md (DOC-02)** - `2f71ce3` (docs)

## Files Created/Modified

- `docs/onboarding.md` - End-user install, consent activation, hook-chain, and smoke-check guide.
- `docs/governance-workflow.md` - CLI workflow reference and gate-chain guide.

## Decisions Made

- Documented CB-3 as the loader-level `gsd-tools capability install ./.gsd/capabilities/aidlc-governance --scope project --yes --raw` consent grant, distinct from `.planning/config.json` `governance.enabled`.
- Used `--phase inception` for the smoke check, matching the locked Phase 12 context and validating that `common` rules select for inception tasks.
- Treated `rule-detail require-mfa` as a summary-only example because the shipped rule has no `detailPath`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None - documentation only; no new network endpoints, auth paths, file access patterns, schema changes, or trust-boundary code introduced.

## Next Phase Readiness

- Plan 12-02 can add `docs/rule-authoring.md` and README documentation links using the same source-grounded documentation pattern.
- `docs/governance-workflow.md` already links to `rule-authoring.md` as the next document in the install-operate-author chain.

## Self-Check: PASSED

- Found `docs/onboarding.md`.
- Found `docs/governance-workflow.md`.
- Found `.planning/phases/12-onboarding-rule-authoring-docs/12-01-SUMMARY.md`.
- Found task commit `065b870`.
- Found task commit `2f71ce3`.

---
*Phase: 12-onboarding-rule-authoring-docs*
*Completed: 2026-07-08*
