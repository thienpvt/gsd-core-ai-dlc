<!-- refreshed: 2026-07-11 -->
# Architecture

**Analysis Date:** 2026-07-11

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  GSD loop + governance CLI                   │
├──────────────────┬──────────────────┬───────────────────────┤
│  CLI dispatcher  │ Capability skills│      Hook entrypoints  │
│ `bin/governance.cjs` │ `.gsd/capabilities/aidlc-governance/capability.json` │ `src/governance/*-hook.ts` │
│ `src/cli/index.ts`   │ `.claude/skills/aidlc-governance-*`                 │                            │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Pure governance decision cores               │
│ `src/index/build.ts` → `src/select/select.ts` → `src/inject/inject.ts` │
│ `src/governance/risk.ts` + `src/select/eval-harness.ts`      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│      Rule packs, schemas, evidence ledger, audit output      │
│ `aidlc-rules/enterprise/`, `aidlc-rules/domain/java-spring/`,          │
│ `src/schema/`, `.planning/governance/`, `GOVERNANCE.md`                │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Package API | Re-export public types, CLI `main`, rule loader, index builder, and frontmatter validation. | `src/index.ts` |
| CLI binary shim | Keep package executable CommonJS-compatible and delegate argv to compiled CLI. | `bin/governance.cjs` |
| CLI dispatcher | Route `governance` subcommands to lazily loaded command modules. | `src/cli/index.ts` |
| Build-index command | Build `rule-index.json` from rule-pack markdown. | `src/cli/commands/build-index.ts` |
| Select command | Read `TaskSignal`, validate it, run selection, emit full `SelectionResult`, and surface budget overflow. | `src/cli/commands/select.ts` |
| Inject command | Render a persisted `SelectionResult` into a summary-only `<governance>` fragment. | `src/cli/commands/inject.ts` |
| Rule-detail command | Lazily load one rule body through guarded `detailPath` resolution. | `src/cli/commands/rule-detail.ts` |
| Eval command | Delegate selection eval CLI without duplicating harness logic. | `src/cli/commands/eval.ts` |
| Rule loader | Recursively load rule markdown, parse frontmatter with `gray-matter`, validate metadata, and quarantine bodies. | `src/rules/load.ts` |
| Rule corpus | Provide one enterprise rule and nine Java/Spring domain rules, with domain details loaded only on demand. | `aidlc-rules/enterprise/`, `aidlc-rules/domain/java-spring/` |
| Scope resolver | Enforce directory-derived scope, cross-tier precedence, and same-tier duplicate failure. | `src/rules/scope.ts` |
| Detail path guard | Resolve `detailPath` safely before body reads. | `src/rules/detail-path.ts` |
| Index builder | Convert validated rules to body-free `RuleIndexRecord` objects and validate `rule-index.json`. | `src/index/build.ts` |
| Index validator | Validate built or loaded indexes against JSON Schema. | `src/index/validate-index.ts` |
| Selector core | Pure deterministic rule selection over `RuleIndex`, `TaskSignal`, and `SelectionConfig`. | `src/select/select.ts` |
| Signal validator | Validate caller task signals before selection. | `src/select/validate-signal.ts` |
| Token estimator | Estimate summary budget used by selected rules. | `src/select/tokens.ts` |
| Injection renderer | Render selected summaries and lazy-detail pointers, never rule bodies. | `src/inject/inject.ts` |
| Risk classifier | Pure deterministic risk tier and domain-widening logic. | `src/governance/risk.ts` |
| Discuss hook | Resolve phase/index, validate signal, classify risk, select, render, and persist selection state. | `src/governance/discuss-hook.ts` |
| Plan hook | Derive planner `TaskSignal`, select rules, render governance, and write plan gate evidence. | `src/governance/plan-hook.ts` |
| Execute hook | Reload persisted selection state and render the same governance fragment for executor context. | `src/governance/execute-hook.ts` |
| Verify hook | Build verify gate request, call adapter boundary, derive per-rule statuses, and persist verify evidence. | `src/governance/verify-gate-hook.ts` |
| Ship hook | Fail closed on missing/failing plan/verify/eval/approval evidence and persist ship evidence. | `src/governance/ship-gate-hook.ts` |
| State store | Read/write persisted `GovernanceRecord` under `.planning/governance/selection-state.json`. | `src/governance/state-store.ts` |
| Gate evidence store | Read/write validated gate evidence records under `.planning/governance/gates/`. | `src/governance/gate-evidence-store.ts` |
| Approval store | Read/write per-phase human approval records under `.planning/governance/approvals/`. | `src/governance/approval-store.ts` |
| Test evidence store | Parse TAP summaries and persist test evidence under `.planning/governance/tests/`. | `src/governance/test-evidence.ts` |
| Eval evidence store | Validate and persist selection eval evidence and markdown reports under `.planning/governance/eval/`. | `src/governance/eval-evidence.ts` |
| Audit writer | Build schema-versioned `GOVERNANCE.md` from persisted machine state. | `src/governance/audit-artifact.ts` |
| Audit enrichment | Extract requirements, remaining risks, and approval summaries from bounded inputs. | `src/governance/audit-enrich.ts` |
| Enforcement adapters | Define `GateAdapter` and no-op/echo adapter stubs for scanner/CI/human boundaries. | `src/enforcement/adapters.ts` |
| Adapter runner | Require all adapter outputs to validate and match the requested gate and adapter identity. | `src/enforcement/run-adapter.ts` |
| Contract validators | Validate frontmatter, task signals, indexes, gate results, approvals, test evidence, eval reports. | `src/schema/*.json`, `src/schema/validate.ts`, `src/enforcement/validate-*.ts` |
| Capability registry | Bind governance skills into GSD loop points with `when: governance.enabled`. | `.gsd/capabilities/aidlc-governance/capability.json` |
| Governance skills | Marshal host context and invoke compiled hook entrypoints; do not duplicate selection/rendering logic. | `.claude/skills/aidlc-governance-*/SKILL.md` |

## Pattern Overview

**Overall:** Hexagonal CLI overlay with pure deterministic cores, thin hook/CLI adapters, schema-validated contracts, and file-backed evidence ledger.

**Key Characteristics:**
- Keep selection math pure: `src/select/select.ts` performs no I/O, no clock reads, no randomness, and always emits every candidate as selected or skipped.
- Keep context injection summary-only: `src/inject/inject.ts` imports no filesystem modules and renders only `id`, `severity`, `summary`, and lazy `governance rule-detail <id>` pointers.
- Keep rule bodies quarantined: `src/rules/load.ts` parses markdown but returns only frontmatter and paths; `src/index/build.ts` whitelists index fields; `src/cli/commands/rule-detail.ts` is the only body-read surface.
- Keep domain packs subscription-gated: the nine records under `aidlc-rules/domain/java-spring/` become candidates only when `SelectionConfig.domains` includes `java-spring`; enterprise rules such as `aidlc-rules/enterprise/require-mfa.md` remain global candidates.
- Keep GSD integration thin: `.claude/skills/aidlc-governance-discuss/SKILL.md`, `.claude/skills/aidlc-governance-plan/SKILL.md`, `.claude/skills/aidlc-governance-execute/SKILL.md`, `.claude/skills/aidlc-governance-verify/SKILL.md`, `.claude/skills/aidlc-governance-audit/SKILL.md`, and `.claude/skills/aidlc-governance-ship/SKILL.md` marshal inputs and invoke compiled hooks.
- Fail closed at trust boundaries: `src/select/validate-signal.ts`, `src/index/validate-index.ts`, `src/enforcement/validate-gate-result.ts`, `src/enforcement/validate-approval.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/test-evidence.ts`, and `src/governance/eval-evidence.ts` validate external or persisted data before use.
- Persist state through compaction/subagents: `src/governance/state-store.ts` writes `.planning/governance/selection-state.json`; `src/governance/execute-hook.ts` reloads it instead of re-selecting.

## Layers

**Runtime entry layer:**
- Purpose: Accept command-line or GSD loop invocations and dispatch to command/hook modules.
- Location: `bin/governance.cjs`, `src/cli/index.ts`, `.gsd/capabilities/aidlc-governance/capability.json`, `.claude/skills/aidlc-governance-*/SKILL.md`
- Contains: CommonJS binary shim, CLI subcommand router, capability step metadata, skill-level marshal instructions.
- Depends on: `src/cli/commands/*`, `src/governance/*-hook.ts`, compiled `dist/` output at runtime.
- Used by: `governance` binary, GSD discuss/plan/execute/verify/ship loop.

**Rule-pack ingestion layer:**
- Purpose: Load authored markdown rules, validate frontmatter, enforce scope/precedence/detail-path constraints, and emit body-free index records.
- Location: `aidlc-rules/`, `src/rules/`, `src/index/`, `src/schema/frontmatter.schema.json`, `src/schema/rule-index.schema.json`
- Contains: One enterprise rule, nine Java/Spring domain rule summaries, nine lazy detail files, frontmatter parser, scope derivation, precedence resolver, detail path guard, index builder, index validator.
- Depends on: `gray-matter`, `node:fs`, `node:path`, `Ajv2020`, `src/types.ts`.
- Used by: `src/cli/commands/build-index.ts`, `src/cli/commands/select.ts` directory fallback, `src/cli/commands/rule-detail.ts`, `src/governance/discuss-hook.ts`, `src/governance/plan-hook.ts`, `src/select/eval-cli.ts`.

**Selection and injection pure-core layer:**
- Purpose: Convert validated signal + config + index into deterministic selections and render selected summaries for context injection.
- Location: `src/select/select.ts`, `src/select/tokens.ts`, `src/select/eval-harness.ts`, `src/inject/inject.ts`
- Contains: Phase gate, domain subscription gate, trigger matching, exclusion rules, superseded skip emission, token budget accounting, injection rendering, eval metric computation.
- Depends on: `picomatch`, `src/types.ts`; `src/inject/inject.ts` depends only on types.
- Used by: CLI commands, discuss hook, plan hook, execute hook, eval CLI, tests.

**Governance hook orchestration layer:**
- Purpose: Bind pure cores to GSD lifecycle gates and file-backed evidence.
- Location: `src/governance/discuss-hook.ts`, `src/governance/plan-hook.ts`, `src/governance/execute-hook.ts`, `src/governance/verify-gate-hook.ts`, `src/governance/audit-artifact.ts`, `src/governance/ship-gate-hook.ts`
- Contains: Phase resolution, risk widening, persisted record assembly, gate request/result assembly, audit generation, approval/eval ship checks.
- Depends on: Pure cores, enforcement adapter boundary, governance stores, `.planning/STATE.md`, `rule-index.json`.
- Used by: `.claude/skills/aidlc-governance-*/SKILL.md`, direct `node dist/governance/*.js` invocations.

**Evidence and persistence layer:**
- Purpose: Persist durable governance state and enforce shape on read/write.
- Location: `src/governance/state-store.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/approval-store.ts`, `src/governance/test-evidence.ts`, `src/governance/eval-evidence.ts`, `src/governance/paths.ts`, `.planning/governance/`
- Contains: Single-sourced path helpers, atomic JSON writes, loud read ladders, schema validation, phase-number guards.
- Depends on: `src/governance/atomic-write.ts`, `node:fs`, `node:path`, JSON schemas, Ajv validators.
- Used by: Discuss, execute, plan, verify, audit, ship, eval, test-evidence capture.

**Enforcement adapter boundary:**
- Purpose: Keep CI/SAST/human approval engines tool-neutral by normalizing outputs to validated `GateResult` records.
- Location: `src/enforcement/types.ts`, `src/enforcement/adapters.ts`, `src/enforcement/run-adapter.ts`, `src/enforcement/validate-gate-result.ts`, `src/schema/gate-request.schema.json`, `src/schema/gate-result.schema.json`
- Contains: `GateAdapter` interface, reference no-op/echo stubs, request/result types, result validation wrapper.
- Depends on: JSON Schema contracts, `Ajv2020`, shared governance/audit types.
- Used by: `src/governance/verify-gate-hook.ts`, future real adapters.

**Audit and reporting layer:**
- Purpose: Produce review-ready governance artifacts from persisted machine state.
- Location: `src/governance/audit-artifact.ts`, `src/governance/audit-enrich.ts`, `src/governance/capture-test-evidence.ts`, `src/select/eval-cli.ts`, `.planning/phases/*/GOVERNANCE.md`, `.planning/governance/eval/`
- Contains: Audit record renderer, enrichment extractors, TAP summary parser, eval report builder, persisted markdown reports.
- Depends on: Governance stores, bounded planning markdown inputs, eval fixtures.
- Used by: Verify post hooks, ship gate, human review.

## Data Flow

### Primary Request Path

1. GSD dispatches a governance skill at a loop point via `.gsd/capabilities/aidlc-governance/capability.json:37` and `.claude/skills/aidlc-governance-discuss/SKILL.md:27`.
2. Discuss hook reads phase from `.planning/STATE.md`, resolves `rule-index.json`, validates `TaskSignal`, classifies risk, widens domains, and calls selection (`src/governance/discuss-hook.ts:165`).
3. Selector applies fixed phase/scope/trigger gates and produces complete selected/skipped output (`src/select/select.ts:204`).
4. Injector renders a summary-only `<governance>` block (`src/inject/inject.ts:65`).
5. State store persists full selection state to `.planning/governance/selection-state.json` using atomic write (`src/governance/state-store.ts:114`, `src/governance/atomic-write.ts:28`).
6. Execute hook reloads the same record and re-renders the fragment without re-running selection (`src/governance/execute-hook.ts:40`).

### Rule Index Build Flow

1. CLI command `governance build-index` calls `buildIndex(root)` with `aidlc-rules` default (`src/cli/commands/build-index.ts:9`).
2. Rule loader recursively reads markdown under `aidlc-rules/`, skipping `details/` subtrees (`src/rules/load.ts:29`).
3. Frontmatter is parsed and validated; body content is not returned (`src/rules/load.ts:56`).
4. Scope resolver rejects mismatched directory/frontmatter scope and same-tier duplicate IDs (`src/rules/scope.ts:67`, `src/rules/scope.ts:89`).
5. Index builder validates `detailPath` targets, whitelists record fields, validates the final index, and writes `rule-index.json` (`src/index/build.ts:59`, `src/index/build.ts:100`).
6. The current `rule-index.json` holds 10 records sourced from `aidlc-rules/enterprise/require-mfa.md` and `aidlc-rules/domain/java-spring/*.md`; the nine domain detail files remain outside the index.

### Lazy Rule Detail Flow

1. Injection tells executor to run `governance rule-detail <id>` instead of embedding bodies (`src/inject/inject.ts:83`).
2. Rule-detail command validates/read-builds the index and locates exactly one record by ID (`src/cli/commands/rule-detail.ts:38`, `src/cli/commands/rule-detail.ts:69`).
3. If `detailPath` is absent, command prints summary and no-detail signal (`src/cli/commands/rule-detail.ts:80`).
4. If `detailPath` exists, command resolves path through containment guard and reads only that target body (`src/cli/commands/rule-detail.ts:97`).

### Plan/Verify/Ship Gate Evidence Flow

1. Plan hook derives planner `TaskSignal` from structured planner inputs and writes `.planning/governance/gates/{NN}-plan.json` (`src/governance/plan-hook.ts:92`, `src/governance/plan-hook.ts:185`).
2. Verify hook reads selection state, creates `GateRequest`, calls `runAdapter`, derives per-rule statuses, and writes `.planning/governance/gates/{NN}-verify.json` (`src/governance/verify-gate-hook.ts:55`).
3. Adapter wrapper validates the returned `GateResult`, `gateId`, and `evaluatedBy` identity before consumers see it (`src/enforcement/run-adapter.ts:8`).
4. Ship hook reads required plan and verify evidence, fails closed on missing/failing records, handles approvals, checks eval evidence for phases `>= "10"`, and writes `.planning/governance/gates/{NN}-ship.json` (`src/governance/ship-gate-hook.ts:188`).

### Audit Artifact Flow

1. Verify post audit skill invokes `node dist/governance/audit-artifact.js <projectRoot> <phaseDir>/GOVERNANCE.md` (`.claude/skills/aidlc-governance-audit/SKILL.md:25`).
2. Audit writer validates output path, reads `.planning/governance/selection-state.json`, and builds schema-versioned audit JSON (`src/governance/audit-artifact.ts:261`).
3. Audit enrichment pulls requirements from `.planning/REQUIREMENTS.md`, tests from `.planning/governance/tests/{NN}.json`, risks from phase `VERIFICATION.md`/`CONTEXT.md`, and approvals from `.planning/governance/approvals/{NN}.json` (`src/governance/audit-artifact.ts:323`).
4. Audit artifact lands as markdown containing JSON under `.planning/phases/{NN}-*/GOVERNANCE.md` (`src/governance/audit-artifact.ts:257`).

**State Management:**
- Use `.planning/governance/selection-state.json` as canonical latest selection state (`src/governance/paths.ts:31`).
- Use `.planning/governance/gates/{NN}-{gate}.json` for plan/verify/ship gate evidence (`src/governance/paths.ts:56`).
- Use `.planning/governance/approvals/{NN}.json` for human approval state (`src/governance/paths.ts:73`).
- Use `.planning/governance/tests/{NN}.json` for test evidence (`src/governance/paths.ts:86`).
- Use `.planning/governance/eval/{NN}.json` and `.planning/governance/eval/{NN}-report.md` for selection eval evidence (`src/governance/paths.ts:98`, `src/governance/paths.ts:110`).
- Use `atomicWriteFile` for persisted governance JSON and markdown writes (`src/governance/atomic-write.ts:28`).

## Key Abstractions

**Rule metadata contract:**
- Purpose: Machine-selectable rule metadata separate from prose rule bodies.
- Examples: `src/types.ts`, `src/schema/frontmatter.schema.json`, `aidlc-rules/enterprise/require-mfa.md`, `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md`
- Pattern: Markdown with YAML frontmatter; scope derives from directory and must match frontmatter.

**RuleIndex:**
- Purpose: Body-free, deterministic selection input artifact.
- Examples: `src/types.ts`, `src/index/build.ts`, `rule-index.json`, `src/schema/rule-index.schema.json`
- Pattern: Explicit field whitelist; no spread from parsed markdown; validate before returning/writing; domain records retain source paths and lazy `detailPath` pointers without embedding detail bodies.

**TaskSignal:**
- Purpose: Small deterministic selector input derived by caller, not free-form task prose.
- Examples: `src/types.ts`, `src/schema/task-signal.schema.json`, `src/select/validate-signal.ts`, `src/governance/plan-hook.ts`
- Pattern: `{ taskType, keywords, paths }`; validate at CLI/hook boundaries.

**SelectionConfig:**
- Purpose: Runtime selector config for phase, domain subscription, and token budget.
- Examples: `src/types.ts`, `src/cli/commands/select.ts`, `src/governance/discuss-hook.ts`, `src/governance/plan-hook.ts`
- Pattern: `phase` plus explicit `domains`; risk classifier widens domains before selection.

**SelectionResult:**
- Purpose: Complete observable selector output for both execution context and audit trails.
- Examples: `src/types.ts`, `src/select/select.ts`, `src/governance/state-store.ts`, `src/governance/audit-artifact.ts`
- Pattern: Every candidate rule appears in `selected` or `skipped`; budget data is advisory/loud but never truncates selected rules.

**GateAdapter:**
- Purpose: Tool-neutral enforcement boundary for CI/SAST/human gates.
- Examples: `src/enforcement/types.ts`, `src/enforcement/adapters.ts`, `src/enforcement/run-adapter.ts`
- Pattern: `evaluate(request): Promise<GateResult>`; consumers call `runAdapter`, not adapter `evaluate` directly.

**GateEvidence:**
- Purpose: Durable pairing of gate request, gate result, and metadata.
- Examples: `src/governance/gate-evidence-store.ts`, `.planning/governance/gates/{NN}-plan.json`, `.planning/governance/gates/{NN}-verify.json`, `.planning/governance/gates/{NN}-ship.json`
- Pattern: Validate on write and read; phase number in path must match metadata.

**ApprovalRecord:**
- Purpose: Durable human approval lifecycle state separate from model execution.
- Examples: `src/governance/approval-store.ts`, `src/enforcement/validate-approval.ts`, `.planning/governance/approvals/{NN}.json`
- Pattern: Pending records omit `decidedBy`/`decidedAt`; human resolution happens out of band.

**GovernanceAudit:**
- Purpose: Review-ready audit artifact generated from persisted state.
- Examples: `src/governance/audit-artifact.ts`, `src/schema/audit-artifact.schema.json`, `.planning/phases/{NN}-*/GOVERNANCE.md`
- Pattern: Markdown wrapper around schema-versioned JSON; enrichment fields are conditionally included from persisted evidence.

## Entry Points

**Package API:**
- Location: `src/index.ts`
- Triggers: Package import through `main: dist/index.js`.
- Responsibilities: Export stable public API for CLI, rule loading, index building, and validation.

**CLI binary:**
- Location: `bin/governance.cjs`
- Triggers: `governance` npm bin.
- Responsibilities: Require compiled CLI and preserve CommonJS runtime compatibility.

**CLI dispatcher:**
- Location: `src/cli/index.ts`
- Triggers: `bin/governance.cjs` or direct `node dist/cli/index.js` invocation.
- Responsibilities: Route `build-index`, `select`, `inject`, `rule-detail`, and `eval` subcommands.

**Build index:**
- Location: `src/cli/commands/build-index.ts`
- Triggers: `governance build-index [--root <dir>] [--out <file>]`.
- Responsibilities: Produce `rule-index.json` from `aidlc-rules/`.

**Select rules:**
- Location: `src/cli/commands/select.ts`
- Triggers: `governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]`.
- Responsibilities: Validate signal, read index, resolve budget, emit `SelectionResult`.

**Inject fragment:**
- Location: `src/cli/commands/inject.ts`
- Triggers: `governance inject [--input <file>]`.
- Responsibilities: Render `<governance>` from a valid selection result and signal overflow through exit code.

**Load rule detail:**
- Location: `src/cli/commands/rule-detail.ts`
- Triggers: `governance rule-detail <id> [--index <f>]`.
- Responsibilities: Read exactly one detail body or return summary-only no-detail signal.

**Run eval harness:**
- Location: `src/select/eval-cli.ts`, `src/cli/commands/eval.ts`
- Triggers: `governance eval <phaseNumber> [--json]` or `node dist/select/eval-cli.js <phaseNumber>`.
- Responsibilities: Run labeled selection cases, persist eval evidence, render report, exit 2 on critical-recall regression.

**Discuss hook:**
- Location: `src/governance/discuss-hook.ts`
- Triggers: `.claude/skills/aidlc-governance-discuss/SKILL.md` at `discuss:pre`.
- Responsibilities: Select and persist governance for discussion context.

**Plan hook:**
- Location: `src/governance/plan-hook.ts`
- Triggers: `.claude/skills/aidlc-governance-plan/SKILL.md` at `plan:pre`.
- Responsibilities: Derive planner signal, render governance, persist plan gate evidence.

**Execute hook:**
- Location: `src/governance/execute-hook.ts`
- Triggers: `.claude/skills/aidlc-governance-execute/SKILL.md` at `execute:pre`.
- Responsibilities: Reload persisted selection and render executor context.

**Verify hook:**
- Location: `src/governance/verify-gate-hook.ts`
- Triggers: `.claude/skills/aidlc-governance-verify/SKILL.md` at `verify:post`.
- Responsibilities: Execute adapter boundary and persist verify evidence.

**Audit artifact writer:**
- Location: `src/governance/audit-artifact.ts`
- Triggers: `.claude/skills/aidlc-governance-audit/SKILL.md` at `verify:post`.
- Responsibilities: Write `GOVERNANCE.md` from persisted selection and enrichment state.

**Ship gate:**
- Location: `src/governance/ship-gate-hook.ts`
- Triggers: `.claude/skills/aidlc-governance-ship/SKILL.md` at `ship:pre`.
- Responsibilities: Block release on missing/failing evidence or unresolved approval and persist ship evidence.

## Architectural Constraints

- **Threading:** Single-process Node.js event loop. CLI/hook code uses synchronous filesystem I/O (`readFileSync`, `writeFileSync`, `renameSync`) for deterministic command behavior; adapter `evaluate()` is async through `Promise<GateResult>` in `src/enforcement/adapters.ts`.
- **Global state:** CLI commands set `process.exitCode` and write to `process.stdout`/`process.stderr` in `src/cli/index.ts`, `src/cli/commands/select.ts`, `src/cli/commands/inject.ts`, `src/select/eval-cli.ts`, and hook direct-run wrappers. Ajv validators are module-level singletons in `src/schema/validate.ts`, `src/index/validate-index.ts`, `src/select/validate-signal.ts`, `src/enforcement/validate-gate-result.ts`, `src/enforcement/validate-approval.ts`, `src/governance/test-evidence.ts`, and `src/governance/eval-evidence.ts`.
- **Circular imports:** No circular import chains detected in loaded architecture files. Keep `src/types.ts` as shared leaf types; do not import runtime modules into it.
- **Module format:** Source uses TypeScript `module: nodenext` but package omits `"type": "module"`; emitted runtime remains CommonJS-compatible for `bin/governance.cjs`.
- **Context budget:** Never place rule bodies in `rule-index.json`, `SelectionResult`, `<governance>`, or audit selection fields. Use `src/cli/commands/rule-detail.ts` for body reads.
- **Filesystem layout:** All governance persisted state must go through `src/governance/paths.ts`; do not re-derive `.planning/governance/` paths inline.
- **Phase numbers:** Persisted gate, approval, test, and eval paths require two-digit `phaseNumber` matching `src/governance/paths.ts` `PHASE_NUMBER_RE`.
- **Human approval:** Model-authored code creates pending approval records only; resolved `approved`, `rejected`, or `waived` decisions require out-of-band human edits under `.planning/governance/approvals/{NN}.json`.
- **Eval ship gate:** `src/governance/ship-gate-hook.ts` enforces eval evidence only for phases `>= "10"`; older two-digit phases are not retroactively blocked by eval absence.

## Anti-Patterns

### Re-implementing Selection In Skills Or Hooks

**What happens:** Skill markdown under `.claude/skills/aidlc-governance-*/SKILL.md` or hooks duplicate trigger matching, rendering, risk classification, or skip-reason logic.
**Why it's wrong:** Duplicate logic drifts from `src/select/select.ts` and under-injects governance.
**Do this instead:** Marshal structured inputs and call compiled hooks (`src/governance/discuss-hook.ts`, `src/governance/plan-hook.ts`, `src/governance/execute-hook.ts`) or pure cores (`src/select/select.ts`, `src/inject/inject.ts`).

### Reading Rule Bodies Outside Rule Detail

**What happens:** Code reads markdown rule body content in selector, injector, index builder, audit writer, or GSD skills.
**Why it's wrong:** Rule bodies in context break summary-only injection and context budget guarantees.
**Do this instead:** Keep body access confined to `src/cli/commands/rule-detail.ts`; all other modules use summaries from `RuleIndexRecord` in `src/types.ts`.

### Calling Adapters Directly

**What happens:** Governance code calls `adapter.evaluate(request)` directly.
**Why it's wrong:** Gate result schema validation, `gateId` identity check, and `evaluatedBy` adapter identity check are bypassed.
**Do this instead:** Call `runAdapter(adapter, request)` in `src/enforcement/run-adapter.ts` as `src/governance/verify-gate-hook.ts` does.

### Re-Deriving Governance Paths Inline

**What happens:** New code constructs `.planning/governance/...` paths with ad-hoc `path.join` calls.
**Why it's wrong:** Path drift breaks readers/writers and can bypass phase-number validation.
**Do this instead:** Add or use helpers in `src/governance/paths.ts` and write through store modules (`src/governance/state-store.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/approval-store.ts`, `src/governance/test-evidence.ts`, `src/governance/eval-evidence.ts`).

### Persisting Without Atomic Write

**What happens:** New stores use `writeFileSync(finalPath, ...)` directly for durable governance records.
**Why it's wrong:** Crash or concurrent write can leave truncated or clobbered evidence.
**Do this instead:** Use `atomicWriteFile` from `src/governance/atomic-write.ts` and validate before write.

### Silent Fallback To No Governance

**What happens:** Missing `.planning/STATE.md`, malformed `TaskSignal`, unreadable index, or corrupt persisted state returns an empty selection or no-rule fragment.
**Why it's wrong:** Silent no-governance is under-injection and breaks auditability.
**Do this instead:** Throw loud like `src/governance/discuss-hook.ts`, `src/select/validate-signal.ts`, `src/index/validate-index.ts`, and `src/governance/state-store.ts`.

### Shared Validator Abstraction For One-Off Evidence Stores

**What happens:** New code extracts the near-identical Ajv setup from all validators into a single shared validator utility.
**Why it's wrong:** Existing architecture intentionally duplicates validators for crash isolation and one-consumer schema ownership.
**Do this instead:** Follow sibling local validator patterns in `src/governance/test-evidence.ts`, `src/governance/eval-evidence.ts`, `src/enforcement/validate-approval.ts`, and `src/enforcement/validate-gate-result.ts`.

## Error Handling

**Strategy:** Fail loud at trust boundaries, return `null` only for absent optional persisted records, validate before write, and set `process.exitCode` instead of calling `process.exit()` so stdout can drain.

**Patterns:**
- Throw contextual errors for malformed `.planning/STATE.md` in `src/governance/discuss-hook.ts` and `src/governance/plan-hook.ts`.
- Validate index and signal JSON before selection in `src/cli/commands/select.ts`.
- Validate frontmatter and format Ajv errors with file paths in `src/schema/validate.ts`.
- Return `null` for missing optional stores and throw on malformed existing stores in `src/governance/state-store.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/approval-store.ts`, `src/governance/test-evidence.ts`, and `src/governance/eval-evidence.ts`.
- Emit output first, then set non-zero `process.exitCode` for budget overflow or eval regression in `src/cli/commands/select.ts`, `src/cli/commands/inject.ts`, and `src/select/eval-cli.ts`.
- Fail ship closed on missing/failing evidence in `src/governance/ship-gate-hook.ts`.

## Cross-Cutting Concerns

**Logging:** CLI and direct hook entrypoints write human/status lines to `process.stderr` and machine-readable primary output to `process.stdout`; examples live in `src/cli/commands/select.ts`, `src/cli/commands/inject.ts`, `src/select/eval-cli.ts`, and `src/governance/*-hook.ts`.

**Validation:** JSON Schema validation uses Ajv 2020 with formats in `src/schema/validate.ts`, `src/index/validate-index.ts`, `src/select/validate-signal.ts`, `src/enforcement/validate-gate-result.ts`, `src/enforcement/validate-approval.ts`, `src/governance/test-evidence.ts`, and `src/governance/eval-evidence.ts`; store modules add post-schema identity checks.

**Authentication:** No runtime auth service exists. Governance approval is file-backed human approval through `src/governance/approval-store.ts` and `src/governance/ship-gate-hook.ts`; `aidlc-rules/enterprise/require-mfa.md` is a policy rule, not an auth implementation.

**Determinism:** Selection, injection, risk classification, and eval aggregation are pure or deterministic except explicit timestamp metadata in hooks/stores; key files are `src/select/select.ts`, `src/inject/inject.ts`, `src/governance/risk.ts`, and `src/select/eval-harness.ts`.

**Security:** Detail path resolution, path normalization, schema validation, no-body index guarantees, and approval anti-auto-approve logic live in `src/rules/detail-path.ts`, `src/index/build.ts`, `src/cli/commands/rule-detail.ts`, `src/enforcement/validate-approval.ts`, and `src/governance/ship-gate-hook.ts`.

**Testing Hooks:** Tests are co-located under `src/**/*.test.ts` and exercise each architectural boundary, including CLI smoke tests in `src/cli/*.smoke.test.ts`, property tests in `src/index/no-body.property.test.ts`, `src/select/select.property.test.ts`, and `src/inject/inject.property.test.ts`, and gate/store tests in `src/governance/*.test.ts`.

---

*Architecture analysis: 2026-07-11*
