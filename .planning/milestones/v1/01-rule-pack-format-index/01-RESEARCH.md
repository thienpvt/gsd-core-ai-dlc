# Phase 1: Rule-Pack Format & Index - Research

**Researched:** 2026-07-05
**Domain:** Rule-pack authoring format (Markdown + YAML frontmatter), JSON Schema validation, CommonJS/tsc CLI scaffolding, deterministic index generation
**Confidence:** HIGH (stack verified from CLAUDE.md grounding, queried 2026-07-05; design synthesis grounded in the 15 locked decisions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Trigger model (feeds PACK-01 schema + Phase 2 selector)**
- **D-01:** `triggers` is a **structured multi-axis object**: `triggers: { taskType: [...], keywords: [...], paths: [...] }`. Not a flat keyword list. Maximizes recall (a critical rule has multiple independent ways to fire) and lets the audit name which axis matched.
- **D-02:** Axes combine with **OR across populated axes** (taskType OR keywords OR paths; any member within an axis matches), plus an **optional `exclude` block**. Exclusion wins over any positive match. AND-across-axes was rejected (worsens under-injection).
- **D-03:** An **empty (no-axis-populated) `triggers` block means always-in-phase** — the rule fires for every task whose `phases` + scope match. Deliberate escape hatch so a `critical` rule can guarantee it never misses within its phase/scope. Phase + scope still bound it. (Chosen over "empty = build error" and "empty = never fires".)
- **D-04:** Per-axis match semantics: `taskType` = **enum equality**; `paths` = **picomatch globs**; `keywords` = **case-insensitive substring** on the normalized (lowercased, trimmed) task signal. Substring chosen because over-injection is cheaper than under-injection, and it stays deterministic + auditable.

**Summary vs detail (sets the Phase 3 lazy-load boundary)**
- **D-05:** Full detail lives in a **separate detail file** (mirrors AI-DLC's `aws-aidlc-rules/` vs `aws-aidlc-rule-details/` split). `summary` stays in frontmatter; `detailPath` points to a separate `.md`. Keeps the index reading frontmatter only, never emitting bodies (PACK-04).
- **D-06:** `detailPath` is **optional** — a rule whose `summary` fully expresses it needs no detail file. `rule-detail <id>` (Phase 3) on a summary-only rule returns the summary or a clear "no detail" signal.
- **D-07:** When a rule **does** name a `detailPath`, a missing/unresolvable target is a **loud build failure** (reports rule id + bad path). Catches typos/moved files at author time.
- **D-08:** `detailPath` resolves **relative to the declaring rule file** (e.g. rule at `enterprise/security/auth.md` with `detailPath: details/auth.md` → `enterprise/security/details/auth.md`). Survives relocating a pack subtree.

**Store & scope (feeds PACK-02 + index builder layout)**
- **D-09:** **Directory location is the source of truth for scope.** Scope comes from which top-level tier the rule sits in; the frontmatter `scope` field is validated against the directory and the build fails on mismatch.
- **D-10:** Store lives at **`aidlc-rules/` at repo root**. Three scope tiers: `enterprise/`, `domain/<name>/` (subdivided by domain — e.g. `domain/security/`, `domain/payments/`), `project/`. Detail files under `<scope>/.../details/`. The `domain/<name>/` layout is what Phase 2's scope-glob matching (`project:payments-*`) globs against.
- **D-11:** Same-`id` collision across scopes resolves by **full replacement** — higher scope (project > domain > enterprise) wins whole, fields verbatim; no field-level merge. The loser is **recorded in the index as `superseded`** (not dropped), feeding Phase 5's skip-reason enum. (Field-level merge rejected.)
- **D-12:** `id` is an **author-defined slug, globally unique across the store** (e.g. `require-mfa`, `no-plaintext-secrets`). A **duplicate id within the same scope fails the build**; the **same id across scopes is the intentional override signal**. (Slug chosen over path-derived id and over slug+namespace.)

**Severity & binding (feeds PACK-03 + Phase 2 recall threshold)**
- **D-13:** `severity` enum is **`critical | high | medium | low`**. Matches SAST/scan tools CLAUDE.md names. Phase 2 targets 100% recall on `critical`, `high` a second threshold.
- **D-14:** `severity` and the **`advisory`/`binding` classification are independent axes** — separate required fields, freely combined. A `critical` rule can be `advisory`; a `low` rule can be `binding`. PACK-03's "binding needs a contract" check applies regardless of severity.
- **D-15:** A `binding` rule references an enforcement contract via a **free-form named contract id** — `enforcement: <contract-id>` (e.g. `semgrep:no-eval`, `ci:exit-code`, `human-approval`). The **v1 build rejects a `binding` rule that omits/empties this field**, but does **not** resolve the id against any registry (deferred to v2 / ENF-04). v1 seam: "you named a contract"; v2: "the contract exists and ran."

### Claude's Discretion
- The concrete `taskType` enum values (discussion locked that `taskType` is an enum matched by equality, but not its members).
- What a task "signal" concretely contains at selection time and how `paths` are sourced per task — Phase 2 concern; Phase 1 only defines the axis shape rules match against.
- Whether the frontmatter `phases` field reuses GSD phase identifiers or an AI-DLC Inception/Construction/Operations vocabulary — align with whatever the researcher finds is canonical.
- Exact JSON Schema structuring (single schema vs. per-scope), and whether to author frontmatter parsing via `gray-matter` or GSD's existing `js-yaml` (CLAUDE.md presents both as valid; planner picks).

### Deferred Ideas (OUT OF SCOPE)
- Summary length cap for the token budget — belongs with Phase 2 token-budget work (SEL-05), not the Phase 1 format.
- Body/detail checksum in the index — out of scope for the v1 format.
- Project-scope consent flow — owned by Phase 4 (`04-03`); do not re-litigate in Phase 1.
- The selection algorithm (Phase 2), summary injection + `rule-detail` lazy loader (Phase 3), GSD capability wiring + disk-backed state (Phase 4), audit writer (Phase 5), real enforcement-contract resolution/registry (v2 ENF-02/03/04).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (verbatim from REQUIREMENTS.md) | Research Support |
|----|---------------------------------------------|------------------|
| PACK-01 | Rule author can define a rule as Markdown with YAML frontmatter carrying `id`, `scope`, `triggers`, `phases`, `severity`, `summary`, and `detailPath` | Frontmatter JSON Schema section (all D-01..D-08, D-13..D-15 fields) |
| PACK-02 | Rule author can organize rules into enterprise / domain / project scopes, and the system resolves conflicts by defined precedence | Store layout + Scope resolution & precedence sections (D-09, D-10, D-11, D-12) |
| PACK-03 | Rule author can classify each rule as `advisory` or `binding`, and the system rejects a `binding` rule that names no enforcement contract | Frontmatter schema if/then (D-14, D-15) + Test strategy |
| PACK-04 | System builds a compact `rule-index.json` (summaries and pointers only, never full bodies) from the rule-pack store | rule-index.json shape (no-body index schema, by-construction guard) + fast-check invariant |

**Roadmap sub-plans (from CONTEXT canonical refs):** the phase is split into `01-01 schema`, `01-02 store layout`, `01-03 index builder`. This research maps: schema → §Frontmatter JSON Schema; store layout → §Store Layout + §Scope resolution; index builder → §CLI structure + §rule-index.json shape.
</phase_requirements>

## Summary

Phase 1 stands up the project's first source tree and build tooling: a rule-pack file format (Markdown body + YAML frontmatter), a JSON Schema (draft 2020-12) validating the frontmatter, the `aidlc-rules/` on-disk store layout, scope precedence/override resolution, and a `governance` CLI whose Phase 1 subcommand builds `rule-index.json` — summaries and pointers only, never bodies. Every recommendation is grounded in the CLAUDE.md locked stack (Node >=22, TypeScript ^6.0.3, CommonJS, tsc-only, Ajv 8.20.0 via `ajv/dist/2020`, gray-matter 4.0.3 / js-yaml, picomatch 4.0.5, node:test + c8 + fast-check) and the 15 locked decisions D-01..D-15.

The single build-config risk the planner must resolve up front is fast-check ^4's exports-map packaging under a CommonJS tsconfig: `require("fast-check")` works at runtime under `module: commonjs`, but TypeScript type resolution for exports-map packages is cleaner under `moduleResolution: nodenext`. Recommendation is `module: nodenext` + `moduleResolution: nodenext` while keeping the package CommonJS (no `"type": "module"`), which emits `require()` and resolves fast-check's, Ajv's, and ajv-formats' types correctly. This is the one decision most likely to stall the first build — flag it in Wave 0.

Research confirms the CLAUDE.md stack is coherent and installable, and reconciles it against the 15 decisions. Two correctness points shape the schema: **D-03 makes an empty `triggers` block valid and meaningful** (always-in-phase), so the schema must NOT require any trigger axis; and **D-14 makes `severity` and `classification` independent required axes**, with `enforcement` required only when `classification: binding` (D-15). **Primary recommendation:** scaffold a CJS/tsc extension with `governance build-index` as the entry subcommand, validate frontmatter with an `additionalProperties:false` schema, derive scope from directory (D-09), record overrides as `superseded` (D-11), and validate the emitted index against a second `additionalProperties:false` schema that has no body field — making body-leakage impossible by construction and verifiable in one property test (PACK-04).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Rule authoring format (md + frontmatter) | Corpus / static files (`aidlc-rules/`) | — | Human-authored content; the format is a data contract, not code |
| Frontmatter validation | CLI / build tool (Ajv) | Schema (JSON) | Build-time gate owned by the tool, driven by a language-neutral schema |
| Store layout + scope derivation | Filesystem layout | CLI / build tool | Directory is the source of truth for scope (D-09); the tool reads and enforces it |
| Index generation | CLI / build tool | Corpus (input) | Deterministic transform: corpus in, `rule-index.json` out |
| Override / precedence resolution | CLI / build tool | Filesystem layout | Same-id-across-scopes (D-12) resolved by scope ordinal (D-11) |
| detailPath resolution | CLI / build tool | Filesystem | Path math + existence check + traversal guard belong to the build step (D-07, D-08) |
| Index consumption (select / detail) | OUT OF SCOPE (Phase 2/3) | — | Phase 1 only produces the index; it does not read it at task time |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | >=22.0.0 | Runtime | Matches GSD Core `engines`; keeps the overlay inside the `npx @opengsd/gsd-core` distribution [VERIFIED: CLAUDE.md grounding] |
| TypeScript | ^6.0.3 | Implementation language | Same version GSD Core builds with; shares its `tsc` pipeline [VERIFIED: CLAUDE.md grounding] |
| CommonJS | n/a | Module format | GSD Core is CJS (no `"type":"module"`); lets `gsd-tools.cjs` `require()` the extension [VERIFIED: CLAUDE.md grounding] |
| Ajv | 8.20.0 | JSON Schema validator (frontmatter + index) | Draft 2020-12 via `require("ajv/dist/2020")`; CJS-clean, no exports-map restriction on 8.x [VERIFIED: CLAUDE.md grounding, npm registry 2026-07-05] |
| ajv-formats | 3.0.1 | `date-time`/`uri` format assertions | Pairs with Ajv 8.x; validates the `generatedAt` timestamp in the index [VERIFIED: CLAUDE.md grounding, npm registry 2026-07-05] |
| gray-matter | 4.0.3 | Split YAML frontmatter from Markdown body | Purpose-built; handles delimiter/BOM/CRLF edge cases; CJS `main`; defaults to js-yaml safe load [VERIFIED: CLAUDE.md grounding, npm registry 2026-07-05] |
| picomatch | 4.0.5 | Glob compile/match for `triggers.paths` + scope globs | Zero-dep CJS; deterministic and explainable (audit-friendly) [VERIFIED: CLAUDE.md grounding, npm registry 2026-07-05] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| js-yaml | (per GSD Core dep) | YAML parse | Alternative to gray-matter if the team wants zero new runtime deps — GSD already ships it [VERIFIED: CLAUDE.md grounding] |
| node:test | built-in (Node 22) | Test runner | Zero-dep; matches GSD's no-extra-runner model |
| c8 | ^11 | Coverage | GSD Core's coverage tool |
| fast-check | ^4.8.0 | Property tests | Invariants like "no body ever appears in the index" — already a GSD dev dep [VERIFIED: CLAUDE.md grounding] |
| util.parseArgs | built-in (Node 22) | CLI argument parsing | Removes any arg-parser dependency; stable in Node 22 |

### Type packages
| Package | Ships own types? | Action |
|---------|------------------|--------|
| ajv | Yes (bundled `.d.ts`) | none |
| ajv-formats | Yes | none |
| picomatch | No | add `@types/picomatch` (devDependency) |
| gray-matter | No | add `@types/gray-matter` (devDependency) |
| fast-check | Yes (exports-map types) | needs `moduleResolution: nodenext` for clean resolution — see build config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | Hand-split `---` + GSD's js-yaml | Zero new runtime dep, more code; hand-rolling the delimiter split mis-handles CRLF/BOM/`---`-in-body/empty-block — a Don't-Hand-Roll item |
| Ajv | Zod | Zod is TS-internal only; the format contract must be a language-neutral JSON Schema per CLAUDE.md |
| util.parseArgs | commander / yargs | Extra deps for a 1-3 subcommand CLI; parseArgs is built-in and sufficient |
| picomatch | minimatch | Functionally equivalent for scope/path globs; picomatch is lighter and is the engine under minimatch (pick one, not both) |

**Installation:**
```bash
# Runtime deps
npm install ajv@8.20.0 ajv-formats@3.0.1 gray-matter@4.0.3 picomatch@4.0.5
# Dev deps (align versions with GSD Core where shared)
npm install -D typescript@^6.0.3 @types/node c8@^11 fast-check@^4.8.0 @types/picomatch @types/gray-matter
```

**Version note:** All versions above are locked in CLAUDE.md and were confirmed against the npm registry in prior research (2026-07-05). Do not re-verify — treat as authoritative. js-yaml is provided transitively by gray-matter (isolated `js-yaml@^3`) and/or directly by GSD Core; reuse before adding a second copy.

## Package Legitimacy Audit

All packages are locked in CLAUDE.md and were verified against the npm registry in prior research (2026-07-05). No new or unverified packages are introduced by this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| ajv | npm | 10+ yrs | very high | github.com/ajv-validator/ajv | OK | Approved |
| ajv-formats | npm | 5+ yrs | very high | github.com/ajv-validator/ajv-formats | OK | Approved |
| gray-matter | npm | 9+ yrs | very high | github.com/jonschlinkert/gray-matter | OK | Approved |
| picomatch | npm | 7+ yrs | very high | github.com/micromatch/picomatch | OK | Approved |
| fast-check | npm | 7+ yrs | high | github.com/dubzzz/fast-check | OK | Approved (existing GSD dev dep) |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** none

## Frontmatter JSON Schema (draft 2020-12)

Addresses PACK-01, PACK-03, success criteria 1 (accept valid / reject invalid) and 3 (binding-without-contract rejected). Validates D-01, D-02, **D-03 (empty triggers allowed)**, D-06, D-13, D-14, D-15. Scope directory-match (D-09) and duplicate-id (D-12) are separate programmatic checks — not expressible in JSON Schema.

**Schema (`src/schema/frontmatter.schema.json`):**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gsd.dev/schemas/aidlc-rule-frontmatter.schema.json",
  "title": "AI-DLC Rule-Pack Frontmatter",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "scope", "triggers", "phases", "severity", "summary", "classification"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      "description": "Author-assigned slug (D-12), globally unique. Same id across scopes = override signal."
    },
    "scope": {
      "type": "string",
      "enum": ["enterprise", "domain", "project"],
      "description": "Enum only. MUST also match the declaring directory (D-09) via a post-parse check."
    },
    "triggers": {
      "type": "object",
      "additionalProperties": false,
      "description": "D-03: an empty object {} is VALID and means always-in-phase. Do NOT set minProperties.",
      "properties": {
        "taskType": { "$ref": "#/$defs/taskTypeArray" },
        "keywords": { "type": "array", "items": { "type": "string", "minLength": 1 }, "uniqueItems": true },
        "paths":    { "type": "array", "items": { "type": "string", "minLength": 1 }, "uniqueItems": true },
        "exclude": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "taskType": { "$ref": "#/$defs/taskTypeArray" },
            "keywords": { "type": "array", "items": { "type": "string", "minLength": 1 }, "uniqueItems": true },
            "paths":    { "type": "array", "items": { "type": "string", "minLength": 1 }, "uniqueItems": true }
          }
        }
      }
    },
    "phases": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": { "type": "string", "enum": ["inception", "construction", "operations", "common"] }
    },
    "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
    "summary":  { "type": "string", "minLength": 1 },
    "detailPath": { "type": "string", "minLength": 1 },
    "classification": { "type": "string", "enum": ["advisory", "binding"] },
    "enforcement": { "type": "string", "minLength": 1 }
  },
  "$defs": {
    "taskTypeArray": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "string",
        "enum": ["feature", "bugfix", "refactor", "docs", "test", "infra", "security", "data"]
      }
    }
  },
  "allOf": [
    {
      "if":   { "properties": { "classification": { "const": "binding" } }, "required": ["classification"] },
      "then": { "required": ["enforcement"] }
    }
  ]
}
```

**Ajv 8.x setup (`src/schema/validate.ts`):**
```ts
// Source: Ajv docs — draft 2020-12 entrypoint. CLAUDE.md grounding (verified 2026-07-05).
import Ajv2020 from "ajv/dist/2020";   // require("ajv/dist/2020") under CJS emit
import addFormats from "ajv-formats";
import schema from "./frontmatter.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
export const validateFrontmatter = ajv.compile(schema);
```

**Design notes:**
- **D-03 is the load-bearing schema decision:** `triggers` must have **no `minProperties`** and every axis is optional, so `triggers: {}` validates. This is the always-in-phase escape hatch a `critical` rule uses to guarantee it never misses within its phase/scope. A schema that required a trigger axis would silently break the project's #1 recall guarantee. [CITED: CONTEXT D-03]
- **`taskType` as a closed enum (D-04):** D-04 locks "taskType = enum equality," so the schema uses a closed enum, not an open `string[]`. The exact members are Claude's Discretion — the set above (`feature/bugfix/refactor/docs/test/infra/security/data`) is a **proposed starter set [ASSUMED]**; the planner should confirm it (likely a discuss-phase checkpoint). Keeping it a `$defs` ref means positive and `exclude` axes share one definition and the set is edited in one place.
- **`enforcement`-required-if-`binding` (D-14/D-15):** the `if`/`then` inside `allOf` adds `enforcement` to `required` only when `classification: binding`. Because `enforcement` is declared in top-level `properties`, `additionalProperties: false` is still satisfied — **no `unevaluatedProperties` needed** (the common draft 2020-12 pitfall, avoided by construction). `enforcement` is a free-form string; v1 does not resolve it against a registry (D-15).
- **`severity` and `classification` are independent required fields (D-14)** — both listed in `required`, no coupling between their enums. A `critical`/`advisory` or `low`/`binding` rule all validate.
- **`allErrors: true`** collects every field error in one pass. Format `validate.errors` into `"<file>: <instancePath> <message>"` lines (a small manual formatter suffices; `ajv-errors` optional for per-field custom messages). [CITED: CLAUDE.md — Ajv is the contract validator]
- Compile the schema once at startup and assert it compiles under `strict: true` in a test (catches typos and unknown-keyword regressions).
- **Summary length cap is deferred** (CONTEXT Deferred Ideas → Phase 2 token budget / SEL-05), so `summary` has `minLength: 1` but no `maxLength` here. Do not add one in Phase 1.

## Store Layout (`aidlc-rules/`)

Addresses PACK-02, D-09, D-10. Greenfield — this tree is created in Phase 1.

```
aidlc-rules/                       # D-10: at repo root
├── enterprise/
│   ├── require-mfa.md
│   └── security/
│       ├── auth.md                # detailPath: details/auth.md  →  enterprise/security/details/auth.md
│       └── details/
│           └── auth.md            # full body (NEVER indexed)
├── domain/                        # D-10: subdivided by domain name
│   ├── security/
│   │   └── no-plaintext-secrets.md
│   └── payments/                  # what Phase 2 globs as project:payments-* / domain scope
│       └── pci-scope.md
└── project/
    └── input-validation.md
```

- **Scope = the first path segment under `aidlc-rules/`** (`enterprise` | `domain` | `project`). For `domain`, the **next segment is the domain name** (`security`, `payments`) — the scope is still `domain`; the name is a sub-facet Phase 2's scope globs match against. [CITED: CONTEXT D-10]
- **Detail files live under a `details/` subdirectory** beside the rule (D-08/D-10 convention), resolved relative to the declaring rule file — not a `.detail.md` sibling suffix.
- A rule file located outside the three tier roots is a hard error (no derivable scope).

## CommonJS + tsc-only CLI Structure (from scratch)

Addresses PACK-02/PACK-04. Greenfield — Phase 1 creates the source tree, build config, and the `governance` binary. Match GSD Core conventions: CJS, `tsc`-only (no bundler), Node >=22.

**Directory layout (source tree):**
```
gsd-core-ai-dlc/
├── package.json
├── tsconfig.json            # dev: includes tests, emits to dist-test/
├── tsconfig.build.json      # ship: src/ only, excludes *.test.ts → dist/
├── bin/
│   └── governance.cjs       # thin shim → dist/cli/index.js
├── src/
│   ├── cli/
│   │   ├── index.ts         # parseArgs dispatch (build-index now; select/rule-detail later)
│   │   └── commands/
│   │       └── build-index.ts
│   ├── schema/
│   │   ├── frontmatter.schema.json
│   │   ├── rule-index.schema.json
│   │   └── validate.ts
│   ├── rules/
│   │   ├── load.ts          # scan aidlc-rules/, gray-matter parse, validate
│   │   ├── scope.ts         # directory-as-truth + precedence + override (D-09/D-11/D-12)
│   │   └── detail-path.ts   # resolve relative to rule file + traversal guard (D-07/D-08)
│   └── index/
│       └── build.ts         # assemble rule-index.json (summaries + pointers only)
├── dist/                    # tsc output (gitignored)
└── aidlc-rules/             # D-10: corpus at repo root (see Store Layout)
```

**package.json (key fields):**
```json
{
  "name": "@opengsd/gsd-aidlc-overlay",
  "version": "0.1.0",
  "engines": { "node": ">=22.0.0", "npm": ">=10.0.0" },
  "bin": { "governance": "bin/governance.cjs" },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "pretest": "tsc -p tsconfig.json",
    "test": "node --test \"dist-test/**/*.test.js\""
  }
}
```
No `"type": "module"` → the package stays CommonJS so `gsd-tools.cjs` can `require()` it.

**bin/governance.cjs (shim):**
```js
#!/usr/bin/env node
require("../dist/cli/index.js").main(process.argv.slice(2));
```

**CLI dispatcher (`src/cli/index.ts`), dep-free with `util.parseArgs`:**
```ts
import { parseArgs } from "node:util";

export async function main(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;
  switch (subcommand) {
    case "build-index":
      return (await import("./commands/build-index.js")).run(rest);
    // Phase 2: case "select"      → ./commands/select
    // Phase 3: case "rule-detail" → ./commands/rule-detail
    default:
      process.stderr.write(`Unknown command: ${subcommand ?? "(none)"}\n`);
      process.exit(2);
  }
}
```

**tsconfig — the fast-check decision (RESOLVE THIS IN WAVE 0):**
```jsonc
// tsconfig.build.json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",          // ← recommended: resolves fast-check exports map
    "moduleResolution": "nodenext",//   AND emits require() because package is CJS
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": true,
    "resolveJsonModule": true,      // to import *.schema.json
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.test.ts"]
}
```

**Why `nodenext` over `commonjs`:** fast-check ^4 ships ESM+CJS behind an `exports` map. Under classic `module: commonjs` + `moduleResolution: node`, `require("fast-check")` runs fine at runtime but **TypeScript cannot resolve fast-check's types** (classic resolution ignores `exports`), forcing a type-shim workaround. `moduleResolution: nodenext` reads the `exports` map so types resolve cleanly; because package.json has no `"type": "module"`, `nodenext` still classifies `.ts` files as CJS and **emits `require()` calls** — exactly what the CJS runtime needs. Use `import * as fc from "fast-check"` (compiles to `const fc = require("fast-check")`). Same benefit applies to `ajv/dist/2020` and `ajv-formats`. This is the single most fiddly build-config decision; the fallback (`module: commonjs` + a `fast-check` type shim) works but is more code and less future-proof. [VERIFIED: CLAUDE.md grounding — fast-check CJS interop note]

**Test toolchain (dep-free path):** compile TS (including `*.test.ts`) via `tsconfig.json` to `dist-test/`, then `node --test "dist-test/**/*.test.js"`. Avoids ts-node/tsx. Coverage: `c8 node --test ...`. Mirrors GSD's "compile then run plain node scripts" model.

## Frontmatter Parsing: gray-matter vs js-yaml

**Recommendation: gray-matter 4.0.3.** Frontmatter extraction is a Don't-Hand-Roll problem — the `---` delimiter split has real edge cases (leading BOM, CRLF line endings, `---` sequences inside the Markdown body, missing trailing newline, empty frontmatter block). gray-matter is purpose-built and returns `{ data, content }` in one call.

```ts
// Source: gray-matter README. CLAUDE.md grounding.
import matter from "gray-matter";
const { data, content } = matter(rawFileText);   // data = frontmatter, content = body
// validateFrontmatter(data);  ← Ajv; content is used ONLY for detail files, never indexed
```

- **Safe load:** gray-matter's default YAML engine uses js-yaml's safe load (no arbitrary type instantiation from `!!` tags). Keep the default engine — do not swap in an unsafe loader.
- **Error clarity:** wrap `matter(...)` in try/catch and re-throw with the file path attached (`"<file>: malformed frontmatter: <yaml error>"`). A raw js-yaml error with only line/column is hard to action across a corpus.
- **`content` is quarantined:** the parsed `content` (body) is used only when writing/reading detail files; the index builder must never read `content`. This is the code-level half of the D-05/PACK-04 body-leak guarantee (the schema is the other half).

**Alternative (js-yaml only):** CLAUDE.md's "reuse before adding" principle makes hand-splitting with GSD's existing js-yaml legitimate for zero new runtime deps. Cost: ~20-30 lines to split delimiters robustly and handle the edge cases above. For a governance/audit tool where the format boundary must be correct, the extra dep buys robustness cheaply — hence gray-matter is recommended. Flag the choice if "minimize runtime deps" outranks robustness. [CITED: CONTEXT Claude's Discretion — planner picks]

## rule-index.json Shape

Addresses PACK-02, PACK-04, D-05, D-11, success criterion 4. Carries summaries + pointers + `superseded` records — **never bodies**.

**Shape:**
```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-07-05T00:00:00Z",
  "rules": [
    {
      "id": "input-validation",
      "scope": "project",
      "triggers": { "taskType": ["feature"], "keywords": ["input","request"], "paths": ["src/api/**"], "exclude": { "paths": ["**/*.test.ts"] } },
      "phases": ["construction"],
      "severity": "high",
      "summary": "Validate all external input at trust boundaries before use.",
      "classification": "binding",
      "enforcement": "semgrep:input-validation",
      "detailPath": "aidlc-rules/project/details/input-validation.md",
      "sourceFile": "aidlc-rules/project/input-validation.md",
      "superseded": [
        { "id": "input-validation", "scope": "enterprise", "sourceFile": "aidlc-rules/enterprise/input-validation.md", "reason": "superseded" }
      ]
    },
    {
      "id": "require-mfa",
      "scope": "enterprise",
      "triggers": {},
      "phases": ["common"],
      "severity": "critical",
      "summary": "All privileged access requires multi-factor authentication.",
      "classification": "advisory"
    }
  ]
}
```
The second record shows the **D-03 always-in-phase pattern** (`triggers: {}`) on a `critical`/`advisory` rule, and a rule with **no `detailPath`/`enforcement`** (both optional) — proving the shape handles the full matrix.

**Body-leakage impossible by construction + verifiable:**
1. **Whitelist construction** — the builder assembles each record from an explicit list of frontmatter fields plus computed pointers (`detailPath`, `sourceFile`). It never spreads the whole parse result and never touches gray-matter's `content`.
2. **Output schema with `additionalProperties: false` and no body field** — validate the emitted index against `rule-index.schema.json` before writing. Any stray `body`/`content` field fails validation → the build aborts. Turns "we promise not to leak bodies" into an enforced, testable invariant.
3. **`detailPath`/`sourceFile` are pointers, not payloads** — Phase 3's `governance rule-detail <id>` reads the detail file lazily; Phase 2's `governance select` injects `summary` only.
4. **`superseded` uses the Phase 5 skip-reason vocabulary** — the `reason` value `"superseded"` is one member of AUDIT-02's machine-checkable enum (`out-of-phase / out-of-scope-by-trigger / superseded / explicitly-waived`). Emitting it here pre-wires Phase 5's audit story (D-11). [CITED: REQUIREMENTS AUDIT-02]

**Index output schema (`src/schema/rule-index.schema.json`), abbreviated:**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "generatedAt", "rules"],
  "properties": {
    "schemaVersion": { "type": "integer", "const": 1 },
    "generatedAt":   { "type": "string", "format": "date-time" },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id","scope","triggers","phases","severity","summary","classification","sourceFile"],
        "properties": {
          "id": {}, "scope": {}, "triggers": {}, "phases": {}, "severity": {},
          "summary": { "type": "string", "minLength": 1 },
          "classification": {}, "enforcement": {}, "detailPath": {}, "sourceFile": {}, "superseded": {}
        }
      }
    }
  }
}
```
The `additionalProperties: false` on each rule item is the by-construction guard: there is no place for a body to live.

## Scope Resolution + Precedence

Addresses PACK-02, D-09, D-11, D-12, success criterion 2.

- **Directory is the source of truth (D-09).** The loader derives scope from the file's location (first segment under `aidlc-rules/`) and cross-checks it against frontmatter `scope`. Mismatch (or a rule outside the three tier roots) is a **hard error** naming the file and both values.
- **Precedence is an enum ordinal, not a glob.** `project (3) > domain (2) > enterprise (1)`. Winner = max ordinal among same-id rules.
- **Override = same id across scopes (D-12).** Group all parsed rules by `id`. If a group spans >1 scope, the highest-precedence scope wins; every loser is recorded under the winner's `superseded[]` (D-11, full replace — no field merge).
- **Duplicate id within the same scope is a hard error (D-12)**, not an override (ambiguous winner). This includes the same id twice inside `domain/security/` and `domain/payments/`? No — those are both `domain` scope, so a shared id across two domain names is same-scope duplication → hard error. Flag this domain-name subtlety for the planner.
- **picomatch's Phase 1 role** is validating/compiling `triggers.paths` globs at build time (catch invalid glob syntax early); actual path-vs-task matching is Phase 2 (`select`). Precedence itself needs no globbing. [CITED: CLAUDE.md — deterministic glob matcher; CONTEXT D-04]

```ts
const ORDINAL = { enterprise: 1, domain: 2, project: 3 } as const;
// group by id → if >1 scope, pick max ordinal → losers become winner.superseded[]
// if >1 rule at the SAME scope for one id → throw (duplicate-id-in-scope)
```

## detailPath Resolution

Addresses D-06, D-07, D-08, and path-traversal safety.

- **Optional (D-06):** absence of `detailPath` is valid — many rules have no detail file.
- **Resolve relative to the declaring rule file (D-08):**
  ```ts
  import path from "node:path";
  const abs = path.resolve(path.dirname(ruleFileAbsPath), fm.detailPath);
  // e.g. enterprise/security/auth.md + "details/auth.md" → enterprise/security/details/auth.md
  ```
- **Fail loud on missing/unresolvable target (D-07):** after resolving, `fs.statSync(abs)` and assert it is an existing file; otherwise throw `"<ruleFile>: detailPath '<value>' → '<abs>' not found"`. No silent skip.
- **Path-traversal guard:** compute `const rel = path.relative(rulesRootAbs, abs);` and reject if `rel` starts with `..` or `path.isAbsolute(rel)` — blocks `detailPath: ../../../etc/passwd` escapes out of `aidlc-rules/`. Store the index's `detailPath`/`sourceFile` as **repo-root-relative POSIX paths** (`/` separators) for portability across Windows dev and Linux CI.

## Test Strategy (node:test + fast-check)

One testable assertion per success criterion. Framework: `node:test` (built-in) + `c8` coverage + `fast-check` for the invariant.

| # | Success criterion | Test type | Assertion |
|---|-------------------|-----------|-----------|
| 1 | Schema accepts valid / rejects invalid frontmatter | unit (table-driven) | Valid fixture passes; each mutation (missing required field, bad `severity`/`scope`/`classification` enum, unknown extra key, invalid `taskType` member) fails with a clear error. **Also: `triggers: {}` MUST pass (D-03).** |
| 2 | Precedence winner is correct | unit | Same id in `enterprise` + `project` → index winner is `project`; `superseded[]` lists the `enterprise` record with `reason: "superseded"` (D-11/D-12) |
| 3 | Binding-without-contract is rejected | unit | `classification: binding` without `enforcement` → schema validation fails (if/then required). `advisory` without `enforcement` → passes (D-14) |
| 4 | No body ever appears in the index | property (fast-check) | For arbitrary rule bodies, the serialized `rule-index.json` never contains the body text AND validates against the no-body index schema |

Additional guardrail tests: directory/scope mismatch → hard error (D-09); duplicate-id-in-scope → hard error (D-12); missing/dangling `detailPath` → hard error (D-07); traversal `detailPath` → rejected; `triggers` with only `exclude` populated → valid (boundary for D-02/D-03); schema compiles under Ajv `strict: true`.

```ts
// fast-check invariant sketch — success criterion 4 (PACK-04)
import fc from "fast-check";
import test from "node:test";
import assert from "node:assert/strict";

test("index never contains rule bodies", () => {
  fc.assert(fc.property(fc.string({ minLength: 1 }), (body) => {
    const index = buildIndexFromRules([makeRule({ body })]);
    const serialized = JSON.stringify(index);
    assert.ok(!serialized.includes(body), "body leaked into index");
  }));
});
```

## Common Pitfalls

### Pitfall 1: Schema forbids empty `triggers`, breaking D-03
**What goes wrong:** adding `minProperties: 1` (or making an axis required) to `triggers` rejects `triggers: {}`.
**Why:** it looks like "a trigger must do something," but D-03 makes empty triggers the deliberate always-in-phase escape hatch for `critical` rules.
**How to avoid:** every trigger axis optional, no `minProperties`; add a test asserting `triggers: {}` validates.
**Warning signs:** a `critical` always-in-phase rule fails the build; recall drops silently in Phase 2.

### Pitfall 2: fast-check types fail to resolve under `module: commonjs`
**What goes wrong:** `require("fast-check")` runs, but `tsc` errors "Could not find a declaration file for module 'fast-check'."
**Why:** fast-check ^4 uses an `exports` map; classic `moduleResolution: node` ignores it.
**How to avoid:** `moduleResolution: nodenext` (+ `module: nodenext`), package stays CJS (no `"type":"module"`). Emits `require()`, resolves types.
**Warning signs:** first `npm run build` fails only in test files importing fast-check.

### Pitfall 3: `unevaluatedProperties` confusion with if/then + `additionalProperties:false`
**What goes wrong:** conditionally-added `enforcement` gets rejected by `additionalProperties:false`, or the if/then required rule is silently ignored.
**Why:** `additionalProperties` only sees properties in the same schema object, not in `if`/`then` branches.
**How to avoid:** declare `enforcement` in top-level `properties` (as done here) and only add it to `required` via if/then. No `unevaluatedProperties` needed.
**Warning signs:** valid binding rules rejected, or invalid ones accepted.

### Pitfall 4: Silent body leakage into the index
**What goes wrong:** a refactor spreads the whole parse result into the index record, dragging `content` along.
**Why:** convenience spreads (`{ ...parsed }`) instead of an explicit field whitelist.
**How to avoid:** whitelist construction + validate output against the no-body index schema (build aborts on any extra field) + the fast-check invariant test.
**Warning signs:** `rule-index.json` file size grows with body length; the invariant test fails.

### Pitfall 5: Windows/Linux path divergence
**What goes wrong:** `detailPath`/`sourceFile` stored with `\` separators break on CI (Linux) or in downstream globbing.
**Why:** `path.resolve` yields OS-native separators; dev is Windows here.
**How to avoid:** normalize stored pointers to POSIX (`/`) and keep them repo-root-relative.
**Warning signs:** index diffs churn between machines; Phase 2 path matching misses.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter split | Custom `---` string parsing | gray-matter | BOM/CRLF/`---`-in-body/empty-block edge cases |
| Schema validation | Ad-hoc field checks | Ajv + JSON Schema | Language-neutral contract, `allErrors`, if/then, audit-friendly |
| Glob matching | Regex from globs | picomatch | Deterministic, explainable, correct glob semantics |
| Arg parsing | Manual `argv` slicing beyond dispatch | `util.parseArgs` | Built-in Node 22; handles flags/values/errors |
| YAML parsing | Custom YAML | js-yaml (via gray-matter) | Safe-load, mature |

**Key insight:** every one of these is a place where a custom solution is subtly wrong and, because this is a governance/audit tool, "subtly wrong" undermines the trust the tool exists to provide.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `phases` canonical set = `inception/construction/operations/common` | Frontmatter schema | Schema rejects valid authored phase values or accepts wrong ones |
| A2 | `taskType` closed enum starter set = `feature/bugfix/refactor/docs/test/infra/security/data` | Frontmatter schema | Blocks authors (too narrow) or weakens the D-04 equality contract (too broad) |
| A3 | PACK-01..04 map to the four success criteria as tabulated | Phase Requirements, Tests | Test coverage misaligned with actual ROADMAP criteria |
| A4 | Same id across two domain names (both `domain` scope) = duplicate-in-scope error | Scope resolution | Wrong: silently treated as override; or over-strict if domains are meant to be independent id namespaces |
| A5 | Precedence order is `project > domain > enterprise` | Scope resolution | Wrong winner selected on override |
| A6 | `enforcement` free-form string, no format constraint in v1 | Frontmatter schema | If a `<tool>:<rule>` shape is expected, malformed ids pass v1 |

**If any assumption is load-bearing for a task, the planner should insert a `checkpoint:human-verify` before locking it.** A1, A2, and A4 are the most likely to need user confirmation via discuss-phase. A5 is stated in CONTEXT D-11 (`project > domain > enterprise`) so it is effectively locked — listed only for completeness.

## Open Questions

1. **Exact `phases` corpus vocabulary** (A1)
   - What we know: AI-DLC uses Inception/Construction/Operations; `common` appears as a shared bucket (CLAUDE.md grounding).
   - What's unclear: whether the vendored `aidlc-rules` corpus uses more/other tokens or different casing. The corpus is not yet in the repo (greenfield).
   - Recommendation: default to the four above; make the enum easy to extend; confirm against awslabs/aidlc-workflows during planning.
2. **`taskType` enum membership** (A2)
   - What we know: D-04 locks "taskType = enum equality"; members are Claude's Discretion.
   - What's unclear: the concrete set. Phase 2's selector consumes it, so the closed set matters there most.
   - Recommendation: adopt the starter set now for a closed enum, flag for discuss-phase confirmation before Phase 2 depends on it.
3. **Does PACK-02 require the `superseded` provenance record, or only the correct winner?**
   - What we know: D-11 explicitly says "recorded in the index as `superseded`" and it feeds AUDIT-02's skip-reason enum.
   - Recommendation: emit `superseded[]` — it is locked by D-11 and directly serves auditability.
4. **Domain-name id namespacing** (A4)
   - What we know: `domain/<name>/` subdivides the domain tier (D-10); ids are globally unique (D-12).
   - What's unclear: whether the same id in `domain/security/` and `domain/payments/` is an error (both `domain` scope) or allowed (different domain namespaces).
   - Recommendation: treat as duplicate-in-scope error per the literal reading of D-12 ("globally unique"), and surface it for user confirmation.

## Environment Availability

Phase 1 is a code/config + local-file phase (build a CLI over local Markdown). No network services, DBs, or external runtimes beyond Node/npm, which CLAUDE.md already fixes at Node >=22 / npm >=10. No availability probing required beyond confirming the toolchain the installer already guarantees. **Step 2.6: effectively SKIPPED (no external service dependencies).**

## Validation Architecture

> `workflow.nyquist_validation` treated as enabled (key absent = enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node 22) + fast-check ^4.8.0 + c8 ^11 |
| Config file | none for the runner; `tsconfig.json` compiles tests to `dist-test/` (see Wave 0) |
| Quick run command | `node --test "dist-test/**/*.test.js"` |
| Full suite command | `c8 node --test "dist-test/**/*.test.js"` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PACK-01 | Frontmatter schema accepts valid / rejects invalid (incl. `triggers: {}` valid) | unit | `node --test dist-test/schema/frontmatter.test.js` | ❌ Wave 0 |
| PACK-02 | Scope precedence + override recorded as `superseded` | unit | `node --test dist-test/rules/scope.test.js` | ❌ Wave 0 |
| PACK-03 | Binding-without-`enforcement` rejected; advisory allowed | unit | `node --test dist-test/schema/classification.test.js` | ❌ Wave 0 |
| PACK-04 | `governance build-index` emits index; index never contains bodies | integration + property | `node --test dist-test/index/build.test.js dist-test/index/no-body.test.js` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test "dist-test/**/*.test.js"` (compile first via `pretest`)
- **Per wave merge:** `c8 node --test "dist-test/**/*.test.js"`
- **Phase gate:** full suite green before `/gsd-verify-work`

### Nyquist dimensions the planner should cover
- **Positive + negative per validator** (accept valid, reject each invalid variant) — not just the happy path.
- **Boundary cases:** empty `triggers: {}` (D-03), `triggers` with only `exclude`, `detailPath` present-but-dangling, absent `detailPath`, advisory-without-enforcement, binding-without-enforcement.
- **Invariant (property) coverage** for the no-body guarantee — the highest-value assertion in the phase (PACK-04).
- **Cross-scope matrix:** same id in enterprise+project (override), same id in two domain names (duplicate-in-scope), same-id-same-scope (error).

### Wave 0 Gaps (greenfield — all test infra is new)
- [ ] Framework/setup: `tsconfig.json` (dev, includes tests → `dist-test/`), `pretest` build script
- [ ] `dist-test` wiring + `node --test` glob confirmed on Windows and Linux
- [ ] `test/fixtures/` valid + invalid rule files (including `triggers: {}` and advisory/binding variants)
- [ ] `dist-test/schema/frontmatter.test.js` — PACK-01
- [ ] `dist-test/schema/classification.test.js` — PACK-03
- [ ] `dist-test/rules/scope.test.js` — PACK-02
- [ ] `dist-test/index/build.test.js` + `dist-test/index/no-body.test.js` (fast-check) — PACK-04
- [ ] Install: `npm i -D fast-check@^4.8.0 c8@^11 @types/picomatch @types/gray-matter` (fast-check/c8 may already be present via GSD)

## Security Domain

> `security_enforcement` treated as enabled (absent = enabled). This phase is a build-time CLI over local files — no network, no auth, no user sessions. Applicable controls are input-validation and path-safety.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | none (no auth surface) |
| V3 Session Management | no | none |
| V4 Access Control | no | none |
| V5 Input Validation | yes | Ajv schema validation of all frontmatter; reject-by-default (`additionalProperties:false`) |
| V6 Cryptography | no | none in v1 (detail checksum is a Deferred Idea) |
| V12 Files & Resources | yes | `detailPath` traversal guard (reject `..`/absolute escapes out of `aidlc-rules/`); safe YAML load |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `detailPath` | Tampering / Info Disclosure | `path.relative` containment check against `aidlc-rules/` root (D-07/D-08) |
| Unsafe YAML type instantiation | Tampering | gray-matter default safe-load; never enable unsafe schema |
| Malformed frontmatter → crash | DoS (build) | try/catch around parse + Ajv validation; fail with clear per-file error |

## Sources

### Primary (HIGH confidence)
- CLAUDE.md project grounding — locked stack, versions (npm registry verified 2026-07-05), CJS/tsc conventions, GSD Core `engines`, gray-matter/js-yaml/picomatch/Ajv choices, AI-DLC corpus phase model, `ajv/dist/2020` CJS deep-import, fast-check ^4 CJS interop.
- `.planning/phases/01-rule-pack-format-index/01-CONTEXT.md` — the 15 locked decisions D-01..D-15, Claude's Discretion, Deferred Ideas, canonical refs, store layout.
- `.planning/REQUIREMENTS.md` — PACK-01..04 verbatim, AUDIT-02 skip-reason enum, v1/v2 split.

### Secondary (MEDIUM confidence)
- Ajv draft 2020-12 usage patterns (`allErrors`, `strict`, if/then) — standard library behavior consistent with Ajv 8.x docs.

### Tertiary (LOW confidence)
- Exact `phases` corpus vocabulary and `taskType` enum members — see Assumptions Log (A1, A2), pending corpus inspection / discuss-phase confirmation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions locked in CLAUDE.md and registry-verified 2026-07-05.
- Architecture / format design: HIGH — directly derived from the 15 locked decisions read from CONTEXT.md; schema shapes are prescriptive and reconciled against D-03/D-14/D-15.
- Build config (fast-check/tsconfig): MEDIUM-HIGH — recommendation is sound; must be exercised in Wave 0 to confirm on this machine.
- Corpus vocabulary (`phases`, `taskType`): LOW — assumed, flagged for confirmation (A1, A2).

**Research date:** 2026-07-05
**Valid until:** ~2026-08-04 (30 days — stable CJS/tsc/JSON-Schema domain; re-check only if fast-check or Ajv majors change)
