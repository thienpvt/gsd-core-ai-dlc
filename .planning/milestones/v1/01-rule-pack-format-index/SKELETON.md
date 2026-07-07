# Walking Skeleton — GSD Governance Overlay (AI-DLC × GSD Core)

**Phase:** 1
**Generated:** 2026-07-05

> Adapted to a CLI / library governance overlay. There is NO web UI, NO routing, NO
> database. The "walking skeleton" is the thinnest end-to-end slice that proves the full
> toolchain: **scaffold the project → author ONE real rule under `aidlc-rules/` → run
> `governance build-index` → emit a valid `rule-index.json` artifact + a smoke test that
> runs the CLI.** Plans 01-02, 01-03, and 01-04 harden each dimension of this slice
> (schema, store/precedence, no-body index) without renegotiating the decisions below.

## Capability Proven End-to-End

A rule author drops one real Markdown-with-frontmatter rule into `aidlc-rules/enterprise/`,
runs `governance build-index`, and gets a schema-valid `rule-index.json` carrying that
rule's summary and pointers but no body — verified by an automated smoke test that invokes
the built CLI end-to-end.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js `>=22.0.0` (npm `>=10`) | Matches GSD Core `engines`; keeps overlay inside `npx @opengsd/gsd-core` distribution (CLAUDE.md locked) |
| Language | TypeScript `^6.0.3` | Same version/pipeline GSD Core builds with; `tsc`-only, NO bundler (CLAUDE.md locked) |
| Module format | CommonJS (no `"type":"module"`) | `gsd-tools.cjs` must `require()` the extension without ESM interop (CLAUDE.md locked) |
| Build | `tsc -p tsconfig.build.json` → `dist/`; dev `tsc -p tsconfig.json` → `dist-test/` | No bundler; mirrors GSD "compile then run plain node" model (RESEARCH §CLI structure) |
| tsconfig module mode | `module: nodenext` + `moduleResolution: nodenext`, package stays CJS | Resolves `fast-check` / `ajv/dist/2020` / `ajv-formats` exports-map types cleanly AND still emits `require()` — the #1 build-config risk, resolved in Wave 1 (RESEARCH Pitfall 2) |
| Schema validator | Ajv `8.20.0` via `require("ajv/dist/2020")` + `ajv-formats 3.0.1` | Draft 2020-12; language-neutral contract per CLAUDE.md "What NOT to Use" (no Zod as the contract) |
| Frontmatter parse | `gray-matter 4.0.3` (default js-yaml safe-load) | Don't-hand-roll `---`/BOM/CRLF split; `content` (body) stays quarantined, never indexed (RESEARCH §Parsing) |
| Glob engine | `picomatch 4.0.5` | Deterministic, explainable scope/path globs; build-time `triggers.paths` syntax validation (D-04) |
| CLI arg parsing | `node:util` `parseArgs` (built-in) | No arg-parser dependency for a 1–3 subcommand CLI (RESEARCH §CLI structure) |
| Test runner | `node:test` (built-in) + `c8 ^11` + `fast-check ^4.8.0` | Zero-extra-runner model; fast-check already a GSD dev dep (CLAUDE.md locked) |
| Rule store root | `aidlc-rules/` at repo root | Mirrors AI-DLC corpus name (D-10) |
| Directory layout | `src/{cli,schema,rules,index}` + co-located `*.test.ts`; corpus `aidlc-rules/{enterprise,domain/<name>,project}` | Directory location is source of truth for scope (D-09/D-10) |

## Stack Touched in Phase 1 (skeleton = 01-01; hardening = 01-02/03/04)

- [x] Project scaffold — `package.json`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`, `bin/governance.cjs`, `src/cli/index.ts`, `src/index.ts`, `src/types.ts` (01-01)
- [x] Build + lint + test runner wiring — `npm run build`, `build:test`, `pretest`, `test` scripts; fast-check/nodenext interop proven (01-01)
- [x] One real rule read — `aidlc-rules/enterprise/require-mfa.md` parsed + validated (01-01)
- [x] One real artifact write — `governance build-index` emits `rule-index.json` (01-01)
- [x] End-to-end smoke test — built CLI runs, artifact validated, no body present, fast-check import compiles+runs (01-01)

## Public Interface (established by the skeleton, extended by later plans)

- CLI binary: `governance` → `bin/governance.cjs` → `require("../dist/cli/index.js").main(argv)`
- Subcommand: `governance build-index [--root <dir>] [--out <file>]` (defaults `aidlc-rules/`, `rule-index.json`)
- Public functions (signatures locked here; bodies hardened in later plans):
  - `validateFrontmatter(data): boolean` + `.errors` (Ajv compiled) — `src/schema/validate.ts`
  - `loadRules(rootDir: string): ParsedRule[]` — `src/rules/load.ts`
  - `buildIndex(rootDir: string): RuleIndex` + `writeIndex(index, outPath): void` — `src/index/build.ts`
  - `deriveScope`, `resolvePrecedence` — `src/rules/scope.ts` (01-03)
  - `resolveDetailPath` — `src/rules/detail-path.ts` (01-03)
- Types (`src/types.ts`): `Scope = "enterprise"|"domain"|"project"`, `Severity = "critical"|"high"|"medium"|"low"`, `Classification = "advisory"|"binding"`, `Phase = "inception"|"construction"|"operations"|"common"`, `Triggers`, `Frontmatter`, `ParsedRule` (frontmatter + `sourceFile` + `absPath`, NEVER body), `SupersededRecord`, `RuleIndexRecord`, `RuleIndex`.
- **Fixture-path convention:** loader/build take an explicit `rootDir`; tests pass fixture corpora and read fixture files via `fs` from `path.resolve(process.cwd(), "test/fixtures/...")` (node --test runs from repo root). Fixtures are `.md`/`.json` under `test/fixtures/` — NOT under `src/`, so never compiled; read at runtime.

## Artifacts This Phase Produces (comprehensive — prevents false drift flags)

New files (all net-new; greenfield):
- `package.json`, `tsconfig.json`, `tsconfig.build.json`, `.gitignore`
- `bin/governance.cjs`
- `src/index.ts` (public API re-exports), `src/types.ts`
- `src/cli/index.ts` (parseArgs dispatch), `src/cli/commands/build-index.ts`
- `src/schema/frontmatter.schema.json`, `src/schema/rule-index.schema.json`, `src/schema/validate.ts`
- `src/rules/load.ts`, `src/rules/scope.ts`, `src/rules/detail-path.ts`
- `src/index/build.ts`
- `aidlc-rules/enterprise/require-mfa.md` (+ domain/project corpus added in 01-03)
- `rule-index.json` (build artifact)
- Tests: `src/**/*.smoke.test.ts`, `src/schema/frontmatter.test.ts`, `src/schema/classification.test.ts`, `src/rules/scope.test.ts`, `src/rules/detail-path.test.ts`, `src/index/build.test.ts`, `src/index/no-body.test.ts`
- Fixtures under `test/fixtures/**`

New symbols: `main`, `build-index` subcommand + `--root`/`--out` flags, `validateFrontmatter`, `formatErrors`, `loadRuleFile`, `loadRules`, `deriveScope`, `ORDINAL`, `resolvePrecedence`, `resolveDetailPath`, `buildIndex`, `writeIndex`, and the `src/types.ts` type set above.

Schema field names (frontmatter): `id`, `scope`, `triggers` (`taskType`/`keywords`/`paths`/`exclude`), `phases`, `severity`, `summary`, `detailPath`, `classification`, `enforcement`. Enums: severity `critical|high|medium|low`; scope `enterprise|domain|project`; classification `advisory|binding`; phases `inception|construction|operations|common`; taskType `feature|bugfix|refactor|docs|test|infra|security|data`. Precedence ordinal: `project(3) > domain(2) > enterprise(1)`.

## Out of Scope (Deferred to Later Slices / Milestones)

Explicit — prevents later phases from re-litigating Phase 1 minimalism:
- The selection algorithm (trigger/scope/phase matching, reasons, token budget) — Phase 2 (SEL-01/04/05)
- Summary injection + `governance rule-detail <id>` lazy loader — Phase 3 (SEL-02/03)
- GSD `capability.json` wiring + disk-backed governance state — Phase 4 (GATE-01/02, ENF-01)
- Audit-artifact writer (`GOVERNANCE.md`) — Phase 5 (AUDIT-01/02)
- Real enforcement-contract resolution / registry (v1 only checks "you named a contract") — v2 (ENF-02/03/04)
- Summary length cap for token budget — Phase 2 (SEL-05); body/detail checksum; project-scope consent flow — Phase 4 (04-03)

## Subsequent Slice Plan

Each later plan/phase adds one slice on top of this skeleton without altering the decisions above:

- Plan 01-02: harden the frontmatter schema (all axes, all decisions, negative cases) + advisory/binding classification
- Plan 01-03: full store layout (enterprise/domain/project) + scope precedence/override (`superseded`) + `detailPath` resolution/traversal guard
- Plan 01-04: index builder no-body guarantee (whitelist + output schema + fast-check property) + `superseded` records + build-fails-loudly
- Phase 2: `governance select` — deterministic trigger+scope+phase matching over `rule-index.json`
- Phase 3: `governance rule-detail <id>` + summary-only injection
- Phase 4: `capability.json` at discuss/execute gates + persistence under `.planning/governance/`
- Phase 5: machine-derived audit artifact
