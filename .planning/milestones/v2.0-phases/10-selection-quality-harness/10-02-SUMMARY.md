---
phase: 10-selection-quality-harness
plan: 02
subsystem: selection-quality-harness
tags: [selection, eval, ship-gate, fail-closed, forward-scoping, verify-post, skill]
dependency_graph:
  requires:
    - src/governance/ship-gate-hook.ts (readApprovalOrFail/assertNoBlockingApprovals/writeGateEvidence — existing gate hook)
    - src/governance/eval-evidence.ts (readEvalEvidence + EvalReport — Plan 01 API, unchanged)
    - src/governance/paths.ts (evalEvidencePath — Plan 01, unchanged)
    - src/enforcement/types.js (GateId, GateResult)
    - .claude/skills/aidlc-governance-verify/SKILL.md (existing 5-step verify:post skill)
  provides:
    - src/governance/ship-gate-hook.ts (readEvalOrFail + assertNoFailedEval + forward-scoping guard — ship-blocking half of SEL-06)
    - .claude/skills/aidlc-governance-verify/SKILL.md (step 5 eval harness invocation — D-13 producer at verify:post)
  affects:
    - .planning/governance/eval/{NN}.json (read by ship gate for phases >= 10)
    - .planning/governance/gates/{NN}-ship.json (only written when eval passes for phase >= 10)
tech_stack:
  added: []
  patterns:
    - GATE-05 fail-closed prior-evidence read (readEvalOrFail clones readRequiredEvidence shape)
    - D-05 critical-recall floor re-derivation at ship boundary (defense-in-depth with Plan 01 exit-2)
    - Forward-scoping string-compare guard (phaseNumber >= "10" — safe under PHASE_NUMBER_RE 2-digit padding)
    - 4-rung loud-fail read ladder reuse (readEvalEvidence from Plan 01)
key_files:
  created: []
  modified:
    - src/governance/ship-gate-hook.ts
    - src/governance/ship-gate-hook.test.ts
    - .claude/skills/aidlc-governance-verify/SKILL.md
decisions:
  - D-07 ship gate consumes eval evidence via fail-closed readEvalOrFail (clone of readRequiredEvidence pattern)
  - D-05 criticalRecall < 1.0 blocks ship via assertNoFailedEval (defense-in-depth with Plan 01 exit-2)
  - RESEARCH Open Q2 resolved: forward-scoping guard phaseNumber >= "10"; legacy phases 06-09 NOT retroactively failed
  - D-13 verify:post SKILL.md step 5 runs harness every governed phase; step ordering capture-test-evidence → eval → audit → propagate-failures
  - String compare `phaseNumber >= "10"` is safe because PHASE_NUMBER_RE enforces 2-digit zero-padding (lexical == numeric order at the "10" threshold)
  - Eval check placed AFTER approval check (both orderings pass RED tests; approval-before-eval matches existing seed order in test helpers)
metrics:
  duration: ~7 min
  completed: 2026-07-08
  tasks: 2
  files: 3 (0 created, 3 modified)
  tests: 4 new (2 blocking RED cases + 2 forward-scoping/pass-path cases)
  commits: 2 (RED + GREEN)
status: complete
---

# Phase 10 Plan 02: Ship-Gate Eval Blocking + verify:post Eval Step Summary

Wired Plan 01's persisted eval evidence into the ship gate as a fail-closed prior-evidence check (D-07; GATE-05 pattern) and added the verify:post skill step that runs the standing harness every governed phase (D-13). A persisted failed eval report (criticalRecall < 1.0) now blocks ship via `assertNoFailedEval`, defense-in-depth with Plan 01's exit-2 producer. Forward-scoping guard `phaseNumber >= "10"` resolves RESEARCH Open Q2 — legacy phases 06-09 shipped without eval evidence and are not retroactively failed.

## Tasks Completed

| Task | Name | Commit | Key Files |
| ---- | ---- | ------ | --------- |
| 1 | RED — extend ship-gate-hook.test.ts with eval-blocking cases | `49ea611` | `src/governance/ship-gate-hook.test.ts` |
| 2 | GREEN — readEvalOrFail + assertNoFailedEval + forward-scoping guard + SKILL.md step 5 | `e35306d` | `src/governance/ship-gate-hook.ts`, `.claude/skills/aidlc-governance-verify/SKILL.md` |

## Verification Results

- `npm test`: **415 tests, 412 pass, 0 fail, 3 skipped** (pre-existing skips unchanged; was 411/408 in Plan 01 — 4 new cases added).
- `node --test dist-test/governance/ship-gate-hook.test.js`: **18 tests, 18 pass, 0 fail** (14 existing approval/plan/verify + 4 new eval cases).
- Manual: `.claude/skills/aidlc-governance-verify/SKILL.md` ordering reads step 4 capture-test-evidence → step 5 eval → audit → step 6 propagate-failures (step 5 inserted before the renumbered propagate step; the audit step is the existing `aidlc-governance-audit` skill invoked after this skill completes).

## Decisions Made

- **Forward-scoping guard via string compare:** `if (args.phaseNumber >= "10")` is safe because `PHASE_NUMBER_RE` (`/^\d{2}(?:\.\d+)?$/`) enforces 2-digit zero-padding, so lexical order matches numeric order at the "10" threshold. Documented inline in `ship-gate-hook.ts`. Legacy phases 06-09 shipped without eval evidence and are not retroactively failed.
- **Eval check placed after approval check:** both orderings (eval-before-approval or eval-after-approval) pass the RED tests as long as all required evidence is checked before `writeGateEvidence("ship")`. Approval-before-eval was chosen to minimize diff against the existing seed order in the test helpers (approval is seeded before the eval-evidence write in the new cases).
- **assertNoFailedEval re-derives pass/fail from the persisted record:** the ship gate reads `aggregate.recallBySeverity.critical` from the persisted EvalReport — even a forged record cannot raise the floor above what `aggregate` (severity sourced from the index at write time, `eval-harness.ts:123`) produced. This is the T-10-08 mitigation.

## Deviations from Plan

None — plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `test(10-02): RED — ship-gate eval blocking cases` (`49ea611`) — 2 of 4 new cases failed (missing-eval-fails-closed, failed-eval-fails-closed); 2 passed (passing-eval-proceeds, legacy-phase-skips) because shipGateHook did not yet check eval evidence — exactly the behavior the GREEN step gates.
- GREEN gate: `feat(10-02): GREEN — ship-gate eval blocking + verify:post eval step` (`e35306d`) — all 4 new cases pass + 14 existing stay green + full `npm test` green (415/412/0).
- REFACTOR gate: intentional no-op (09-01 decision — validator/ladder duplication is deliberate crash-isolation; no shared module to extract).

## Known Stubs

None. All ship-gate consumption is wired: `readEvalOrFail` calls `readEvalEvidence` (Plan 01), `assertNoFailedEval` enforces the D-05 floor, forward-scoping guard skips legacy phases, SKILL.md step 5 invokes `node dist/select/eval-cli.js <phaseNumber>`.

## Threat Flags

None. All threats in the plan's `<threat_model>` are mitigated:
- T-10-08 (tampering): `readEvalEvidence` re-validates via 4-rung ladder (Plan 01); `assertNoFailedEval` re-derives pass/fail from persisted `aggregate.recallBySeverity.critical`.
- T-10-09 (DoS false-positive block on legacy phases): forward-scoping guard `phaseNumber >= "10"` skips eval check for legacy phases; covered by test case (d).
- T-10-10 (silent critical-rule drop): D-05 floor enforced twice — Plan 01 at write time (exit 2 + failed report persisted), Plan 02 at ship time (`assertNoFailedEval` throws).
- T-10-11 (repudiation — verify:post step skipped): SKILL.md step 5 invokes dist entry directly; ship gate fails closed on missing eval evidence for phase >= 10.

No new security-relevant surface introduced beyond the plan's threat model.

## Self-Check: PASSED

- FOUND: `src/governance/ship-gate-hook.ts`
- FOUND: `src/governance/ship-gate-hook.test.ts`
- FOUND: `.claude/skills/aidlc-governance-verify/SKILL.md`
- FOUND: `49ea611` (RED commit)
- FOUND: `e35306d` (GREEN commit)