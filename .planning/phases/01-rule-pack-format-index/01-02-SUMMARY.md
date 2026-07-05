---
phase: 01-rule-pack-format-index
plan: 02
subsystem: infra
tags: [typescript, json-schema, ajv, draft-2020-12, frontmatter, node-test, tdd, rule-pack, validation]

requires:
  - phase: 01-01
    provides: "CommonJS/tsc scaffold, minimal frontmatter.schema.json + Ajv2020 validate.ts, ParsedRule/Frontmatter types, node:test toolchain, require-mfa.md fixture"
provides:
  - "Full PACK-01 frontmatter contract: multi-axis triggers (taskType/keywords/paths/exclude), closed taskType enum, phases enum, severity enum, all required fields"
  - "PACK-03 advisory/binding classification enforced at the schema layer: allOf if/then rejects a binding rule that names no enforcement contract (D-15)"
  - "D-03 always-in-phase escape hatch preserved and test-locked: triggers: {} validates (no minProperties)"
  - "Hardened validate.ts error formatter surfacing missingProperty + allowedValues, with the 01-01 (file, errors) signature preserved"
  - "Two table-driven test suites (frontmatter.test.ts, classification.test.ts) that are the data-contract regression net every later phase inherits"
affects: [01-03, 01-04, phase-02-select, phase-05-audit]

tech-stack:
  added: []
  patterns:
    - "Ajv strict:true kept ON for every check EXCEPT strictRequired:false — strictRequired cannot resolve an if/then-required property back to root properties, so the D-15 binding->enforcement if/then would otherwise throw at compile time"
    - "single-sourced $defs (taskTypeArray, stringArray) shared by positive and exclude trigger axes so a Phase 2 enum change is a one-line edit"
    - "table-driven node:test suites with a makeValidFrontmatter() factory returning a fresh literal per call (no cross-case mutation leak); schema JSON never pasted into the test — the schema is the system under test"
    - "if/then adds enforcement to required only; enforcement declared in top-level properties so additionalProperties:false coexists with the conditional without unevaluatedProperties (Pitfall 3)"

key-files:
  created:
    - "src/schema/frontmatter.test.ts"
    - "src/schema/classification.test.ts"
  modified:
    - "src/schema/frontmatter.schema.json"
    - "src/schema/validate.ts"

key-decisions:
  - "Kept formatErrors signature as (file, errors) — the plan action text said (errors, file), but 01-01 locked (file, errors) and src/rules/load.ts calls it that way; flipping would break the loader compile. Enriched the body (missingProperty + allowedValues) instead of reordering params."
  - "Set Ajv strictRequired:false (its documented default) while leaving strict:true — the allOf if/then required:[enforcement] pattern throws strictRequired at compile time because the property is declared at root, not in the then-branch. Disabling only strictRequired keeps strictSchema/strictTypes/strictTuples and the RESEARCH schema shape verbatim."
  - "taskType and phases enums accepted as v1 starter sets, single-sourced in $defs/enum, flagged for Phase 2 confirmation before the selector binds to taskType (records Codex 01-REVIEWS MEDIUM finding; no human checkpoint since later revision is a one-line edit)."

patterns-established:
  - "TDD RED->GREEN at plan granularity: test(01-02) commit (23 tests, 4 red) precedes feat(01-02); the two suites were authored against the future hardened schema, not the current minimal one."
  - "Schema-compile-as-a-test: importing validate.js throws if the schema fails Ajv strict, so a compile regression surfaces as an import-time test failure rather than a silent accept."

requirements-completed: [PACK-01, PACK-03]

coverage:
  - id: D1
    description: "Full PACK-01 frontmatter contract: a fully valid object validates; each missing required field is rejected with a field-named error; multi-axis and exclude-only triggers validate; out-of-enum severity/scope/classification/phases/taskType and unknown top-level keys are rejected."
    requirement: "PACK-01"
    verification:
      - kind: unit
        ref: "src/schema/frontmatter.test.ts#rejects frontmatter missing required field (loop over 7 required fields) + enum-rejection + unknown-key cases"
        status: pass
    human_judgment: false
  - id: D2
    description: "PACK-03 advisory/binding classification: a binding rule naming no enforcement contract is rejected (D-15); an advisory rule with no enforcement is accepted (D-14); binding-with-enforcement and the critical/advisory + low/binding independence combos all validate."
    requirement: "PACK-03"
    verification:
      - kind: unit
        ref: "src/schema/classification.test.ts#rejects a binding rule that names no enforcement contract (D-15) + independence combos"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-03 always-in-phase escape hatch preserved: triggers: {} validates because the schema sets no minProperties and every axis is optional — the phase's #1 recall guarantee is not silently broken."
    verification:
      - kind: unit
        ref: "src/schema/frontmatter.test.ts#accepts an empty triggers object (D-03 always-in-phase escape hatch)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The full schema compiles under Ajv strict (with strictRequired:false) and the 01-01 smoke test still passes — require-mfa.md validates unchanged against the hardened schema."
    verification:
      - kind: unit
        ref: "src/schema/frontmatter.test.ts#the validator is compiled once at module load"
        status: pass
      - kind: e2e
        ref: "src/cli/cli.smoke.test.ts#built CLI build-index emits a body-free index carrying the rule summary"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-05
status: complete
---

# Phase 1 Plan 02: Frontmatter Contract Hardening Summary

**Full PACK-01 multi-axis trigger schema + PACK-03 binding/enforcement if/then, validated by Ajv draft 2020-12 under strict mode, driven test-first by two table-driven suites (25/25 green).**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-05T17:57 local (+07:00)
- **Completed:** 2026-07-05T18:15:20+07:00
- **Tasks:** 2 of 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Hardened `frontmatter.schema.json` from the 01-01 walking-skeleton stub into the full PACK-01 authoring contract: the multi-axis `triggers` object (`taskType`/`keywords`/`paths`/`exclude`) with NO `minProperties`, a closed `$defs.taskTypeArray` enum shared by the positive and `exclude` axes (D-04), the `phases` enum (D-01/A1), and the `severity` enum (D-13).
- Enforced PACK-03 at the schema layer via a single `allOf` if/then: a `binding` rule that names no `enforcement` contract is now rejected at validation time (D-15), while `severity` and `classification` stay independent required axes (D-14).
- Preserved the D-03 always-in-phase escape hatch and locked it with a dedicated test — `triggers: {}` validates, so a `critical` rule can still guarantee it never silently misses within its phase/scope (the phase's #1 recall guarantee).
- Delivered two table-driven `node:test` suites (23 schema assertions) that are the RED driver and the permanent regression net: they were authored against the hardened contract, failed 4/23 against the minimal schema (RED), and pass fully after hardening (GREEN).
- Enriched `formatErrors` to surface `params.missingProperty` and `params.allowedValues`, so an author sees exactly which field failed and the allowed set — without breaking the `(file, errors)` signature `src/rules/load.ts` depends on.

## Task Commits

Each task was committed atomically (plan `type: tdd`, RED before GREEN):

1. **Task 1 (RED): Table-driven failing tests for full frontmatter schema + classification** - `a95a0f4` (test) — 23 tests, 19 pass / 4 fail against 01-01's minimal schema
2. **Task 2 (GREEN): Harden frontmatter.schema.json to the full contract + error formatter** - `ae16cd7` (feat) — full suite 25/25 green (23 schema + 2 skeleton smoke)

_TDD note: `test(01-02)` precedes `feat(01-02)`; the 4 RED failures (multi-axis triggers, exclude-only triggers, out-of-enum phases, binding-without-enforcement) are exactly the behaviors Task 2 turned green._

## Files Created/Modified

- `src/schema/frontmatter.test.ts` (created) - PACK-01 table-driven acceptance/rejection: base-valid, empty-triggers (D-03), exclude-only, multi-axis, a loop deleting each of the 7 required fields asserting a field-named error, enum rejections (severity/scope/classification/phases/taskType), unknown-key rejection
- `src/schema/classification.test.ts` (created) - PACK-03: binding-without-enforcement rejected (D-15), advisory-without-enforcement accepted (D-14), binding-with-enforcement accepted, critical/advisory + low/binding independence combos
- `src/schema/frontmatter.schema.json` (modified) - full draft 2020-12 contract: multi-axis triggers (no minProperties), `$defs.taskTypeArray` + `$defs.stringArray`, phases/severity enums, `allOf` if/then binding->enforcement, `additionalProperties:false` throughout
- `src/schema/validate.ts` (modified) - `strictRequired:false` so the if/then compiles under Ajv strict; `formatErrors` now surfaces `missingProperty` + `allowedValues`; doc comment updated to reflect the full contract

## Decisions Made

- **Kept `formatErrors(file, errors)` signature** rather than the plan's literal `(errors, file)`: 01-01 locked `(file, errors)` and `src/rules/load.ts` already calls it that way. Flipping the parameter order would have broken the loader's compile (out of this plan's scope). Enriched the body to name the missing field / allowed values instead — the plan's intent (field-named errors) is met without the signature churn.
- **`Ajv strictRequired:false`** (its documented Ajv default) while leaving `strict:true`: the RESEARCH-specified `allOf` if/then `required:["enforcement"]` throws `strictRequired` at compile time because `enforcement` is declared at the root, not inside the `then` branch. Disabling only `strictRequired` keeps `strictSchema`/`strictTypes`/`strictTuples` on and preserves the RESEARCH schema shape verbatim (no `unevaluatedProperties` needed — Pitfall 3).
- **`taskType`/`phases` enums are v1 starter sets**, single-sourced in `$defs`/enum, flagged for Phase 2 confirmation before the selector binds to `taskType` (records the Codex 01-REVIEWS MEDIUM finding). No human checkpoint inserted — later revision is a one-line edit and no Phase 1 code binds to the members.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ajv `strictRequired` rejected the D-15 if/then at schema-compile time**
- **Found during:** Task 2 (GREEN) first build
- **Issue:** `npm test` aborted with `strict mode: required property "enforcement" is not defined at "#/allOf/0/then" (strictRequired)`. Under `strict:true`, Ajv's `strictRequired` check does not resolve a property named in a nested `then.required` back to the root `properties`, so the schema failed to compile and every test errored at module load.
- **Fix:** Constructed the validator with `strict: true, strictRequired: false`. `strictRequired`'s documented default is already `false`; setting it explicitly restores that default while keeping all other strict checks on. The schema JSON itself is unchanged from the RESEARCH shape.
- **Files modified:** src/schema/validate.ts
- **Verification:** `npm test` → 25/25 green; the binding-without-enforcement rejection (D-15) and advisory-without-enforcement acceptance (D-14) both assert correctly, so the relaxed setting did not weaken the contract.
- **Committed in:** ae16cd7 (GREEN commit)

**2. [Rule 3 - Blocking] `formatErrors` parameter order in the plan action text contradicted the locked 01-01 contract**
- **Found during:** Task 2 (GREEN)
- **Issue:** The plan action text specified `formatErrors(errors, file)`, but 01-01 shipped `formatErrors(file, errors)` and `src/rules/load.ts` (out of this plan's `files_modified`) calls it in that order. Reordering would have broken the loader's compile.
- **Fix:** Preserved the `(file, errors)` signature and instead enriched the body to append `(missing '<field>')` and `(allowed: ...)` from Ajv `params`, satisfying the plan's actual acceptance criterion (errors name the offending field) without touching an out-of-scope file.
- **Files modified:** src/schema/validate.ts
- **Verification:** the missing-required-field test loop asserts the output contains each deleted field name; all pass. `src/rules/load.ts` still compiles unchanged.
- **Committed in:** ae16cd7 (GREEN commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking)
**Impact on plan:** Both were necessary to compile the hardened schema and keep the existing loader building. No scope creep — the schema shape matches RESEARCH verbatim and the contract behaviors (D-01..D-04, D-13, D-14, D-15) are all enforced as specified.

## Issues Encountered

- None beyond the two blocking build-config items above. The RED phase produced exactly the 4 predicted failures (multi-axis triggers, exclude-only triggers, out-of-enum phases, binding-without-enforcement), confirming the tests targeted the right gaps before implementation.

## User Setup Required

None - no external service configuration required. Pure local build-time schema validation over authored Markdown frontmatter.

## Next Phase Readiness

- The full frontmatter data contract (PACK-01) and advisory/binding classification (PACK-03) are locked and test-covered — the shape every later phase inherits is now hardened, not a stub.
- **01-03** adds the store layout + scope precedence/override (`superseded`, D-09/D-11/D-12) and `detailPath` resolution/traversal guard on top of this validated frontmatter.
- **01-04** adds the no-body `rule-index.schema.json` + fast-check property invariant + build-fails-loudly on body leak.
- **Phase 2 flag:** the `taskType`/`phases` enums are v1 starter sets, single-sourced in `$defs`/enum; confirm the members before the selector depends on `taskType` equality (RESEARCH A1/A2).
- No blockers.

---
*Phase: 01-rule-pack-format-index*
*Completed: 2026-07-05*

## Self-Check: PASSED

Files verified present: src/schema/frontmatter.test.ts, src/schema/classification.test.ts, src/schema/frontmatter.schema.json, src/schema/validate.ts.

Commits verified present: a95a0f4 (test/RED — 23 tests, 4 red), ae16cd7 (feat/GREEN — full suite 25/25).

Test result: `npm test` exits 0 — 25 tests pass (23 schema/classification + 2 skeleton smoke).
