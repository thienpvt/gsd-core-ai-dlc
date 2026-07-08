# Technology Stack

**Analysis Date:** 2026-07-08

## Languages

**Primary:**
- TypeScript `^6.0.3` - implementation code under `src/`, compiled to `dist/` via `tsc -p tsconfig.build.json` from `package.json`.
- JSON Schema draft 2020-12 - contract schemas under `src/schema/*.schema.json`, copied to `dist/schema/` and `dist-test/schema/` by TypeScript JSON module resolution.
- Markdown with YAML frontmatter - AI-DLC rule-pack authoring under `aidlc-rules/enterprise/require-mfa.md`; project skill indexes under `.claude/skills/*/SKILL.md`.

**Secondary:**
- JavaScript/CommonJS - CLI shim in `bin/governance.cjs`; compiled output in `dist/**/*.js` and `dist-test/**/*.js`.
- JSON - generated and runtime artifacts in `rule-index.json`, `.gsd-capabilities.json`, `.gsd/capabilities/aidlc-governance/capability.json`, `.planning/config.json`, and `.planning/governance/**/*.json`.

## Runtime

**Environment:**
- Node.js `>=22.0.0` from `package.json` `engines.node`.
- npm `>=10.0.0` from `package.json` `engines.npm`.
- Package module runtime uses CommonJS semantics: `package.json` has no `"type": "module"`, and `bin/governance.cjs` uses `require("../dist/cli/index.js")`.

**Package Manager:**
- npm `>=10.0.0`.
- Lockfile: present at `package-lock.json` with lockfileVersion `3`.

## Frameworks

**Core:**
- No web application framework detected. This repo is a Node CLI/library overlay.
- GSD capability surface - `.gsd/capabilities/aidlc-governance/capability.json` registers governance hooks for `discuss:pre`, `plan:pre`, `execute:pre`, `verify:post`, and `ship:pre`.
- Claude/GSD skills surface - `.claude/skills/aidlc-governance-discuss/SKILL.md`, `.claude/skills/aidlc-governance-plan/SKILL.md`, `.claude/skills/aidlc-governance-execute/SKILL.md`, `.claude/skills/aidlc-governance-verify/SKILL.md`, `.claude/skills/aidlc-governance-audit/SKILL.md`, and `.claude/skills/aidlc-governance-ship/SKILL.md` marshal into compiled hooks in `dist/governance/`.
- CLI dispatcher - `src/cli/index.ts` lazy-loads subcommands `build-index`, `select`, `inject`, `rule-detail`, and `eval`; `bin/governance.cjs` is the published `governance` binary.

**Testing:**
- Node built-in test runner - `package.json` script `test` runs `node --test "dist-test/**/*.test.js"`.
- `node:assert/strict` - assertion library used throughout `src/**/*.test.ts`.
- `c8 ^11.0.0` - coverage via `package.json` script `test:coverage`.
- `fast-check ^4.8.0` - property tests in `src/index/no-body.property.test.ts`, `src/select/select.property.test.ts`, and `src/inject/inject.property.test.ts`.

**Build/Dev:**
- TypeScript compiler `^6.0.3` - build command `npm run build` uses `tsc -p tsconfig.build.json`; test build command `npm run build:test` uses `tsc -p tsconfig.json`.
- No bundler detected. There is no webpack/esbuild/rollup config in project source; package output ships compiled `dist/` files.
- Node native APIs - `node:fs`, `node:path`, `node:util`, `node:child_process`, and `node:crypto` are used directly across `src/`.

## Key Dependencies

**Critical:**
- `ajv 8.20.0` - runtime JSON Schema validation in `src/schema/validate.ts`, `src/index/validate-index.ts`, `src/select/validate-signal.ts`, `src/enforcement/validate-gate-result.ts`, `src/enforcement/validate-approval.ts`, `src/governance/test-evidence.ts`, and `src/governance/eval-evidence.ts`.
- `ajv-formats 3.0.1` - date-time and URI format support for schemas such as `src/schema/gate-result.schema.json`, `src/schema/approval.schema.json`, `src/schema/test-evidence.schema.json`, and `src/schema/audit-artifact.schema.json`.
- `gray-matter 4.0.3` - YAML frontmatter parsing in `src/rules/load.ts`; Markdown bodies are read but not propagated into `ParsedRule` or `rule-index.json`.
- `picomatch 4.0.5` - deterministic path glob matching in `src/select/select.ts` with `dot: true` to include dot-prefixed paths such as `.github/` and `.env`.

**Infrastructure:**
- `@types/node ^22.0.0` - Node type definitions for TypeScript compilation.
- `@types/picomatch ^4.0.0` - TypeScript typing for `picomatch`.
- `c8 ^11.0.0` - V8 coverage wrapper for `node --test`.
- `fast-check ^4.8.0` - selection/injection/index invariants with generated cases.

## Configuration

**Environment:**
- Runtime config lives in `.planning/config.json`. Governance-relevant keys include `workflow.security_enforcement`, `workflow.tdd_mode`, `intel.enabled`, and `graphify.enabled`.
- Capability config lives in `.gsd/capabilities/aidlc-governance/capability.json`. It defines `governance.enabled` default `true` and `governance.token_budget` default `2000`.
- CLI budget fallback reads `.planning/config.json` key `governance.token_budget` from `src/cli/commands/select.ts`; missing or invalid optional config falls back to `2000`.
- No `.env*` file detected at repo root. Environment variable use is limited to test harness references such as `CODEX_HOME` in `src/governance/audit-hook-contract.test.ts`, `src/governance/config-no-warnings.test.ts`, `src/governance/consent.test.ts`, and `src/governance/consent-verify-post.test.ts`.

**Build:**
- `package.json` - package metadata, `governance` bin, scripts, engines, dependencies, devDependencies.
- `tsconfig.build.json` - production build config: target `es2022`, module `nodenext`, moduleResolution `nodenext`, rootDir `src`, outDir `dist`, strict mode, declarations, JSON module imports.
- `tsconfig.json` - test build config extending `tsconfig.build.json`, outDir `dist-test`, includes test files.
- `package-lock.json` - pinned dependency graph.
- `rule-index.json` - generated index consumed by selection and governance hooks.
- `src/schema/*.schema.json` - contract schemas imported by validators and copied to compiled output.

## Platform Requirements

**Development:**
- Use Node.js `>=22.0.0` and npm `>=10.0.0` per `package.json`.
- Run `npm run build` before runtime CLI use; `bin/governance.cjs` requires compiled `dist/cli/index.js`.
- Run `npm test` to execute compiled tests; `pretest` builds both `dist/` and `dist-test/`.
- Rule-pack changes require `governance build-index [--root aidlc-rules] [--out rule-index.json]` from `src/cli/commands/build-index.ts` to refresh `rule-index.json`.

**Production:**
- Deployment target is npm package/library CLI. `package.json` publishes `dist`, `bin`, and `aidlc-rules` via `files`.
- Runtime output is local filesystem state under `.planning/governance/` using helpers in `src/governance/paths.ts` and atomic writes in `src/governance/atomic-write.ts`.
- Host integration target is GSD Core capability/skill runtime through `.gsd/capabilities/aidlc-governance/capability.json` and `.claude/skills/*/SKILL.md`.

---

*Stack analysis: 2026-07-08*
