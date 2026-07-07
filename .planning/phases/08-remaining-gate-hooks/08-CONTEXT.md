# Phase 8: Remaining Gate Hooks - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Mode:** Auto-generated (`--auto`) after Phase 7 completion

<domain>
## Phase Boundary

Wire the remaining GSD loop governance gates so plan, verify, and ship consume the Phase 7 enforcement contracts and produce per-rule pass/fail evidence. This phase does not add real scanner integrations, a full audit record, or human approval semantics; it connects the hook surface to the contract boundary so Phase 9 can consume reliable gate evidence.

</domain>

<decisions>
## Implementation Decisions

### Plan Gate Signal And Output
- **D-01:** Add an `aidlc-governance-plan` capability skill at `plan:pre`; it should reuse the existing selection core (`select()` + `renderInjection()` pattern) instead of introducing a second selector.
- **D-02:** The plan gate should derive a `TaskSignal` from planning inputs: phase goal, requirement IDs, risks/threat model when present, acceptance criteria, and impacted modules/files. It should surface summary-only governance context to the planner, matching discuss/execute anti-bloat behavior.
- **D-03:** Plan gate output should be planner context plus a persisted gate evidence record. Do not overwrite the canonical execute selection state used by `executeHook`; plan-time selection is a separate gate evaluation.

### Verify Gate Adapter Flow
- **D-04:** Verify gate evidence must route through `runAdapter(adapter, request)`, not direct `adapter.evaluate(request)`, so Phase 7's malformed-output hard-fail boundary is always honored.
- **D-05:** Start with the existing `ADAPTERS` no-op registry for stable pass records. Use `ECHO_ADAPTERS` only in tests or deliberate failing fixtures; production gate wiring should not manufacture failures from selected rules.
- **D-06:** The verify gate should build a `GateRequest` with `gateId: "verify"`, selected applied rules, the current phase signal, and strict ISO timestamps. Its `GateResult` becomes the per-rule evidence source that Phase 9 will fold into the full audit artifact.

### Ship Blocking Policy
- **D-07:** Add an `aidlc-governance-ship` `ship:pre` gate that fails closed when required prior gate evidence is missing or failed. Required evidence for Phase 8 is plan and verify gate records for the phase.
- **D-08:** Preserve existing GSD/security `ship:pre` gates. The governance ship gate should compose with them, not replace them.
- **D-09:** Do not implement APPR-01 approval capture, full rollback evidence, or complete audit enrichment here. Phase 8 may check for placeholders/absence and report missing evidence, but Phase 9 owns the approval/audit data model.

### Gate Evidence Storage
- **D-10:** Store gate evidence under `.planning/governance/gates/` as one JSON file per phase/gate, for example `.planning/governance/gates/08-plan.json`, `.planning/governance/gates/08-verify.json`, and `.planning/governance/gates/08-ship.json`.
- **D-11:** Each evidence file should contain the `GateRequest`, validated `GateResult`, and small metadata (`phase`, `writtenAt`, `source`). Keep the file schema close to Phase 7 types; do not invent a large audit model before Phase 9.
- **D-12:** Use existing atomic-write helpers for evidence files. Gate evidence is durable workflow state and must survive context compaction, reruns, and ship-time checks.

### the agent's Discretion
- Exact function/file names for new hook modules are flexible, but keep the existing style: thin hook wrappers in `src/governance/`, pure helpers where reuse is real, tests under `src/**` so the current build includes them.
- Exact manifest ordering is flexible, but use canonical GSD hook points: `plan:pre`, `verify:post` (or `verify:pre` only if research proves it better fits the host flow), and `ship:pre`.
- Planner may split Phase 8 into separate TDD plans for plan gate, verify gate/evidence writer, and ship gate/blocking policy if that gives cleaner tests.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 8 goal, success criteria, and dependency on Phase 7.
- `.planning/REQUIREMENTS.md` - GATE-03, GATE-04, and GATE-05 requirement text and traceability.
- `.planning/PROJECT.md` - Current milestone state and Phase 7 validated contract boundary.

### Existing Capability Surface
- `.gsd/capabilities/aidlc-governance/capability.json` - Current discuss/execute/verify hook registration; Phase 8 extends this manifest.
- `src/governance/discuss-hook.ts` - Existing selection + render + persist pattern for summary-only governance at discuss time.
- `src/governance/execute-hook.ts` - Existing reload-and-render boundary for persisted selection state.
- `src/governance/audit-artifact.ts` - Existing `GovernanceAudit` writer and atomic audit behavior; Phase 9 consumes this more deeply.

### Phase 7 Enforcement Boundary
- `src/enforcement/types.ts` - `GateId`, `GateRequest`, `GateResult`, and finding evidence types.
- `src/enforcement/adapters.ts` - `GateAdapter`, `ADAPTERS`, and `ECHO_ADAPTERS` static registries.
- `src/enforcement/run-adapter.ts` - Sanctioned adapter-output boundary; validate before consumers see results.
- `src/enforcement/validate-gate-result.ts` - Ajv runtime validator pattern for `GateResult`.
- `src/schema/gate-request.schema.json` - Binding request schema for gate evaluation.
- `src/schema/gate-result.schema.json` - Binding result schema for adapter output.
- `src/schema/audit-artifact.schema.json` - Advisory audit schema that records governance evidence, not enforcement.

### Tests To Mirror
- `src/governance/consent.test.ts` - Consent-gated hook activation pattern for discuss/execute.
- `src/governance/consent-verify-post.test.ts` - Verify hook consent/onError:halt pattern.
- `src/governance/audit-hook-contract.test.ts` - Capability manifest contract assertions.
- `src/enforcement/run-adapter.test.ts` - Adapter hard-fail boundary tests.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `discussHook()` already converts a GSD task signal into selected rules, renders a summary-only `<governance>` fragment, and persists the full selection record. Reuse its pure-core path for plan gate behavior rather than reimplementing matching.
- `executeHook()` reloads `.planning/governance/selection-state.json` without re-deriving selection. Preserve that boundary; plan/verify evidence should not corrupt the execute selection state.
- `runAdapter()` is the only safe adapter boundary. It validates `GateResult`, rejects spoofed `gateId` / `evaluatedBy`, and propagates adapter runtime errors.
- `ADAPTERS` provides the production-safe no-op stubs. `ECHO_ADAPTERS` is useful for tests because it makes selected rules observable as findings.
- Existing consent tests create isolated runtime config roots and render hooks through `gsd-tools`; new plan/ship/verify hook tests should copy that pattern.

### Established Patterns
- Capability manifest steps use canonical points from GSD Core: `plan:pre`, `plan:post`, `verify:pre`, `verify:post`, `ship:pre`, and `ship:post`.
- Tests live under `src/**` and run through the current custom Node test harness. Avoid a separate `test/` helper extraction unless it removes real duplication without widening risk.
- Hook wrappers stay thin. Selection, rendering, validation, and persistence logic belong in reusable pure helpers or existing modules.
- Config and consent are evaluated by the capability registry before hook dispatch. Hook code should not re-check `when`; it should fail loud on malformed inputs.

### Integration Points
- `plan:pre` is the right host point to add planner-context governance before PLAN.md is generated.
- `verify:post` already hosts the audit artifact hook; Phase 8 can add adapter-based evidence there, or introduce a new verify hook skill that runs before audit writing if planning proves ordering needs it.
- `ship:pre` is the blocking point for release readiness. Existing security ship gate also lives there, so governance ship checks should be additive.
- `.planning/governance/` is the durable state home for selection and audit-adjacent data; gate evidence belongs there rather than in transient context.

</code_context>

<specifics>
## Specific Ideas

- Auto-selected all gray areas because `--auto` was active.
- The minimal durable evidence model is enough for Phase 8: `{ request, result, metadata }` per gate. Full audit rollup and approval semantics stay in Phase 9.
- Keep Phase 8 boring: no real semgrep/bandit/checkov/grype/gitleaks execution, no dynamic adapter loader, no OPA/GitHub Actions dependency.
- `ship:pre` should fail closed with actionable messages when evidence is missing. Missing plan/verify evidence means "run the relevant phase workflow again", not "assume pass".

</specifics>

<deferred>
## Deferred Ideas

- APPR-01 human approval schema and approval decision capture — Phase 9.
- Complete audit artifact expansion for requirements, tests, risks, approvals — Phase 9.
- Real scanner/policy integrations beyond no-op stubs — future milestone after v2.0.
- Dynamic adapter loading through the capability registry — future milestone.

</deferred>

---

*Phase: 8-Remaining Gate Hooks*
*Context gathered: 2026-07-07*
