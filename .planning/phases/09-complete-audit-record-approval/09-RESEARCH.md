# Phase 9: Complete Audit Record & Approval - Research

**Researched:** 2026-07-07
**Domain:** Audit artifact enrichment + human approval checkpoint + tool-agnostic contract layer
**Confidence:** HIGH (all claims verified against source in this session)

## Summary

Phase 9 extends four already-proven primitives in this repo: (1) the v1 `GovernanceAudit` writer (`src/governance/audit-artifact.ts`), (2) the per-gate durable evidence store (`src/governance/gate-evidence-store.ts`), (3) the `runAdapter` validation choke point (`src/enforcement/run-adapter.ts`), and (4) the ship-gate fail-closed prior-evidence check (`src/governance/ship-gate-hook.ts`). Each v2 increment is a thin additive layer over these — no new primitive invented, no contract forked, no new runtime dep. The planner can split Phase 9 into four parallel TDD plans matching CONTEXT D-14's module list: approval store+schema, test-evidence capture, audit enrichment, ship-gate approval blocking.

One load-bearing ambiguity surfaces in D-01: it names "the existing GSD custom `run-tests.cjs`" as the AUDIT-04 input. That file does not exist in this overlay repo, nor in the locally-installed `gsd-core` (which ships only `bin/`, `contexts/`, `references/`, `templates/`, `workflows/` — no `scripts/`). The overlay's actual test command is `node --test "dist-test/**/*.test.js"`. Node's built-in reporter set is `tap` (default), `spec`, `dot`, `junit`, `lcov` — there is no built-in `json` reporter. The planner MUST reconcile D-01's "run-tests.cjs" language with the reality: the AUDIT-04 source is `node --test` TAP output, parsed for `# tests N`, `# pass N`, `# fail N` summary lines (or `--test-reporter=junit` XML for richer per-case structure).

**Primary recommendation:** Parse `node --test --test-reporter=tap` stdout (the default and existing `npm test` output) for the structured pass/fail counts plus a malformed-rejection guard that requires the `# tests N` summary line to be present and numeric. Treat any output without those summary lines as malformed (hard fail per D-04). Do NOT add a `json` reporter dependency.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test-Runner Output Ingestion (AUDIT-04)**
- **D-01:** Parse the existing GSD custom `run-tests.cjs` structured output as the single-sourced test-evidence input — no JUnit XML, no generic exit-code-only path.
- **D-02:** Persist test evidence under `.planning/governance/tests/{NN}.json` as durable state (matches the gate-evidence-store pattern), not inline-only in the audit artifact.
- **D-03:** The `verify:post` hook captures real runner output — the model never authors test results. The hook invokes/parses structured output, then writes evidence; narration is rejected.
- **D-04:** Malformed runner output is a hard fail (matches `runAdapter` / `validateGateResult` boundary) — never warn-and-continue into a corrupted audit trail.

**Human Approval Checkpoint Schema (APPR-01)**
- **D-05:** Approval request shape: `approvalId`, `phase`, `gateId`, `artifactPath`, `requestedBy`, `requestedAt`, `decision` (`pending` | `approved` | `rejected` | `waived`), `decidedBy`, `decidedAt`, `rationale`.
- **D-06:** Approvals persist under `.planning/governance/approvals/{NN}.json` and are produced/consumed through `runAdapter(human-approval, request)` — reuse the Phase 7/8 contract boundary, no standalone ad-hoc store.
- **D-07:** The ship gate creates pending approval requests for required approvals; `decidedBy`/`decidedAt` stay blank until a human resolves them. The model never auto-decides approvals (that would violate human-in-the-loop).
- **D-08:** Ship gate fails closed on `pending` or `rejected` approvals — matches the GATE-05 fail-closed prior-evidence pattern from Phase 8.

**Audit Artifact Enrichment (AUDIT-03/05/06)**
- **D-09:** Bump `schema_version` to 2; add optional `requirements_covered`, `tests_executed`, `remaining_risks`, `approvals` fields. v1 required fields stay required and byte-stable so prior regeneration semantics hold.
- **D-10:** Requirements covered (REQ-IDs) are machine-extracted from the phase `success_criteria` / REQUIREMENTS.md traceability table — not executor tags, not user manual entry, not model narration.
- **D-11:** Remaining risks are machine-collected at ship time from the phase threat model / VERIFICATION.md gaps + any deferred items in CONTEXT.md `<deferred>` — not model-authored free-text and never silently empty.
- **D-12:** Approvals (AUDIT-06) are folded into the audit by reading `.planning/governance/approvals/{NN}.json` and embedding an approval summary (who + decision). Single-sourced from the approval store; never re-queried through the adapter at audit time.

**Hook Wiring & File Layout**
- **D-13:** Extend the existing `verify:post` audit hook to read test evidence + approvals + risks and emit the enriched GOVERNANCE.md. The ship gate then consumes the enriched audit. No new `ship:post` audit writer, no separate `audit:pre` hook.
- **D-14:** New source modules: `src/governance/approval-store.ts`, `src/governance/test-evidence.ts`, `src/governance/audit-enrich.ts` — thin, reusing existing `atomicWriteFile` / `readSelection` / `runAdapter` helpers. Do not fold all logic into `audit-artifact.ts`; do not create one mega-module.
- **D-15:** New schemas: `src/schema/approval.schema.json`, `src/schema/test-evidence.schema.json` (draft 2020-12). Bump `src/schema/audit-artifact.schema.json` to v2 with the four optional fields. Runtime validation via the existing Ajv/validate pattern.
- **D-16:** Extend the existing `aidlc-governance` capability manifest — the ship gate now reads approvals + the enriched audit. Do not create a new `aidlc-approval` or `aidlc-audit` capability.

### Claude's Discretion
- Exact function names within the new modules are flexible, but keep the existing style (thin wrappers, pure helpers, assertXxx guards, tests under `src/**`).
- Planner may split Phase 9 into separate TDD plans for test-evidence capture, approval store/schema, audit enrichment, and ship-gate approval blocking if that gives cleaner tests.
- Exact REQ-ID extraction mechanism is flexible as long as it is machine-derived from traceability and deterministic.

### Deferred Ideas (OUT OF SCOPE)
- Real scanner/policy integrations beyond no-op stubs — future milestone after v2.0.
- Rollback plan evidence (GATE-05 mentions it) — Phase 9 checks for absence and reports missing, but authoring rollback plans stays a future concern unless the planner finds a minimal placeholder is required for ship-gate completeness.
- Dynamic adapter loading through the capability registry — future milestone.
- Operations-phase (deploy/monitor) governance — OPS-01, explicitly out of scope for v2.0.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIT-03 | The audit artifact records requirements covered by the phase (which REQ-IDs the work addressed) | Machine-extracted from REQUIREMENTS.md traceability table + phase `success_criteria` (D-10). Implementation: parser that scans the traceability section for the phase's REQ-IDs and emits a `requirements_covered: string[]` field on `GovernanceAudit` v2. Must be deterministic regex/markdown-AST extraction, never model narration. |
| AUDIT-04 | The audit artifact records tests executed and their results, derived from real test-runner output (not model narration) | New `test-evidence.ts` module parses `node --test` TAP output (the existing `npm test` runner), persists under `.planning/governance/tests/{NN}.json` (D-02). The `verify:post` hook invokes the runner and captures real output (D-03); malformed output hard-fails (D-04). |
| AUDIT-05 | The audit artifact records remaining risks known at ship time | Machine-collected from VERIFICATION.md gaps + CONTEXT.md `<deferred>` section (D-11). Never silently empty — if no risks found, emit explicit `[{ id: "none-identified", ... }]` placeholder so absence is auditable, not just missing. |
| AUDIT-06 | The audit artifact records approvals required and who granted them | Folded into the audit by reading `.planning/governance/approvals/{NN}.json` (D-12). The approval store is single-sourced; the audit embeds a summary view, not a re-query through the adapter. |
| APPR-01 | A human approval checkpoint schema captures approval requests, the approver, the artifact under approval, and the decision — produced and consumed through the tool-agnostic contract layer | New `approval.schema.json` (draft 2020-12) with the D-05 10-field shape; new `approval-store.ts` mirrors `gate-evidence-store.ts`; produced/consumed through `runAdapter(human-approval, request)` so the existing ENF-02 malformed-hard-fail boundary covers approvals (D-06). Ship gate creates pending requests (D-07) and blocks on `pending`/`rejected` (D-08). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Node `>=22.0.0`, npm `>=10.0.0`** — do not raise the floor.
- **CommonJS** (`require()`, `.cjs`/`.js` shims, no `"type": "module"`). All new modules author as CJS.
- **tsc-only build** (`tsc -p tsconfig.build.json`). No bundler.
- **No new runtime deps.** `ajv@8.20.0`, `ajv-formats@3.0.1`, `gray-matter@4.0.3`, `picomatch@4.0.5` already installed. `js-yaml` is NOT in this overlay's deps (it lives in gsd-core's deps); do not assume `js-yaml` is resolvable here.
- **JSON Schema draft 2020-12 + Ajv** for binding/advisory contracts. `x-binding` keyword must be registered via `ajv.addKeyword` before compile under Ajv 2020 strict mode.
- **Tests** via `node:test` + `node:assert/strict`, run through `node --test "dist-test/**/*.test.js"`. No jest/vitest.
- **Overlay-not-fork.** Extend via the installed capability surface (`.gsd/capabilities/aidlc-governance/capability.json`); do not patch gsd-core internals.
- **Deterministic + auditable.** No clock inside persisted selection state; timestamps are wrapper metadata. No model-authored free-text in audit fields.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Test-evidence capture (AUDIT-04) | Hook layer (verify:post) | test-evidence.ts parser | Hook invokes the runner; parser is a pure helper that transforms TAP→structured record. Storage in `.planning/governance/tests/{NN}.json`. |
| Approval schema + store (APPR-01) | Contract layer (JSON Schema) + durable store | Adapter boundary (runAdapter human-approval stub) | Schema is the contract; store is single-sourced persistence; adapter boundary preserves ENF-02 malformed-hard-fail. |
| Approval decision workflow | Hook layer (ship:pre) | approval-store.ts | Ship gate creates pending requests (D-07), reads decisions, blocks on pending/rejected (D-08). Human decides out-of-band; the model never writes `decidedBy`. |
| Requirements covered (AUDIT-03) | Audit enrichment (audit-enrich.ts) | REQUIREMENTS.md traceability table | Pure helper reads the traceability markdown and emits REQ-IDs; deterministic extraction, never narration. |
| Remaining risks (AUDIT-05) | Audit enrichment (audit-enrich.ts) | VERIFICATION.md + CONTEXT.md `<deferred>` | Pure helper aggregates known gaps; absence is an explicit record, never silent. |
| Audit artifact v2 bump | audit-artifact.ts + audit-artifact.schema.json | audit-enrich.ts (preparer) | The writer stays the single authority for byte-stable regeneration; enrichment prepares optional fields and passes them in. |
| Ship-gate approval blocking | ship-gate-hook.ts | approval-store.ts | Existing `readRequiredEvidence` / `assertNonBlocking` pattern extended with one more fail-closed check. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `>=22.0.0` | Runtime | CLAUDE.md engine floor. Verified `[VERIFIED: package.json engines]` |
| TypeScript | `^6.0.3` | Implementation | Matches GSD Core. `[VERIFIED: package.json devDependencies]` |
| `ajv` | `8.20.0` | JSON Schema validator (draft 2020-12) | Already installed. Used by `validate-gate-result.ts` and `validate.ts`. New `validate-approval.ts` / `validate-test-evidence.ts` follow the same pattern. `[VERIFIED: package.json dependencies]` |
| `ajv-formats` | `3.0.1` | Format assertions (date-time, uri) | Paired with `ajv@8.x`. Already installed. `[VERIFIED: package.json dependencies]` |
| JSON Schema draft 2020-12 | n/a | Contract layer | All existing schemas (`gate-request`, `gate-result`, `audit-artifact`, `task-signal`, `frontmatter`, `rule-index`) use `$schema: "https://json-schema.org/draft/2020-12/schema"`. `[VERIFIED: src/schema/*.schema.json]` |
| `node:test` + `node:assert/strict` | built-in | Test framework | All 22 existing test files use this. No jest/vitest. `[VERIFIED: src/**/*.test.ts]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `picomatch` | `4.0.5` | Glob matching | Already installed. Use only if a selector needs it (Phase 9 doesn't add new selectors). `[VERIFIED: package.json]` |

No new dependencies introduced in Phase 9.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TAP output parsing | `--test-reporter=junit` XML | TAP has simpler summary lines (`# tests N`, `# pass N`, `# fail N`); JUnit gives richer per-case detail but requires XML parsing. Decision in CONTEXT D-01 explicitly says "no JUnit XML" — TAP is the path. |
| Built-in TAP reporter | Custom Node `--test-reporter=./custom.js` | Adds a file and maintenance. TAP summary lines suffice for AUDIT-04 (pass count, fail count, total). Skip. |
| Approval store as JSON file per approval | SQLite/LevelDB | Overkill — bounded count of approvals per phase, atomic write already solves concurrency (TD-03). Stick with the gate-evidence-store pattern. |

**Installation:** None. All deps already installed.

**Version verification:** `package.json` confirmed `ajv@8.20.0`, `ajv-formats@3.0.1`, `gray-matter@4.0.3`, `picomatch@4.0.5`, `typescript@^6.0.3`, Node `>=22.0.0`. Locally running Node v24.14.0 (`node --version`).

## Package Legitimacy Audit

Phase 9 installs zero new packages. The audit is therefore trivially satisfied — no packages to vet.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
REQUIREMENTS.md ─┐
                 ├─→ audit-enrich.ts ────┐
VERIFICATION.md ─┤    (REQ-IDs + risks)  │
                 │                       │
CONTEXT.md       │                       │
  <deferred> ────┘                       │
                                         ▼
┌──────────────────────────┐    .planning/governance/
│  verify:post hook        │    tests/{NN}.json
│  1. runAdapter(verify)   │    approvals/{NN}.json
│     → gates/{NN}-verify  │    gates/{NN}-{plan,verify,ship}.json
│  2. node --test (TAP)    │            ▲
│     → tests/{NN}.json    │            │
│  3. buildAuditRecord(v2) │            │
│     → GOVERNANCE.md      │            │
└──────────────────────────┘            │
                                         │
┌──────────────────────────┐            │
│  ship:pre hook           │────────────┘
│  1. readRequiredEvidence │
│     (plan, verify)       │
│  2. assertNonBlocking    │
│  3. read approvals       │
│  4. create pending (D-07)│
│  5. fail closed on       │
│     pending/rejected (D-08)
│  6. write ship evidence  │
└──────────────────────────┘
```

Data flows top-to-bottom: phase markdown inputs → enrichment helpers → persisted state → audit artifact + ship evidence. The hook layer is the only writer; helpers are pure.

### Recommended Project Structure
```
src/
├── governance/
│   ├── audit-artifact.ts        # EXTEND: GovernanceAudit v2 type + buildAuditRecord enrichment
│   ├── audit-enrich.ts          # NEW: prepare requirements_covered + remaining_risks from markdown
│   ├── approval-store.ts        # NEW: writeApproval/readApproval/approvalPath + assertApproval
│   ├── test-evidence.ts         # NEW: writeTestEvidence/readTestEvidence + parseTapOutput
│   ├── gate-evidence-store.ts   # EXISTS: template to clone
│   ├── ship-gate-hook.ts        # EXTEND: add approval fail-closed check
│   └── paths.ts                 # EXTEND: approvalPath + testEvidencePath helpers
├── enforcement/
│   ├── adapters.ts              # EXISTS: human-approval noop stub already registered
│   ├── run-adapter.ts           # EXISTS: approval routes through this unchanged
│   └── validate-approval.ts     # NEW: Ajv validator mirroring validate-gate-result.ts
└── schema/
    ├── audit-artifact.schema.json  # BUMP: v2 with 4 optional fields
    ├── approval.schema.json        # NEW: D-05 10-field shape
    └── test-evidence.schema.json   # NEW: parsed-runner-output shape
```

### Pattern 1: Durable Store (clone of gate-evidence-store.ts)
**What:** Per-phase JSON file under `.planning/governance/{kind}/{NN}.json`. Atomic write via `atomicWriteFile`; loud-fail read via `assertXxx` guards.
**When to use:** Any state that must survive context compaction and be consumed by a later step.
**Example:**
```typescript
// Source: src/governance/gate-evidence-store.ts (lines 107-168, verified)
export function writeGateEvidence(projectRoot, phaseNumber, evidence): void {
  const gateId = gateIdForWrite(evidence);
  const filePath = gateEvidencePath(projectRoot, phaseNumber, gateId);
  assertEvidence(evidence, filePath, phaseNumber, gateId);  // assert BEFORE write
  atomicWriteFile(filePath, JSON.stringify(evidence, null, 2));
}

export function readGateEvidence(projectRoot, phaseNumber, gateId): GateEvidence | null {
  const filePath = gateEvidencePath(projectRoot, phaseNumber, gateId);
  if (!existsSync(filePath)) return null;
  let raw: string;
  try { raw = readFileSync(filePath, "utf8"); }
  catch (err) { fail(filePath, `unreadable (${String(err)})`); }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch (err) { fail(filePath, String(err)); }
  assertEvidence(parsed, filePath, phaseNumber, gateId);  // assert AFTER read
  return parsed;
}
```

Mirror this exactly for `approval-store.ts` and `test-evidence.ts`. Replace `gateEvidencePath` with `approvalPath`/`testEvidencePath` in `paths.ts`. Replace `assertEvidence` with `assertApproval`/`assertTestEvidence`.

### Pattern 2: Contract Validator (clone of validate-gate-result.ts)
**What:** Ajv 2020 strict-mode validator compiled once at module load, with `x-binding` keyword registered before compile.
**When to use:** Every binding/advisory contract that crosses a trust boundary.
**Example:**
```typescript
// Source: src/enforcement/validate-gate-result.ts (lines 22-44, verified)
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../schema/gate-result.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
const validate: ValidateFunction = ajv.compile(schema);

export function validateGateResult(result: unknown): asserts result is GateResult {
  if (!validate(result)) {
    throw new Error(`invalid gate-result:\n${formatErrors(validate.errors)}`);
  }
  // ... post-AJV invariant checks (e.g. lineRange start <= end)
}
```

### Pattern 3: Ship-Gate Fail-Closed Prior-Evidence Check
**What:** Ship gate reads prior evidence, throws if missing or failing, writes ship evidence only after all checks pass.
**When to use:** Any blocking pre-ship check.
**Example:**
```typescript
// Source: src/governance/ship-gate-hook.ts (lines 18-46, verified)
function readRequiredEvidence(projectRoot, phaseNumber, gateId): GateEvidence {
  const evidence = readGateEvidence(projectRoot, phaseNumber, gateId);
  if (evidence === null) {
    throw new Error(`ship gate: missing governance evidence ${gateEvidencePath(...)}`);
  }
  return evidence;
}

function assertNonBlocking(evidence, gateId): void {
  if (evidence.result.status === "fail") {
    throw new Error(`ship gate: ${gateId} governance evidence failed - ${findingDetails(evidence)}`);
  }
}
```

The Phase 9 approval check mirrors this:
```typescript
// NEW (proposed shape, mirroring the above):
function assertNoBlockingApprovals(approvals: ApprovalRecord[]): void {
  const blocking = approvals.filter(a => a.decision === "pending" || a.decision === "rejected");
  if (blocking.length > 0) {
    throw new Error(`ship gate: ${blocking.length} pending/rejected approval(s): ${
      blocking.map(a => a.approvalId).join(", ")
    }`);
  }
}
```

### Anti-Patterns to Avoid
- **Inlining enrichment in `audit-artifact.ts`:** D-14 explicitly forbids this. Keep `audit-enrich.ts` separate so the v1 writer stays byte-stable for the v1 subset.
- **Re-querying approvals through the adapter at audit time:** D-12 forbids this. The audit reads `.planning/governance/approvals/{NN}.json` directly.
- **Letting the model author test results:** D-03 forbids this. The `verify:post` hook parses real runner output; narration is rejected by the malformed-output guard.
- **Adding `decision` to the `GateResult.status` enum:** Approval decision vocab is `pending|approved|rejected|waived`; `GateResult.status` is `pass|fail|waived`. They are different enums on purpose — do not conflate.
- **Mutating v1 `GovernanceAudit` required fields on the v2 bump:** D-09 requires v1 byte-stability. Add the 4 new fields to `properties` but NOT to `required`; bump `schema_version.const` from `1` to `2` (or use an `enum: [1, 2]` for transition).
- **Auto-deciding approvals:** D-07 forbids this. The model only creates `pending` requests; `decidedBy`/`decidedAt` stay blank until a human resolves them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic durable write | Custom temp+rename | `atomicWriteFile` from `src/governance/atomic-write.ts` | Already solves concurrent-write race (TD-03). Unique `.<pid>-<uuid>.tmp` suffix. |
| Path derivation | String concatenation | Helpers in `src/governance/paths.ts` | Single-sourced; prevents path drift. Add `approvalPath` and `testEvidencePath` here. |
| Contract validation | Custom shape checks | Ajv 2020 + a new `validate-*.ts` mirroring `validate-gate-result.ts` | Compile-once, draft 2020-12, fails closed on malformed. |
| Adapter output integrity | Direct `adapter.evaluate()` calls | `runAdapter(adapter, request)` | Already validates + checks `gateId`/`evaluatedBy` match. Approval routes through this for free. |
| Test result parsing | Shell out to `jq`/`awk` or a custom JSON reporter | `node --test --test-reporter=tap` + a small TAP summary parser | The existing `npm test` command already produces TAP. No new reporter file. |
| Skip-reason enum mapping | Inline strings | Reuse the `assertOneOf` pattern from `audit-artifact.ts` | Compile-time enum + runtime assertion, one message. |
| Markdown table parsing for REQ-IDs | A markdown AST dep | Deterministic regex over the traceability table | Bounded format, deterministic, no new dep. (CLAUDE.md: "no new runtime deps".) |

**Key insight:** Every primitive Phase 9 needs is already in the repo. The work is additive: clone the store/validator patterns, extend the audit shape, extend the ship-gate check.

## Runtime State Inventory

Phase 9 is a greenfield-ish extension — it adds new state stores, not renames existing ones. But two existing artifacts get a version bump, so we inventory the existing runtime state that touches them.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `.planning/governance/gates/{NN}-{plan,verify,ship}.json` (Phase 8 evidence files) — schema unchanged, no migration needed. `.planning/governance/selection-state.json` — read-only input to audit enrichment, schema unchanged. | None — existing files remain valid. |
| Live service config | None. The capability manifest `.gsd/capabilities/aidlc-governance/capability.json` is in git (source of truth); no UI-stored config. | Extend manifest with new produces/consumes (D-13, D-16). |
| OS-registered state | None. No pm2/launchd/tasks. | None. |
| Secrets/env vars | None. Approval identity (`decidedBy`) comes from out-of-band human action, not an env var. | None. |
| Build artifacts | `dist/` and `dist-test/` recompile from source on next `npm run build`. New `.schema.json` files import via `resolveJsonModule` (already enabled — see `tsconfig.json` includes). | None beyond standard rebuild. |

**Existing GOVERNANCE.md artifacts under `.planning/phases/*/GOVERNANCE.md`:** these were written by the v1 writer with `schema_version: 1`. After Phase 9 they will be re-emitted with `schema_version: 2`. The v2 schema MUST accept v1 records (i.e. the 4 new fields are optional), and re-emitting a v1-only record under v2 MUST produce byte-identical output for the v1 subset (D-09).

## Common Pitfalls

### Pitfall 1: `schema_version.const: 1` blocks the bump
**What goes wrong:** The existing audit-artifact schema has `"const": 1` on `schema_version`. Changing it to `"const": 2` makes existing v1 records invalid against the new schema; changing it to `"enum": [1, 2]` lets a v2 writer accidentally emit `1`.
**Why it happens:** Schema versioning is a contract, not just a label.
**How to avoid:** Set `"const": 2` in the v2 schema. The writer always emits `2` once upgraded. Tests assert v1 records fail validation against v2 (forward-incompatible by design — a v1 GOVERNANCE.md must be regenerated).
**Warning signs:** Test that asserts byte-identical regeneration of a v1 fixture starts failing.

### Pitfall 2: Field-order drift breaks byte-stability
**What goes wrong:** `JSON.stringify` preserves object-literal insertion order. If `buildAuditRecord` adds `requirements_covered` BEFORE `rules_applied`, the v1 subset bytes change.
**Why it happens:** V8 insertion-order iteration.
**How to avoid:** Add the 4 new fields AFTER the existing 7, and only when enrichment data is present. Test: a v1-only input must produce byte-identical output to the v1 writer (deep-equal on parsed JSON is not enough — string-compare the rendered markdown).
**Warning signs:** Existing `audit-artifact.test.ts` "renderGovernanceMarkdown is deterministic" test still passes, but a snapshot test of the rendered bytes changes.

### Pitfall 3: Approval decision enum leaks into GateResult
**What goes wrong:** A planner conflates `ApprovalRecord.decision` (`pending|approved|rejected|waived`) with `GateResult.status` (`pass|fail|waived`) and tries to embed approval state as a finding.
**Why it happens:** Both are 4-value enums with overlap on `waived`.
**How to avoid:** Keep `ApprovalRecord` a distinct top-level durable record under `approvals/{NN}.json`. The audit artifact embeds a *summary view* (`approvals: [{approvalId, decidedBy, decision}]`), not a `GateResult`. The ship gate reads approvals separately and throws on `pending`/`rejected`.
**Warning signs:** Type assertion errors, or tests that pass `decision: "approved"` into a `GateResult.status` field.

### Pitfall 4: `node --test` JSON reporter doesn't exist
**What goes wrong:** A planner writes `node --test --test-reporter=json` and the test runner crashes with `Cannot find package 'json'`.
**Why it happens:** Node resolves an unknown reporter name as a module path; `json` is not a built-in reporter id. `[VERIFIED: Node v24.14.0 local run]`
**How to avoid:** Use `--test-reporter=tap` (default) and parse the summary lines, OR `--test-reporter=junit` for richer XML. D-01 forbids JUnit XML, so TAP is the path.
**Warning signs:** Test-evidence parser tests fail with `ERR_MODULE_NOT_FOUND` for package `json`.

### Pitfall 5: Approval auto-decide by the model
**What goes wrong:** The ship hook writes `decision: "approved"` with `decidedBy: "model"` to unblock itself.
**Why it happens:** Convenience / lack of a real human approver in the loop.
**How to avoid:** The ship hook ONLY writes `decision: "pending"` with blank `decidedBy`/`decidedAt` (D-07). A separate mutation path (human action) flips the decision. Tests assert `decidedBy` is blank when written by the hook.
**Warning signs:** Test asserting `decision === "pending"` after hook execution fails.

### Pitfall 6: Missing enrichment data becomes silently empty
**What goes wrong:** If no requirements/risks/approvals are found, the audit emits `requirements_covered: []`, `remaining_risks: []`, `approvals: []`. Reviewers cannot tell "researched and found none" from "not checked".
**Why it happens:** Optional arrays defaulting to empty.
**How to avoid:** D-11 says risks are "never silently empty" — emit an explicit `[{id: "none-identified", severity: "low", detail: "no risks found in VERIFICATION.md or CONTEXT.md <deferred>"}]` placeholder. Same pattern for the other three if empty: emit one explicit "none-required" / "none-found" row. (Planner discretion on per-field policy, but absence must be explicit.)
**Warning signs:** Audit shows `[]` for any of the 4 enrichment arrays.

## Code Examples

### Approval Schema (proposed — D-05 shape)
```json
// Source: derived from CONTEXT D-05 + gate-result.schema.json convention. [AUTHORED, not yet in codebase]
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gsd.dev/schemas/approval.schema.json",
  "title": "Human Approval Checkpoint",
  "description": "APPR-01 human approval record. Produced/consumed through runAdapter(human-approval, request). x-binding: binding — a pending/rejected decision blocks ship (D-08).",
  "type": "object",
  "additionalProperties": false,
  "required": ["approvalId", "phase", "gateId", "artifactPath", "requestedBy", "requestedAt", "decision"],
  "properties": {
    "approvalId": { "type": "string", "minLength": 1 },
    "phase": { "type": "string", "enum": ["inception", "construction", "operations", "common"] },
    "gateId": { "type": "string", "enum": ["discuss", "plan", "execute", "verify", "ship"] },
    "artifactPath": { "type": "string", "minLength": 1 },
    "requestedBy": { "type": "string", "minLength": 1 },
    "requestedAt": { "type": "string", "format": "date-time", "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$" },
    "decision": { "type": "string", "enum": ["pending", "approved", "rejected", "waived"] },
    "decidedBy": { "type": "string", "minLength": 1 },
    "decidedAt": { "type": "string", "format": "date-time", "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$" },
    "rationale": { "type": "string" }
  },
  "x-binding": "binding"
}
```

Note: `decidedBy`/`decidedAt`/`rationale` are NOT in `required` — they are blank until a human resolves the decision (D-07). The validator must allow them to be absent; if present, they must be non-empty strings / strict ISO timestamps.

### TAP Output Shape (verified local capture)
```text
// Source: `node --test --test-reporter=tap /tmp/test-demo.mjs` on Node v24.14.0, captured 2026-07-07.
// [VERIFIED: local node execution]
TAP version 13
# Subtest: demo-pass
ok 1 - demo-pass
  ---
  duration_ms: 0.4518
  type: 'test'
  ...
# Subtest: demo-fail
not ok 2 - demo-fail
  ---
  duration_ms: 0.4804
  location: '...test-demo.mjs:4:1'
  failureType: 'testCodeFailure'
  error: '...'
  ...
1..2
# tests 2
# pass 1
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 44.9934
```

The summary block at the bottom (`# tests N`, `# pass N`, `# fail N`, etc.) is the parse target. A simple line-anchored regex (`/^# (tests|pass|fail|skipped|todo|cancelled|duration_ms) (\d+(?:\.\d+)?)/m`) extracts the structured fields. The malformed-rejection guard requires the `# tests` line to be present and numeric — anything else is a hard fail (D-04).

### Audit Artifact v2 Type Extension
```typescript
// Source: derived from src/governance/audit-artifact.ts GovernanceAudit (lines 40-48).
// [AUTHORED extension of verified existing shape]
export interface RequirementsCoveredEntry {
  reqId: string;        // e.g. "AUDIT-03"
  title: string;        // human-readable from REQUIREMENTS.md
  status: "complete" | "pending" | "partial";
}

export interface TestEvidenceSummary {
  total: number;
  pass: number;
  fail: number;
  skipped: number;
  duration_ms: number;
  source: ".planning/governance/tests/{NN}.json";
}

export interface RemainingRiskEntry {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  source: "VERIFICATION.md" | "CONTEXT.md<deferred>" | "none-identified";
}

export interface ApprovalSummary {
  approvalId: string;
  gateId: GateId;
  decision: "pending" | "approved" | "rejected" | "waived";
  decidedBy?: string;
}

export interface GovernanceAudit {
  schema_version: 2;                    // bumped from 1
  phase: GovernanceRecord["phase"];
  riskTier: GovernanceRecord["riskTier"];
  selection_timestamp: string;
  generated_from: ".planning/governance/selection-state.json";
  rules_applied: AuditAppliedRule[];
  rules_skipped: AuditSkippedRule[];
  // v2 optional enrichment (present only when enrichment data exists):
  requirements_covered?: RequirementsCoveredEntry[];
  tests_executed?: TestEvidenceSummary;
  remaining_risks?: RemainingRiskEntry[];
  approvals?: ApprovalSummary[];
}
```

### Ship-Gate Approval Check (extension point)
```typescript
// Source: src/governance/ship-gate-hook.ts (lines 47-78, verified) + D-08 requirement.
// [AUTHORED proposed extension of verified existing function]
export function shipGateHook(args: ShipGateHookArgs): ShipGateHookResult {
  // ... existing plan + verify evidence checks (unchanged) ...

  // NEW (D-08): fail closed on pending/rejected approvals
  const approvals = readApprovals(args.projectRoot, args.phaseNumber);
  assertNoBlockingApprovals(approvals);

  // NEW (D-07): if no approvals exist yet and the phase requires them,
  // write pending requests with blank decidedBy/decidedAt
  if (approvals.length === 0 && phaseRequiresApproval(args.phaseNumber)) {
    writePendingApprovals(args.projectRoot, args.phaseNumber);
    throw new Error(`ship gate: ${args.phaseNumber} pending approvals created — human resolution required`);
  }

  // ... existing ship evidence write (unchanged) ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v1 `GovernanceAudit` (7 required fields, `schema_version: 1`) | v2 `GovernanceAudit` (7 required + 4 optional, `schema_version: 2`) | Phase 9 | v1 records must be regeneratable byte-identical for the v1 subset; the 4 new fields appear only when enrichment data exists. |
| Ship gate blocks on plan/verify evidence only | Ship gate also blocks on pending/rejected approvals | Phase 9 | One more fail-closed check; mirrors `assertNonBlocking` exactly. |
| Audit reads only `selection-state.json` | Audit additionally reads `tests/{NN}.json`, `approvals/{NN}.json`, REQUIREMENTS.md, VERIFICATION.md, CONTEXT.md | Phase 9 | The audit writer becomes a thin orchestrator: enrichment modules prepare the 4 optional arrays, the writer just merges them. |

**Deprecated/outdated:**
- `schema_version: 1` on `GovernanceAudit` — superseded by v2 in Phase 9. The schema file's `"const": 1` becomes `"const": 2`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CONTEXT D-01's "run-tests.cjs" refers to the test command that actually runs in this repo (`node --test "dist-test/**/*.test.js"` via `npm test`), not a missing file. | Standard Stack, Pitfall 4, Phase Requirements AUDIT-04 | If a real `run-tests.cjs` exists somewhere I didn't find, the parser target is wrong. Mitigation: planner confirms with user before writing the parser. The local `find` across `$HOME/.claude`, `$HOME/.codex`, and the repo found no such file. |
| A2 | The "phase requires approval" predicate (used in the ship hook to decide whether to create pending approvals) is per-phase policy, not yet decided. | Code Examples, Ship-Gate Approval Check | Planner needs to either (a) hard-code "every ship creates one approval for the ship gate itself" or (b) add a config flag. Recommend (a) for v2.0 simplicity. |
| A3 | `decidedBy`/`decidedAt`/`rationale` being absent (not empty string) when decision is `pending` is the right shape. | Approval Schema | If the schema requires them as empty strings, the type union is uglier but functionally equivalent. The proposed shape (optional fields) matches how `audit-artifact.ts` handles optional `detail`/`scope`/`sourceFile` on `AuditSkippedRule`. |
| A4 | TAP summary lines (`# tests N`, `# pass N`, `# fail N`) are stable across Node 22/24. | Pitfall 4, Code Examples | Verified locally on Node v24.14.0. Node 22 LTS test runner output format matches (Node docs). Low risk. |
| A5 | REQ-IDs in REQUIREMENTS.md follow the existing `AUDIT-NN`, `APPR-NN`, `GATE-NN`, `ENF-NN`, `SEL-NN`, `TD-NN`, `OPS-NN` prefix convention and the traceability table is the canonical source. | Phase Requirements AUDIT-03 | Verified by reading `.planning/REQUIREMENTS.md` Traceability table (lines 73-95). High confidence. |

## Open Questions (RESOLVED)

1. **D-01 "run-tests.cjs" reconciliation** — RESOLVED in Plan 09-02: parse target is `node --test` TAP output (`# tests N` / `# pass N` / `# fail N` summary block). No `run-tests.cjs` exists locally; D-01's file name referenced upstream gsd-core. Narration rejected via missing-summary-line guard.
   - What we know: No `run-tests.cjs` exists in this repo or the locally-installed `gsd-core`. The actual test command is `node --test "dist-test/**/*.test.js"`.
   - What's unclear: Whether the user intended (a) to invoke the upstream gsd-core's `scripts/run-tests.cjs` (not present locally), (b) to parse `node --test` TAP output (the de-facto runner here), or (c) something else.
   - Recommendation: Planner adds a `checkpoint:human-verify` task before writing the parser, confirming "TAP output from `npm test`" is the intended source. The CONTEXT's `<specifics>` says "real runner output" and "guard that rejects model narration" — both are satisfiable by parsing TAP. Low ambiguity in intent; only the file name in D-01 is imprecise.

2. **Approval creation policy (A2)** — RESOLVED in Plan 09-04: exactly one pending approval per phase for the ship gate (`gateId: "ship"`, `approvalId: ship-{phaseNumber}`); multi-approval policy deferred to post-v2.0.
   - What we know: D-07 says "ship gate creates pending approval requests for required approvals."
   - What's unclear: Which approvals are "required" per phase.
   - Recommendation: For v2.0, ship creates exactly ONE pending approval for the ship gate itself (`gateId: "ship"`, `artifactPath: ".planning/governance/gates/{NN}-ship.json"`). Multiple-approval policy is post-v2.0.

3. **v1 GOVERNANCE.md regeneration under v2** — RESOLVED in Plan 09-03 REFACTOR task: historical phase audits (01..08) left as v1; only Phase 9+ emits v2; v2 schema rejects `schema_version: 1`.
   - What we know: D-09 requires v1 byte-stability for the v1 subset.
   - What's unclear: Whether existing v1 `GOVERNANCE.md` files under `.planning/phases/01..08/GOVERNANCE.md` should be regenerated under v2 or left as v1.
   - Recommendation: Leave historical phase audits as v1; only Phase 9+ emits v2. Planner adds a test asserting v2 schema rejects `schema_version: 1` records so the contract boundary is explicit.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime + test runner | ✓ | v24.14.0 (>=22.0.0 floor) | — |
| npm | Build | ✓ | (>=10.0.0 floor) | — |
| `node --test` | AUDIT-04 test evidence | ✓ | built-in (Node 22+) | — |
| `node --test --test-reporter=tap` | AUDIT-04 parser target | ✓ | built-in (default reporter) | — |
| `ajv@8.20.0` + `ajv-formats@3.0.1` | Schema validation | ✓ | installed | — |
| TypeScript `^6.0.3` + `tsc` | Build | ✓ | installed | — |
| A real `run-tests.cjs` file | (D-01 names it) | ✗ | — | Parse `node --test` TAP output instead (see Open Question 1) |

**Missing dependencies with no fallback:** None that block execution. The `run-tests.cjs` "missing" is a naming imprecision in CONTEXT D-01, not a real gap — `node --test` is the actual runner and is available.

**Missing dependencies with fallback:** `run-tests.cjs` → fall back to parsing `node --test --test-reporter=tap` stdout (which is what `npm test` already emits).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in) + `node:assert/strict` |
| Config file | none — `package.json` `"test": "node --test \"dist-test/**/*.test.js\""` |
| Quick run command | `npm run build:test && node --test "dist-test/governance/approval-store.test.js" "dist-test/governance/test-evidence.test.js"` |
| Full suite command | `npm test` (= `pretest` + `node --test "dist-test/**/*.test.js"`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-03 | REQ-IDs machine-extracted from REQUIREMENTS.md traceability | unit | `node --test "dist-test/governance/audit-enrich.test.js"` | ❌ Wave 0 |
| AUDIT-04 | TAP output parsed; malformed output hard-fails; evidence persisted | unit | `node --test "dist-test/governance/test-evidence.test.js"` | ❌ Wave 0 |
| AUDIT-04 | verify:post hook captures real runner output, not narration | integration | `node --test "dist-test/governance/verify-gate-hook.test.js"` (extend) | ✅ exists, extend |
| AUDIT-05 | Remaining risks collected from VERIFICATION.md + CONTEXT `<deferred>`; never silently empty | unit | `node --test "dist-test/governance/audit-enrich.test.js"` | ❌ Wave 0 |
| AUDIT-06 | Approval summary folded from approval store into audit | unit | `node --test "dist-test/governance/audit-artifact.test.js"` (extend) | ✅ exists, extend |
| APPR-01 | Approval schema validates 10-field shape; rejects malformed | unit | `node --test "dist-test/enforcement/validate-approval.test.js"` | ❌ Wave 0 |
| APPR-01 | Approval store round-trips; loud-fail on malformed | unit | `node --test "dist-test/governance/approval-store.test.js"` | ❌ Wave 0 |
| APPR-01 | Ship gate blocks on pending/rejected approvals (D-08) | unit | `node --test "dist-test/governance/ship-gate-hook.test.js"` (extend) | ✅ exists, extend |
| APPR-01 | Ship gate creates pending requests with blank decidedBy (D-07) | unit | `node --test "dist-test/governance/ship-gate-hook.test.js"` (extend) | ✅ exists, extend |
| v2 byte-stability | v1-only input produces byte-identical output to v1 writer | unit | `node --test "dist-test/governance/audit-artifact.test.js"` (extend) | ✅ exists, extend |
| v2 schema bump | audit-artifact v2 schema rejects `schema_version: 1` | unit | `node --test "dist-test/schema/audit-artifact-v2.test.js"` | ❌ Wave 0 |
| ENF-02 boundary | Approval through runAdapter validates via validate-approval | integration | `node --test "dist-test/enforcement/run-adapter.test.js"` (extend, optional) | ✅ exists, optional extend |

### Sampling Rate
- **Per task commit:** `npm run build:test && node --test "dist-test/governance/{touched-module}.test.js"`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`. Target: existing 289 tests + ~40 new tests across 4 new files ≈ 330 total, 0 fail.

### Wave 0 Gaps
- [ ] `src/governance/approval-store.test.ts` — covers APPR-01 store round-trip + malformed rejection + path derivation
- [ ] `src/governance/test-evidence.test.ts` — covers AUDIT-04 TAP parse + malformed hard-fail + evidence round-trip
- [ ] `src/governance/audit-enrich.test.ts` — covers AUDIT-03 REQ-ID extraction + AUDIT-05 risk aggregation + never-empty placeholder
- [ ] `src/enforcement/validate-approval.test.ts` — covers APPR-01 schema acceptance/rejection (mirror `validate-gate-result.test.ts`)
- [ ] `src/schema/audit-artifact-v2.test.ts` — covers v2 schema rejects v1 records + accepts v2 with optional fields (and/or extend `audit-artifact.test.ts`)
- [ ] Framework install: none — `node:test` already available

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Out of scope — approvals are authorized by out-of-band human action, not by this overlay's authn. |
| V3 Session Management | no | Out of scope. |
| V4 Access Control | yes | Approval `decidedBy` is the human approver identity; the model never writes it (D-07). Mitigates privilege escalation via auto-approval. |
| V5 Input Validation | yes | All 4 new fields (approval, test-evidence, audit v2) are Ajv-validated at the trust boundary. Malformed = hard fail (matches `validateGateResult`). |
| V6 Cryptography | no | No crypto added. Timestamps are ISO-8601 strict (TD-01 shape). |
| V7 Error Handling and Logging | yes | Fail-closed on missing/malformed evidence preserves audit-trail integrity (D-04, D-08). |
| V8 Data Protection | yes (light) | Approval `rationale` may contain human-authored context; persisted as plaintext JSON under `.planning/governance/approvals/`. Acceptable for v2.0 — matches how gate evidence is already stored. |
| V9 Communications | no | No network added. |
| V10 Business Logic | yes | Ship-gate approval blocking is a business-logic invariant: `pending`/`rejected` = block; `approved`/`waived` = proceed. Mirrors GATE-05. |
| V13 API & Web Service | no | Not a service. |

### Known Threat Patterns for audit+approval stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Model auto-approves its own work | Elevation of privilege | D-07: hook writes only `decision: "pending"` with blank `decidedBy`. Test asserts. |
| Malformed runner output corrupts audit trail | Tampering | D-04: malformed runner output hard-fails through the TAP-summary-line guard before evidence is persisted. |
| Approval decision enum leaks into GateResult.status | Tampering (data integrity) | Distinct top-level `ApprovalRecord` with its own schema; audit embeds a summary view, not a GateResult. |
| v1 audit records re-emitted under v2 with different bytes | Repudiation (audit integrity) | D-09: v1 subset byte-stability asserted by a string-compare test, not just deep-equal. |
| Missing enrichment data silently empty | Information disclosure (audit gap) | D-11: explicit "none-identified" / "none-required" placeholder row, never `[]`. |
| Approval file tampered on disk after decision | Tampering | `assertApproval` re-validates on every read; schema-invalid record throws loud (mirrors `readGateEvidence`). |

## Sources

### Primary (HIGH confidence — verified in this session by reading source)
- `src/governance/audit-artifact.ts` — `GovernanceAudit`, `buildAuditRecord`, `writeGovernanceAudit`, `AUDIT_SKIP_REASONS`, `assertTimestamp`, ISO 8601 strict regex, byte-stable serialization via `JSON.stringify(..., null, 2)`. Read in full.
- `src/governance/gate-evidence-store.ts` — durable-store template: `writeGateEvidence`/`readGateEvidence`/`assertEvidence`/`fail(filePath, detail): never` + atomic write + `existsSync → null` contract. Read in full.
- `src/enforcement/adapters.ts` — `STUB_NAMES` (7 incl. `human-approval`), `noopAdapter` returns `status: "pass"` + empty findings, `ADAPTERS`/`ECHO_ADAPTERS`. Read in full.
- `src/enforcement/run-adapter.ts` — `runAdapter` validates via `validateGateResult` + checks `gateId` and `evaluatedBy` match. Read in full.
- `src/enforcement/validate-gate-result.ts` — Ajv 2020 + `addFormats` + `addKeyword("x-binding")` before compile; `formatErrors` shape. Read in full.
- `src/enforcement/types.ts` — `GateId`, `GateRequest`, `GateResult`, `GateFinding`, `GateFindingEvidence`. Read in full.
- `src/schema/audit-artifact.schema.json` — v1 schema with `schema_version.const: 1`, `additionalProperties: false`, `x-binding: "advisory"`. Read in full.
- `src/schema/gate-result.schema.json` + `gate-request.schema.json` + `task-signal.schema.json` — draft 2020-12 conventions. Read in full.
- `src/governance/ship-gate-hook.ts` — `readRequiredEvidence`/`assertNonBlocking` fail-closed pattern; ship evidence explicitly excludes approval/audit fields. Read in full.
- `src/governance/verify-gate-hook.ts` — `runAdapter` integration, `deriveRuleGateStatuses` per-rule mapping. Read in full.
- `src/governance/paths.ts` — `gateEvidencePath` with `PHASE_NUMBER_RE = /^\d{2}(?:\.\d+)?$/` validation; path helper convention. Read in full.
- `src/governance/state-store.ts` + `atomic-write.ts` — `readSelection`/`writeSelection`, `atomicWriteFile` unique `.<pid>-<uuid>.tmp` suffix (TD-03). Read in full.
- `.gsd/capabilities/aidlc-governance/capability.json` — current 6-step hook registration; `verify:post` has `aidlc-governance-verify` then `aidlc-governance-audit`; `ship:pre` has `aidlc-governance-ship`. Read in full.
- `src/governance/audit-artifact.test.ts` + `gate-evidence-store.test.ts` + `run-adapter.test.ts` + `ship-gate-hook.test.ts` + `verify-gate-hook.test.ts` + `consent-verify-post.test.ts` + `validate-gate-result.test.ts` — test idiom: `node:test`, `withTempRoot(mkdtempSync/rmSync)`, fixture builders, `assert.throws(/regex/)`. Read in full.
- `package.json` + `tsconfig.json` + `tsconfig.build.json` — Node `>=22`, CJS, `tsc -p tsconfig.build.json`, test command `node --test "dist-test/**/*.test.js"`. Read in full.
- `.planning/REQUIREMENTS.md` + `.planning/ROADMAP.md` + `.planning/STATE.md` + `.planning/PROJECT.md` — Phase 9 scope, requirement IDs, traceability table. Read in full.

### Secondary (MEDIUM confidence — verified by local execution)
- `node --test --test-reporter=tap /tmp/test-demo.mjs` on Node v24.14.0 — captured TAP output shape: `# Subtest:`, `ok N`/`not ok N`, `1..N`, summary block `# tests N`, `# pass N`, `# fail N`, `# cancelled N`, `# skipped N`, `# todo N`, `# duration_ms N`. Confirmed `--test-reporter=json` is NOT built-in (`Cannot find package 'json'` error). `[VERIFIED: local execution 2026-07-07]`
- `node --test --test-reporter=junit` and `--test-reporter=spec` output shapes also captured locally.

### Tertiary (LOW confidence — assumptions, flagged for user confirm)
- `run-tests.cjs` — referenced in CONTEXT D-01 and CLAUDE.md, but NOT found in this repo or the locally-installed gsd-core. Assumed to be an imprecise reference to `node --test`. `[ASSUMED]` See Open Question 1.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in `package.json`, all conventions verified in source.
- Architecture: HIGH — every pattern (store, validator, ship-gate fail-closed) is directly observable in existing source that Phase 9 clones.
- Pitfalls: HIGH — Pitfall 4 (missing JSON reporter) verified by local execution; the rest by reading source.
- Test runner target (AUDIT-04): MEDIUM — TAP shape verified; the D-01 "run-tests.cjs" naming ambiguity is the only soft spot.

**Research date:** 2026-07-07
**Valid until:** 2026-08-07 (30 days; stable internal-codebase research, not external-API dependent)

## RESEARCH COMPLETE

**Phase:** 9 - Complete Audit Record & Approval
**Confidence:** HIGH

### Key Findings
- Every primitive Phase 9 needs is already in the repo: `atomicWriteFile`, `gate-evidence-store.ts` template, `runAdapter` boundary, `validate-gate-result.ts` Ajv pattern, ship-gate fail-closed check. Phase 9 is purely additive cloning.
- v2 audit bump is mechanical: 4 optional fields added to `properties` (NOT `required`), `schema_version.const: 1 → 2`, fields appended AFTER the existing 7 to preserve v1 byte-stability.
- **`run-tests.cjs` does not exist locally** (CONTEXT D-01 imprecision). The actual test runner is `node --test` with TAP reporter (default). Planner must reconcile this — see Open Question 1.
- The `human-approval` adapter stub is already registered in `ADAPTERS` (Phase 7); no new adapter needed. Approval capture routes through `runAdapter(human-approval, request)` for free, inheriting the ENF-02 malformed-hard-fail boundary.
- Approval `decision` enum (`pending|approved|rejected|waived`) is distinct from `GateResult.status` (`pass|fail|waived`) — keep them on separate types, do not conflate.

### File Created
`.planning/phases/09-complete-audit-record-approval/09-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages verified in `package.json`; CLAUDE.md constraints honored (no new deps). |
| Architecture | HIGH | All 4 extension points (audit-artifact, gate-evidence-store, runAdapter, ship-gate-hook) read in full; patterns directly cloneable. |
| Pitfalls | HIGH | TAP reporter absence verified by local execution; v1 byte-stability threat verified by reading serialization code. |
| Test runner target | MEDIUM | TAP shape verified locally on Node 24; the D-01 "run-tests.cjs" naming is the only unresolved point. |

### Open Questions (RESOLVED — see detailed section above)
1. D-01 "run-tests.cjs" reconciliation — RESOLVED in Plan 09-02 (TAP parse target).
2. Approval creation policy (per-phase vs. always-one-for-ship) — RESOLVED in Plan 09-04 (always-one-for-ship for v2.0).
3. Existing v1 GOVERNANCE.md files under phases 01..08 — RESOLVED in Plan 09-03 (left as v1; Phase 9+ emits v2).

### Ready for Planning
Research complete. Planner can now create PLAN.md files. Suggested plan split (per CONTEXT discretion): 4 TDD plans matching D-14 modules — (a) approval store + schema, (b) test-evidence capture, (c) audit-enrich + v2 bump, (d) ship-gate approval blocking + capability manifest extension.
