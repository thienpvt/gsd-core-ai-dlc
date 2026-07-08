# Phase 7: Enforcement Contracts & Adapter Stubs - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish the tool-agnostic enforcement contract layer: JSON Schema (draft 2020-12) documents for gate-request, gate-result, and audit-artifact shapes; a single `GateAdapter` TypeScript interface (`evaluate(request) → Promise<GateResult>`); and 7 reference no-op/echo stubs named after AI-DLC-implied tools (semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval). Ajv validates every adapter's output at runtime so malformed output hard-fails rather than corrupting the audit trail. The advisory-vs-binding boundary is made explicit in the contracts. No first-class tool integrations — stubs only. Phases 8-10 consume these contracts.

</domain>

<decisions>
## Implementation Decisions

### Contract Schema Location & Shape (Area 1/3 — accepted)
- 3 separate JSON Schema files in `src/schema/`: `gate-request.schema.json`, `gate-result.schema.json`, `audit-artifact.schema.json` — mirrors the existing `frontmatter.schema.json` / `rule-index.schema.json` / `task-signal.schema.json` convention.
- `audit-artifact.schema.json` formalizes the **existing** `GovernanceAudit` shape (Phase 5's `writeGovernanceAudit` already emits it) — document what ships, do not invent a new shape.
- `gate-request` fields: `gateId`, `phase`, `taskSignal`, `rules[]` (selected rule summaries), `requestedAt` (ISO-8601, reuse the strict ISO-8601 shape tightened in TD-01).
- `gate-result` fields: `gateId`, `status` (`pass`|`fail`|`waived`), `findings[]` (`id`, `severity`, `message`, optional `evidence`), `evaluatedBy` (adapter name), `evaluatedAt` (ISO-8601).

### GateAdapter Interface & Stub Set (Area 2/3 — accepted)
- `interface GateAdapter { readonly name: string; evaluate(request: GateRequest): Promise<GateResult> }` — one method; `name` for audit attribution (maps to `evaluatedBy`).
- 7 stubs, exactly the AI-DLC-implied set: **semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval**. No first-class integrations.
- Each stub ships **two variants**: a `noop` base (returns `pass` with empty findings — the "nothing to report" contract) and an `echo` variant (mirrors `request.rules` as findings — for testability). Recommend a shared `noopAdapter(name)` / `echoAdapter(name)` factory so the 7 stubs are thin wrappers.
- Stub registration: a static `Map<string, GateAdapter>` keyed by name. No dynamic loader in Phase 7 (matches scope; capability-registry-style dynamic loading is out of scope).

### Runtime Validation & Advisory/Binding Boundary (Area 3/3 — accepted)
- `validateGateResult(result)` assert function mirrors the existing `validateSignal` / `validateIndex` pattern (`src/select/validate-signal.ts`, `src/index/validate-index.ts`): Ajv 2020 + `addFormats`, compiled-once validator, `formatErrors`-style actionable lines.
- **Hard-fail at the `evaluate()` boundary** — a wrapper validates the adapter's `GateResult` before it reaches any consumer. Malformed = throw (no silent corruption of the audit trail — ENF-02).
- Advisory-vs-binding boundary: each gate contract schema carries an `x-binding: "binding"` or `x-binding: "advisory"` annotation field; markdown steering rules reference the contract by its `$id`. The boundary is explicit in the contracts themselves, not a separate doc.
- Test coverage: one `gate-contracts.test.ts` (under `src/governance/` to match the tsconfig-only-compiles-`src/` constraint discovered in Phase 6) asserting: each schema compiles under Ajv 2020, valid fixtures pass, malformed fixtures (status out of enum, missing required field, bad ISO-8601 timestamp) hard-fail. Mirrors the existing `frontmatter.schema.test.ts` pattern.

### Claude's Discretion
- Exact `$id` URIs for the 3 schemas (recommend a stable `https://.../gsd-aidlc/<name>.schema.json` convention or a local relative `$id` — match whatever `frontmatter.schema.json` already uses for consistency).
- Whether `findings[].evidence` is a string or an object `{ path, lineRange?, url? }` — recommend the object form (structured, matches SAST tool output) but keep optional.
- File layout for the adapter stubs (one file `src/enforcement/adapters.ts` with all 7, or one file per stub) — recommend a single `adapters.ts` since stubs are thin factory calls; split only if it grows.
- Whether to add a `GateId` enum/type (discuss/plan/execute/verify/ship gates) or keep `gateId: string` — recommend a `GateId` union for type safety, since Phase 8 will consume it.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schema/validate.ts` — canonical Ajv 2020 validator pattern: `new Ajv2020({ allErrors: true, strict: true, strictRequired: false })` + `addFormats(ajv)`, `ajv.compile(schema)` once at module load, `formatErrors(file, errors)`. The 3 new contract validators should mirror this.
- `src/index/validate-index.ts` / `src/select/validate-signal.ts` — second/third instances of the same pattern (strict mode, compile-once, assert function). `validateGateResult` is the fourth instance.
- `src/schema/frontmatter.schema.json`, `rule-index.schema.json`, `task-signal.schema.json` — existing schema files; the 3 new ones follow the same directory + import convention (no `with { type: "json" }` attribute — resolveJsonType handles it; import attributes are illegal on CJS require()).
- `src/governance/audit-artifact.ts` `GovernanceAudit` interface (line 40) + `AuditAppliedRule`/`AuditSkippedRule` (lines 22-38) — the existing audit-artifact shape `audit-artifact.schema.json` formalizes; `AUDIT_SKIP_REASONS` (line 7) is the enum to reference.
- `src/governance/atomic-write.ts` — the shared atomic-write helper (TD-03, Phase 6) for any test fixtures that write artifacts.
- `src/types.ts` — `Severity`, `SkipReason`, `Scope`, `MatchedAxis`, `Phase`, `TaskSignal` types reused across schemas.

### Established Patterns
- CJS modules, `tsc`-only build (`tsconfig.build.json`), no bundler. `tsconfig.json` compiles `src/**/*.ts` only — Phase 6 learned test files must live under `src/` (not `test/`) to be compiled. `ponytail:` convention marks deliberate simplifications.
- Tests: custom runner `node scripts/run-tests.cjs` (suites unit/integration/install/security/slow), `c8` coverage, `fast-check` property tests, `stryker` mutation. Schema test pattern: `frontmatter.schema.test.ts` (compile + valid/invalid fixtures).
- Overlay on GSD Core, NOT a fork — no edits to `gsd-core/` internals; only `src/`, `test/` (compiled via `src/`), `.planning/`.
- Reuse existing deps: `ajv` (`ajv/dist/2020`), `ajv-formats` already installed. **No new runtime deps for Phase 7** — the contract layer is pure stdlib + ajv.

### Integration Points
- Phase 8 (Remaining Gate Hooks) consumes `GateRequest`/`GateResult` + `GateAdapter` — the plan/verify/ship gates call `adapter.evaluate(request)` and route on `status`.
- Phase 9 (Audit Record & Approval) consumes `audit-artifact.schema.json` — the audit artifact must validate against it.
- The `aidlc-governance-audit` skill (`verify:post`) already writes `GOVERNANCE.md` from `GovernanceAudit`; the new `audit-artifact.schema.json` must be byte-compatible with what that skill emits.
- `assertTimestamp` (TD-01, Phase 6) — the ISO-8601 strictness is the timestamp contract; reuse it for `requestedAt`/`evaluatedAt` validation.

</code_context>

<specifics>
## Specific Ideas

- The 7 stub names are locked by the phase goal (semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval) — these match the in-repo SAST config AI-DLC ships (`.bandit`, `.checkov.yaml`, `.semgrepignore`, `.grype.yaml`, gitleaks) plus a generic exit-code CI adapter and a human-approval adapter. Name the reference stubs after these exactly.
- The contract layer is the **tool-agnostic boundary** (CLAUDE.md: JSON Schema is the lingua franca, not OPA/Rego or GitHub Actions). An OPA adapter can be one optional stub later — but NOT in Phase 7 (stubs only, no real integrations).

</specifics>

<deferred>
## Deferred Ideas

- Real first-class tool integrations (actually running semgrep/bandit/etc.) — out of scope; Phase 7 ships stubs only. Real integrations are a future milestone.
- Dynamic adapter loading via the capability registry — Phase 7 uses a static `Map`; dynamic loading deferred.
- OPA/Rego adapter — can be one optional stub in a later phase; not in Phase 7's 7-stub set.
- Property-based (fast-check) contract fuzzing — `gate-contracts.test.ts` uses fixed valid/invalid fixtures; property fuzzing can be added in Phase 10 (Selection-Quality Harness) if it proves valuable.

</deferred>