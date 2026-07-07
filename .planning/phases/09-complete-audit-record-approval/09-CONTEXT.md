# Phase 9: Complete Audit Record & Approval - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

Complete the audit artifact to record the full enterprise SDLC evidence set — requirements covered (AUDIT-03), tests executed from real runner output (AUDIT-04), remaining risks known at ship time (AUDIT-05), approvals required and granted (AUDIT-06) — and define the APPR-01 human approval checkpoint schema produced/consumed through the tool-agnostic contract layer. This phase extends the existing `GovernanceAudit` writer and the Phase 7/8 contract boundary; it does not add real scanner integrations, rollback plan authoring, or operations-phase governance.

</domain>

<decisions>
## Implementation Decisions

### Test-Runner Output Ingestion (AUDIT-04)
- **D-01:** Parse the existing GSD custom `run-tests.cjs` structured output as the single-sourced test-evidence input — no JUnit XML, no generic exit-code-only path.
- **D-02:** Persist test evidence under `.planning/governance/tests/{NN}.json` as durable state (matches the gate-evidence-store pattern), not inline-only in the audit artifact.
- **D-03:** The `verify:post` hook captures real runner output — the model never authors test results. The hook invokes/parses structured output, then writes evidence; narration is rejected.
- **D-04:** Malformed runner output is a hard fail (matches `runAdapter` / `validateGateResult` boundary) — never warn-and-continue into a corrupted audit trail.

### Human Approval Checkpoint Schema (APPR-01)
- **D-05:** Approval request shape: `approvalId`, `phase`, `gateId`, `artifactPath`, `requestedBy`, `requestedAt`, `decision` (`pending` | `approved` | `rejected` | `waived`), `decidedBy`, `decidedAt`, `rationale`.
- **D-06:** Approvals persist under `.planning/governance/approvals/{NN}.json` and are produced/consumed through `runAdapter(human-approval, request)` — reuse the Phase 7/8 contract boundary, no standalone ad-hoc store.
- **D-07:** The ship gate creates pending approval requests for required approvals; `decidedBy`/`decidedAt` stay blank until a human resolves them. The model never auto-decides approvals (that would violate human-in-the-loop).
- **D-08:** Ship gate fails closed on `pending` or `rejected` approvals — matches the GATE-05 fail-closed prior-evidence pattern from Phase 8.

### Audit Artifact Enrichment (AUDIT-03/05/06)
- **D-09:** Bump `schema_version` to 2; add optional `requirements_covered`, `tests_executed`, `remaining_risks`, `approvals` fields. v1 required fields stay required and byte-stable so prior regeneration semantics hold.
- **D-10:** Requirements covered (REQ-IDs) are machine-extracted from the phase `success_criteria` / REQUIREMENTS.md traceability table — not executor tags, not user manual entry, not model narration.
- **D-11:** Remaining risks are machine-collected at ship time from the phase threat model / VERIFICATION.md gaps + any deferred items in CONTEXT.md `<deferred>` — not model-authored free-text and never silently empty.
- **D-12:** Approvals (AUDIT-06) are folded into the audit by reading `.planning/governance/approvals/{NN}.json` and embedding an approval summary (who + decision). Single-sourced from the approval store; never re-queried through the adapter at audit time.

### Hook Wiring & File Layout
- **D-13:** Extend the existing `verify:post` audit hook to read test evidence + approvals + risks and emit the enriched GOVERNANCE.md. The ship gate then consumes the enriched audit. No new `ship:post` audit writer, no separate `audit:pre` hook.
- **D-14:** New source modules: `src/governance/approval-store.ts`, `src/governance/test-evidence.ts`, `src/governance/audit-enrich.ts` — thin, reusing existing `atomicWriteFile` / `readSelection` / `runAdapter` helpers. Do not fold all logic into `audit-artifact.ts`; do not create one mega-module.
- **D-15:** New schemas: `src/schema/approval.schema.json`, `src/schema/test-evidence.schema.json` (draft 2020-12). Bump `src/schema/audit-artifact.schema.json` to v2 with the four optional fields. Runtime validation via the existing Ajv/validate pattern.
- **D-16:** Extend the existing `aidlc-governance` capability manifest — the ship gate now reads approvals + the enriched audit. Do not create a new `aidlc-approval` or `aidlc-audit` capability.

### Claude's Discretion
- Exact function names within the new modules are flexible, but keep the existing style (thin wrappers, pure helpers, assertXxx guards, tests under `src/**`).
- Planner may split Phase 9 into separate TDD plans for test-evidence capture, approval store/schema, audit enrichment, and ship-gate approval blocking if that gives cleaner tests.
- Exact REQ-ID extraction mechanism is flexible as long as it is machine-derived from traceability and deterministic.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 9 goal, success criteria, and dependency on Phase 8.
- `.planning/REQUIREMENTS.md` - AUDIT-03/04/05/06 and APPR-01 requirement text and traceability.
- `.planning/PROJECT.md` - Current milestone state; Phase 8 validated gate-evidence boundary.

### Existing Audit Surface (v1, to extend not fork)
- `src/governance/audit-artifact.ts` - `GovernanceAudit`, `writeGovernanceAudit`, `buildAuditRecord`, `renderGovernanceMarkdown`, `AUDIT_SKIP_REASONS` — extend here for v2 enrichment.
- `src/schema/audit-artifact.schema.json` - Advisory audit schema (v1) to bump to v2.
- `src/governance/gate-evidence-store.ts` - Per-gate durable evidence read/write pattern + `assertEvidence` guard style to mirror for approval-store and test-evidence.
- `src/governance/state-store.ts` - Persisted selection state read boundary.

### Phase 7/8 Enforcement Boundary (to consume, not re-invent)
- `src/enforcement/types.ts` - `GateId`, `GateRequest`, `GateResult`, `GateFinding` types.
- `src/enforcement/adapters.ts` - `GateAdapter`, `ADAPTERS` (incl. `human-approval` no-op stub), `ECHO_ADAPTERS`, `STUB_NAMES`.
- `src/enforcement/run-adapter.ts` - Sanctioned adapter-output boundary; approval capture must route through this.
- `src/enforcement/validate-gate-result.ts` - Ajv runtime validator pattern.
- `src/schema/gate-request.schema.json` / `gate-result.schema.json` - Binding gate schemas.

### GSD Loop Hook Surface (to wire into)
- `.gsd/capabilities/aidlc-governance/capability.json` - Current discuss/execute/verify/plan/ship hook registration; extend manifest, do not fork capability.
- `src/governance/plan-hook.ts` / `verify-gate-hook.ts` / `ship-gate-hook.ts` - Existing gate hooks; ship-gate-hook is where approval blocking lands.
- `scripts/run-tests.cjs` (GSD custom runner) - source of structured test output to parse for AUDIT-04.

### Tests To Mirror
- `src/governance/audit-artifact.test.ts` - byte-identical regeneration + malformed-state rejection pattern.
- `src/governance/gate-evidence-store.test.ts` - durable store read/write + assertXxx guard pattern.
- `src/enforcement/run-adapter.test.ts` - adapter hard-fail boundary tests.
- `src/governance/consent-verify-post.test.ts` - verify:post hook consent/onError:halt pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `writeGovernanceAudit()` + `buildAuditRecord()` already produce the v1 audit from persisted selection state — extend `buildAuditRecord`/add an enrichment pass rather than replacing it.
- `gate-evidence-store.ts` `writeGateEvidence`/`readGateEvidence` + `assertEvidence` is the proven durable-store pattern — clone its shape for `approval-store` and `test-evidence`.
- `runAdapter()` is the only sanctioned adapter boundary; approval capture routes through `runAdapter(human-approval, request)` so Phase 7's malformed-output hard-fail covers approvals too.
- `ADAPTERS` already has a `human-approval` no-op stub registered — the production-safe default; use `ECHO_ADAPTERS` only in tests.
- `atomicWriteFile` (TD-03) eliminates the concurrent-write race for all durable state under `.planning/governance/`.

### Established Patterns
- Durable state lives under `.planning/governance/{gates,tests,approvals}/` as one JSON file per phase; survives context compaction and reruns.
- Schemas are draft 2020-12 JSON Schema with `x-binding` (binding vs advisory); runtime validation via Ajv; malformed = hard fail.
- Hook wrappers stay thin — selection/rendering/validation/persistence belong in pure helpers; hooks fail loud on malformed input.
- Tests live under `src/**` and run through the existing custom Node harness (`node scripts/run-tests.cjs`); no new test framework.

### Integration Points
- `verify:post` is where the existing audit writer lives — enrichment extends this hook, no new host point.
- `ship:pre` is the blocking point; the governance ship gate already fails closed on missing plan/verify evidence — add approval blocking there.
- `.planning/governance/` is the durable state home — approvals and test evidence belong there alongside gate evidence.

</code_context>

<specifics>
## Specific Ideas

- Auto-selected all grey areas via smart discuss; user accepted all recommended answers.
- Keep Phase 9 boring: no real scanner execution, no dynamic adapter loader, no OPA/GitHub Actions, no rollback-plan authoring. Audit enrichment + approval schema + ship-gate blocking only.
- `schema_version` bump to 2 must preserve v1 required fields and byte-identical regeneration for the v1 subset — do not mutate v1 in place.
- Test evidence must be provably machine-derived (parsed runner output), with a guard that rejects model-authored narration — this is the AUDIT-04 trust boundary.
- Ship gate approval blocking: `pending`/`rejected` = block; `approved`/`waived` = proceed. Matches GATE-05 fail-closed semantics.

</specifics>

<deferred>
## Deferred Ideas

- Real scanner/policy integrations beyond no-op stubs — future milestone after v2.0.
- Rollback plan evidence (GATE-05 mentions it) — Phase 9 checks for absence and reports missing, but authoring rollback plans stays a future concern unless the planner finds a minimal placeholder is required for ship-gate completeness.
- Dynamic adapter loading through the capability registry — future milestone.
- Operations-phase (deploy/monitor) governance — OPS-01, explicitly out of scope for v2.0.

</deferred>

---

*Phase: 9-Complete Audit Record & Approval*
*Context gathered: 2026-07-07*