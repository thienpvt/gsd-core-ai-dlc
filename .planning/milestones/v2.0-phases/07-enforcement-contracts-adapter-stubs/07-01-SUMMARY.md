---
phase: 07-enforcement-contracts-adapter-stubs
plan: 01
subsystem: enforcement-contracts
tags: [enforcement, json-schema, types, contracts]
requires:
  - src/schema/task-signal.schema.json (gate-request taskSignal $ref target)
  - src/governance/audit-artifact.ts (GovernanceAudit shape formalized)
  - src/types.ts (Severity, Phase, TaskSignal, MatchedAxis enums mirrored)
provides:
  - src/schema/gate-request.schema.json ($id https://gsd.dev/schemas/gate-request.schema.json)
  - src/schema/gate-result.schema.json ($id https://gsd.dev/schemas/gate-result.schema.json)
  - src/schema/audit-artifact.schema.json ($id https://gsd.dev/schemas/audit-artifact.schema.json)
  - src/enforcement/types.ts (GateId, GateFinding, GateFindingEvidence, GateRequest, GateResult)
  - src/governance/gate-contracts.test.ts (6 cases; 07-04 appends malformed-fixture cases)
affects:
  - 07-02 (validateGateResult mirrors validate.ts pattern against gate-result schema)
  - 07-03 (GateAdapter interface + 7 stubs consume GateRequest/GateResult)
  - 07-04 (runAdapter wrapper + gate-contracts.test.ts malformed cases)
  - Phase 8 (gate hooks consume GateRequest/GateResult + GateAdapter)
  - Phase 9 (audit-artifact.schema.json validates Phase 5/9 audit writer output)
tech-stack:
  added: []
  patterns:
    - JSON Schema draft 2020-12 (mirror existing frontmatter/rule-index/task-signal convention)
    - x-binding custom annotation keyword (Ajv addKeyword no-op) — ENF-04 advisory/binding boundary
    - $ref to existing task-signal $id (single-source signal contract)
    - CJS type-only imports (import type for interfaces/unions)
key-files:
  created:
    - src/schema/gate-request.schema.json
    - src/schema/gate-result.schema.json
    - src/schema/audit-artifact.schema.json
    - src/enforcement/types.ts
    - src/governance/gate-contracts.test.ts
  modified: []
decisions:
  - 'gate-request + gate-result x-binding: "binding"; audit-artifact x-binding: "advisory" (ENF-04 boundary explicit in contracts)'
  - 'GateFindingEvidence is object form {path, lineRange?, url?} per 07-CONTEXT Claude Discretion (matches SAST output)'
  - 'GateId is a union (discuss|plan|execute|verify|ship), not bare string — Phase 8 type safety'
  - 'GateRequest.rules reuses AuditAppliedRule imported from ../governance/audit-artifact.js (DRY — single source for applied-rule shape)'
  - 'GateAdapter interface deferred to 07-03 adapters.ts (Area 2 — interface lives with the stubs)'
  - 'gate-request taskSignal uses $ref to task-signal $id (not inline) — single-sources the signal contract; requires addSchema before compile'
metrics:
  duration: 5
  completed: 2026-07-07
  tasks: 3
  files: 5
requirements-completed: [ENF-02, ENF-04]
status: complete
---

# Phase 7 Plan 1: Enforcement Contract Schemas + Types Summary

Three tool-agnostic enforcement contract schemas (draft 2020-12) + TypeScript mirror types + schema-compile smoke test — the foundation layer for Phase 7's gate contract system, with the advisory/binding boundary made explicit via x-binding annotation (ENF-04).

## What Was Built

### Task 1 — Three JSON Schema (draft 2020-12) contract files

**`src/schema/gate-request.schema.json`** — `$id https://gsd.dev/schemas/gate-request.schema.json`, x-binding: binding. The binding contract produced by Phase 8 gate hooks and consumed by `GateAdapter.evaluate()`. Fields: `gateId` (discuss/plan/execute/verify/ship), `phase`, `taskSignal` (a `$ref` to the existing task-signal schema by `$id` — single-sources the signal contract), `rules[]` (AuditAppliedRule shape), `requestedAt` (ISO-8601 strict).

**`src/schema/gate-result.schema.json`** — `$id https://gsd.dev/schemas/gate-result.schema.json`, x-binding: binding. The binding contract produced by `GateAdapter.evaluate()` and consumed by Phase 8 gate routing. Fields: `gateId`, `status` (pass|fail|waived — the enforcement decision), `findings[]` with optional structured `evidence` object (path + 1-based `[startLine, endLine]` lineRange + url), `evaluatedBy` (adapter name), `evaluatedAt`.

**`src/schema/audit-artifact.schema.json`** — `$id https://gsd.dev/schemas/audit-artifact.schema.json`, x-binding: advisory. Formalizes the EXISTING `GovernanceAudit` shape emitted by `src/governance/audit-artifact.ts` (Phase 5's `writeGovernanceAudit`) — documents what ships, does not invent a new shape. `skippedRule.reason` enum includes `explicitly-waived` (the AUDIT_SKIP_REASONS reconcile-only value absent from the raw SkipReason enum); `selector_reason` is the raw SkipReason enum verbatim (selector provenance).

### Task 2 — Enforcement TypeScript types (`src/enforcement/types.ts`)

5 exported types mirroring the 3 schemas:
- `GateId` = `"discuss" | "plan" | "execute" | "verify" | "ship"` (union — Phase 8 type safety)
- `GateFindingEvidence` = `{ path; lineRange?; url? }` (object form per 07-CONTEXT discretion)
- `GateFinding` = `{ id; severity; message; evidence? }`
- `GateRequest` = `{ gateId; phase; taskSignal; rules: AuditAppliedRule[]; requestedAt }` — **imports** `AuditAppliedRule` from `../governance/audit-artifact.js` rather than redeclaring (DRY — the applied-rule shape is single-sourced where the audit writer emits it)
- `GateResult` = `{ gateId; status; findings; evaluatedBy; evaluatedAt }`

`GateAdapter` interface intentionally NOT here — ships in 07-03's `adapters.ts` per Area 2 (interface lives with the stubs).

### Task 3 — Schema-compile smoke test (`src/governance/gate-contracts.test.ts`)

6 cases (3 schema-compile + 3 valid-fixture) under `src/governance/` (Phase 6 lesson: tsconfig compiles `src/**` only; `test/` is not compiled). Local Ajv 2020 strict instance per test (not the production validator that ships in 07-02) with the two MANDATORY pre-compile registrations:
1. `ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" })` — Ajv 2020 strict rejects unknown keywords at compile; all 3 schemas carry x-binding.
2. `ajv.addSchema(taskSignalSchema)` — gate-request's `taskSignal` is a `$ref` to task-signal.schema.json by `$id`; Ajv cannot resolve the `$ref` without the referenced schema registered first.

Malformed-fixture cases are deferred to 07-04 (after `validateGateResult` + `runAdapter` exist).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 verify probe missing `addFormats`**
- **Found during:** Task 1 verify step
- **Issue:** Plan's verify probe (`node -e "const Ajv2020=require('ajv/dist/2020');const ajv=new Ajv2020(...)..."`) omitted `addFormats(ajv)`. Ajv 2020 strict mode throws `unknown format "date-time" ignored in schema at path "#/properties/requestedAt"` at compile when `format: "date-time"` is used without `addFormats` registered — blocking the probe.
- **Fix:** Added `const addFormats=require('ajv-formats'); ... addFormats(ajv);` to the verify probe before the compile loop. All 3 schemas then compiled OK. (Task 3's test file already had `addFormats` per the plan's action text; the deviation was only in the verify probe command string.)
- **Files modified:** None (test-file was correct as written; only the inline probe command needed adjustment).
- **Commit:** aba3d35 (Task 1 commit, fix applied before commit).

No other deviations — plan executed as written.

## Verification

- `npm run build` exits 0 (3 new JSON schemas import via `resolveJsonModule`, 1 new TS module compiles under `tsc`).
- `npm test` exits 0: **197 pass / 0 fail** (199 total tests, 2 skipped — pre-existing). The 6 new gate-contracts cases all pass:
  - `gate-request schema compiles under Ajv 2020 strict`
  - `gate-result schema compiles under Ajv 2020 strict`
  - `audit-artifact schema compiles under Ajv 2020 strict`
  - `gate-request schema accepts a valid fixture`
  - `gate-result schema accepts a valid fixture`
  - `audit-artifact schema accepts a valid GovernanceAudit fixture`
- Each schema compiles under Ajv 2020 strict mode (separate `node -e` probe — see Task 1 verify).
- `audit-artifact.schema.json` accepts a real `GovernanceAudit`-shaped fixture (shape compatibility with Phase 5 proven).
- No new runtime deps (existing `ajv` + `ajv-formats` only). Overlay-not-fork honored: only `src/` + `.planning/` touched, zero edits to `gsd-core/` internals.

## Self-Check: PASSED

Files created (all FOUND on disk):
- `src/schema/gate-request.schema.json`
- `src/schema/gate-result.schema.json`
- `src/schema/audit-artifact.schema.json`
- `src/enforcement/types.ts`
- `src/governance/gate-contracts.test.ts`

Commits (all FOUND in `git log`):
- `aba3d35`: feat(07-01): add 3 enforcement contract schemas (gate-request, gate-result, audit-artifact)
- `42a4417`: feat(07-01): add enforcement TypeScript types (GateId, GateRequest, GateResult, GateFinding)
- `eadc27d`: test(07-01): schema-compile + valid-fixture tests for 3 enforcement contracts

## Threat Model

Per the plan's `<threat_model>`:
- **T-07-01 (Tampering, schema files, medium, mitigate):** Schema-compile test (Task 3 cases 1-3) proves each schema compiles under Ajv 2020 strict at module load; a typo throws immediately. Mitigated.
- **T-07-02 (Integrity, audit-artifact vs GovernanceAudit, high, mitigate):** Schema formalizes the existing GovernanceAudit shape field-for-field (Task 1 read `audit-artifact.ts` lines 7-48); Task 3 case 6 asserts a real GovernanceAudit fixture passes. Mitigated.
- **T-07-03 (Info Disclosure, x-binding, low, accept):** x-binding is an annotation (not validated); zero surface. Accepted.
- **T-07-SC (Tampering, npm installs, low, accept):** No new runtime deps. Accepted.

No new threat surface introduced beyond what the plan's threat model anticipated.
