---
phase: 08-remaining-gate-hooks
plan: 05
subsystem: governance
tags: [tdd, capability-manifest, consent, hook-registration]

requires:
  - phase: 08-remaining-gate-hooks
    provides: plan, verify, and ship gate hook runners
  - phase: 07-enforcement-contracts-adapter-stubs
    provides: GateRequest, GateResult, and capability consent behavior
provides:
  - aidlc-governance-plan skill at plan:pre
  - aidlc-governance-verify skill at verify:post
  - aidlc-governance-ship skill at ship:pre
  - manifest contract tests for remaining governance gate hook registration
affects: [plan-pre-governance, verify-post-governance, ship-pre-governance]

tech-stack:
  added: []
  patterns:
    - "Capability manifest registers thin skill prompts that invoke compiled governance runners instead of duplicating hook logic."
    - "Consent tests assert new gate hooks are inactive before consent, active after consent, inactive after revoke, and inactive after tamper."
    - "verify:post evidence hook is ordered before the existing audit hook so later audit work can consume stable evidence."

key-files:
  created:
    - .claude/skills/aidlc-governance-plan/SKILL.md
    - .claude/skills/aidlc-governance-verify/SKILL.md
    - .claude/skills/aidlc-governance-ship/SKILL.md
  modified:
    - .gsd/capabilities/aidlc-governance/capability.json
    - src/governance/audit-hook-contract.test.ts
    - src/governance/consent.test.ts
    - src/governance/consent-verify-post.test.ts

key-decisions:
  - "Manifest consumes for the plan hook use loader-valid phase artifacts (`CONTEXT.md`, `RESEARCH.md`, and `PATTERNS.md`) while the skill text still instructs the host to read roadmap, requirements, state, validation, and phase evidence sources."
  - "verify:post runs `aidlc-governance-verify` before `aidlc-governance-audit` and both halt on error."
  - "Registration tests inspect both rendered `activeHooks` and manifest `steps` because runtime output can expose either shape."

patterns-established:
  - "New capability skill docs are marshal-and-invoke prompts around `dist/governance/*hook.js`."
  - "Manifest cross-cap validation constrains `consumes` to artifacts known to the capability loader."

requirements-completed: [GATE-03, GATE-04, GATE-05]

coverage:
  - id: D1
    description: "Capability manifest exposes `aidlc-governance-plan` at `plan:pre` with D-02 source coverage documented in the skill contract."
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "src/governance/audit-hook-contract.test.ts#capability contract includes plan governance skill and source contract"
        status: pass
    human_judgment: false
  - id: D2
    description: "Capability manifest exposes verify evidence and preserves audit at `verify:post`, with verify before audit and halt-on-error policy."
    requirement: GATE-04
    verification:
      - kind: unit
        ref: "src/governance/consent-verify-post.test.ts#verify post renders verify evidence before audit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Capability manifest exposes `aidlc-governance-ship` at `ship:pre` with fail-loud ship skill wiring."
    requirement: GATE-05
    verification:
      - kind: unit
        ref: "src/governance/consent.test.ts#ship pre hooks require consent"
        status: pass
    human_judgment: false
  - id: D4
    description: "All new hook registrations preserve consent lifecycle behavior."
    requirement: GATE-03
    verification:
      - kind: unit
        ref: "src/governance/consent.test.ts"
        status: pass
      - kind: other
        ref: "npm test"
        status: pass
    human_judgment: false

duration: 18 min
completed: 2026-07-07
status: complete
---

# Phase 08 Plan 05: Capability Wiring Summary

**Registered remaining governance gate hooks without replacing existing discuss, execute, verify audit, or consent behavior**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-07T15:05:00+07:00
- **Completed:** 2026-07-07T15:23:00+07:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `aidlc-governance-plan`, `aidlc-governance-verify`, and `aidlc-governance-ship` skill docs as thin wrappers around compiled governance hook runners.
- Registered additive `plan:pre`, `verify:post`, and `ship:pre` capability steps in `.gsd/capabilities/aidlc-governance/capability.json`.
- Extended manifest and consent tests to prove hook visibility, consent activation, tamper/revoke deactivation, and verify-before-audit ordering.

## Task Commits

1. **Task 1: Wave 0 RED tests for capability hook registration** - `4dce66f` (test)
2. **Task 2: GREEN manifest and skill wiring** - `0739882` (feat)

**Plan metadata:** pending (this SUMMARY/STATE/ROADMAP commit)

## Files Created/Modified

- `.claude/skills/aidlc-governance-plan/SKILL.md` - Plan pre-hook skill contract and runner invocation instructions.
- `.claude/skills/aidlc-governance-verify/SKILL.md` - Verify post-hook skill contract and runner invocation instructions.
- `.claude/skills/aidlc-governance-ship/SKILL.md` - Ship pre-hook skill contract and runner invocation instructions.
- `.gsd/capabilities/aidlc-governance/capability.json` - Additive manifest registration for plan, verify, and ship governance steps.
- `src/governance/audit-hook-contract.test.ts` - Manifest and skill-doc contract assertions for new gate hooks.
- `src/governance/consent.test.ts` - Consent lifecycle coverage for new plan, execute, and ship hook refs.
- `src/governance/consent-verify-post.test.ts` - verify:post ordering and halt policy coverage.

## Decisions Made

- Plan-step manifest `consumes` stays limited to loader-valid produced artifacts (`CONTEXT.md`, `RESEARCH.md`, `PATTERNS.md`) because direct `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, and validation consumes failed cross-capability validation. Skill text still instructs the host to read those sources.
- Verify evidence remains before audit at `verify:post` so Phase 9 can add audit enrichment without another ordering migration.
- Render-hook tests inspect `activeHooks` and manifest `steps`; both shapes matter because consent runtime and static manifest checks expose different contract surfaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted plan consumes to satisfy capability loader validation**
- **Found during:** Task 2 GREEN
- **Issue:** Raw `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, and `*-VALIDATION.md` consumes caused GSD loader cross-cap validation failure because those artifacts are not host/capability-produced in the manifest model.
- **Fix:** Kept the skill contract instruction to read those sources, but limited manifest `consumes` to loader-valid phase artifacts already accepted by the capability loader.
- **Files modified:** `.gsd/capabilities/aidlc-governance/capability.json`, `.claude/skills/aidlc-governance-plan/SKILL.md`
- **Verification:** `npm run build:test` and targeted governance tests passed; full `npm test` passed.
- **Committed in:** `0739882`

**Total deviations:** 1 auto-fixed (1 manifest validation issue).
**Impact on plan:** No user-visible scope loss; capability registration works and the plan skill still names the required source classes.

## Issues Encountered

- Capability loader validation rejects unknown or not-yet-produced manifest consumes; Phase 8 wiring now avoids that by putting broader source requirements in skill text rather than manifest dependency edges.
- Full suite retains 3 pre-existing skips; no failures.

## Verification

- RED: `npm run build:test` failed before manifest and skill docs existed.
- GREEN: `npm run build:test` passed.
- Targeted: `node --test "dist-test/governance/audit-hook-contract.test.js" "dist-test/governance/consent.test.js" "dist-test/governance/consent-verify-post.test.js"` passed.
- Full suite: `npm test` passed: 286 pass, 0 fail, 3 skipped.

## TDD Gate Compliance

- RED gate: `4dce66f` (`test(08-05): add failing tests for remaining gate hook registration`) - verified by failing `npm run build:test` before implementation.
- GREEN gate: `0739882` (`feat(08-05): register remaining governance gate hooks`) - targeted tests and full suite pass.
- REFACTOR gate: not needed; changes are small manifest and skill wiring.

## Authentication Gates

None.

## Known Stubs

None. Skill docs invoke existing compiled hook runners and do not add scanner, approval, or audit enrichment implementations.

## Threat Flags

None. Consent lifecycle, manifest tamper behavior, verify ordering, and halt policies are covered by automated tests.

## Self-Check: PASSED

- Found all three new skill docs.
- Found `.gsd/capabilities/aidlc-governance/capability.json` registration for plan, verify, and ship steps.
- Found commits `4dce66f` and `0739882`.
- `npm test` passed with 286 pass, 0 fail, 3 skipped.
- No tracked file deletions.
- `.codegraph/` and `.idea/` remained unmodified and uncommitted.

## Next Phase Readiness

Phase 8 now has all remaining gate hooks registered at GSD lifecycle points. Phase 9 can build audit persistence and APPR-01/rollback enrichment on top of stable plan, verify, and ship evidence files.

---
*Phase: 08-remaining-gate-hooks*
*Completed: 2026-07-07*
