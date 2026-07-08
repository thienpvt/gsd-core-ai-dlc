# Coding Conventions

**Analysis Date:** 2026-07-08

## Naming Patterns

**Files:**
- Use kebab-case for source modules and tests under `src/`: `src/select/validate-signal.ts`, `src/rules/detail-path.ts`, `src/governance/gate-evidence-store.ts`.
- Co-locate tests beside implementation with `.test.ts`: `src/select/select.test.ts`, `src/inject/inject.test.ts`, `src/governance/state-store.test.ts`.
- Use `.property.test.ts` suffix for fast-check property tests: `src/select/select.property.test.ts`, `src/index/no-body.property.test.ts`, `src/inject/inject.property.test.ts`.
- Use `.smoke.test.ts` suffix for compiled CLI/process-boundary tests: `src/cli/select.smoke.test.ts`, `src/cli/inject.smoke.test.ts`, `src/cli/rule-detail.smoke.test.ts`.
- Use `.schema.json` suffix for JSON Schema contracts imported by validators: `src/schema/frontmatter.schema.json`, `src/schema/rule-index.schema.json`, `src/schema/gate-result.schema.json`.

**Functions:**
- Use `camelCase` named functions for implementation and helpers: `select` in `src/select/select.ts`, `renderInjection` in `src/inject/inject.ts`, `loadRuleFile` in `src/rules/load.ts`.
- Use `read*` / `write*` prefixes for filesystem persistence APIs: `readSelection` and `writeSelection` in `src/governance/state-store.ts`, `readGateEvidence` and `writeGateEvidence` in `src/governance/gate-evidence-store.ts`.
- Use `validate*` prefixes for Ajv-backed schema guards: `validateSignal` in `src/select/validate-signal.ts`, `validateIndex` in `src/index/validate-index.ts`, `validateGateResult` in `src/enforcement/validate-gate-result.ts`.
- Use local helper factories in tests with specific intent names: `withTempRoot` in `src/governance/state-store.test.ts`, `makeValidGateRequest` in `src/enforcement/run-adapter.test.ts`, `plannerInputs` in `src/governance/plan-hook.test.ts`.

**Variables:**
- Use `camelCase` for local variables and object fields: `budgetExceeded` in `src/select/select.ts`, `requestedAt` in `src/governance/verify-gate-hook.ts`, `selectionResult` in `src/governance/state-store.ts`.
- Use `UPPER_SNAKE_CASE` for module constants and fixed fixtures: `DEFAULT_TOKEN_BUDGET` in `src/select/select.ts`, `VALID_PHASES` in `src/cli/commands/select.ts`, `EVAL_ROOT` in `src/select/select.test.ts`.
- Use short but meaningful loop variables only for local data transforms: `r` in `src/select/select.ts` comparator contexts, `s` in `src/cli/commands/select.ts` selected-rule formatting.
- Use `result`, `record`, `signal`, and `config` consistently for domain objects in tests: `src/select/select.test.ts`, `src/governance/state-store.test.ts`, `src/enforcement/run-adapter.test.ts`.

**Types:**
- Use `PascalCase` for interfaces and exported type aliases: `TaskSignal`, `SelectionConfig`, `SelectionResult` in `src/types.ts`.
- Keep central cross-module contracts in `src/types.ts`; enforcement-specific contracts live in `src/enforcement/types.ts`, and governance hook result types live with hook modules such as `src/governance/verify-gate-hook.ts`.
- Use string-literal unions for closed enums instead of runtime enums: `Severity`, `Phase`, `TaskType`, `SkipReason`, and `MatchedAxis` in `src/types.ts`.
- Use `ReadonlyMap`, `readonly`, and `as const` for immutable public sets: `STUB_NAMES` and `ADAPTERS` in `src/enforcement/adapters.ts`, `VALID_PHASES` in `src/cli/commands/select.ts`.

## Code Style

**Formatting:**
- Formatting tool: Not detected. No `.prettierrc*`, `.eslintrc*`, `eslint.config.*`, or `biome.json` exists at repo root.
- Use TypeScript compiler settings as style baseline: `strict: true`, `target: es2022`, `module: nodenext`, `moduleResolution: nodenext` in `tsconfig.build.json`.
- Use two-space indentation, semicolons, double quotes, and trailing commas for multiline calls/objects. Examples: `src/select/select.ts`, `src/governance/state-store.ts`, `src/cli/commands/select.ts`.
- Use explicit `.js` extensions in TypeScript relative imports because NodeNext emits Node-compatible module paths: `import { select } from "./select.js"` in `src/select/select.test.ts`.
- Use sync Node stdlib filesystem APIs for CLI/library paths where deterministic, small file operations dominate: `readFileSync` in `src/rules/load.ts`, `writeFileSync` in `src/index/build.ts`, `mkdtempSync` in `src/select/select.test.ts`.
- Pretty-print JSON with 2-space indentation when writing durable artifacts: `atomicWriteJson` in `src/governance/state-store.ts`, `writeIndex` in `src/index/build.ts`, `writeEvalEvidence` in `src/governance/eval-evidence.ts`.

**Linting:**
- Lint tool: Not detected. `package.json` has `build`, `build:test`, `test`, `test:coverage`, and `eval` scripts only.
- Use `npm run build` as compile-time quality gate for production files via `tsconfig.build.json`.
- Use `npm run build:test` as compile-time quality gate for tests via `tsconfig.json`.
- Avoid adding lint-only patterns that are not enforced by repo tooling; prefer compiler-enforced types and tests under `src/**/*.test.ts`.

## Import Organization

**Order:**
1. Node built-ins first: `node:test`, `node:assert/strict`, `node:fs`, `node:path` in `src/select/select.test.ts` and `src/governance/state-store.test.ts`.
2. External dependencies next: `picomatch` in `src/select/select.ts`, `gray-matter` in `src/rules/load.ts`, `Ajv2020` and `addFormats` in `src/schema/validate.ts`.
3. Internal value imports next: `buildIndex` from `../index/build.js`, `select` from `./select.js`, `validateSignal` from `./validate-signal.js` in `src/select/select.test.ts`.
4. Type-only imports last or grouped separately with `import type`: `import type { RuleIndex, TaskSignal, SelectionConfig } from "../types.js"` in `src/select/select.test.ts`.

**Path Aliases:**
- No path aliases detected. `tsconfig.build.json` has no `baseUrl` or `paths`.
- Use relative imports with `.js` suffix for all local modules: `../types.js`, `./paths.js`, `../../select/select.js`.
- Keep public barrel exports in `src/index.ts`; do not create feature-local barrel files unless multiple external consumers use them.

## Error Handling

**Patterns:**
- Fail loud at trust boundaries with contextual `Error` messages that include file path or hook name: `loadRuleFile` in `src/rules/load.ts`, `readJsonRecord` in `src/governance/state-store.ts`, `verifyGateHook` in `src/governance/verify-gate-hook.ts`.
- Treat missing optional configuration as fallback, not failure: `readConfigBudget` in `src/cli/commands/select.ts` returns `undefined` on missing or malformed optional `.planning/config.json` budget.
- Treat malformed persisted governance state as hard failure: `readJsonRecord` in `src/governance/state-store.ts` throws on non-JSON or missing `selectionResult`.
- Validate schema-bound external data with Ajv at boundaries: frontmatter in `src/schema/validate.ts`, task signals in `src/select/validate-signal.ts`, rule indexes in `src/index/validate-index.ts`, gate results in `src/enforcement/validate-gate-result.ts`.
- Set `process.exitCode` rather than calling `process.exit()` so stdout/stderr drains safely: `src/cli/index.ts`, `src/cli/commands/select.ts`, `bin/governance.cjs`.
- Use `assert.throws` / `assert.rejects` in tests for error paths: `src/governance/state-store.test.ts`, `src/enforcement/run-adapter.test.ts`, `src/governance/verify-gate-hook.test.ts`.

## Logging

**Framework:** console/process streams

**Patterns:**
- Use `process.stdout.write` for CLI output and machine-readable JSON: `src/cli/commands/select.ts`, `src/cli/index.ts`, `src/governance/verify-gate-hook.ts` direct runner.
- Use `process.stderr.write` for CLI usage, errors, and non-zero warnings: `src/cli/index.ts`, `src/cli/commands/select.ts`, `bin/governance.cjs`.
- Use `console.log` only in tests where TAP output is acceptable diagnostic evidence: `src/select/recall.test.ts`.
- Do not introduce logging frameworks; current runtime uses Node process streams only.

## Comments

**When to Comment:**
- Comment load-bearing invariants, governance requirements, and failure modes: body quarantine in `src/rules/load.ts`, deterministic selection in `src/select/select.ts`, atomic writes in `src/governance/state-store.ts`.
- Use comments to explain why an unsafe-looking simplification is deliberate: `ponytail:` comments in `src/enforcement/adapters.ts` and `src/governance/audit-artifact.test.ts`.
- Keep comments near the code they protect; examples include `dot: true` rationale in `src/select/select.ts` and `process.exitCode` rationale in `src/cli/commands/select.ts`.

**JSDoc/TSDoc:**
- Use block comments on exported functions, public interfaces, and module-level invariants: `select` in `src/select/select.ts`, `renderInjection` in `src/inject/inject.ts`, `GovernanceRecord` in `src/governance/state-store.ts`.
- Use `{@link TypeName}` references for domain contracts when useful: `src/inject/inject.ts`, `src/types.ts`, `src/governance/state-store.ts`.
- Tests often use file-level comments to state acceptance evidence and invariant coverage: `src/select/select.property.test.ts`, `src/index/no-body.property.test.ts`, `src/cli/select.smoke.test.ts`.

## Function Design

**Size:** Keep pure core functions small enough to test directly; allow larger orchestration functions when they encode a CLI or hook boundary. `select` in `src/select/select.ts` is the main pure engine; `run` in `src/cli/commands/select.ts` owns CLI parsing and I/O.

**Parameters:** Use typed object parameters for hooks and multi-field public APIs: `VerifyGateHookArgs` in `src/governance/verify-gate-hook.ts`, `PlanTaskSignalInputs` in `src/governance/plan-hook.ts`. Use positional parameters for small pure helpers: `scoreCase(selectedIds, expectedIds)` in `src/select/eval-harness.ts`.

**Return Values:** Return explicit domain objects, not side-channel state: `select` returns `SelectionResult` in `src/select/select.ts`, `verifyGateHook` returns `VerifyGateHookResult` in `src/governance/verify-gate-hook.ts`, `writeGovernanceAudit` returns an object with audit/output data in `src/governance/audit-artifact.ts`.

**Purity:** Keep deterministic core logic free of clocks, random, and I/O: `select` in `src/select/select.ts`, `renderInjection` in `src/inject/inject.ts`, `scoreCase` and `aggregate` in `src/select/eval-harness.ts`. Put clocks in wrapper metadata/adapters only: `src/enforcement/adapters.ts`, `src/governance/verify-gate-hook.ts`, `src/index/build.ts`.

## Module Design

**Exports:**
- Use named exports for implementation APIs: `export function select` in `src/select/select.ts`, `export function loadRules` in `src/rules/load.ts`, `export async function main` in `src/cli/index.ts`.
- Export types from modules that own public contracts: `GovernanceRecord` from `src/governance/state-store.ts`, `GateAdapter` from `src/enforcement/adapters.ts`, core types from `src/types.ts`.
- Keep implementation-only helpers unexported: `matchPositive` in `src/select/select.ts`, `readJsonRecord` in `src/governance/state-store.ts`, `renderText` in `src/cli/commands/select.ts`.

**Barrel Files:**
- Root barrel exists at `src/index.ts` for package exports: types, CLI `main`, index builder, rule loader, and frontmatter validator.
- No feature-level barrel files detected under `src/select/`, `src/governance/`, `src/enforcement/`, or `src/rules/`.
- Add new exports to `src/index.ts` only when needed by package consumers; keep internal hook/test helpers imported by direct relative path.

---

*Convention analysis: 2026-07-08*
