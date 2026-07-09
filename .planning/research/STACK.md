# Stack Research

**Domain:** v4.0 Developer Coding Conventions — Java/Spring rule packs + starter examples + consumer-side coverage gate adapter
**Researched:** 2026-07-09
**Confidence:** HIGH (repo observation + stdlib feasibility proof); MEDIUM on ecosystem package versions (npm registry)

> Scope: **NEW only** for milestone v4.0. Shipped v1–v3 stack (Node ≥22, TypeScript, CJS, tsc, Ajv, gray-matter, picomatch, GateAdapter/`runAdapter`) is frozen — do not re-open.

## Grounding: What Was Observed In-Repo

| Surface | Observation |
|---------|-------------|
| Runtime deps | `ajv@8.20.0`, `ajv-formats@3.0.1`, `gray-matter@4.0.3`, `picomatch@4.0.5` — no XML/coverage libs |
| Adapter boundary | `src/enforcement/adapters.ts` — `GateAdapter` + `STUB_NAMES` (semgrep/bandit/checkov/grype/gitleaks/generic-exit-ci/human-approval) + `ADAPTERS` Map of no-ops |
| Binding path | `runAdapter(adapter, request)` hard-fails on schema/`gateId`/`evaluatedBy`; `verifyGateHook` defaults `adapterName` to `generic-exit-ci` |
| Rule format | YAML frontmatter + Markdown body; schema `src/schema/frontmatter.schema.json`; store `aidlc-rules/{enterprise,domain/<name>,project}/` |
| Lazy detail | `detailPath` relative to declaring rule file; must resolve **inside pack root** (traversal guard in `src/rules/detail-path.ts`); index never carries body |
| Authoring docs | `docs/rule-authoring.md` already covers frontmatter/scopes/triggers — reuse, no new authoring runtime |
| Node | v24.14.0 available; **no** `node:xml` built-in |

## Recommended Stack (v4.0 additions)

### Core — no new packages

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Existing rule-pack format | as shipped | Coding-convention rules | Frontmatter already has `id/scope/triggers/phases/severity/summary/classification/detailPath/enforcement`. Zero new rule runtime. |
| Node stdlib only (`fs`, `path`, string/regex) | Node ≥22 | JaCoCo XML + LCOV parse | Report shapes are fixed/simple. Zero-dep parse proven for report-level JaCoCo `counter` + LCOV `LF`/`LH`. Avoids new dep + ESM/CJS friction. |
| Existing `GateAdapter` + `runAdapter` | as shipped | Coverage CI gate | Real adapter implements `evaluate(request): Promise<GateResult>`; register in `ADAPTERS`; verify hook already routes through `runAdapter`. |
| Markdown rule bodies + optional `detailPath` | as shipped | Hexagonal/CQRS/DDD/WSO2/Kafka/logging prose | Summaries inject; full convention text lazy via `detailPath` under pack root. |

### Supporting (stdlib modules — not npm)

| Module | Purpose | When |
|--------|---------|------|
| `node:fs` / `node:fs/promises` | Read consumer coverage report from disk | Coverage adapter `evaluate` |
| `node:path` | Resolve report path; refuse traversal outside project root | Same security pattern as `detail-path.ts` |
| String match / line scan | JaCoCo: last-wins `<counter type="LINE" missed="N" covered="M"/>` (report-level counters emit last). LCOV: sum `LF:` / `LH:` | Prefer over full XML DOM |

### Development tools — unchanged

| Tool | Notes |
|------|-------|
| `tsc` + `node:test` + `c8` | Fixture-driven unit tests for parsers (sample `jacoco.xml` / `lcov.info` under `test/fixtures/coverage/`) |
| `fast-check` | Optional property: coverage% formula `covered/(missed+covered)` monotonic; threshold boundary at 70.0 |

## What To Add (concrete deliverables, not deps)

### 1. Rule packs (content only)

```
aidlc-rules/
  domain/
    java-spring/                    # subscribe: governance select --domains java-spring
      unit-test-coverage.md         # binding, enforcement: coverage-report
      hexagonal-structure.md
      cqrs-ddd-layering.md
      service-classification-wso2.md
      inbound-rest-kafka.md
      error-audit-logging.md
      api-contract.md
      saga-outbox-events.md
      details/                      # detailPath targets — prose only, in-pack
        hexagonal.md
        ...
```

- **Scope:** `domain` + domain name `java-spring` (banking consumers opt in). Project overrides allowed later.
- **Binding coverage rule:** `classification: binding`, `enforcement: coverage-report` (or `jacoco-coverage`), threshold **>70% LINE** documented in body + adapter config default `0.70`.
- **Triggers:** path globs like `**/*.{java,kt}`, `**/pom.xml`, `**/build.gradle*`, keywords `spring`, `kafka`, `wso2`, `jacoco`, `coverage`; phases mainly `construction` + `common` where always-on.

### 2. Coverage adapter (Node code in this repo)

| Item | Spec |
|------|------|
| Name | `coverage-report` (register in `STUB_NAMES` → replace no-op with real impl; keep noop/echo maps for tests) |
| Input | Report file path(s) from adapter options / env / convention — **not** from untrusted rule body. Defaults: `target/site/jacoco/jacoco.xml`, `build/reports/jacoco/test/jacocoTestReport.xml`, `coverage/lcov.info` |
| Formats | **JaCoCo XML** (primary for Java consumers); **LCOV** (secondary / shared with JS) |
| Metric | LINE coverage = `covered / (missed + covered)`; fail if `< threshold` (default `0.70`). Division by zero → fail loud |
| Output | Schema-valid `GateResult`: `status` pass/fail, `findings[]` with id matching rule id (e.g. `unit-test-coverage`), severity from rule, message with pct + path, `evaluatedBy: "coverage-report"` |
| Boundary | **Always** call via `runAdapter` — never raw `adapter.evaluate` from hooks |

**Parser design (prescriptive, zero-dep):**

```text
parseJacocoXml(xml: string) → { line: { missed, covered }, branch?: ... }
  // Scan all <counter .../>; for each type, LAST occurrence wins
  // (JaCoCo nests counters; report-level counters are emitted last.)

parseLcov(text: string) → { lf, lh }
  // Sum LF: and LH: across records; pct = lh/lf

coveragePercent(missed, covered) → number  // 0..100 or 0..1 — pick one, document, test boundaries
```

Reject: full XML DOM libraries for this milestone. JaCoCo DTD is attribute-stable; regex/attr scan is enough for report-level counters. If a future report is non-conformant, fail closed with clear error (do not "best effort" invent coverage).

**GateRequest gap:** current `GateRequest` has no `evidencePath`. Do **not** expand the published JSON Schema this milestone unless required. Prefer:

1. Adapter constructor/options: `{ reportPath?: string; threshold?: number; projectRoot: string }`
2. Or env `GOVERNANCE_COVERAGE_REPORT` / config under `.planning/governance/` later

Hook wiring: `verifyGateHook({ adapterName: "coverage-report", ... })` when selected rules include binding coverage enforcement — or always available in `ADAPTERS` and selected by name from rule `enforcement` field in a later plan. Minimal v4: implement adapter + unit tests; wire when verify consumes `enforcement` (may be thin glue).

### 3. Starter examples (not selected, not indexed)

| Location | Content | Why here |
|----------|---------|----------|
| `examples/java-spring-starter/` (repo root) | Folder layout + **thin** `.java` reference snippets (ports/adapters, command/query, domain entity, REST controller shell, Kafka listener shell, WSO2 outbound client port) | Outside `aidlc-rules/` → never enters `buildIndex` / selection / injection |
| `docs/examples/java-spring.md` | Index doc linking layout + how LLM should mirror | Human/LLM discoverability without context injection |
| Rule `detailPath` files under `aidlc-rules/.../details/` | Short prose + path pointers to `examples/...` | Lazy load only when `rule-detail` asked; keep snippets out of summary injection |

**Anti-pattern:** putting multi-file Spring projects under `aidlc-rules/**` or setting `detailPath` to large example trees (bloat + pack-root coupling).

## Installation

```bash
# v4.0: no new npm dependencies required for rule packs, examples, or coverage parser.
# Existing deps already cover frontmatter + gates:
#   ajv@8.20.0 ajv-formats@3.0.1 gray-matter@4.0.3 picomatch@4.0.5

# Consumer Java projects (NOT this overlay repo) generate reports with their own toolchain:
#   Maven:  jacoco-maven-plugin → target/site/jacoco/jacoco.xml
#   Gradle: jacoco → build/reports/jacoco/test/jacocoTestReport.xml
```

If full XML DOM ever required (not recommended for JaCoCo counters):

```bash
# LAST RESORT only — prefer stdlib
npm install fast-xml-parser@5.9.3
# CJS: require('fast-xml-parser') via package exports require → ./lib/fxp.cjs
# Legacy pin: fast-xml-parser@4.5.7 (dist-tag legacy)
```

## Alternatives Considered

| Recommended | Alternative | Why not (for v4) |
|-------------|-------------|------------------|
| Zero-dep JaCoCo/LCOV scan | `fast-xml-parser@5.9.3` | Extra dep + strnum/entities surface; report counters don't need DOM |
| Zero-dep scan | `xml2js@0.6.2` / `@xmldom/xmldom@0.9.x` | Heavier; CJS/ESM churn; no benefit for attribute counters |
| Zero-dep scan | Shell out to `xmllint` / Java | Breaks Windows/portability; pulls Java into overlay CI |
| `coverage-report` GateAdapter | Generic exit-code only (`generic-exit-ci`) | Exit code alone loses % evidence in audit; real parser is the milestone point |
| Rules in existing frontmatter format | New rule DSL / JSON rules | Breaks shipped index/select/inject; YAGNI |
| Examples under `examples/` | Embed Spring Boot app in npm package | Violates "overlay stays TS"; ships wrong toolchain |
| LINE coverage >70% | Instruction/branch as primary | LINE matches common bank CI gates; branch can be optional secondary later |

## What NOT to Add

| Avoid | Why | Use instead |
|-------|-----|-------------|
| Spring Boot / Spring Framework JARs in this repo | Wrong runtime; npm package is Node governance overlay | Thin `.java` snippets under `examples/` only |
| Maven / Gradle as runtime deps of overlay | Consumer owns build; overlay only **reads** report files | Document consumer plugin paths |
| JDK / `JAVA_HOME` requirement for overlay tests | Breaks Node-only CI | Fixture XML/LCOV files in `test/fixtures/` |
| `fast-xml-parser` / `xml2js` / `sax` for v4 | Stdlib sufficient for JaCoCo counters + LCOV | Pure TS parser modules under `src/enforcement/coverage/` |
| OPA/Rego, GitHub Actions as enforcement core | Still tool-agnostic constraint | `GateResult` + adapter |
| Embeddings for rule selection | Auditability + determinism | Existing trigger/scope engine |
| Forking GSD Core | Upgrade-safe overlay constraint | `GateAdapter` + rule packs + hooks |
| Putting starters inside `aidlc-rules/` | Selection/index pollution risk | `examples/` + docs links |
| Injecting full starter sources into context | Anti-bloat premise | Summaries only; `rule-detail` / open example on demand |
| Raising Node engines above GSD floor | Portability | Stay `>=22` |
| Expanding gate JSON Schema for paths unless proven needed | Schema churn across consumers | Adapter options / env / fixed conventions first |

## Integration Points (existing boundary)

```
Consumer CI
  → produces jacoco.xml | lcov.info
coverage-report GateAdapter.evaluate(GateRequest)
  → read report (stdlib) → % vs 0.70 → GateResult
runAdapter(adapter, request)          # Ajv hard-fail + gateId/evaluatedBy check
verifyGateHook({ adapterName: "coverage-report" })
  → writeGateEvidence(.planning/governance/gates/{NN}-verify.json)
shipGateHook                          # fail-closed on prior evidence (unchanged)
```

Rule authoring path (unchanged machinery):

```
aidlc-rules/domain/java-spring/*.md
  → gray-matter + frontmatter.schema.json
  → buildIndex → rule-index.json (body-free)
  → select() → summary injection
  → rule-detail <id> → detailPath under pack root
```

## Stack Patterns by Variant

**If consumer is Maven JaCoCo default layout:**
- Default report path `target/site/jacoco/jacoco.xml`
- LINE counter at report level

**If consumer is Gradle JaCoCo:**
- Default `build/reports/jacoco/test/jacocoTestReport.xml` (confirm per project; allow override)

**If only LCOV available (multi-lang monorepo):**
- Parse `LF`/`LH`; same threshold contract

**If report missing at verify:**
- Adapter returns `fail` + finding `coverage-report-missing` — fail closed (do not pass on absent evidence)

**If need DOM XML later (malformed nesting, non-JaCoCo):**
- Add `fast-xml-parser@5.9.3` behind the same pure function interface; keep GateResult mapping unchanged

## Version Compatibility

| Piece | Compatible with | Notes |
|-------|-----------------|-------|
| Coverage adapter | `GateAdapter` / `runAdapter` as shipped Phase 7 | `evaluatedBy` must equal adapter `name` |
| Binding rule `enforcement: coverage-report` | frontmatter schema (string minLength 1) | Free-form contract id — no schema change |
| `detailPath` examples pointers | Pack-root traversal guard | Example trees stay **outside** pack; details only link |
| Node ≥22 stdlib parse | Node 22–24 | No `node:xml` dependency |
| `fast-xml-parser@5.9.3` (opt) | CJS via `exports.require` → `lib/fxp.cjs` | Only if stdlib abandoned |
| Consumer JaCoCo | jacoco-maven-plugin / Gradle jacoco | Overlay does not pin Java plugin versions |

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| No new deps for rules/examples | HIGH | Format + docs already shipped |
| Stdlib JaCoCo/LCOV parse | HIGH | Local fixture proof: last-wins counters → 80% LINE; LCOV LF/LH sum |
| Adapter plug-in path | HIGH | `adapters.ts` + `runAdapter` + `verifyGateHook` observed |
| Default consumer report paths | MEDIUM | Conventions vary by plugin version; make path configurable |
| fast-xml-parser latest | MEDIUM | npm `5.9.3` (2026-07-09); not needed for v4 |

## Sources

- In-repo: `package.json`, `src/enforcement/adapters.ts`, `src/enforcement/run-adapter.ts`, `src/enforcement/types.ts`, `src/governance/verify-gate-hook.ts`, `src/rules/detail-path.ts`, `src/index/build.ts`, `src/schema/frontmatter.schema.json`, `docs/rule-authoring.md`, `aidlc-rules/enterprise/require-mfa.md` — HIGH
- Node runtime check: no `node:xml`; Node v24.14.0 — HIGH
- Local zero-dep parse proof on sample JaCoCo/LCOV — HIGH
- npm registry: `fast-xml-parser@5.9.3` (main/exports CJS), legacy `4.5.7`; `xml2js@0.6.2`; `@xmldom/xmldom@0.9.10` — MEDIUM (queried 2026-07-09)
- `.planning/PROJECT.md` v4.0 goals (coverage >70%, Java/Spring conventions, WSO2 boundary) — HIGH

---
*Stack research delta for: v4.0 Developer Coding Conventions*
*Researched: 2026-07-09*
*Prior stack (v1–v3): see git history of this file @ 2026-07-05 — still authoritative for base runtime*
