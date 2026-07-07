# Phase 05 Validation Plan

**Phase:** 05-audit-artifact-writer  
**Nyquist:** enabled  
**Requirements:** AUDIT-01, AUDIT-02

## Wave 0 Coverage

Wave 0 must create failing automated coverage before production behavior lands.

| Gap | Requirement | Planned Coverage | Owning Plan |
|-----|-------------|------------------|-------------|
| `src/governance/audit-artifact.test.ts` absent | AUDIT-01 | RED tests prove `rules_applied` maps one-to-one from `readSelection(projectRoot).selectionResult.selected`, no selector rerun, missing state fails loud, malformed state propagates. | 05-01 Task 1 |
| `src/governance/audit-artifact.test.ts` absent | AUDIT-02 | RED tests prove skipped reasons normalize to `out-of-scope-by-trigger`, preserve `selector_reason`, keep allowed enum only, and reject unknown reasons. | 05-01 Task 1 |
| Direct runner coverage absent | AUDIT-01, AUDIT-02 | RED tests prove `node dist/governance/audit-artifact.js <projectRoot> <outputPath>` writes only `GOVERNANCE.md` under `<projectRoot>/.planning/phases/` and rejects invalid output paths. | 05-01 Task 1 |
| `src/governance/audit-hook-contract.test.ts` absent | AUDIT-01, AUDIT-02 | Contract tests prove `verify:post` has one artifact-only `aidlc-governance-audit` step, no gates, and skill resolves phase dir from `.planning/STATE.md` `current_phase`. | 05-02 Task 2 |

## Requirement Mapping

| Requirement | Required Truth | Automated Check |
|-------------|----------------|-----------------|
| AUDIT-01 | Audit artifact records rules applied from actual selector output, not model narration. | `npm run build && npm run build:test && node --test dist-test/governance/audit-artifact.test.js` |
| AUDIT-01 | Writer uses persisted `readSelection(projectRoot)` and fails loud when state is missing or malformed. | `npm run build:test && node --test dist-test/governance/audit-artifact.test.js` |
| AUDIT-01 | `verify:post` reaches the writer through artifact-only skill. | `npm run build:test && node --test dist-test/governance/audit-hook-contract.test.js` |
| AUDIT-02 | Skipped rules use only `out-of-phase`, `out-of-scope-by-trigger`, `superseded`, and `explicitly-waived`. | `npm run build:test && node --test dist-test/governance/audit-artifact.test.js` |
| AUDIT-02 | Selector `out-of-scope` normalizes to `out-of-scope-by-trigger` with provenance retained. | `npm run build:test && node --test dist-test/governance/audit-artifact.test.js` |
| AUDIT-02 | Hook skill does not duplicate reason mapping or add enforcement gates. | `npm run build:test && node --test dist-test/governance/audit-hook-contract.test.js` |

## Task Automated Checks

| Plan Task | Check |
|-----------|-------|
| 05-01 Task 1 | `npm run build:test && node --test dist-test/governance/audit-artifact.test.js` fails RED for missing module or missing exports only. |
| 05-01 Task 2 | `npm run build && npm run build:test && node --test dist-test/governance/audit-artifact.test.js` passes. |
| 05-01 Task 2 | `npm test` passes. |
| 05-02 Task 1 | Manifest JSON check confirms `aidlc-governance-audit` skill, one `verify:post` step, `produces: ["GOVERNANCE.md"]`, and `gates: []`. |
| 05-02 Task 2 | `npm run build:test && node --test dist-test/governance/audit-hook-contract.test.js` passes. |
| 05-02 Task 2 | `node C:/Users/thien/.codex/gsd-core/bin/gsd-tools.cjs loop render-hooks verify:post --raw --config-dir C:/Users/thien/.codex` includes `aidlc-governance-audit`. |
| 05-02 Task 3 | `npm test` passes and package dependency files remain untouched. |

## Phase Gate

Run after both plans complete:

1. `npm run build`
2. `npm run build:test && node --test dist-test/governance/audit-artifact.test.js dist-test/governance/audit-hook-contract.test.js`
3. `node C:/Users/thien/.codex/gsd-core/bin/gsd-tools.cjs loop render-hooks verify:post --raw --config-dir C:/Users/thien/.codex`
4. `npm test`

## Boundary Checks

- Phase 05 remains artifact-only at `verify:post`.
- No ship hooks, approval gates, scanner adapters, test-runner ingestion, waiver source, or policy enforcement are added in this phase.
- `writeGovernanceAudit` keeps explicit `outputPath`; phase-dir resolution lives in the skill.
- Direct runner validates basename `GOVERNANCE.md` and resolved output containment under `<projectRoot>/.planning/phases/`.
