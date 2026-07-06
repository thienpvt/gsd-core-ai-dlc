# Phase 5: Audit-Artifact Writer - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning
**Mode:** Auto-generated (technical writer phase; no product grey areas)

<domain>
## Phase Boundary

This phase builds the v1 audit artifact writer. Given the persisted governance selection state from Phase 4, the system writes a per-task audit artifact at `verify:post` to `<phase>/GOVERNANCE.md`.

The artifact records selected/applied rules and skipped rules from machine data only. It must not depend on model narration, fresh selection, or hand-authored summaries. Re-running from the same persisted selection state must produce identical applied/skipped records.

In scope:
- `GOVERNANCE.md` generation from `.planning/governance/selection-state.json`.
- `rules_applied` derived directly from `selectionResult.selected`.
- `rules_skipped` derived from `selectionResult.skipped`.
- Audit skip-reason enum enforcement for `out-of-phase`, `out-of-scope-by-trigger`, `superseded`, and `explicitly-waived`.
- Stable ordering and deterministic output from the same input.
- A `verify:post` artifact-generation hook path if needed for acceptance.

Out of scope:
- Verify enforcement checks, CI/SAST/policy adapters, or binding-rule execution (v2 GATE-04 / ENF-02..04).
- Human approval workflow (v2 APPR-01).
- Requirement/test coverage fields beyond the minimal v1 audit record (v2 AUDIT-03..06).

</domain>

<decisions>
## Implementation Decisions

### Machine-Derived Artifact
- Use Phase 4 `readSelection(projectRoot)` as the source of truth. Do not re-run `select()` in the audit writer.
- The writer should fail loud when `selection-state.json` is missing or malformed. A silent empty audit is an under-injection/audit bypass.
- `rules_applied` maps one-to-one from `selectionResult.selected`; preserve id, severity, summary, matched axis, and matched value.
- `rules_skipped` maps from `selectionResult.skipped`; preserve id, severity, normalized audit reason, and source/provenance fields where present.

### Audit Reason Enum
- Audit reasons are not inherited blindly from `SkipReason`. Phase 2 has `out-of-scope`; Phase 5's public audit enum does not.
- Normalize selector `out-of-scope` into audit `out-of-scope-by-trigger` with a provenance field such as `selector_reason: "out-of-scope"` so no evidence is lost.
- Keep `explicitly-waived` in the audit enum for schema completeness, but do not invent waivers without a machine input. The v1 writer may emit none.
- Add a validator/test that rejects any audit reason outside the fixed enum.

### Reproducibility
- No fresh clock in generated applied/skipped records. If metadata needs time, use the persisted selection record timestamp or omit it.
- Sort output deterministically using existing selection order; if additional grouping is needed, use id/scope/sourceFile stable keys.
- Tests should regenerate from the same fixture state and compare applied/skipped records for deep equality.

### Hook Boundary
- A `verify:post` hook here is artifact generation only. It must not grow into the v2 verify gate that runs tests, lint, scans, or policy checks.
- If the capability manifest is extended, keep the new hook thin: load persisted state, write audit artifact, return path/status.

### the agent's Discretion
The planner may choose frontmatter, fenced JSON, or a compact Markdown table as long as `rules_applied` and `rules_skipped` remain machine-parseable and deterministic. Prefer the shortest format that makes the acceptance tests easy and stable.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/governance/state-store.ts` exposes `readSelection(projectRoot)` and the persisted `GovernanceRecord`.
- `src/types.ts` already defines `SelectionResult`, `SelectedRule`, `SkippedRule`, and selector `SkipReason`.
- `src/governance/paths.ts` owns governance paths; reuse or extend path helpers instead of scattering string paths.
- Existing tests use Node's built-in `node:test`, `assert/strict`, temporary fixture dirs, and focused CLI/process checks.
- Existing CLI commands route through `src/cli/index.ts`; use that path only if a manual command is useful for acceptance.

### Established Patterns
- Pure core first, thin wrapper second.
- Loud malformed-input failures.
- Atomic write for durable governance artifacts.
- Body-free audit surfaces: summaries and ids only unless a caller explicitly asks for detail through the lazy loader.

### Integration Points
- `.planning/governance/selection-state.json` is the input.
- `<phase-dir>/GOVERNANCE.md` is the output.
- `.gsd/capabilities/aidlc-governance/capability.json` may gain a `verify:post` step only for audit artifact generation.
- Phase 5 completion should mark `AUDIT-01` and `AUDIT-02`.

</code_context>

<specifics>
## Specific Ideas

- Make the writer a small pure function such as `renderAudit(selectionRecord)` plus a thin file-writing wrapper.
- Add a fixture state with one selected rule, one `out-of-phase`, one `out-of-scope`, one `out-of-scope-by-trigger`, and one `superseded` skip.
- Test invalid audit reason rejection directly, not through string matching.
- Test reproducibility by rendering twice from the same record and comparing parsed `rules_applied` / `rules_skipped`.

</specifics>

<deferred>
## Deferred Ideas

- Real waiver source and approval trail.
- Test-runner/lint/SAST evidence ingestion.
- Gate adapter contracts and binding enforcement.
- Full audit sections for requirements covered, tests executed, remaining risks, approvals required, and rollback plan.

</deferred>
