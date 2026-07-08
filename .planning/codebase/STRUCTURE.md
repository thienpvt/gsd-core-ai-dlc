# Codebase Structure

**Analysis Date:** 2026-07-08

## Directory Layout

```
gsd-core-ai-dlc/
├── .claude/                         # Project instructions and governance skill wrappers
│   ├── CLAUDE.md                    # Project-level constraints and stack guidance
│   └── skills/                      # GSD capability skill entrypoints
│       ├── aidlc-governance-discuss/
│       ├── aidlc-governance-plan/
│       ├── aidlc-governance-execute/
│       ├── aidlc-governance-verify/
│       ├── aidlc-governance-audit/
│       └── aidlc-governance-ship/
├── .gsd/                            # Installed GSD capability metadata
│   └── capabilities/
│       └── aidlc-governance/
│           └── capability.json
├── .planning/                       # GSD project state, roadmap, phases, governance ledger, codebase map
│   ├── codebase/                    # Generated codebase architecture/stack/quality docs
│   ├── governance/                  # Runtime governance selection/evidence state
│   ├── milestones/                  # Historical milestone planning artifacts
│   ├── phases/                      # Phase plans, reviews, verification, audit artifacts
│   ├── research/                    # Research docs and cache
│   ├── PROJECT.md                   # Project statement and constraints
│   ├── ROADMAP.md                   # Phase roadmap
│   └── STATE.md                     # Current phase state
├── aidlc-rules/                     # Authored governance rule pack store
│   └── enterprise/                  # Enterprise-scope rule markdown
│       └── require-mfa.md
├── bin/                             # Published executable shims
│   └── governance.cjs               # CommonJS CLI shim
├── src/                             # TypeScript source and co-located tests
│   ├── cli/                         # CLI dispatcher, commands, CLI smoke tests
│   │   └── commands/                # `governance` subcommand implementations
│   ├── enforcement/                 # Gate contracts, adapter stubs, adapter validation boundary
│   ├── governance/                  # GSD hook orchestration, stores, audit/evidence writers
│   ├── index/                       # Rule index builder and index validator
│   ├── inject/                      # Summary-only governance fragment renderer
│   ├── rules/                       # Rule loading, scope, precedence, detail-path guards
│   ├── schema/                      # JSON Schema contracts and frontmatter validation
│   ├── select/                      # Selection core, token budget, eval harness/CLI
│   ├── index.ts                     # Public package exports
│   └── types.ts                     # Shared domain type contracts
├── test/                            # Test fixtures and fixture scripts
│   └── fixtures/                    # Rule stores, eval cases, governance store fixtures
├── package.json                     # Package metadata, bin, scripts, dependencies
├── package-lock.json                # npm lockfile
├── rule-index.json                  # Generated body-free rule index artifact
├── tsconfig.build.json              # Production TypeScript build config
└── tsconfig.json                    # Test TypeScript build config
```

## Directory Purposes

**`.claude/`:**
- Purpose: Claude project instructions and skill wrappers consumed by GSD/Claude runtime.
- Contains: `.claude/CLAUDE.md` and `.claude/skills/aidlc-governance-*/SKILL.md`.
- Key files: `.claude/CLAUDE.md`, `.claude/skills/aidlc-governance-discuss/SKILL.md`, `.claude/skills/aidlc-governance-plan/SKILL.md`, `.claude/skills/aidlc-governance-execute/SKILL.md`, `.claude/skills/aidlc-governance-verify/SKILL.md`, `.claude/skills/aidlc-governance-audit/SKILL.md`, `.claude/skills/aidlc-governance-ship/SKILL.md`.
- Use: Keep skill files thin. They marshal host context and invoke `dist/governance/*` hooks; do not implement selection/rendering logic there.

**`.gsd/`:**
- Purpose: GSD capability installation metadata.
- Contains: `.gsd/capabilities/aidlc-governance/capability.json`.
- Key files: `.gsd/capabilities/aidlc-governance/capability.json`.
- Use: Add or adjust loop binding metadata here only when capability surfaces change.

**`.planning/`:**
- Purpose: GSD runtime project state and durable planning/governance artifacts.
- Contains: Roadmap, state, phase artifacts, governance evidence, research docs, generated codebase map.
- Key files: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, `.planning/config.json`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.
- Use: Runtime code reads `.planning/STATE.md` for phase resolution and `.planning/config.json` for governance budget in `src/cli/commands/select.ts`.

**`.planning/codebase/`:**
- Purpose: Generated codebase map consumed by GSD planning/execution.
- Contains: `ARCHITECTURE.md`, `STRUCTURE.md`, and sibling stack/quality/concerns docs when full map runs.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.
- Use: Refresh through mapping workflow; do not hand-edit during feature implementation unless requested by GSD mapping.

**`.planning/governance/`:**
- Purpose: Durable governance ledger written by hooks and evidence stores.
- Contains: `selection-state.json`, `gates/`, `approvals/`, `tests/`, `eval/`, and `phase-*` records.
- Key files: `.planning/governance/selection-state.json`, `.planning/governance/gates/{NN}-plan.json`, `.planning/governance/gates/{NN}-verify.json`, `.planning/governance/gates/{NN}-ship.json`, `.planning/governance/approvals/{NN}.json`, `.planning/governance/tests/{NN}.json`, `.planning/governance/eval/{NN}.json`, `.planning/governance/eval/{NN}-report.md`.
- Use: Never construct these paths inline. Use `src/governance/paths.ts` and store modules.

**`.planning/phases/`:**
- Purpose: Per-phase planning and verification artifacts plus generated `GOVERNANCE.md` audit outputs.
- Contains: Phase directories like `.planning/phases/06-v1-0-tech-debt-fold-in/` and `.planning/phases/07-enforcement-contracts-adapter-stubs/`.
- Key files: `.planning/phases/{NN}-*/{NN}-CONTEXT.md`, `.planning/phases/{NN}-*/{NN}-*-PLAN.md`, `.planning/phases/{NN}-*/{NN}-VERIFICATION.md`, `.planning/phases/{NN}-*/GOVERNANCE.md`.
- Use: Audit writer requires output path shape `<projectRoot>/.planning/phases/{NN}-*/GOVERNANCE.md` in `src/governance/audit-artifact.ts`.

**`.planning/research/`:**
- Purpose: Background research and cached source material.
- Contains: `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/SUMMARY.md`, `.planning/research/.cache/*.json`.
- Key files: `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`.
- Use: Reference for planning only; production code does not import this directory.

**`aidlc-rules/`:**
- Purpose: Source rule-pack store for authored governance rules.
- Contains: Tier directories `enterprise/`, `domain/<name>/`, `project/`; optional `details/` subtrees for lazy-loaded detail bodies.
- Key files: `aidlc-rules/enterprise/require-mfa.md`.
- Use: Add new rules as markdown with YAML frontmatter. Scope directory is source of truth and must match `scope` frontmatter.

**`bin/`:**
- Purpose: npm executable shim files.
- Contains: `bin/governance.cjs`.
- Key files: `bin/governance.cjs`.
- Use: Keep as thin shim requiring `../dist/cli/index.js`; put CLI behavior in `src/cli/`.

**`src/`:**
- Purpose: All TypeScript implementation, public exports, and co-located tests.
- Contains: Domain modules grouped by layer: CLI, rules, index, select, inject, governance, enforcement, schema.
- Key files: `src/index.ts`, `src/types.ts`.
- Use: Add source under the layer that owns the responsibility. Add co-located `*.test.ts` beside implementation.

**`src/cli/`:**
- Purpose: CLI dispatcher and command surfaces for the `governance` binary.
- Contains: `src/cli/index.ts`, smoke tests, and `src/cli/commands/`.
- Key files: `src/cli/index.ts`, `src/cli/commands/build-index.ts`, `src/cli/commands/select.ts`, `src/cli/commands/inject.ts`, `src/cli/commands/rule-detail.ts`, `src/cli/commands/eval.ts`.
- Use: Commands parse argv, perform boundary validation/I/O, then delegate logic to core modules. Keep `src/cli/index.ts` as switch-only dispatcher.

**`src/cli/commands/`:**
- Purpose: Individual CLI command implementations.
- Contains: One file per subcommand.
- Key files: `src/cli/commands/build-index.ts`, `src/cli/commands/select.ts`, `src/cli/commands/inject.ts`, `src/cli/commands/rule-detail.ts`, `src/cli/commands/eval.ts`.
- Use: Add a new command as `src/cli/commands/<name>.ts`, then add one switch case and usage line in `src/cli/index.ts`.

**`src/enforcement/`:**
- Purpose: Tool-neutral enforcement contract and adapter boundary.
- Contains: Gate request/result types, adapter interface/stubs, adapter runner, validators.
- Key files: `src/enforcement/types.ts`, `src/enforcement/adapters.ts`, `src/enforcement/run-adapter.ts`, `src/enforcement/validate-gate-result.ts`, `src/enforcement/validate-approval.ts`, `src/enforcement/validate-eval-report.test.ts`.
- Use: Add real scanners as `GateAdapter` implementations here or under a child adapter folder; always call them through `src/enforcement/run-adapter.ts`.

**`src/governance/`:**
- Purpose: GSD hook orchestration, persisted governance stores, audit generation, and evidence capture.
- Contains: Hook entrypoints, stores, path helpers, atomic writer, audit writer, evidence parsers.
- Key files: `src/governance/discuss-hook.ts`, `src/governance/plan-hook.ts`, `src/governance/execute-hook.ts`, `src/governance/verify-gate-hook.ts`, `src/governance/ship-gate-hook.ts`, `src/governance/audit-artifact.ts`, `src/governance/paths.ts`, `src/governance/atomic-write.ts`, `src/governance/state-store.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/approval-store.ts`, `src/governance/test-evidence.ts`, `src/governance/eval-evidence.ts`.
- Use: Add GSD lifecycle orchestration here. Use stores for persistence and keep pure matching/rendering in `src/select/` and `src/inject/`.

**`src/index/`:**
- Purpose: Build and validate body-free rule index artifacts.
- Contains: `build.ts`, `validate-index.ts`, and index-focused tests.
- Key files: `src/index/build.ts`, `src/index/validate-index.ts`, `src/index/no-body.property.test.ts`, `src/index/precedence.test.ts`, `src/index/build-guards.test.ts`.
- Use: Add index artifact changes here. Preserve explicit field whitelists and schema validation.

**`src/inject/`:**
- Purpose: Render governance context fragments from selected summaries.
- Contains: Pure renderer and tests.
- Key files: `src/inject/inject.ts`, `src/inject/inject.test.ts`, `src/inject/inject.property.test.ts`.
- Use: Keep filesystem/body reads out of this directory. Renderer should consume `SelectionResult` only.

**`src/rules/`:**
- Purpose: Rule-pack loading, scope enforcement, precedence resolution, and lazy detail path containment.
- Contains: Loader, scope resolver, detail path guard, and tests.
- Key files: `src/rules/load.ts`, `src/rules/scope.ts`, `src/rules/detail-path.ts`, `src/rules/load.test.ts`, `src/rules/scope.test.ts`, `src/rules/detail-path.test.ts`.
- Use: Add rule-pack format/ingestion logic here. Do not let rule bodies escape `loadRuleFile` return types.

**`src/schema/`:**
- Purpose: JSON Schema contracts for rule metadata, indexes, signals, gates, approvals, evidence, and audit artifacts.
- Contains: `*.schema.json`, schema validator, schema tests.
- Key files: `src/schema/frontmatter.schema.json`, `src/schema/rule-index.schema.json`, `src/schema/task-signal.schema.json`, `src/schema/gate-request.schema.json`, `src/schema/gate-result.schema.json`, `src/schema/approval.schema.json`, `src/schema/test-evidence.schema.json`, `src/schema/audit-artifact.schema.json`, `src/schema/eval-report.schema.json`, `src/schema/validate.ts`.
- Use: Put published/portable contract shapes here. Add runtime validators near their consumers when only one consumer exists.

**`src/select/`:**
- Purpose: Deterministic selection core, token budget, recall/precision eval harness, eval CLI.
- Contains: Pure selector, signal validator consumer tests, token estimator, eval harness, eval CLI.
- Key files: `src/select/select.ts`, `src/select/tokens.ts`, `src/select/validate-signal.ts`, `src/select/eval-harness.ts`, `src/select/eval-cli.ts`, `src/select/select.test.ts`, `src/select/select.property.test.ts`, `src/select/recall.test.ts`.
- Use: Add selector math here. Keep I/O outside `src/select/select.ts`; CLI/eval entrypoints may do I/O.

**`test/fixtures/`:**
- Purpose: Rule stores, eval cases, and persisted-state fixtures used by tests.
- Contains: `precedence-store/`, `scope-mismatch-store/`, `binding-no-enforcement-store/`, `detailpath-store/`, `detail-missing-store/`, `detail-absolute-store/`, `detail-escape-store/`, `eval/`, `governance-store/`.
- Key files: `test/fixtures/eval/cases/eval-cases.json`, `test/fixtures/eval/eval-rules/enterprise/*.md`, `test/fixtures/eval/eval-rules/domain/security/threat-model.md`, `test/fixtures/eval/eval-rules/domain/payments/pci-scope.md`, `test/fixtures/eval/eval-rules/project/data-retention.md`.
- Use: Add focused fixtures here for tests; do not place production rule packs here.

## Key File Locations

**Entry Points:**
- `bin/governance.cjs`: Published CLI executable shim.
- `src/cli/index.ts`: CLI command dispatcher.
- `src/index.ts`: Package public export surface.
- `src/governance/discuss-hook.ts`: Discuss gate hook.
- `src/governance/plan-hook.ts`: Plan gate hook.
- `src/governance/execute-hook.ts`: Execute gate hook.
- `src/governance/verify-gate-hook.ts`: Verify gate hook.
- `src/governance/audit-artifact.ts`: Audit artifact writer/direct entrypoint.
- `src/governance/ship-gate-hook.ts`: Ship gate hook.
- `src/governance/capture-test-evidence.ts`: Test-evidence capture entrypoint.
- `src/select/eval-cli.ts`: Selection eval CLI entrypoint.
- `.gsd/capabilities/aidlc-governance/capability.json`: GSD loop integration metadata.
- `.claude/skills/aidlc-governance-*/SKILL.md`: Skill wrappers invoked by GSD loop steps.

**Configuration:**
- `package.json`: npm package, bin, scripts, dependencies.
- `package-lock.json`: Locked npm dependency graph.
- `tsconfig.build.json`: Production build config, excludes `*.test.ts`.
- `tsconfig.json`: Test build config, emits to `dist-test` and includes tests.
- `.planning/config.json`: GSD/runtime config; `src/cli/commands/select.ts` reads `governance.token_budget`.
- `.gsd-capabilities.json`: Installed capability registry snapshot.
- `.gsd/capabilities/aidlc-governance/capability.json`: Capability config keys and loop step bindings.

**Core Logic:**
- `src/types.ts`: Shared type contracts for rules, signals, selection, phases, severity, skip reasons.
- `src/rules/load.ts`: Rule markdown loader and frontmatter parser.
- `src/rules/scope.ts`: Scope derivation and precedence.
- `src/rules/detail-path.ts`: Detail path containment guard.
- `src/index/build.ts`: Rule index builder.
- `src/index/validate-index.ts`: Rule index schema validator.
- `src/select/select.ts`: Selection engine core.
- `src/select/tokens.ts`: Selection summary token estimator.
- `src/inject/inject.ts`: `<governance>` renderer.
- `src/governance/risk.ts`: Risk tier classifier and domain widening.
- `src/enforcement/run-adapter.ts`: Validated adapter execution wrapper.
- `src/enforcement/adapters.ts`: Stub adapter registry.
- `src/governance/paths.ts`: Single source for governance ledger paths.
- `src/governance/atomic-write.ts`: Atomic file write helper.

**Persistence and Evidence:**
- `src/governance/state-store.ts`: Selection-state store.
- `src/governance/gate-evidence-store.ts`: Plan/verify/ship gate evidence store.
- `src/governance/approval-store.ts`: Approval record store.
- `src/governance/test-evidence.ts`: Test evidence validator/store and TAP parser.
- `src/governance/eval-evidence.ts`: Eval evidence validator/store.
- `.planning/governance/selection-state.json`: Latest selection record.
- `.planning/governance/gates/{NN}-{gate}.json`: Gate evidence records.
- `.planning/governance/approvals/{NN}.json`: Human approval records.
- `.planning/governance/tests/{NN}.json`: Test-evidence records.
- `.planning/governance/eval/{NN}.json`: Selection eval evidence.
- `.planning/governance/eval/{NN}-report.md`: Human-readable eval report.

**Schemas:**
- `src/schema/frontmatter.schema.json`: Rule frontmatter contract.
- `src/schema/rule-index.schema.json`: Body-free index contract.
- `src/schema/task-signal.schema.json`: Task signal contract.
- `src/schema/gate-request.schema.json`: Gate request contract.
- `src/schema/gate-result.schema.json`: Gate result contract.
- `src/schema/approval.schema.json`: Approval record contract.
- `src/schema/test-evidence.schema.json`: Test evidence contract.
- `src/schema/audit-artifact.schema.json`: Governance audit contract.
- `src/schema/eval-report.schema.json`: Eval report contract.

**Rule Packs and Generated Index:**
- `aidlc-rules/enterprise/require-mfa.md`: Production enterprise rule fixture/source.
- `rule-index.json`: Generated index consumed by selector and hooks.

**Testing:**
- `src/**/*.test.ts`: Co-located unit/property/integration-style tests.
- `src/cli/*.smoke.test.ts`: CLI smoke tests.
- `test/fixtures/eval/cases/eval-cases.json`: Standing eval case corpus.
- `test/fixtures/eval/eval-rules/`: Eval rule corpus.
- `test/fixtures/precedence-store/`: Scope precedence fixture store.
- `test/fixtures/detailpath-store/`: Detail path fixture store.
- `test/fixtures/governance-store/`: Governance state fixture area.

## Naming Conventions

**Files:**
- Kebab-case implementation files: `src/governance/gate-evidence-store.ts`, `src/governance/ship-gate-hook.ts`, `src/cli/commands/build-index.ts`.
- Co-located test files use `.test.ts`: `src/select/select.test.ts`, `src/governance/state-store.test.ts`.
- CLI smoke tests use `.smoke.test.ts`: `src/cli/select.smoke.test.ts`, `src/cli/rule-detail.smoke.test.ts`.
- Property tests use `.property.test.ts`: `src/select/select.property.test.ts`, `src/index/no-body.property.test.ts`, `src/inject/inject.property.test.ts`.
- JSON Schema files use `.schema.json`: `src/schema/gate-result.schema.json`, `src/schema/eval-report.schema.json`.
- Skill files are always `SKILL.md` inside named skill directories: `.claude/skills/aidlc-governance-plan/SKILL.md`.
- Rule markdown files use kebab-case IDs or names: `aidlc-rules/enterprise/require-mfa.md`, `test/fixtures/eval/eval-rules/enterprise/secrets-management.md`.

**Directories:**
- Source layer directories are singular by concern: `src/select/`, `src/inject/`, `src/index/`, `src/rules/`, `src/schema/`, `src/governance/`, `src/enforcement/`.
- CLI subcommands live under `src/cli/commands/`.
- Rule-pack scope directories must be `enterprise/`, `domain/<name>/`, or `project/` under rule store roots.
- Rule detail directories are named `details/` and skipped by index loading.
- GSD skill directories use capability-prefixed kebab names: `.claude/skills/aidlc-governance-verify/`.

**Types and Symbols:**
- Public domain types use PascalCase interfaces/types in `src/types.ts`: `RuleIndex`, `RuleIndexRecord`, `TaskSignal`, `SelectionConfig`, `SelectionResult`.
- Hook arg/result interfaces use `<HookName>Args` and `<HookName>Result`: `DiscussHookArgs`, `PlanHookResult`, `VerifyGateHookResult`.
- Store record interfaces use `<Thing>Record`: `GovernanceRecord`, `ApprovalRecord`, `TestEvidenceRecord`.
- Pure functions use camelCase verbs: `select`, `renderInjection`, `buildIndex`, `derivePlannerTaskSignal`, `classifyRisk`, `riskAdjustedDomains`.
- Constants use UPPER_SNAKE_CASE for regexes/sets/defaults: `DEFAULT_TOKEN_BUDGET`, `PHASE_NUMBER_RE`, `TAP_SUMMARY_RE`.

## Where to Add New Code

**New CLI Command:**
- Implementation: `src/cli/commands/<command-name>.ts`
- Dispatcher: Add switch case and usage line in `src/cli/index.ts`
- Tests: Add command tests in `src/cli/commands/<command-name>.test.ts` or smoke tests in `src/cli/<command-name>.smoke.test.ts`
- Pattern: Parse args in command file, validate inputs loud, delegate core logic to non-CLI modules.

**New Rule-Pack Loading Behavior:**
- Implementation: `src/rules/` for filesystem/frontmatter/scope/detail behavior; `src/index/build.ts` for index output behavior.
- Schemas: `src/schema/frontmatter.schema.json` or `src/schema/rule-index.schema.json`
- Tests: `src/rules/*.test.ts`, `src/index/*.test.ts`, fixtures under `test/fixtures/<case>-store/`
- Pattern: Preserve body quarantine and explicit index field whitelists.

**New Selector Matching Rule:**
- Implementation: `src/select/select.ts`
- Types: `src/types.ts`
- Schema: `src/schema/task-signal.schema.json` or `src/schema/rule-index.schema.json` when shape changes.
- Tests: `src/select/select.test.ts`, `src/select/select.property.test.ts`, `src/select/skip-reasons.test.ts`, `src/select/recall.test.ts`
- Pattern: Keep `select()` pure and deterministic; update skip reasons/audit mapping deliberately.

**New Governance Hook:**
- Implementation: `src/governance/<gate>-hook.ts`
- Capability binding: `.gsd/capabilities/aidlc-governance/capability.json`
- Skill wrapper: `.claude/skills/aidlc-governance-<gate>/SKILL.md`
- Tests: `src/governance/<gate>-hook.test.ts`
- Pattern: Hook marshals inputs, delegates pure logic, persists evidence through stores.

**New Persisted Governance Store:**
- Path helper: `src/governance/paths.ts`
- Store implementation: `src/governance/<thing>-store.ts` or `<thing>-evidence.ts`
- Schema: `src/schema/<thing>.schema.json` when portable contract exists.
- Tests: `src/governance/<thing>-store.test.ts`
- Pattern: Use `atomicWriteFile`, validate before write, return `null` on missing file, throw loud on malformed existing file, ensure path phase matches record phase.

**New Enforcement Adapter:**
- Interface: Reuse `GateAdapter` from `src/enforcement/adapters.ts`
- Implementation: `src/enforcement/<adapter-name>.ts` or child folder if multiple files become necessary.
- Registry: Add to `ADAPTERS` only when it is an intended built-in adapter; otherwise inject through hook args for tests/integration.
- Tests: `src/enforcement/<adapter-name>.test.ts` and `src/enforcement/run-adapter.test.ts` if wrapper behavior changes.
- Pattern: Consumers must call `runAdapter()` from `src/enforcement/run-adapter.ts`, not `evaluate()` directly.

**New JSON Schema Contract:**
- Schema: `src/schema/<contract>.schema.json`
- Types: `src/types.ts`, `src/enforcement/types.ts`, or owning module depending on domain.
- Validator: Put a validator beside primary consumer when one-consumer (`src/governance/test-evidence.ts` pattern); use `src/schema/validate.ts` only for frontmatter.
- Tests: `src/schema/<contract>.test.ts` or consumer validator tests.
- Pattern: Ajv 2020, `ajv-formats`, `x-binding` keyword when schema contains binding metadata.

**New Audit Field:**
- Extraction logic: `src/governance/audit-enrich.ts` for pure extraction from bounded inputs.
- Audit shape: `src/governance/audit-artifact.ts` and `src/schema/audit-artifact.schema.json`
- Persisted source: Existing or new store under `src/governance/`
- Tests: `src/governance/audit-enrich.test.ts`, `src/governance/audit-artifact.test.ts`
- Pattern: Add fields conditionally so absent enrichment preserves older output shape where expected.

**New Selection Eval Case Or Rule:**
- Cases: `test/fixtures/eval/cases/eval-cases.json`
- Eval rules: `test/fixtures/eval/eval-rules/{enterprise,domain/<name>,project}/`
- Harness logic: `src/select/eval-harness.ts`
- CLI/reporting: `src/select/eval-cli.ts`
- Tests: `src/select/recall.test.ts`, `src/select/eval-fixtures.test.ts`, `src/select/eval-cli.test.ts`
- Pattern: Keep eval measurement in `eval-harness.ts` pure; keep disk/reporting in `eval-cli.ts`.

**New Governance Rule:**
- Enterprise-wide rule: `aidlc-rules/enterprise/<rule-id>.md`
- Domain rule: `aidlc-rules/domain/<domain-name>/<rule-id>.md`
- Project rule: `aidlc-rules/project/<rule-id>.md`
- Detail body: `aidlc-rules/<scope>/details/<detail-file>.md` or sibling details subtree referenced by `detailPath`
- Index update: Run `governance build-index --root aidlc-rules --out rule-index.json`
- Pattern: Frontmatter must include `id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `classification`; binding rules require `enforcement`.

**Utilities:**
- Shared domain-independent utility: Prefer nearest owner module first; create new shared helper only if at least two production modules need it.
- Governance path utility: `src/governance/paths.ts`
- Atomic persistence utility: `src/governance/atomic-write.ts`
- Selector-only utility: `src/select/`
- Rule-pack utility: `src/rules/`

## Special Directories

**`dist/`:**
- Purpose: Production TypeScript build output from `npm run build`.
- Generated: Yes
- Committed: Not detected in source tree listing; build output generated locally when present.

**`dist-test/`:**
- Purpose: Test TypeScript build output from `npm run build:test`.
- Generated: Yes
- Committed: Not detected in source tree listing; build output generated locally when present.

**`node_modules/`:**
- Purpose: npm dependency install tree.
- Generated: Yes
- Committed: No.

**`.planning/governance/`:**
- Purpose: Runtime governance ledger consumed across GSD loop steps.
- Generated: Yes, by hooks and evidence commands.
- Committed: Project-dependent; treat as audit/runtime artifact and avoid manual edits except human approval resolution.

**`.planning/codebase/`:**
- Purpose: Generated codebase map docs.
- Generated: Yes, by codebase mapping workflow.
- Committed: Yes, intended planning artifact.

**`.planning/research/.cache/`:**
- Purpose: Cached research JSON.
- Generated: Yes.
- Committed: Project-dependent; not used by runtime source.

**`.claude/skills/`:**
- Purpose: Runtime skill instructions for GSD capability hooks.
- Generated: No, source capability surface.
- Committed: Yes.

**`.gsd/capabilities/`:**
- Purpose: GSD capability metadata.
- Generated: Installed/generated by capability packaging, but source-controlled in this repo.
- Committed: Yes.

**`aidlc-rules/`:**
- Purpose: Rule pack source corpus.
- Generated: No, authored source.
- Committed: Yes.

**`test/fixtures/`:**
- Purpose: Test-only rule stores and evidence fixtures.
- Generated: No, test source.
- Committed: Yes.

**`.codegraph/`:**
- Purpose: Local code intelligence index.
- Generated: Yes.
- Committed: No; currently untracked in git status snapshot.

**`.idea/`:**
- Purpose: JetBrains IDE project metadata.
- Generated: Yes.
- Committed: No; currently untracked in git status snapshot.

---

*Structure analysis: 2026-07-08*
