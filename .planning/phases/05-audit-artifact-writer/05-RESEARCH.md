# Phase 05: Audit-Artifact Writer - Research

**Researched:** 2026-07-06
**Domain:** TypeScript/Node governance audit artifact generation
**Confidence:** HIGH for local code/runtime findings; LOW for WebSearch, which returned no project-relevant authoritative source.

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied from `.planning/phases/05-audit-artifact-writer/05-CONTEXT.md`. [VERIFIED: .planning/phases/05-audit-artifact-writer/05-CONTEXT.md]

### Locked Decisions

#### Machine-Derived Artifact
- Use Phase 4 `readSelection(projectRoot)` as the source of truth. Do not re-run `select()` in the audit writer.
- The writer should fail loud when `selection-state.json` is missing or malformed. A silent empty audit is an under-injection/audit bypass.
- `rules_applied` maps one-to-one from `selectionResult.selected`; preserve id, severity, summary, matched axis, and matched value.
- `rules_skipped` maps from `selectionResult.skipped`; preserve id, severity, normalized audit reason, and source/provenance fields where present.

#### Audit Reason Enum
- Audit reasons are not inherited blindly from `SkipReason`. Phase 2 has `out-of-scope`; Phase 5's public audit enum does not.
- Normalize selector `out-of-scope` into audit `out-of-scope-by-trigger` with a provenance field such as `selector_reason: "out-of-scope"` so no evidence is lost.
- Keep `explicitly-waived` in the audit enum for schema completeness, but do not invent waivers without a machine input. The v1 writer may emit none.
- Add a validator/test that rejects any audit reason outside the fixed enum.

#### Reproducibility
- No fresh clock in generated applied/skipped records. If metadata needs time, use the persisted selection record timestamp or omit it.
- Sort output deterministically using existing selection order; if additional grouping is needed, use id/scope/sourceFile stable keys.
- Tests should regenerate from the same fixture state and compare applied/skipped records for deep equality.

#### Hook Boundary
- A `verify:post` hook here is artifact generation only. It must not grow into the v2 verify gate that runs tests, lint, scans, or policy checks.
- If the capability manifest is extended, keep the new hook thin: load persisted state, write audit artifact, return path/status.

### the agent's Discretion

The planner may choose frontmatter, fenced JSON, or a compact Markdown table as long as `rules_applied` and `rules_skipped` remain machine-parseable and deterministic. Prefer the shortest format that makes the acceptance tests easy and stable.

### Deferred Ideas (OUT OF SCOPE)

- Real waiver source and approval trail.
- Test-runner/lint/SAST evidence ingestion.
- Gate adapter contracts and binding enforcement.
- Full audit sections for requirements covered, tests executed, remaining risks, approvals required, and rollback plan.
</user_constraints>

## Summary

Phase 5 should be a small artifact writer over Phase 4 state: read `.planning/governance/selection-state.json` with `readSelection(projectRoot)`, map `selectionResult.selected` to `rules_applied`, map `selectionResult.skipped` to `rules_skipped`, normalize only `out-of-scope` to public audit reason `out-of-scope-by-trigger`, and write `<phase>/GOVERNANCE.md` atomically. No call path should import or call `select()`, `validateSignal()`, `classifyRisk()`, `discussHook()`, or `executeHook()` for audit generation. [VERIFIED: CodeGraph src/governance/state-store.ts; VERIFIED: CodeGraph src/types.ts; VERIFIED: .planning/phases/05-audit-artifact-writer/05-CONTEXT.md]

Use fenced JSON inside Markdown as the v1 artifact format. It is shorter and easier to test than Markdown tables or YAML frontmatter, and it preserves exact array/object shapes for deep-equality tests. [VERIFIED: .planning/phases/05-audit-artifact-writer/05-CONTEXT.md; VERIFIED: package.json node:test usage]

Add a `verify:post` step to `.gsd/capabilities/aidlc-governance/capability.json` because the roadmap acceptance criterion says the writer runs at `verify:post`, and the installed GSD runtime exposes `verify:post` as a canonical loop point. Keep it as a step only: `produces: ["GOVERNANCE.md"]`, `consumes: [".planning/governance/selection-state.json"]`, `when: "governance.enabled"`, `onError: "halt"`. Do not add gates, ship checks, adapters, SAST, lint, or test execution. [VERIFIED: .planning/ROADMAP.md; VERIFIED: C:/Users/thien/.codex/gsd-core/bin/lib/loop-host-contract.cjs; VERIFIED: gsd-tools loop render-hooks verify:post]

**Primary recommendation:** Build `src/governance/audit-artifact.ts` with pure `buildAuditRecord(record)` / `renderGovernanceMarkdown(audit)` plus a thin `writeGovernanceAudit({ projectRoot, outputPath })`; add one focused test file and one artifact-only `verify:post` skill/manifest update. [VERIFIED: CodeGraph src/governance/state-store.ts; VERIFIED: CodeGraph src/cli/index.ts]

## Phase Requirements

<phase_requirements>

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIT-01 | System produces a per-task audit artifact recording the rules applied, derived from actual selector output, not model narration. | Use `readSelection(projectRoot)` and map `record.selectionResult.selected` one-to-one into `rules_applied`; test against fixture `selection-state.json`. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: CodeGraph readSelection] |
| AUDIT-02 | Audit artifact records rules skipped and reason for each skip, drawn from machine-checkable enum `out-of-phase / out-of-scope-by-trigger / superseded / explicitly-waived`. | Define audit enum in audit writer, normalize selector `out-of-scope` to `out-of-scope-by-trigger` with `selector_reason`, and reject unknown reasons. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: CodeGraph src/types.ts] |

</phase_requirements>

## Project Constraints (from Provided AGENTS.md Instructions)

- Use CodeGraph first for structural code exploration; native search is acceptable for literal text in docs/manifests. [VERIFIED: user-provided AGENTS.md instructions]
- Trust CodeGraph structural results; do not re-grep symbol definitions already returned by CodeGraph. [VERIFIED: user-provided AGENTS.md instructions]
- Existing hook notes matter only if editing Codex runtime Stop/SubagentStop hooks; Phase 5 uses GSD capability `verify:post`, not Codex Stop hooks. [VERIFIED: user-provided AGENTS.md instructions; VERIFIED: .planning/phases/05-audit-artifact-writer/05-CONTEXT.md]
- No `./AGENTS.md` file exists in the repo root during this research run. [VERIFIED: Test-Path AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Load persisted selection | Node hook/runtime | Governance state store | `readSelection(projectRoot)` owns selection-state parsing and malformed-state loud failures. [VERIFIED: CodeGraph readSelection; VERIFIED: src/governance/state-store.ts] |
| Build audit data | Pure TypeScript core | Existing types | Mapping selected/skipped arrays is deterministic and needs no I/O, clock, model text, or selector rerun. [VERIFIED: CodeGraph src/types.ts; VERIFIED: 05-CONTEXT.md] |
| Normalize skip reasons | Pure TypeScript core | Tests | Public audit enum differs from selector enum only for `out-of-scope`; provenance field prevents evidence loss. [VERIFIED: src/types.ts; VERIFIED: 05-CONTEXT.md] |
| Write `GOVERNANCE.md` | Node hook/runtime | Filesystem | Artifact output belongs at verify time and should use temp-then-rename like Phase 4 state writes. [VERIFIED: src/governance/state-store.ts; VERIFIED: C:/Users/thien/.codex/gsd-core/bin/lib/capability-registry.cjs] |
| Register `verify:post` | GSD capability manifest | Thin GSD skill | Installed loop supports `verify:post`; manifest step makes acceptance exercise the loop seam without adding v2 enforcement. [VERIFIED: loop-host-contract.cjs; VERIFIED: gsd-tools loop render-hooks verify:post] |

## Standard Stack

### Core

| Library / Surface | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| Node.js runtime + stdlib (`node:fs`, `node:path`) | 24.14.0 available; package requires >=22 | Read/write files, path-safe output, atomic rename. | Already required by project; no new dependency for file I/O. [VERIFIED: node --version; VERIFIED: package.json] |
| TypeScript | 6.0.3 local | Strict typed audit record and reason enum. | Existing project compiler and `nodenext` config. [VERIFIED: npx tsc --version; VERIFIED: tsconfig.build.json] |
| `node:test` + `node:assert/strict` | Node stdlib | TDD unit/integration tests. | Existing tests use Node built-in test runner; no Jest/Vitest. [VERIFIED: src/governance/state-store.test.ts; VERIFIED: package.json] |
| `readSelection(projectRoot)` | Existing source | Load `.planning/governance/selection-state.json`. | Phase 4 source of truth; malformed JSON throws loud, missing returns null. [VERIFIED: CodeGraph readSelection; VERIFIED: src/governance/state-store.ts] |
| `SelectionResult`, `SelectedRule`, `SkippedRule`, `SkipReason` | Existing source | Input contract for applied/skipped audit arrays. | Already carries selected fields, skipped reasons, and optional superseded provenance. [VERIFIED: src/types.ts] |
| GSD capability `steps` manifest | Installed runtime 1.6.1 active | Register `verify:post` artifact step. | Same mechanism used by first-party `nyquist` and `security` verify post artifacts. [VERIFIED: capability list; VERIFIED: capability-registry.cjs] |

### Supporting

| Surface | Purpose | When to Use |
|---------|---------|-------------|
| `.claude/skills/aidlc-governance-audit/SKILL.md` | Thin project skill for hook invocation. | Add with manifest step so `verify:post` has a named skill. [VERIFIED: existing .claude/skills/aidlc-governance-execute/SKILL.md pattern] |
| `gsd-tools loop render-hooks verify:post --raw --config-dir "$HOME/.codex"` | Verify manifest step is active. | Use in acceptance/manifest test after manifest update. [VERIFIED: gsd-tools loop render-hooks verify:post] |
| Built CLI dispatch (`src/cli/index.ts`) | Optional manual command wiring. | Skip for Phase 5 unless planner wants `governance audit`; hook/function tests are enough for AUDIT-01/02. [VERIFIED: CodeGraph src/cli/index.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fenced JSON in Markdown | Markdown table | Tables are human-readable but harder to parse and can mangle optional provenance fields. [VERIFIED: 05-CONTEXT.md discretion] |
| Fenced JSON in Markdown | YAML frontmatter | Frontmatter needs parser rules and can mix machine record with prose; fenced JSON uses stdlib `JSON.parse`. [VERIFIED: package.json; VERIFIED: 05-CONTEXT.md discretion] |
| Direct hook module | New `governance audit` CLI | CLI adds dispatch file and smoke test; useful later, not required for verify-post acceptance. [VERIFIED: CodeGraph src/cli/index.ts; VERIFIED: ROADMAP Phase 5 criteria] |
| `select()` rerun | Persisted `readSelection()` | Rerun can drift from discuss-time signal; Phase 5 is explicitly reload-not-rederive. [VERIFIED: 04-02-SUMMARY.md; VERIFIED: 05-CONTEXT.md] |

**Installation:** none. This phase should add no external packages. [VERIFIED: package.json; VERIFIED: 05-CONTEXT.md]

## Package Legitimacy Audit

No external package installation is recommended for Phase 5, so package legitimacy gate is not applicable. Existing dependencies remain unchanged. [VERIFIED: package.json]

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| none | n/a | n/a | n/a | n/a | n/a | No install |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package plan]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: package plan]

## Existing Code Findings

- `GovernanceRecord` contains `phase`, `taskSignal`, `selectionConfig`, full `selectionResult`, `riskTier`, and wrapper-only `timestamp`. [VERIFIED: src/governance/state-store.ts]
- `readSelection(projectRoot)` composes through `selectionStatePath(projectRoot)` and returns `GovernanceRecord | null`; malformed content throws from `readJsonRecord`. [VERIFIED: CodeGraph readSelection; VERIFIED: src/governance/state-store.ts]
- `SkipReason` currently includes `out-of-phase`, `out-of-scope`, `out-of-scope-by-trigger`, and `superseded`; source comments already state Phase 5 reconciles this enum and adds `explicitly-waived`. [VERIFIED: src/types.ts]
- `SkippedRule` can carry `detail`, `scope`, and `sourceFile`; these are provenance fields that should pass through when present. [VERIFIED: src/types.ts]
- Existing `phaseDir(projectRoot, phase)` in `src/governance/paths.ts` means `.planning/governance/phase-<phase>`, not `.planning/phases/05-audit-artifact-writer`; avoid reusing that name for output artifact path. [VERIFIED: src/governance/paths.ts]
- Current project manifest declares `discuss:pre` and `execute:pre` only; no `verify:post` project hook exists yet. [VERIFIED: .gsd/capabilities/aidlc-governance/capability.json; VERIFIED: gsd-tools loop render-hooks verify:post]
- Current workspace has no `.planning/governance/selection-state.json`; tests must create fixture state instead of relying on repo state. [VERIFIED: Test-Path .planning/governance/selection-state.json]

## Architecture Patterns

### System Architecture Diagram

```text
GSD verify:post
  -> aidlc-governance-audit skill
    -> audit hook receives projectRoot + outputPath
      -> readSelection(projectRoot)
        -> missing null: throw loud
        -> malformed JSON/shape: state-store throws loud
        -> valid GovernanceRecord
      -> buildAuditRecord(record)
        -> selectionResult.selected -> rules_applied
        -> selectionResult.skipped -> normalizeSkipReason -> rules_skipped
      -> renderGovernanceMarkdown(audit)
        -> fenced JSON, deterministic stringify
      -> atomic write <phase>/GOVERNANCE.md
        -> return path/status
```

[VERIFIED: CodeGraph readSelection; VERIFIED: loop-host-contract.cjs; VERIFIED: 05-CONTEXT.md]

### Recommended Project Structure

```text
src/governance/
  audit-artifact.ts        # pure audit build/render + thin write wrapper
  audit-artifact.test.ts   # AUDIT-01/02 unit + fixture integration coverage
.claude/skills/
  aidlc-governance-audit/
    SKILL.md               # verify:post thin skill; no logic duplication
.gsd/capabilities/aidlc-governance/
  capability.json          # add verify:post step only
```

[VERIFIED: existing src/governance layout; VERIFIED: existing .claude/skills aidlc governance skills]

### Pattern 1: Pure Builder, Thin Writer

**What:** `buildAuditRecord(record)` returns a plain object; `renderGovernanceMarkdown(audit)` returns string; `writeGovernanceAudit(args)` does file I/O. [VERIFIED: existing pure-core/thin-wrapper pattern in discussHook/executeHook]

**When to use:** Always for Phase 5; TDD can cover mapping without filesystem, then cover one wrapper test for read/write. [VERIFIED: src/governance/execute-hook.test.ts]

**Example:**

```typescript
// Source: local research recommendation from src/types.ts + state-store.ts
export function buildAuditRecord(record: GovernanceRecord): GovernanceAudit {
  return {
    schema_version: 1,
    phase: record.phase,
    riskTier: record.riskTier,
    selection_timestamp: record.timestamp,
    generated_from: ".planning/governance/selection-state.json",
    rules_applied: record.selectionResult.selected.map((rule) => ({
      id: rule.id,
      severity: rule.severity,
      summary: rule.summary,
      matchedAxis: rule.matchedAxis,
      matchedValue: rule.matchedValue,
    })),
    rules_skipped: record.selectionResult.skipped.map(normalizeSkippedRule),
  };
}
```

### Pattern 2: Normalize Reason, Preserve Selector Provenance

**What:** Public audit reason validates against the AUDIT-02 enum; original selector reason remains available as `selector_reason`. [VERIFIED: src/types.ts; VERIFIED: 05-CONTEXT.md]

**When to use:** Every skipped selector record. [VERIFIED: 05-CONTEXT.md]

**Example:**

```typescript
// Source: local research recommendation from src/types.ts
export const AUDIT_SKIP_REASONS = [
  "out-of-phase",
  "out-of-scope-by-trigger",
  "superseded",
  "explicitly-waived",
] as const;

export type AuditSkipReason = (typeof AUDIT_SKIP_REASONS)[number];

export function normalizeSkipReason(selectorReason: string): AuditSkipReason {
  if (selectorReason === "out-of-scope") return "out-of-scope-by-trigger";
  if ((AUDIT_SKIP_REASONS as readonly string[]).includes(selectorReason)) {
    return selectorReason as AuditSkipReason;
  }
  throw new Error(`invalid audit skip reason: ${selectorReason}`);
}
```

### Pattern 3: Artifact-Only `verify:post` Step

**What:** Add one manifest step and one skill; do not add gates. [VERIFIED: capability-registry.cjs first-party nyquist/security verify steps; VERIFIED: 05-CONTEXT.md]

**Example:**

```json
{
  "point": "verify:post",
  "ref": { "skill": "aidlc-governance-audit" },
  "produces": ["GOVERNANCE.md"],
  "consumes": [".planning/governance/selection-state.json"],
  "when": "governance.enabled",
  "onError": "halt"
}
```

### Anti-Patterns to Avoid

- **Re-running `select()` in audit writer:** can diverge from discuss-time state and violates the locked context decision. [VERIFIED: 05-CONTEXT.md; VERIFIED: 04-02-SUMMARY.md]
- **Treating selector `out-of-scope` as public audit reason:** AUDIT-02 public enum excludes it; normalize and preserve `selector_reason`. [VERIFIED: REQUIREMENTS.md; VERIFIED: src/types.ts]
- **Silent empty artifact when state missing:** under-injection/audit bypass; throw loud. [VERIFIED: 05-CONTEXT.md; VERIFIED: src/governance/execute-hook.ts]
- **Copying security's `ship:pre` gate:** security has a blocking ship gate for threats; Phase 5 v1 must stay artifact-only. [VERIFIED: capability-registry.cjs; VERIFIED: 05-CONTEXT.md]
- **Adding new parser dependency:** fenced JSON can be parsed by stdlib; no package needed. [VERIFIED: package.json; VERIFIED: 05-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Selection decisions | New selector path or fresh `select()` call | `readSelection(projectRoot)` | Phase 4 persisted the source of truth; rerun can drift. [VERIFIED: CodeGraph readSelection; VERIFIED: 05-CONTEXT.md] |
| Loop integration | Custom hook runner | GSD capability `steps` at `verify:post` | Installed runtime already resolves canonical loop points. [VERIFIED: loop-host-contract.cjs; VERIFIED: loop-resolver.cjs] |
| File I/O abstraction | New fs wrapper package | `node:fs` temp file + `renameSync` | Existing state-store uses same pattern; no dependency needed. [VERIFIED: src/governance/state-store.ts] |
| Audit parser | YAML/frontmatter/table parser | fenced JSON + `JSON.parse` in tests | Machine-parseable, deterministic, and dependency-free. [VERIFIED: package.json; VERIFIED: 05-CONTEXT.md] |
| Enforcement | Test/lint/SAST runner in hook | none in v1 | v2 GATE-04/ENF-02..04 are explicitly deferred. [VERIFIED: REQUIREMENTS.md; VERIFIED: 05-CONTEXT.md] |

**Key insight:** Phase 5 is data projection, not governance decision-making. Any new decision logic beyond enum normalization creates a drift surface. [VERIFIED: 05-CONTEXT.md; VERIFIED: 04-02-SUMMARY.md]

## Minimal File / Module / Test Plan

| Plan Slice | Files | Tests | Acceptance Link |
|------------|-------|-------|-----------------|
| 05-01 Audit writer core | `src/governance/audit-artifact.ts`, `src/governance/audit-artifact.test.ts` | RED tests for selected mapping, missing-state throw, malformed-state propagation, deterministic render twice | AUDIT-01 [VERIFIED: ROADMAP.md] |
| 05-02 Skip enum + hook seam | same test file plus `.gsd/capabilities/aidlc-governance/capability.json`, `.claude/skills/aidlc-governance-audit/SKILL.md` | RED tests for `out-of-scope` normalization, invalid reason rejection, superseded provenance pass-through, manifest `verify:post` render | AUDIT-02 [VERIFIED: ROADMAP.md] |

Recommended tests:

- `buildAuditRecord maps selected one-to-one to rules_applied` compares selected fixture objects to parsed artifact `rules_applied`. [VERIFIED: AUDIT-01]
- `buildAuditRecord normalizes selector out-of-scope with selector_reason provenance` checks `{ reason: "out-of-scope-by-trigger", selector_reason: "out-of-scope" }`. [VERIFIED: AUDIT-02; VERIFIED: 05-CONTEXT.md]
- `normalizeSkipReason rejects unknown selector reason` casts test fixture as unsafe input and asserts throw. [VERIFIED: 05-CONTEXT.md]
- `writeGovernanceAudit throws on missing selection-state.json` uses empty temp project root. [VERIFIED: execute-hook missing-state pattern]
- `writeGovernanceAudit writes deterministic fenced JSON` writes same record twice and deep-equals parsed `rules_applied` / `rules_skipped`. [VERIFIED: 05-CONTEXT.md]
- `manifest verify:post step is artifact-only` asserts no `gates` entry is added and the new step only produces `GOVERNANCE.md`. [VERIFIED: 05-CONTEXT.md; VERIFIED: capability.json]

## Common Pitfalls

### Pitfall 1: Audit Re-Derives Selection

**What goes wrong:** Audit output differs from discuss/execute governance state. [VERIFIED: 04-02-SUMMARY.md]
**Why it happens:** Writer imports selector or reconstructs task signal at verify time. [VERIFIED: 05-CONTEXT.md]
**How to avoid:** Structural test: `audit-artifact.ts` must not import `../select/`, `validateSignal`, `classifyRisk`, `discussHook`, or `executeHook`. [VERIFIED: execute-hook structural test pattern]
**Warning signs:** Test fixtures need `rule-index.json` or `STATE.md` to render audit. [VERIFIED: 05-CONTEXT.md]

### Pitfall 2: Losing `out-of-scope` Provenance

**What goes wrong:** Public audit reason is valid but cannot explain that selector skipped by domain subscription, not trigger. [VERIFIED: src/types.ts]
**Why it happens:** Blind normalization overwrites original reason. [VERIFIED: 05-CONTEXT.md]
**How to avoid:** Add `selector_reason` for every skipped row or at least for normalized rows. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** Tests only inspect `reason`, not `selector_reason`. [VERIFIED: research inference from AUDIT-02]

### Pitfall 3: Verify Hook Grows Into v2 Gate

**What goes wrong:** Phase 5 starts running tests/lint/scans/policy checks and blocks on adapter results. [VERIFIED: REQUIREMENTS.md]
**Why it happens:** First-party security capability has `verify:post` artifact plus `ship:pre` gate, tempting a copy. [VERIFIED: capability-registry.cjs]
**How to avoid:** Add only a `steps[]` entry for `verify:post`; leave `gates` unchanged. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** Manifest changes include `ship:pre`, `artifact-frontmatter-equals`, SAST, CI, or adapter names. [VERIFIED: capability-registry.cjs]

### Pitfall 4: Non-Deterministic Artifact Metadata

**What goes wrong:** Re-rendering same state changes audit output. [VERIFIED: 05-CONTEXT.md]
**Why it happens:** Writer uses current time, process id, filesystem order, or fresh sorting. [VERIFIED: state-store timestamp comments]
**How to avoid:** Use persisted `record.timestamp` only as `selection_timestamp`, keep arrays in existing selection order, and stringify with fixed 2-space indentation. [VERIFIED: src/governance/state-store.ts; VERIFIED: 05-CONTEXT.md]
**Warning signs:** Tests need regex/timestamp normalization before comparison. [VERIFIED: state-store test pattern]

### Pitfall 5: Planning-Phase Path Confusion

**What goes wrong:** Artifact writes under `.planning/governance/phase-construction/` instead of `.planning/phases/05-audit-artifact-writer/GOVERNANCE.md`. [VERIFIED: src/governance/paths.ts; VERIFIED: ROADMAP.md]
**Why it happens:** Existing `phaseDir()` helper name refers governance ledger phase, not planning phase directory. [VERIFIED: src/governance/paths.ts]
**How to avoid:** Pass explicit `outputPath` or `planningPhaseDir` into writer; do not reuse `phaseDir(projectRoot, phase)` for artifact destination. [VERIFIED: codebase path semantics]
**Warning signs:** Output path includes `phase-construction` rather than `05-audit-artifact-writer`. [VERIFIED: src/governance/paths.ts]

## Code Examples

### Parse Fenced Audit JSON in Tests

```typescript
// Source: local research recommendation
function parseAuditMarkdown(markdown: string): GovernanceAudit {
  const match = markdown.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, "GOVERNANCE.md must contain fenced JSON");
  return JSON.parse(match[1]) as GovernanceAudit;
}
```

### Thin File Writer

```typescript
// Source: local research recommendation from state-store atomic pattern
function atomicWriteText(finalPath: string, content: string): void {
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmp = `${finalPath}.tmp`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, finalPath);
}
```

### Hook Wrapper Contract

```typescript
// Source: local research recommendation from executeHook pattern
export function writeGovernanceAudit(args: {
  projectRoot: string;
  outputPath: string;
}): { outputPath: string; audit: GovernanceAudit } {
  const record = readSelection(args.projectRoot);
  if (record === null) {
    throw new Error(
      `auditHook: missing governance selection state at ${selectionStatePath(args.projectRoot)}`,
    );
  }
  const audit = buildAuditRecord(record);
  atomicWriteText(args.outputPath, renderGovernanceMarkdown(audit));
  return { outputPath: args.outputPath, audit };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Model-authored audit prose | Machine-derived audit from persisted selector output | Locked by Phase 5 context on 2026-07-06 | Planner should not add narrative-only fields for AUDIT-01/02. [VERIFIED: 05-CONTEXT.md] |
| Execute-time re-derivation | Reload persisted state after boundary | Phase 04 Plan 02 on 2026-07-06 | Audit should follow reload-not-rederive. [VERIFIED: 04-02-SUMMARY.md] |
| Full verify enforcement | Artifact-only v1 audit | v2 deferred in requirements/roadmap | No CI/SAST/policy adapter in Phase 5. [VERIFIED: REQUIREMENTS.md; VERIFIED: ROADMAP.md] |

**Deprecated/outdated for this phase:**
- Selector `out-of-scope` as public audit reason: selector still emits it, but Phase 5 public enum excludes it. [VERIFIED: src/types.ts; VERIFIED: REQUIREMENTS.md]
- Markdown tables as primary machine record: allowed by context, but fenced JSON is recommended for deterministic tests. [VERIFIED: 05-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | build/test/hook execution | yes | 24.14.0 | none needed; package requires >=22. [VERIFIED: node --version; VERIFIED: package.json] |
| npm | existing scripts | yes | 11.9.0 | none needed. [VERIFIED: npm --version] |
| TypeScript | build/test compile | yes | 6.0.3 | none needed. [VERIFIED: npx tsc --version] |
| GSD tools | manifest render-hooks check | yes | first-party capabilities report 1.6.1 | Direct manifest JSON test if CLI unavailable. [VERIFIED: capability list] |
| selection-state runtime file | live audit input | no in current workspace | n/a | Tests create fixture `selection-state.json`; real hook should fail loud if absent. [VERIFIED: Test-Path .planning/governance/selection-state.json] |

**Missing dependencies with no fallback:** none for implementation/testing. [VERIFIED: environment probes]

**Missing dependencies with fallback:** live `.planning/governance/selection-state.json` absent; fixture state is correct for tests, and production hook must fail loud. [VERIFIED: state-store behavior]

## Validation Architecture

Nyquist validation is enabled in `.planning/config.json`; include tests in the plan. [VERIFIED: .planning/config.json]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` with `assert/strict`. [VERIFIED: package.json; VERIFIED: src/governance/state-store.test.ts] |
| Config file | `tsconfig.json` for `dist-test`, `tsconfig.build.json` for production. [VERIFIED: tsconfig.json; VERIFIED: tsconfig.build.json] |
| Quick run command | `npm run build:test && node --test dist-test/governance/audit-artifact.test.js` [VERIFIED: package.json script pattern] |
| Full suite command | `npm test` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUDIT-01 | `rules_applied` derives one-to-one from `selectionResult.selected`; no selector rerun. | unit + structural | `node --test dist-test/governance/audit-artifact.test.js` | no - Wave 0 |
| AUDIT-01 | Missing/malformed `selection-state.json` fails loud. | unit | `node --test dist-test/governance/audit-artifact.test.js` | no - Wave 0 |
| AUDIT-02 | `rules_skipped` reasons validate against public enum and preserve provenance. | unit | `node --test dist-test/governance/audit-artifact.test.js` | no - Wave 0 |
| AUDIT-02 | `out-of-scope` normalizes to `out-of-scope-by-trigger` with `selector_reason`. | unit | `node --test dist-test/governance/audit-artifact.test.js` | no - Wave 0 |
| AUDIT-01/02 | `verify:post` render-hooks includes artifact-only `aidlc-governance-audit` step. | integration/manifest | `node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" loop render-hooks verify:post --raw --config-dir "$HOME/.codex"` | no - Wave 0 |

### Sampling Rate

- Per task commit: `npm run build:test && node --test dist-test/governance/audit-artifact.test.js` [VERIFIED: package.json]
- Per wave merge: `npm test` [VERIFIED: package.json]
- Phase gate: `npm test` plus `gsd-tools loop render-hooks verify:post --raw --config-dir "$HOME/.codex"` showing `aidlc-governance-audit`. [VERIFIED: gsd-tools render-hooks]

### Wave 0 Gaps

- [ ] `src/governance/audit-artifact.test.ts` - covers AUDIT-01/AUDIT-02. [VERIFIED: file list]
- [ ] `src/governance/audit-artifact.ts` - implementation target. [VERIFIED: file list]
- [ ] `.claude/skills/aidlc-governance-audit/SKILL.md` - project skill target. [VERIFIED: existing skill layout]
- [ ] Manifest update in `.gsd/capabilities/aidlc-governance/capability.json` - add `verify:post` step and skill entry. [VERIFIED: current manifest]

## Security Domain

Security enforcement is enabled in `.planning/config.json`; Phase 5 handles a local artifact writer, not auth/session/crypto. [VERIFIED: .planning/config.json; VERIFIED: 05-CONTEXT.md]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No user identity or auth flow in scope. [VERIFIED: 05-CONTEXT.md] |
| V3 Session Management | no | No session state in scope. [VERIFIED: 05-CONTEXT.md] |
| V4 Access Control | no | Artifact written inside project phase dir; no multi-user authorization boundary. [VERIFIED: 05-CONTEXT.md] |
| V5 Input Validation | yes | Validate persisted state shape enough to reject invalid audit reasons and malformed selected/skipped arrays. [VERIFIED: src/governance/state-store.ts; VERIFIED: 05-CONTEXT.md] |
| V6 Cryptography | no | No crypto; do not add signing in v1. [VERIFIED: REQUIREMENTS.md v2 boundary] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Corrupted `selection-state.json` yields empty/success audit | Tampering | State store throws on malformed record; audit wrapper throws on `null`; add selected/skipped array and enum checks. [VERIFIED: src/governance/state-store.ts; VERIFIED: 05-CONTEXT.md] |
| Path confusion writes artifact outside phase dir | Tampering | Prefer explicit `outputPath` from trusted phase resolver; if CLI accepts path, resolve/contain under `.planning/phases/`. [VERIFIED: paths.ts semantics; VERIFIED: ROADMAP target] |
| v2 enforcement creep in v1 hook | Elevation of scope | Manifest step only, no gates/adapters/scan commands. [VERIFIED: REQUIREMENTS.md; VERIFIED: 05-CONTEXT.md] |
| Prompt/model narration contaminates audit facts | Repudiation | Artifact fields derive only from persisted machine JSON. [VERIFIED: 05-CONTEXT.md; VERIFIED: PITFALLS.md] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `aidlc-governance-audit` skill can resolve the current planning phase directory at runtime via existing GSD phase context or pass an explicit `outputPath` to the Node wrapper. [ASSUMED] | Architecture Patterns / Minimal Plan | If wrong, manifest render still passes but live hook needs a small skill argument/resolution adjustment. |

## Open Questions

1. **Exact phase-dir source inside live `verify:post` skill**
   - What we know: `verify:post` is canonical, and `init.phase-op 05` returns `.planning/phases/05-audit-artifact-writer`. [VERIFIED: init.phase-op; VERIFIED: loop-host-contract.cjs]
   - What's unclear: whether the live skill receives the phase number as an argument or must infer from `.planning/STATE.md`. [ASSUMED]
   - Recommendation: keep TypeScript writer accepting explicit `outputPath`; skill resolves phase dir separately, so core remains testable. [VERIFIED: existing thin skill pattern]

## Sources

### Primary (HIGH confidence)

- CodeGraph exploration of `src/governance/state-store.ts`, `src/types.ts`, `src/governance/paths.ts`, `src/cli/index.ts`, `src/governance/execute-hook.ts`. [VERIFIED: CodeGraph]
- `.planning/phases/05-audit-artifact-writer/05-CONTEXT.md` - locked Phase 5 scope and decisions. [VERIFIED: local file]
- `.planning/REQUIREMENTS.md` - AUDIT-01/AUDIT-02 text and v2 deferred boundary. [VERIFIED: local file]
- `.planning/ROADMAP.md` - Phase 5 criteria including `verify:post`. [VERIFIED: local file]
- `.planning/phases/04-gsd-capability-integration-persistence/04-02-SUMMARY.md` - reload-not-rederive and loud missing-state pattern. [VERIFIED: local file]
- Installed GSD runtime files `loop-host-contract.cjs`, `loop-resolver.cjs`, `capability-registry.cjs` plus `gsd-tools loop render-hooks`. [VERIFIED: local runtime command]

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md` and `.planning/research/SUMMARY.md` - prior research on audit anti-patterns and verify hooks. [VERIFIED: local file]

### Tertiary (LOW confidence)

- WebSearch for project-specific audit writer, GSD verify-post, and skip-reason normalization returned no authoritative project-relevant hits; not used for recommendations. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing package/runtime/test configuration verified locally. [VERIFIED: package.json; VERIFIED: node/npm/tsc commands]
- Architecture: HIGH - source and installed GSD runtime verify the load/write/hook seams. [VERIFIED: CodeGraph; VERIFIED: gsd-tools render-hooks]
- Pitfalls: HIGH for local anti-patterns from Phase 04/05 context; LOW for external web. [VERIFIED: 04 summaries; VERIFIED: 05-CONTEXT.md]

**Research date:** 2026-07-06
**Valid until:** 2026-08-05 for local code shape; re-check installed GSD runtime before editing manifest if GSD Core updates. [ASSUMED]

## RESEARCH COMPLETE
