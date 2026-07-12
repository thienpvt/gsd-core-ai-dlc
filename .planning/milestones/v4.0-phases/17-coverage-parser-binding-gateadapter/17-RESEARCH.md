# Phase 17: Coverage Parser + Binding GateAdapter - Research

**Researched:** 2026-07-12
**Domain:** Coverage report parsing (JaCoCo XML, LCOV) + binding GateAdapter integrated through existing enforcement seam
**Confidence:** HIGH

## Summary

Phase 17 adds the first real (non-stub) GateAdapter to the enforcement layer. The existing `src/enforcement/` module ships a clean, narrow contract: `GateAdapter.evaluate(request) → GateResult`, validated through `runAdapter()` against the JSON-Schema gate-result contract. The coverage adapter slots in alongside the seven no-op/echo stubs without widening `GateRequest`, and routes its result through the same `runAdapter()` boundary so schema-invalid output remains a hard failure.

Two parser formats are in scope: JaCoCo XML (consumer Java/Maven primary) and LCOV (portable secondary). Both are line-coverage-only at the binding layer. JaCoCo's hierarchical counter tree repeats the LINE counter at method/class/sourcefile/package/report levels — the root `<report><counter type="LINE" missed="N" covered="N"/>` is the only safe aggregate; summing descendant counters double-counts `[ASSUMED]`. LCOV summarizes per-record via `LF`/`LH` pairs, which aggregate cleanly across `end_of_record` blocks `[ASSUMED]`.

The binding rule (`java-spring-unit-line-coverage`) must classify as `binding`, declare `enforcement: coverage-report`, and select on Java production paths while excluding test/generated/build paths to avoid a circular coverage obligation. Failure findings must contain the rule id token so the existing `deriveRuleGateStatuses()` regex marks the rule failed.

**Primary recommendation:** Ship parser functions as pure `({covered, total})` exports, wrap them in a factory-built adapter named `coverage-report`, and register it in a new map (or composed registry) that leaves `STUB_NAMES`/`ADAPTERS`/`ECHO_ADAPTERS` seven-entry contracts untouched. Fail-closed on every error class via a valid `GateResult` with `status: "fail"`; let only adapter programming faults throw through `runAdapter()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Binding Rule Contract**
- One rule under `aidlc-rules/domain/java-spring/`: id `java-spring-unit-line-coverage`, heading `## Rule JS-COV-01: Unit Line Coverage`.
- `classification: binding`, `enforcement: coverage-report`, `severity: high`, `phases: [construction]`.
- Require unit-test line coverage ≥ 70% for new/changed consumer Java production behavior.
- Select on `taskType` feature/bugfix/refactor plus tight Java production paths. Exclude docs, test-only, test/generated/build paths.
- Injected summary one sentence; format/measurement explanation behind `detailPath`; BODY_CANARY quarantine proof.

**Measurement Boundary**
- Only binding metric: aggregate **line** coverage. Branch/instruction/method/class out of scope (`JAVA-COV-04` future).
- Threshold: exact integer cross-multiplication `covered * 100 >= total * 70`. Exactly 70% passes.
- JaCoCo: single report-root `<counter type="LINE" missed="…" covered="…"/>`. Do NOT sum package/class/method counters (hierarchy repeats → double-count).
- LCOV: aggregate `LF`/`LH` across all `end_of_record` records. Reject duplicate `LF`/`LH` within a record, incomplete records, inconsistent totals (`LH > LF`). Do not combine `DA` lines with summary counters.
- Syntactically valid report with `total === 0` fails closed (no measurable production-line evidence).
- Exclusions are producer-owned. Adapter evaluates exactly the supplied report boundary.

**Parser & Format Contract**
- Pure parser functions returning `{ covered, total }`, plus an adapter factory configured at construction time. Do not widen the published `GateRequest` schema.
- Adapter name exactly `coverage-report`; register alongside, not inside, the locked seven-stub set. `STUB_NAMES` and `ECHO_ADAPTERS` remain seven-entry stub-only contracts.
- Factory input: `projectRoot`, `reportPath`, optional `format: "jacoco" | "lcov"`. Resolve relative report paths against `projectRoot`.
- Format omission: infer only from unambiguous suffixes (`.xml` → JaCoCo, `.info`/`.lcov` → LCOV). Unknown suffix fails closed; no content-sniffing.
- Report target must stay under canonical `projectRoot`, including symlink resolution. Reject absolute/relative traversal escapes, directories, unreadable files, oversized input before parsing. Freeze a small explicit size ceiling in implementation/tests; no streaming parser.
- XML support narrow and report-specific: locate/validate report-root LINE counter; reject missing/duplicate/non-integer/negative/unsafe-integer attributes and malformed structure. No general XML parser, DOM, entities, DTD.

**Fail-Closed Gate Evidence**
- Missing/unreadable/out-of-root/unsupported-format/oversized/malformed/zero-line/below-threshold reports return a **valid `GateResult` with `status: "fail"`**, not an exception.
- Adapter programming faults may still throw. Schema-invalid results hard-fail in `runAdapter()` and must never be persisted.
- Every coverage failure finding id must contain the rule id `java-spring-unit-line-coverage` so `deriveRuleGateStatuses()` marks the rule failed. One stable finding id for the binding result; reason in `message`.
- Failure finding severity `high`, matching the rule. Evidence points to the configured project-relative report path when a safe in-project path exists.
- Passing reports return `status: "pass"` and no findings. No waived outcomes.
- Phase 17 tests must invoke the real adapter via `runAdapter()` to prove output-schema and adapter-identity validation. Direct parser tests for format edge cases.

**Test & Fixture Contract**
- Focused fixtures for JaCoCo and LCOV: exactly 70% pass, below 70% fail, malformed, zero-line, format-specific aggregation/duplication cases.
- Missing-file and path-containment tests, plus a `runAdapter()` integration assertion for schema-valid pass/fail results.
- Real-corpus rule suite assertion: binding metadata, selective triggers/excludes, lazy detail/body quarantine, inventory growth 10 → 11.
- Zero new npm dependencies. No Maven/Gradle/JDK/shell execution. `node:test`, `node:assert/strict`, repo-local fixtures.

### Claude's Discretion
- Exact production filenames under `src/enforcement/` and fixture directory layout.
- Exact safe report-size ceiling, provided explicit and tested.
- Exact wording of failure messages and detail prose.
- Whether the real adapter registry is exported as a separate map or composed registry, provided the seven-stub contract remains unchanged and Phase 18 can configure `coverage-report` without dynamic loading.

### Deferred Ideas (OUT OF SCOPE)
- Report-path configuration surface and consumer defaults → Phase 18.
- Automatic `verifyGateHook` selection of `coverage-report` when binding rule applies → Phase 18.
- Consumer JaCoCo/LCOV production commands and docs entrypoint links → Phase 18.
- Branch coverage → future `JAVA-COV-04`.
- Changed-lines-only coverage, per-module thresholds, Maven/Gradle invocation, streaming XML, dynamic adapter loading → future work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JAVA-COV-01 | Binding rule requires unit-test line coverage ≥ 70% for new/changed consumer Java work (`classification: binding`, `enforcement: coverage-report`) | "Binding rule authoring" section — frontmatter shape, triggers/excludes, inventory bump 10 → 11; mirrors existing `java-spring-*` rule pattern |
| JAVA-COV-02 | Real `coverage-report` GateAdapter parses consumer JaCoCo XML (primary) and LCOV (secondary) via Node stdlib only; emits schema-valid `GateResult` | "Adapter design" section — factory pattern, pure parsers, stdlib-only XML/LCOV handling, `runAdapter()` validation contract |
| JAVA-COV-03 | Missing report or line coverage < 70% fails closed at verify (blocks ship when coverage evidence required) | "Fail-closed matrix" section — every error class maps to a valid fail `GateResult`; `deriveRuleGateStatuses()` regex requires rule id in finding id |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

| Directive | Source | Phase 17 Compliance |
|-----------|--------|---------------------|
| Node.js >=22 / TypeScript / CJS-only | CLAUDE.md Stack | New `src/enforcement/coverage-*.ts` files compile via existing `tsc -p tsconfig.build.json`; CJS `require()` only |
| No bundler (tsc-only) | CLAUDE.md Stack | Plain TS source — no bundler imports |
| No new runtime deps; reuse `js-yaml` before adding | CLAUDE.md Alternatives | Zero deps added (CONTEXT locked) — parsers are stdlib regex/line-based |
| JSON Schema (draft 2020-12) + Ajv for contracts | CLAUDE.md Stack | Existing `validate-gate-result.ts` already enforces; no new schema needed |
| `node:test` + `c8` (no jest/vitest) | CLAUDE.md Dev Tools | Tests use `node:test` + `node:assert/strict` — matches every existing `*.test.ts` |
| Engine-neutral, vendor names only in rule content | CLAUDE.md Constraints | JaCoCo/LCOV are format names (not vendor product strings); no Maven/JDK in `src/` |
| Markdown advisory; binding enforcement via real adapters | CLAUDE.md Enforcement | This phase IS the binding adapter — exactly the contract CLAUDE.md mandates |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Coverage report parsing (JaCoCo/LCOV) | Enforcement layer (`src/enforcement/`) | — | Pure parser functions colocated with adapter; enforcement owns adapter contracts per existing pattern |
| GateResult emission + validation | Enforcement layer (`runAdapter` boundary) | — | `runAdapter()` already the mandatory output-validation/identity seam — must not be bypassed |
| Binding rule authoring + selection | Rule pack (`aidlc-rules/domain/java-spring/`) | Selection engine (frozen) | Rule content lives in pack; selection uses shipped engine (Phase 13+ pattern) |
| Finding → rule status mapping | Governance layer (`verify-gate-hook`) | — | Existing `deriveRuleGateStatuses()` regex — Phase 17 must emit compatible finding IDs, no hook changes |
| Report path configuration | — | Phase 18 (deferred) | CONTEXT explicitly defers all path config + auto-selection wiring |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | >=22.0.0 | Runtime (existing) | Matches GSD Core engines; stdlib XML/line parsing sufficient — no JaCoCo/LCOV npm package needed |
| TypeScript | ^6.0.3 | Type safety (existing) | Same compiler/tsconfig as rest of `src/enforcement/` |
| `node:fs` (realpathSync, statSync, readFileSync) | stdlib | File boundary checks + bounded read | Existing pattern in `detail-path.ts` (realpath canonicalization) and `load.ts` (readFileSync) |
| `node:path` | stdlib | Containment math | Mirror `detail-path.ts` approach for project-root containment |
| `node:test` + `node:assert/strict` | stdlib | Test framework | Every `*.test.ts` in repo uses this |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `runAdapter` (existing) | — | Wrap adapter.evaluate with schema + identity validation | Every test that exercises the real adapter MUST route through this |
| `validateGateResult` (existing) | — | Asserts GateResult schema validity | Called inside runAdapter; direct tests may also use for explicit assertion |

### No New Dependencies
**Zero new npm deps** (CONTEXT locked). JaCoCo XML parsing uses narrow regex/substring extraction against the report-root counter only — NOT a general XML parser. LCOV parsing is line-based `split('\n')` over `SF`/`DA`/`LF`/`LH`/`end_of_record` tokens. Both are bounded, line-oriented formats on a size-ceilinged input; a streaming parser or npm package would be over-engineering.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex/substring JaCoCo root-counter extraction | `fast-xml-parser` / `sax` | Adds dep for one attribute lookup; CONTEXT forbids. Narrow regex on a size-capped file is auditable and sufficient |
| Manual LCOV line parser | `lcov-parse` npm | Adds dep; CONTEXT forbids. LCOV record format is simple line-oriented key:value |
| Widening `GateRequest` to carry report path | Factory closure | CONTEXT explicitly forbids schema widening; factory input captures config at construction |

## Package Legitimacy Audit

**No new packages installed in this phase.** The phase adds zero runtime or dev dependencies. All functionality uses Node.js stdlib (`node:fs`, `node:path`, `node:test`, `node:assert/strict`) and existing project dependencies (`ajv`, `ajv-formats` via the existing `validate-gate-result.ts` seam).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none added) | — | — | — | — | — | N/A |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious:** none

## Architecture Patterns

### System Architecture Diagram

```
                    Consumer (Java project)
                           │
                           │  produces via Maven/Gradle (out of scope P17)
                           ▼
                ┌────────────────────────┐
                │  JaCoCo XML / LCOV file │  (already on disk)
                └───────────┬────────────┘
                            │
                            │  factory input: { projectRoot, reportPath, format? }
                            ▼
        ┌───────────────────────────────────────────┐
        │  createCoverageAdapter(factory config)     │
        │  ├── resolve+contain reportPath            │
        │  │   (projectRoot realpath containment)    │
        │  ├── bound size; reject dir/unreadable     │
        │  ├── infer format from suffix if omitted   │
        │  └── build closure → GateAdapter           │
        └───────────────────┬───────────────────────┘
                            │
                            │  GateRequest (verify gate)
                            ▼
        ┌───────────────────────────────────────────┐
        │  adapter.evaluate(request)                 │
        │  ├── read bounded file                     │
        │  ├── dispatch format → parse function      │
        │  │   ├── parseJacoco(xml) → {covered,total}│
        │  │   └── parseLcov(text)  → {covered,total}│
        │  ├── compare: covered*100 >= total*70?     │
        │  └── return GateResult (pass/fail)         │
        └───────────────────┬───────────────────────┘
                            │
                            │  validated + identity-checked
                            ▼
                   ┌──────────────────┐
                   │   runAdapter()    │  (existing seam)
                   │   ├── assertGateResult(schema)
                   │   ├── gateId match
                   │   └── evaluatedBy === adapter.name
                   └────────┬─────────┘
                            │
                            ▼
            (Phase 18: verifyGateHook selects adapter;
             derives rule statuses via finding-id regex)
```

### Recommended Project Structure

```
src/enforcement/
├── adapters.ts                 # EXISTING — 7 stubs, STUB_NAMES — UNCHANGED
├── run-adapter.ts              # EXISTING — validation seam — UNCHANGED
├── validate-gate-result.ts     # EXISTING — schema gate — UNCHANGED
├── types.ts                    # EXISTING — GateResult etc. — UNCHANGED
├── coverage-report.ts          # NEW — adapter factory + registry export
├── coverage-report.test.ts     # NEW — runAdapter integration + fail-closed matrix
├── parse-jacoco.ts             # NEW — pure parser: string → {covered,total}
├── parse-jacoco.test.ts        # NEW — root-counter + edge cases
├── parse-lcov.ts               # NEW — pure parser: string → {covered,total}
└── parse-lcov.test.ts          # NEW — LF/LH aggregation + edge cases

aidlc-rules/domain/java-spring/
├── java-spring-unit-line-coverage.md          # NEW — binding rule
└── details/
    └── java-spring-unit-line-coverage-detail.md # NEW — measurement contract detail

test/fixtures/coverage/
├── jacoco/
│   ├── pass-70.xml             # exactly 70% (covered*100 == total*70)
│   ├── fail-below-70.xml       # <70%
│   ├── zero-lines.xml          # total=0 → fail closed
│   ├── malformed.xml           # structure error → fail
│   ├── duplicate-root-line.xml # two root LINE counters → fail
│   └── negative-counter.xml    # missed<0 or covered<0 → fail
└── lcov/
    ├── pass-70.info            # exactly 70%
    ├── fail-below-70.info      # <70%
    ├── zero-lines.info         # LF=0 across all records → fail closed
    ├── malformed.info          # unterminated record → fail
    ├── duplicate-lf.info       # two LF in one record → fail
    └── lh-gt-lf.info           # LH>LF → inconsistent → fail

src/select/
└── java-spring-coverage.test.ts # NEW — binding metadata, triggers/excludes, BODY_CANARY
```

### Pattern 1: Adapter Factory Closure (config injection without schema widening)

**What:** The adapter receives `projectRoot`/`reportPath`/`format` at construction time via a factory, closing over them. `evaluate(request)` only uses `request.gateId` for the result echo — no `GateRequest` schema change.
**When to use:** Any real adapter that needs local config that should NOT leak into the vendor-neutral `GateRequest` contract.

```typescript
// Source: pattern inferred from src/enforcement/adapters.ts + CONTEXT.md decision
import type { GateAdapter } from "./adapters.js";
import type { GateRequest, GateResult } from "./types.js";
import { resolveReportPath } from "./coverage-paths.js";
import { parseJacoco } from "./parse-jacoco.js";
import { parseLcov } from "./parse-lcov.js";

export interface CoverageAdapterConfig {
  projectRoot: string;
  reportPath: string;
  format?: "jacoco" | "lcov";
}

export function createCoverageAdapter(
  config: CoverageAdapterConfig,
): GateAdapter {
  return {
    name: "coverage-report",
    async evaluate(request: GateRequest): Promise<GateResult> {
      // ... path resolution, format inference, bounded read, parse, compare ...
      return {
        gateId: request.gateId,
        status: /* pass|fail */,
        findings: /* [] on pass, [binding-finding] on fail */,
        evaluatedBy: "coverage-report",
        evaluatedAt: new Date().toISOString(),
      };
    },
  };
}
```

### Pattern 2: Fail-Closed GateResult (no thrown parse error)

**What:** Every error class (missing/unreadable/out-of-root/unknown-format/oversized/malformed/zero-lines/below-threshold) returns a valid `GateResult` with `status: "fail"` and one finding carrying the rule id token. Only adapter programming faults throw.
**When to use:** Whenever a binding gate needs durable, reviewable failure evidence in the audit trail — `runAdapter` consumers persist the result, not the exception.

```typescript
function failResult(
  gateId: GateId,
  ruleId: string,
  message: string,
  evidencePath?: string,
): GateResult {
  return {
    gateId,
    status: "fail",
    findings: [
      {
        // Finding id contains the rule id token so deriveRuleGateStatuses()
        // regex (^|[^A-Za-z0-9])<ruleId>($|[^A-Za-z0-9]) matches.
        id: `${ruleId}:coverage-report`,
        severity: "high",
        message,
        ...(evidencePath ? { evidence: { path: evidencePath } } : {}),
      },
    ],
    evaluatedBy: "coverage-report",
    evaluatedAt: new Date().toISOString(),
  };
}
```

### Pattern 3: Pure Parser Functions (format edge cases isolated)

**What:** Parsers are pure `(input: string) → { covered: number, total: number }` (or throw on malformed input — the adapter catches and turns into failResult). Parser tests directly exercise format edge cases without the adapter/runAdapter wrapping.
**When to use:** Always for format-specific logic — keeps the adapter thin and lets format tests stay focused.

```typescript
// parse-jacoco.ts — narrow regex on the report root only
export interface LineCounter { covered: number; total: number; }
export function parseJacoco(xml: string): LineCounter {
  // Match the report-root <counter type="LINE" missed="N" covered="N"/>
  // Must be the direct child of <report> (root level), NOT nested in
  // package/class/method/sourcefile. Reject duplicate root LINE counters.
  // (Implementation detail: locate </report>-adjacent counters or use a
  // stack-free scan for the root element's direct counter children.)
  // ...
}

// parse-lcov.ts — aggregate LF/LH across records
export function parseLcov(text: string): LineCounter {
  let covered = 0, total = 0;
  let inRecord = false;
  let recordLf: number | null = null;
  let recordLh: number | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("SF:")) { inRecord = true; recordLf = null; recordLh = null; }
    else if (line.startsWith("LF:")) {
      if (recordLf !== null) throw new Error(`duplicate LF in record`);
      recordLf = parseNonNegInt(line.slice(3));
    }
    else if (line.startsWith("LH:")) {
      if (recordLh !== null) throw new Error(`duplicate LH in record`);
      recordLh = parseNonNegInt(line.slice(3));
    }
    else if (line === "end_of_record") {
      if (!inRecord || recordLf === null || recordLh === null)
        throw new Error(`incomplete record`);
      if (recordLh > recordLf) throw new Error(`LH > LF inconsistent`);
      total += recordLf; covered += recordLh;
      inRecord = false;
    }
  }
  if (inRecord) throw new Error(`unterminated record (missing end_of_record)`);
  return { covered, total };
}
```

### Anti-Patterns to Avoid

- **Summing JaCoCo non-root counters:** The LINE counter repeats at method/class/sourcefile/package/report levels. Summing any level other than root double-counts because parent counters already include child lines `[ASSUMED]`.
- **Mixing LCOV `DA` with `LF`/`LH`:** `DA` lines are the raw per-line execution counts; `LF`/`LH` are the record summary. Aggregating `DA` directly while also using `LF`/`LH` double-counts. CONTEXT explicitly forbids.
- ** Throwing on missing file / malformed report:** Violates fail-closed evidence contract. The verify/ship path needs a durable `GateResult` to block, not an exception that may or may not be caught upstream.
- **Widening `GateRequest` to carry reportPath:** Breaks the vendor-neutral contract and forces every adapter to ignore the field. Use a factory closure.
- **Reusing `STUB_NAMES`/`ADAPTERS`/`ECHO_ADAPTERS` to carry `coverage-report`:** Violates CONTEXT — those are stub-only contracts locked at 7 entries. Add a separate export.
- **Floating-point percent comparison:** `0.7 * total` introduces rounding; exactly-70% boundary becomes ambiguous. Use `covered * 100 >= total * 70` integer cross-multiplication.
- **General XML parser / DOM / entity processing:** Over-broad attack surface; CONTEXT forbids. Narrow regex/scan for the report-root LINE counter only.
- **Content-sniffing format:** Ambiguous (LCOV and JaCoCo both have angle brackets in comments). Use suffix only; unknown suffix fails closed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GateResult schema validation | Custom shape checks | Existing `validateGateResult` via `runAdapter()` | Already the mandatory boundary; hardens against malformed adapter output |
| Path containment (symlink-safe) | New traversal logic | Mirror `detail-path.ts` pattern (lexical check + `realpathSync` canonicalization) | CR-01 symlink-bypass mitigation is already proven; reinventing risks the same gap |
| Finding → rule mapping | New regex | Existing `deriveRuleGateStatuses()` | Uses `(^|[^A-Za-z0-9])<ruleId>($|[^A-Za-z0-9])` — finding id just needs to contain the rule id as a token |
| Test framework / assertions | New harness | Existing `node:test` + `node:assert/strict` | Every `*.test.ts` uses this; `pretest` builds via existing `build:test` |

**Key insight:** Phase 17's riskiest work (symlink containment, schema validation, finding-to-rule mapping, adapter validation seam) is already done in shipped modules. Phase 17 wires through them, not around them.

## Runtime State Inventory

Step 2.5: SKIPPED — Phase 17 is additive (new files only). No rename/refactor/string-replacement. No stored data, live service config, OS-registered state, secrets, or build artifacts carry the old name. Existing `STUB_NAMES`/`ADAPTERS`/`ECHO_ADAPTERS` are deliberately unchanged.

## Common Pitfalls

### Pitfall 1: JaCoCo Counter Hierarchy Double-Counting
**What goes wrong:** Summing LINE counters across `<package>` or `<class>` levels yields 2-5x the true line count.
**Why it happens:** JaCoCo repeats the counter element at every level of the hierarchy; each parent counter already includes all child lines.
**How to avoid:** Locate the single `<report>` direct-child `<counter type="LINE">`. Reject if 0 or >1 root LINE counters.
**Warning signs:** Suspiciously high `total` (e.g. 10k lines for a 2k-line module); pass percentage >100%.

### Pitfall 2: LCOV DA/LF/LH Confusion
**What goes wrong:** Aggregating `DA` counts alongside `LF`/`LH` either double-counts or yields mismatched totals.
**Why it happens:** `DA` lines are raw per-line execution counts (one per source line); `LF`/`LH` are the per-record summary already computed by the producer.
**How to avoid:** Use `LF`/`LH` exclusively — they're the portable summary contract. Reject duplicate `LF` or `LH` within a record. Reject incomplete records (record without `end_of_record`). Reject `LH > LF`.
**Warning signs:** Totals differ between two valid LCOV producers for the same code.

### Pitfall 3: Floating-Point 70% Boundary
**What goes wrong:** `covered / total >= 0.7` produces different accept/reject decisions across JS engines for edge cases like 7/10, 14/20.
**Why it happens:** IEEE-754 division introduces representational error; 0.7 itself is not exactly representable.
**How to avoid:** `covered * 100 >= total * 70` — pure integer arithmetic. Exactly 70% (e.g. 7/10) passes.
**Warning signs:** Test flapping on exactly-threshold fixtures.

### Pitfall 4: Schema-Invalid GateResult From Fail-Closed Path
**What goes wrong:** Adapter returns a fail result missing `evaluatedAt` or with `gateId` that doesn't match request, and `runAdapter()` throws — masking the real coverage failure.
**Why it happens:** Fail-closed paths are hand-built; easy to forget a required field.
**How to avoid:** Centralize via a `failResult(gateId, ruleId, message, evidencePath?)` helper. Every fail path routes through it. Test that `runAdapter()` accepts every fail variant.
**Warning signs:** Tests fail with `invalid gate-result` instead of asserting `status === "fail"`.

### Pitfall 5: Finding ID Without Rule Token
**What goes wrong:** Coverage fails but `deriveRuleGateStatuses()` doesn't mark the binding rule as failed — ship proceeds.
**Why it happens:** The finding id regex `(^|[^A-Za-z0-9])java-spring-unit-line-coverage($|[^A-Za-z0-9])` requires the rule id as a delimited token; a finding id of just `coverage-failure` won't match.
**How to avoid:** Finding id must contain the rule id token. Use `${ruleId}:coverage-report` or similar.
**Warning signs:** Integration test shows rule status `pass` while result status is `fail`.

### Pitfall 6: STUB_NAMES / ADAPTERS Size Regression
**What goes wrong:** Adding `coverage-report` to `STUB_NAMES` (or `ADAPTERS`) breaks every test asserting size === 7.
**Why it happens:** Tempting to reuse the existing registry instead of a new export.
**How to avoid:** New export (`COVERAGE_ADAPTERS` map, or composed `REAL_ADAPTERS`). `STUB_NAMES`/`ADAPTERS`/`ECHO_ADAPTERS` stay locked at 7.
**Warning signs:** Existing `adapters.test.ts` "exactly 7 entries" test fails.

### Pitfall 7: Unbounded Read on Oversized Report
**What goes wrong:** Pathological or malicious 1GB report file exhausts memory.
**Why it happens:** `readFileSync` reads the whole file into memory.
**How to avoid:** `statSync` first; reject if `size > CEILING`. CONTEXT mandates a "small explicit size ceiling" — pick e.g. 8 or 16 MiB and freeze in tests. No streaming parser needed at this scale.
**Warning signs:** CI OOM on coverage gate runs.

### Pitfall 8: Symlink-Bypassed Containment
**What goes wrong:** `reportPath` is lexically inside `projectRoot` but a symlink points outside (`reports/symlinked.xml -> /etc/passwd`).
**Why it happens:** Lexical path checks don't follow links; `readFileSync` does.
**How to avoid:** `realpathSync(reportPath)` then check containment against `realpathSync(projectRoot)`. Already proven in `detail-path.ts` (CR-01).
**Warning signs:** Reading succeeds for a path that should be out-of-root.

## Code Examples

### JaCoCo XML Root Counter Extraction

```xml
<!-- Source: JaCoCo standard report format (jacoco.xml) -->
<report name="demo">
  <package name="com/example">
    <class name="Foo">
      <counter type="LINE" missed="2" covered="8"/>  <!-- NESTED — ignore -->
    </class>
    <counter type="LINE" missed="2" covered="8"/>      <!-- NESTED — ignore -->
  </package>
  <counter type="INSTRUCTION" missed="50" covered="150"/>
  <counter type="BRANCH" missed="3" covered="7"/>
  <counter type="LINE" missed="5" covered="15"/>        <!-- ROOT — use THIS -->
  <counter type="METHOD" missed="1" covered="4"/>
</report>
```

The root `<counter type="LINE" missed="5" covered="15"/>` gives `{covered: 15, total: 20}` = 75% pass.

### LCOV Record Structure

```
# Source: LCOV/geninfo spec (Linux Test Project)
TN:test_name
SF:src/main/java/com/example/Foo.java
DA:10,3
DA:11,0
DA:12,5
LF:3
LH:2
end_of_record
```

One record: `{LF: 3, LH: 2}`. Aggregate across all records for the project total.

### Exact Threshold Check

```typescript
// Source: CONTEXT.md "Measurement Boundary" decision
function meetsThreshold(covered: number, total: number): boolean {
  // Exactly 70% passes (integer cross-multiplication, no FP rounding).
  // covered=7, total=10: 7*100=700 >= 10*70=700 → true
  // covered=6, total=10: 6*100=600 >= 10*70=700 → false
  return covered * 100 >= total * 70;
}
```

### runAdapter Integration Test Shape

```typescript
// Source: inferred from src/enforcement/run-adapter.test.ts pattern
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAdapter } from "./run-adapter.js";
import { createCoverageAdapter } from "./coverage-report.js";
import type { GateRequest } from "./types.js";

const request: GateRequest = {
  gateId: "verify",
  phase: "construction",
  taskSignal: { taskType: "feature", keywords: [], paths: ["src/main/java/Foo.java"] },
  rules: [{
    id: "java-spring-unit-line-coverage",
    severity: "high",
    summary: "Unit-test line coverage must be ≥70%.",
    matchedAxis: "paths",
    matchedValue: "**/src/main/java/**",
  }],
  requestedAt: "2026-07-12T00:00:00.000Z",
};

test("runAdapter returns schema-valid pass for 70% report", async () => {
  const adapter = createCoverageAdapter({
    projectRoot: process.cwd(),
    reportPath: "test/fixtures/coverage/jacoco/pass-70.xml",
  });
  const result = await runAdapter(adapter, request);
  assert.equal(result.status, "pass");
  assert.equal(result.findings.length, 0);
  assert.equal(result.evaluatedBy, "coverage-report");
});

test("runAdapter returns schema-valid fail for missing report", async () => {
  const adapter = createCoverageAdapter({
    projectRoot: process.cwd(),
    reportPath: "test/fixtures/coverage/nonexistent.xml",
  });
  const result = await runAdapter(adapter, request);
  assert.equal(result.status, "fail");
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].id, /java-spring-unit-line-coverage/);
  assert.equal(result.findings[0].severity, "high");
});
```

### Binding Rule Frontmatter (mirror existing java-spring-* shape)

```markdown
---
id: java-spring-unit-line-coverage
scope: domain
triggers:
  taskType:
    - feature
    - bugfix
    - refactor
  paths:
    - "**/src/main/java/**"
    - "**/src/main/**/*.java"
  exclude:
    taskType:
      - docs
      - test
      - infra
    paths:
      - "**/src/test/**"
      - "**/generated/**"
      - "**/build/**"
      - "**/target/**"
phases:
  - construction
severity: high
summary: "New or changed Java production behavior requires unit-test line coverage ≥70% verified by a real coverage report."
classification: binding
enforcement: coverage-report
detailPath: details/java-spring-unit-line-coverage-detail.md
---

## Rule JS-COV-01: Unit Line Coverage

New or changed consumer Java production code requires aggregate unit-test line coverage of at least 70%, measured by a JaCoCo XML or LCOV report produced by the consumer's build. The binding gate fails closed when the report is missing, malformed, or below threshold.

### Verification

- Confirm a coverage report (JaCoCo XML or LCOV) is available at the configured path.
- Confirm aggregate line coverage ≥70% using exact-integer threshold (`covered*100 >= total*70`).
- Confirm reports with zero total lines fail closed.
- Confirm missing/malformed/out-of-root reports fail closed.

<!-- BODY_CANARY java-spring-unit-line-coverage -->
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stub-only adapter registry (7 no-ops) | Real `coverage-report` adapter alongside stubs | Phase 17 | First real enforcement evidence; binding rules now have a working contract |
| Advisory rules only (Phase 13-15) | First binding rule in pack | Phase 17 | `java-spring-unit-line-coverage` is the first `classification: binding` rule in `aidlc-rules/domain/java-spring/` |
| Inventory 10 winners | Inventory 11 winners | Phase 17 | `precedence.test.ts` and `starter-examples.test.ts` INVENTORY_COUNT assertions must update |

**Deprecated/outdated:**
- None in Phase 17 scope. Stub contracts deliberately preserved.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JaCoCo root `<report><counter type="LINE">` is the aggregate; child counters repeat the hierarchy and summing double-counts | Common Pitfalls #1, Code Examples | Would over-count total lines → pass/fail boundary wrong. Verify by inspecting a real JaCoCo XML in fixtures. |
| A2 | LCOV `LF`/`LH` are per-record summaries intended for aggregation; `DA` lines are per-source-line raw data | Common Pitfalls #2, Code Examples | Would double-count or mismatch totals. Verify by inspecting a real LCOV in fixtures. |
| A3 | `verify-gate-hook.ts` `deriveRuleGateStatuses()` is the only finding→rule mapping; no other consumer exists | Fail-Closed Gate Evidence, Pattern 2 | If another consumer exists, finding-id scheme may need to satisfy it too. Verified by grep — only `verify-gate-hook.ts` consumes findings. |
| A4 | The adapter will not be wired into `verifyGateHook` default selection in Phase 17 (Phase 18 owns that) | Architecture Diagram | CONTEXT explicitly defers — low risk. |
| A5 | Real `RuleIndex` winners count is exactly 10 today (9 java-spring + `require-mfa`) | Inventory Update | Verified in `precedence.test.ts` and `starter-examples.test.ts` (INVENTORY_COUNT=10). |

## Open Questions

1. **Exact safe size ceiling value**
   - What we know: CONTEXT mandates "small explicit size ceiling"; no streaming parser.
   - What's unclear: 1 MiB vs 8 MiB vs 16 MiB.
   - Recommendation: Claude's Discretion per CONTEXT — pick 8 MiB (covers real JaCoCo XML for ~500k LOC projects; well below memory pressure), freeze in tests.

2. **Exact production filename(s) under `src/enforcement/`**
   - What we know: CONTEXT gives Claude's Discretion.
   - What's unclear: Single `coverage-report.ts` with parsers inline vs. three files (adapter + two parsers).
   - Recommendation: Three files (`coverage-report.ts` + `parse-jacoco.ts` + `parse-lcov.ts`) for testability and parser-test isolation — mirrors the separation in existing `adapters.ts` + `run-adapter.ts` + `validate-gate-result.ts`.

3. **Registry export shape**
   - What we know: CONTEXT gives Claude's Discretion (separate map vs composed registry) provided seven-stub contract unchanged and Phase 18 can configure without dynamic loading.
   - What's unclear: `COVERAGE_ADAPTERS: ReadonlyMap<string, GateAdapter>` vs a composed `REAL_ADAPTERS` merging stubs + coverage.
   - Recommendation: Export `createCoverageAdapter` factory only (no static registry) — Phase 18 constructs with config; avoids any static map that could be mistaken for a stub peer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js >=22 | Build + tests | ✓ | Per `engines` | — |
| TypeScript ^6.0.3 | Build | ✓ | per package.json | — |
| `tsc -p tsconfig.build.json` | Production build | ✓ | existing script | — |
| `tsc -p tsconfig.json` | Test build (`build:test`) | ✓ | existing script | — |
| `node --test` | Test runner | ✓ | existing `test` script | — |
| Maven/JDK | (OUT OF SCOPE) | n/a | n/a | CONTEXT forbids — parsers consume already-produced files |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 22 built-in) + `node:assert/strict` |
| Config file | none (uses `package.json` scripts + built-in node:test discovery) |
| Quick run command | `npm run build && npm run build:test && node --test "dist-test/enforcement/parse-jacoco.test.js" "dist-test/enforcement/parse-lcov.test.js"` |
| Full suite command | `npm test` (= `pretest` + `node --test "dist-test/**/*.test.js"`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JAVA-COV-01 | Binding rule frontmatter (`classification: binding`, `enforcement: coverage-report`, `severity: high`, triggers/excludes, summary one sentence) | unit | `node --test "dist-test/select/java-spring-coverage.test.js"` | ❌ Wave 0 |
| JAVA-COV-01 | Inventory 10 → 11 (new rule is a winner, no collisions) | unit | `node --test "dist-test/index/precedence.test.js"` (update expected) | ✅ (exists, needs update) |
| JAVA-COV-01 | BODY_CANARY quarantine (body/detail not in index or inject) | unit | `node --test "dist-test/select/java-spring-coverage.test.js"` | ❌ Wave 0 |
| JAVA-COV-02 | JaCoCo root-counter parser: valid XML → `{covered, total}` | unit | `node --test "dist-test/enforcement/parse-jacoco.test.js"` | ❌ Wave 0 |
| JAVA-COV-02 | LCOV LF/LH parser: valid LCOV → `{covered, total}` | unit | `node --test "dist-test/enforcement/parse-lcov.test.js"` | ❌ Wave 0 |
| JAVA-COV-02 | `runAdapter()` integration: schema-valid pass result | integration | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-02 | Adapter name is `coverage-report`; factory closure config | unit | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | Missing report → fail GateResult (not throw) | integration | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | Below-70% report → fail GateResult with rule-id finding | integration | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | Exactly-70% report → pass GateResult | integration | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | Zero-line report → fail closed | unit + integration | `node --test "dist-test/enforcement/parse-jacoco.test.js" "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | Malformed/duplicate/inconsistent report → fail closed | unit | both parser tests | ❌ Wave 0 |
| JAVA-COV-03 | Path-containment rejection (symlink, traversal, absolute) | unit | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | Oversized report → fail closed | unit | `node --test "dist-test/enforcement/coverage-report.test.js"` | ❌ Wave 0 |
| JAVA-COV-03 | STUB_NAMES / ADAPTERS / ECHO_ADAPTERS remain 7-entry | regression | `node --test "dist-test/enforcement/adapters.test.js"` | ✅ (existing — must stay GREEN) |

### Sampling Rate
- **Per task commit:** `npm run build && npm run build:test && node --test "dist-test/enforcement/**/*.test.js" "dist-test/select/java-spring-coverage.test.js" "dist-test/index/precedence.test.js"`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/enforcement/parse-jacoco.ts` + `src/enforcement/parse-jacoco.test.ts` — covers JAVA-COV-02 parser
- [ ] `src/enforcement/parse-lcov.ts` + `src/enforcement/parse-lcov.test.ts` — covers JAVA-COV-02 parser
- [ ] `src/enforcement/coverage-report.ts` + `src/enforcement/coverage-report.test.ts` — covers JAVA-COV-02 adapter + JAVA-COV-03 fail-closed matrix
- [ ] `src/select/java-spring-coverage.test.ts` — covers JAVA-COV-01 binding metadata + triggers + BODY_CANARY + inventory 11
- [ ] `test/fixtures/coverage/jacoco/{pass-70,fail-below-70,zero-lines,malformed,duplicate-root-line,negative-counter}.xml`
- [ ] `test/fixtures/coverage/lcov/{pass-70,fail-below-70,zero-lines,malformed,duplicate-lf,lh-gt-lf}.info`
- [ ] Update `src/index/precedence.test.ts` expected winners 10 → 11
- [ ] Update `src/select/starter-examples.test.ts` INVENTORY_COUNT 10 → 11
- [ ] `aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md` + `details/java-spring-unit-line-coverage-detail.md`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth in adapter |
| V3 Session Management | no | n/a — no sessions |
| V4 Access Control | yes | Path containment (projectRoot + realpath canonicalization) — prevents arbitrary file read |
| V5 Input Validation | yes | All report attributes (missed/covered/LF/LH) validated as non-negative integers; format inferred from suffix only |
| V6 Cryptography | no | n/a |
| V7 Error Handling | yes | Fail-closed GateResult on every error class — no silent pass; adapter programming faults throw through runAdapter |
| V8 Data Protection | no | n/a — no persisted secrets |
| V12 Files & Resources | yes | Bounded file read (statSync size ceiling before readFileSync); symlink-safe containment; reject directories/unreadable |

### Known Threat Patterns for Coverage Gate

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Arbitrary file read via `reportPath` traversal (`../../etc/passwd`) | Tampering / Information Disclosure | `realpathSync` canonicalization + lexical containment check against `projectRoot` (mirror `detail-path.ts` CR-01) |
| Symlink escape (`reports/x.xml` → `/etc/passwd`) | Information Disclosure | realpath canonicalization of BOTH `reportPath` and `projectRoot` before containment check |
| Oversized report OOM | Denial of Service | `statSync().size > CEILING` rejection before readFileSync |
| Malformed XML entity expansion (billion laughs) | Denial of Service | No XML parser / no entity processing — narrow regex on root counter only |
| Path confusion via absolute `reportPath` | Tampering | Reject absolute paths; resolve relative to `projectRoot` only |
| Format-content sniffing ambiguity | Tampering | Suffix-only inference; unknown suffix fails closed |
| Silent pass on adapter fault | Elevation | Adapter programming faults throw through `runAdapter`; schema-invalid results hard-fail |

## Sources

### Primary (HIGH confidence)
- `src/enforcement/adapters.ts` — `GateAdapter` interface, `STUB_NAMES` (7 entries), `noopAdapter`/`echoAdapter` factory pattern, `ADAPTERS`/`ECHO_ADAPTERS` static registries (read directly)
- `src/enforcement/run-adapter.ts` — `runAdapter()` validation boundary: `validateGateResult` + gateId match + evaluatedBy match (read directly)
- `src/enforcement/validate-gate-result.ts` — Ajv draft 2020-12 schema validator; `x-binding` keyword registration; additionalProperties:false on finding/evidence (read directly)
- `src/enforcement/types.ts` — `GateRequest`, `GateResult`, `GateFinding`, `GateFindingEvidence` TS contracts (read directly)
- `src/schema/gate-result.schema.json` — binding JSON Schema (read directly)
- `src/rules/detail-path.ts` — established lexical + realpath containment pattern (CR-01 symlink mitigation) — the pattern to mirror for `reportPath` containment (read directly)
- `src/governance/verify-gate-hook.ts` — `deriveRuleGateStatuses()` finding-to-rule regex; default adapter selection (`generic-exit-ci`) — Phase 18 changes selection, not Phase 17 (read directly)
- `src/index/precedence.test.ts` line 120 — inventory lock: 10 winners (1 mfa + 9 java-spring) (read directly)
- `src/select/starter-examples.test.ts` line 19 — `INVENTORY_COUNT = 10` (read directly)
- `src/enforcement/adapters.test.ts` line 90 — "exactly 7 entries" assertion that must remain GREEN (read directly)
- `.planning/phases/17-coverage-parser-binding-gateadapter/17-CONTEXT.md` — locked decisions (authoritative)
- `package.json` — `engines`, scripts (`build`, `build:test`, `test`), dependencies (read directly)

### Secondary (MEDIUM confidence)
- JaCoCo XML report format — root `<counter type="LINE" missed covered>` as aggregate; hierarchy at method/class/sourcefile/package/report levels. `[ASSUMED]` per training knowledge; fixture in Phase 17 will verify. JaCoCo docs: https://www.jacoco.org/jacoco/trunk/doc/
- LCOV format — `DA`/`LF`/`LH`/`end_of_record` per-record structure; `LF`=lines found, `LH`=lines hit. `[ASSUMED]` per training knowledge; fixture in Phase 17 will verify. LCOV spec from geninfo man page (Linux Test Project).

### Tertiary (LOW confidence)
- None — all findings traced to codebase or CONTEXT.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps, all existing code read directly
- Architecture: HIGH — factory + pure parser pattern inferred directly from existing `adapters.ts` + `run-adapter.ts` + CONTEXT decisions
- Pitfalls: HIGH — all eight pitfalls traced to CONTEXT decisions or existing code comments
- JaCoCo/LCOV format specifics: MEDIUM — `[ASSUMED]` from training; fixtures will verify exact attribute/record semantics at implementation time

**Research date:** 2026-07-12
**Valid until:** 2026-08-11 (30 days; stable internal-codebase research, no external API surface)
