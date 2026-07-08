---
phase: 07-enforcement-contracts-adapter-stubs
plan: 02
subsystem: enforcement
tags: [enforcement, validation, ajv, tdd, runtime-contract]
requires:
  - 07-01 (gate-result.schema.json, src/enforcement/types.ts GateResult)
provides:
  - src/enforcement/validate-gate-result.ts (validateGateResult assert — ENF-02 runtime integrity gate)
affects:
  - 07-04 (runAdapter wraps evaluate() with validateGateResult — the hard-fail boundary)
tech-stack:
  added: []
  patterns:
    - "Ajv 2020 + addFormats + compile-once + formatErrors (4th instance of validate.ts pattern)"
    - "TS assertion function (asserts result is GateResult) narrows type for callers"
    - "ajv.addKeyword({ keyword: 'x-binding', type: 'object', schemaType: 'string' }) before compile — Ajv 2020 strict rejects unknown keywords"
key-files:
  created:
    - src/enforcement/validate-gate-result.ts
    - src/enforcement/validate-gate-result.test.ts
  modified: []
decisions:
  - "validateGateResult mirrors validate-signal.ts exactly (closest analog) — single Ajv2020 instance, addFormats, compile-once, asserts result is GateResult, throws 'invalid gate-result:\\n<formatErrors lines>'"
  - "strictRequired:false matches validate.ts (canonical first instance) — future-proof for if/then branches on gate-result; harmless now"
  - "x-binding keyword registered via ajv.addKeyword before compile — gate-result.schema.json carries x-binding and Ajv 2020 strict rejects unknown keywords; without this the module fails to load (fail-closed, T-07-05)"
  - "gate-result has no $ref so no addSchema needed (unlike 07-01's gate-request compile which references task-signal)"
  - "formatErrors surfaces missingProperty + allowedValues + additionalProperty so every rejection is actionable (auditor can see which field, which enum, which stray key)"
metrics:
  duration: 4 min
  completed: 2026-07-07
  tasks: 2
  files: 2
requirements-completed: [ENF-02]
status: complete
---

# Phase 7 Plan 02: validateGateResult Assert Summary

Implemented `validateGateResult` — the Ajv 2020 runtime validator for the gate-result contract. This is the fourth instance of the canonical validate.ts pattern (validateFrontmatter → validateIndex → validateSignal → validateGateResult) and the ENF-02 runtime integrity gate: malformed adapter output is rejected loudly before it reaches any consumer, preventing silent audit-trail corruption. 07-04's `runAdapter` wrapper will call this at the `evaluate()` boundary.

## What Was Built

### Task 1 — RED (commit `67a0b8a`): failing tests pinning the contract

`src/enforcement/validate-gate-result.test.ts` — 12 TDD cases driving the gate-result contract via table-driven acceptance/rejection:

- **Compile-once guard** — asserts `typeof validateGateResult === "function"` (a schema typo at module load fails the whole file).
- **Valid fixtures accepted** — base gate-result, gate-result with populated findings (evidence object form), `waived` status.
- **Missing required rejected** — 5-case loop over `[gateId, status, findings, evaluatedBy, evaluatedAt]`, each asserts `throws` + error prefixed `invalid gate-result`.
- **Out-of-enum rejected** — `status: "maybe"`, `gateId: "review"`, `finding.severity: "blocker"`.
- **Bad ISO-8601 rejected** — `evaluatedAt: "2026/07/07"` (slashes are not ISO-8601 separators; the TD-01 strictness contract applied to gate-result).
- **Closed shape rejected** — unknown top-level key `extra` trips `additionalProperties: false`.
- **Malformed findings rejected** — finding missing required `id`.
- **Actionable error** — message includes the failing field/instancePath, not a bare "schema rejected".

RED signal confirmed: `tsc -p tsconfig.json` errored TS2307 (module `./validate-gate-result.js` not found) before Task 2.

### Task 2 — GREEN (commit `02dff05`): implement the validator

`src/enforcement/validate-gate-result.ts` — 88 lines mirroring `src/select/validate-signal.ts` structurally:

- `import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js"`
- `import addFormats from "ajv-formats"`
- `import schema from "../schema/gate-result.schema.json"` (resolveJsonModule — no import attribute, CJS require)
- `import type { GateResult } from "./types.js"`
- `new Ajv2020({ allErrors: true, strict: true, strictRequired: false })` — matches validate.ts options
- `addFormats(ajv)` — enables the `date-time` format check on `evaluatedAt`
- `ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" })` — **MANDATORY** before compile. gate-result.schema.json carries `x-binding: "binding"` and Ajv 2020 strict mode rejects unknown keywords at compile. Without this, the module fails to load (fail-closed, T-07-05).
- `const validate: ValidateFunction = ajv.compile(schema)` — compiled once at module load
- Local `formatErrors(errors)` — mirrors `formatSignalErrors`: surfaces `instancePath || "(root)"`, `params.missingProperty`, `params.allowedValues`, and `params.additionalProperty` (borrowed from validate-index.ts) so every rejection line names the failing field and the permitted set.
- `export function validateGateResult(result: unknown): asserts result is GateResult` — TS assertion function; throws `invalid gate-result:\n<formatErrors lines>` on malformed input.

All 12 RED cases turned GREEN; full suite 215 pass / 0 fail; `npm run build` clean.

## TDD Gate Compliance

RED gate (`test(07-02)` commit `67a0b8a`) precedes GREEN gate (`feat(07-02)` commit `02dff05`). RED phase confirmed via `tsc` TS2307 (module not found) before implementation existed. No REFACTOR commit needed — the validator is 88 lines and mirrors the canonical pattern.

## Verification

- `npm run build` exits 0 (tsc -p tsconfig.build.json compiles the new module into dist/)
- `npm run build:test` exits 0 (tsc -p tsconfig.json compiles the test into dist-test/)
- `npm test` exits 0 — 215 pass / 0 fail / 2 skipped; all 12 validate-gate-result cases GREEN
- Grep contract (acceptance criteria):
  - `Ajv2020` appears on import + construction lines (matches validate-signal.ts precedent)
  - `addFormats` appears on import + invocation lines (matches validate-signal.ts precedent)
  - `asserts result is GateResult` returns 1 (TS assertion signature present)
  - `gate-result.schema.json` imported (the 07-01 schema is the system under test)
  - `addKeyword` returns 1 (x-binding registration before compile)
- Pattern fidelity: the validator is the 4th instance of validate.ts — structure is byte-comparable to validate-signal.ts (closest analog)

## Deviations from Plan

None — plan executed exactly as written. The x-binding keyword registration flagged as MANDATORY in the plan was implemented verbatim; no Rule 1-4 deviations triggered during execution.

## Known Stubs

None — the validator is fully functional; no placeholder/TODO/coming-soon patterns. 07-04 will wire it into `runAdapter`.

## Threat Flags

None — no new security surface introduced beyond what 07-01's threat model documented. The validator is pure structural validation (no I/O, no clock, no network); threat register T-07-04 (Tampering) and T-07-05 (Integrity, compile-once) mitigated as planned.

## Self-Check

- `src/enforcement/validate-gate-result.ts` — FOUND (created this plan)
- `src/enforcement/validate-gate-result.test.ts` — FOUND (created this plan)
- Commit `67a0b8a` (test(07-02) RED) — FOUND in git log
- Commit `02dff05` (feat(07-02) GREEN) — FOUND in git log

## Self-Check: PASSED
