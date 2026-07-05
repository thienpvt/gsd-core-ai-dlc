---
phase: 01-rule-pack-format-index
plan: 01
subsystem: infra
tags: [typescript, commonjs, tsc, ajv, json-schema, gray-matter, picomatch, fast-check, node-test, cli, rule-pack]

requires: []
provides:
  - "CommonJS/tsc project scaffold (@opengsd/gsd-aidlc-overlay) with dual tsconfig (ship dist/, dev dist-test/)"
  - "governance CLI entry-point shape: bin/governance.cjs -> dist/cli/index.js main(argv) parseArgs dispatch"
  - "governance build-index subcommand emitting a body-free rule-index.json (summaries + pointers only)"
  - "Shared type set src/types.ts (Scope/Severity/Classification/Phase/Triggers/Frontmatter/ParsedRule/RuleIndex) — the format contract later phases inherit"
  - "Minimal Ajv draft-2020-12 frontmatter validator + gray-matter safe-load loader with body quarantine"
  - "Proven fast-check + ajv/dist/2020 nodenext type-resolution under a CommonJS package (RESEARCH Pitfall 2 retired)"
affects: [01-02, 01-03, 01-04, phase-02-select, phase-03-rule-detail, phase-05-audit]

tech-stack:
  added:
    - "typescript@^6.0.3 (tsc-only, no bundler)"
    - "ajv@8.20.0 + ajv-formats@3.0.1 (draft 2020-12 via ajv/dist/2020)"
    - "gray-matter@4.0.3 (frontmatter parse, default js-yaml safe-load)"
    - "picomatch@4.0.5 (installed for later trigger/scope globs; not yet exercised)"
    - "fast-check@^4.8.0 + c8@^11 (node:test toolchain)"
  patterns:
    - "module/moduleResolution nodenext while package stays CommonJS (no type:module) — resolves exports-map types AND emits require()"
    - "explicit compilerOptions.types [node] required under TS6 nodenext (globals not auto-included)"
    - "whitelist field construction in the index builder — parse result never spread, gray-matter content never referenced (body-leak impossible by construction)"
    - "require.main === module self-invocation guard so the compiled CLI runs both via bin shim and via direct node dist/cli/index.js"
    - "repo-root-relative POSIX sourceFile paths for Windows/Linux portability"

key-files:
  created:
    - "package.json / package-lock.json / tsconfig.json / tsconfig.build.json / .gitignore"
    - "bin/governance.cjs"
    - "src/types.ts / src/index.ts"
    - "src/cli/index.ts / src/cli/commands/build-index.ts"
    - "src/schema/frontmatter.schema.json / src/schema/validate.ts"
    - "src/rules/load.ts"
    - "src/index/build.ts"
    - "aidlc-rules/enterprise/require-mfa.md"
    - "src/cli/cli.smoke.test.ts"
  modified: []

key-decisions:
  - "Removed non-existent @types/gray-matter from devDeps — gray-matter 4.0.3 ships its own types (typings field verified on npm registry). Not a package substitution; removal of a hallucinated type-stub."
  - "Added compilerOptions.types [node] + lib [es2022] to tsconfig.build.json — TS 6.0.3 under moduleResolution nodenext does not auto-include @types/node globals (empirically diagnosed)."
  - "Added require.main === module guard to src/cli/index.ts — exported main() alone never runs when the file is invoked directly as node dist/cli/index.js (how the smoke test calls it)."
  - "Dropped illegal `import ... with { type: json }` attribute (not allowed on CommonJS require emit) — plain resolveJsonModule import instead."

patterns-established:
  - "TDD RED->GREEN: the e2e smoke test (Task 3 deliverable) is the failing test that drives Task 2's build-index behavior; committed test(01-01) before feat(01-01)."
  - "Body quarantine is enforced at two layers even in the skeleton: loader never carries gray-matter content onto ParsedRule, and the index builder assembles records by explicit whitelist."

requirements-completed: [PACK-01, PACK-04]

coverage:
  - id: D1
    description: "Rule author defines a rule as Markdown + YAML frontmatter (id/scope/triggers/phases/severity/summary/classification); the loader parses and Ajv-validates it."
    requirement: "PACK-01"
    verification:
      - kind: e2e
        ref: "src/cli/cli.smoke.test.ts#built CLI build-index emits a body-free index carrying the rule summary"
        status: pass
    human_judgment: false
  - id: D2
    description: "governance build-index compiles aidlc-rules/ into a compact rule-index.json carrying summaries + pointers, and the rule Markdown body never leaks into the index."
    requirement: "PACK-04"
    verification:
      - kind: e2e
        ref: "src/cli/cli.smoke.test.ts#built CLI build-index emits a body-free index carrying the rule summary"
        status: pass
    human_judgment: false
  - id: D3
    description: "fast-check + ajv/dist/2020 + ajv-formats type-resolve and execute under moduleResolution nodenext with a CommonJS package (RESEARCH Pitfall 2 retired before any hardening plan)."
    verification:
      - kind: unit
        ref: "src/cli/cli.smoke.test.ts#fast-check imports and executes under the CommonJS/nodenext build"
        status: pass
      - kind: other
        ref: "npm run build && npm run build:test (both exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "CLI entry-point shape locked: bin/governance.cjs -> main(argv) parseArgs dispatch; build-index exits 0, unknown subcommand exits 2 (select/rule-detail reserved for Phase 2/3)."
    verification:
      - kind: e2e
        ref: "src/cli/cli.smoke.test.ts#built CLI build-index emits a body-free index carrying the rule summary"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-07-05
status: complete
---

# Phase 1 Plan 01: Walking Skeleton Summary

**End-to-end governance CLI slice: author one real rule, run `governance build-index`, emit a schema-valid body-free `rule-index.json` — proven by a smoke test that spawns the built CLI, under a CommonJS/tsc stack with fast-check/nodenext interop resolved.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-05T17:2x local (+07:00)
- **Completed:** 2026-07-05T17:52:57+07:00
- **Tasks:** 3 of 3
- **Files created:** 16 tracked (+ committed lockfile; `rule-index.json` is a gitignored build artifact)

## Accomplishments

- Scaffolded the project's first source tree under the CLAUDE.md-locked stack (Node >=22, TypeScript ^6.0.3, CommonJS, tsc-only, no bundler) with a committed `package-lock.json`.
- Retired the phase's highest-risk build-config item (RESEARCH Pitfall 2): `module`/`moduleResolution: nodenext` resolves fast-check + `ajv/dist/2020` + ajv-formats exports-map types while still emitting `require()` because the package stays CommonJS. Proven by a green fast-check smoke assertion.
- Stood up the `governance` CLI entry-point shape (`bin/governance.cjs` -> `main(argv)` parseArgs dispatch) that Phase 2 (`select`) and Phase 3 (`rule-detail`) extend; unknown subcommand exits 2.
- Delivered the thin format -> load -> build -> index path: one real rule (`aidlc-rules/enterprise/require-mfa.md`), gray-matter safe-load parse, Ajv validation, whitelist index construction, and a `rule-index.json` carrying the summary but no body.
- Locked the shared type set in `src/types.ts` (the format contract 01-02/03/04 and Phases 2/5 inherit), with `ParsedRule` deliberately body-free.

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold + fast-check/nodenext interop** - `fa161ae` (chore)
2. **Build-config fix (Rule 3 deviation): @types/node globals under TS6 nodenext** - `5b07a02` (fix)
3. **Task 3 as RED: failing e2e smoke test for build-index** - `81d7751` (test)
4. **Task 2 as GREEN: implement governance build-index end-to-end** - `ba82af3` (feat)

_TDD note: the Task 3 smoke test was written first as the RED test driving Task 2's behavior (test(01-01) precedes feat(01-01)), satisfying the MVP+TDD gate._

## Files Created/Modified

- `package.json` / `package-lock.json` - CJS package manifest (@opengsd/gsd-aidlc-overlay) + pinned dependency tree
- `tsconfig.build.json` / `tsconfig.json` - ship (dist/) and dev (dist-test/) TypeScript projects, nodenext + types:[node]
- `.gitignore` - ignores node_modules, dist, dist-test, generated rule-index.json
- `bin/governance.cjs` - CommonJS shim -> `dist/cli/index.js` main(argv)
- `src/types.ts` - shared type set (body-free ParsedRule/RuleIndexRecord)
- `src/index.ts` - public API re-exports (main, buildIndex, writeIndex, loadRules, validateFrontmatter)
- `src/cli/index.ts` - parseArgs dispatch + require.main self-invocation guard
- `src/cli/commands/build-index.ts` - `--root`/`--out` flags, buildIndex + writeIndex
- `src/schema/frontmatter.schema.json` - minimal draft-2020-12 contract (empty triggers valid per D-03)
- `src/schema/validate.ts` - Ajv2020 compiled validator + per-file error formatter
- `src/rules/load.ts` - recursive .md scan (skips details/), gray-matter safe parse, body quarantine
- `src/index/build.ts` - whitelist index construction + writeIndex
- `aidlc-rules/enterprise/require-mfa.md` - one real rule (triggers {} always-in-phase, critical/advisory, body-leak canary)
- `src/cli/cli.smoke.test.ts` - end-to-end smoke test (built CLI spawn + body-absence + fast-check import)

## Decisions Made

- **Removed non-existent `@types/gray-matter`** (Rule 3): the npm registry has no such package at any version, and gray-matter 4.0.3 ships its own types (`typings: gray-matter.d.ts`). This is removal of a hallucinated type-stub, not a prohibited package substitution.
- **Explicit `types: ["node"]` + `lib: ["es2022"]`** in the base tsconfig: empirically, TS 6.0.3 with `moduleResolution: nodenext` does not auto-include `@types/node` into global scope, so `process`/`node:` builtins failed TS2591. Import-based types (fast-check/picomatch/gray-matter) are unaffected.
- **`require.main === module` self-invocation guard** in `src/cli/index.ts`: exporting `main()` alone left the CLI a no-op when invoked directly as `node dist/cli/index.js` (the smoke-test path) — it exited 0 without writing.
- Minimal schema only (empty `triggers` valid, no multi-axis sub-schema, no binding/enforcement if/then) — full contract is 01-02's job, per plan scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed non-existent `@types/gray-matter` dependency**
- **Found during:** Task 1 (`npm install` failed E404)
- **Issue:** Plan/RESEARCH listed `@types/gray-matter` as a dev dep; it does not exist on the npm registry at any version.
- **Fix:** Verified via `npm view` that gray-matter 4.0.3 ships its own `typings`; removed the stub from devDependencies. Did NOT substitute a similarly-named package (package-substitution prohibition honored).
- **Files modified:** package.json
- **Verification:** `npm install` then `npm run build:test` both succeed; gray-matter imports type-resolve.
- **Committed in:** fa161ae (Task 1 commit)

**2. [Rule 3 - Blocking] `@types/node` globals not auto-included under TS6 nodenext**
- **Found during:** writing the first test file (Task 3 RED)
- **Issue:** Every `node:` builtin and `process` reference emitted TS2591; `pretest` runs `build:test`, so `npm test` would have aborted.
- **Fix:** Added `compilerOptions.types: ["node"]` + `lib: ["es2022"]` to `tsconfig.build.json` (inherited by the dev tsconfig). Root cause diagnosed with isolated probes.
- **Files modified:** tsconfig.build.json
- **Verification:** `npm run build` and `npm run build:test` both exit 0; smoke test compiles clean.
- **Committed in:** 5b07a02 (separate fix commit before the RED test)

**3. [Rule 1 - Bug] CLI wrote nothing when run directly**
- **Found during:** Task 2 GREEN verification
- **Issue:** `src/cli/index.ts` exported `main` but never invoked it; `node dist/cli/index.js build-index ...` exited 0 without producing `rule-index.json`, so the smoke test stayed red.
- **Fix:** Added a `require.main === module` self-invocation guard that calls `main(process.argv.slice(2))` on direct execution.
- **Files modified:** src/cli/index.ts
- **Verification:** manual CLI run writes the index; `npm test` green.
- **Committed in:** ba82af3 (GREEN commit)

**4. [Rule 1 - Bug] Two GREEN-phase compile errors**
- **Found during:** Task 2 first build
- **Issue:** (a) `import schema ... with { type: "json" }` is illegal when emitting a CommonJS `require()`; (b) `ReturnType<typeof readdirSync>` resolved to the Buffer overload, breaking string path handling.
- **Fix:** Dropped the import attribute (plain `resolveJsonModule` import); replaced the annotated variable with a `readDirSafe()` helper returning Dirents.
- **Files modified:** src/schema/validate.ts, src/rules/load.ts
- **Verification:** `npm run build` exits 0.
- **Committed in:** ba82af3 (GREEN commit)

---

**Total deviations:** 4 auto-fixed (2 blocking build-config, 2 bugs)
**Impact on plan:** All four were necessary to make the walking skeleton build and the smoke test pass. No scope creep — the schema/loader/builder remain minimal per plan (hardening deferred to 01-02/03/04).

## Issues Encountered

- Mid-execution harness truncations occurred; on resume I re-verified git state and on-disk files before continuing, and picked up exactly at the CLI self-invocation fix. No commits were lost or duplicated.

## User Setup Required

None - no external service configuration required. Pure local build-time CLI over local Markdown.

## Next Phase Readiness

- The CLI entry-point, dual-tsconfig build, node:test/fast-check toolchain, and `rule-index.json` contract shape are established for the hardening plans.
- **01-02** hardens the frontmatter schema (multi-axis triggers, all enums, binding/enforcement if/then, negative cases).
- **01-03** adds full store layout + scope precedence/override (`superseded`) + `detailPath` resolution/traversal guard (`src/rules/scope.ts`, `src/rules/detail-path.ts` are stubbed as future files, not yet created).
- **01-04** adds the no-body output schema (`src/schema/rule-index.schema.json`) + fast-check property invariant + build-fails-loudly.
- No blockers.

---
*Phase: 01-rule-pack-format-index*
*Completed: 2026-07-05*

## Self-Check: PASSED

Files verified present: package.json, package-lock.json, tsconfig.json, tsconfig.build.json, .gitignore, bin/governance.cjs, src/index.ts, src/types.ts, src/cli/index.ts, src/cli/commands/build-index.ts, src/schema/frontmatter.schema.json, src/schema/validate.ts, src/rules/load.ts, src/index/build.ts, aidlc-rules/enterprise/require-mfa.md, src/cli/cli.smoke.test.ts.

Commits verified present: fa161ae (chore/scaffold), 5b07a02 (fix/types), 81d7751 (test/RED smoke), ba82af3 (feat/GREEN build-index).

Test result: `npm test` exits 0 — 2 tests pass (built-CLI body-free index; fast-check import/run).
