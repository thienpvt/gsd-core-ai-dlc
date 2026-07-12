# Phase 17: Coverage Parser + Binding GateAdapter - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 14 new + 2 modified
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/enforcement/coverage-report.ts` | adapter factory | request-response | `src/enforcement/adapters.ts` (`noopAdapter`/`echoAdapter` factory) | exact |
| `src/enforcement/coverage-report.test.ts` | integration test | request-response | `src/enforcement/run-adapter.test.ts` | exact |
| `src/enforcement/parse-jacoco.ts` | pure parser | transform | (new — no existing parser) | none |
| `src/enforcement/parse-jacoco.test.ts` | unit test | transform | `src/select/tokens.test.ts` (pure-function unit-test style) | role-match |
| `src/enforcement/parse-lcov.ts` | pure parser | transform | (new — no existing parser) | none |
| `src/enforcement/parse-lcov.test.ts` | unit test | transform | `src/select/tokens.test.ts` | role-match |
| `aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md` | binding rule | static | `aidlc-rules/domain/java-spring/java-spring-api-contract.md` | exact (same pack, shape) |
| `aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md` | rule detail | static | `aidlc-rules/domain/java-spring/details/java-spring-api-contract-detail.md` | exact |
| `src/select/java-spring-coverage.test.ts` | rule suite test | static | `src/select/java-spring-pack.test.ts` | exact |
| `test/fixtures/coverage/jacoco/*.xml` (6 files) | test fixture | static | `test/fixtures/precedence-store/**/*.md` (fixture pattern) | role-match |
| `test/fixtures/coverage/lcov/*.info` (6 files) | test fixture | static | `test/fixtures/eval/**/*.md` | role-match |
| `src/index/precedence.test.ts` (MODIFIED) | inventory regression | static | self (existing file — update `expectedIds` + winners count) | exact |
| `src/select/starter-examples.test.ts` (MODIFIED) | inventory regression | static | self (existing — update `INVENTORY_COUNT`) | exact |
| `src/enforcement/adapters.test.ts` (UNCHANGED — regression guard) | registry size | static | self (must stay GREEN at 7) | exact |

## Pattern Assignments

### `src/enforcement/coverage-report.ts` (adapter factory, request-response)

**Analog:** `src/enforcement/adapters.ts` lines 26-64 (`noopAdapter`/`echoAdapter` factory pattern)

**Imports pattern** (mirrors `adapters.ts` line 1 + sibling imports):
```typescript
import type { GateAdapter } from "./adapters.js";
import type { GateRequest, GateResult, GateId } from "./types.js";
import { realpathSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseJacoco } from "./parse-jacoco.js";
import { parseLcov } from "./parse-lcov.js";
```

**Factory closure pattern** — mirror `noopAdapter(name)` returning `{ name, evaluate }` (adapters.ts lines 26-39). Config injected at construction; `evaluate(request)` closes over config, does NOT read from `request` beyond `gateId`/`rules`:
```typescript
// Source: adapters.ts:26-39 — noopAdapter factory shape to copy
export function noopAdapter(name: string): GateAdapter {
  return {
    name,
    async evaluate(request: GateRequest): Promise<GateResult> {
      return {
        gateId: request.gateId,
        status: "pass",
        findings: [],
        evaluatedBy: name,
        evaluatedAt: new Date().toISOString(),
      };
    },
  };
}
```

**Adapter contract requirements** (all sourced from `adapters.ts` + `run-adapter.ts`):
- `name` MUST be exactly `"coverage-report"` (so `result.evaluatedBy === adapter.name` check passes in `run-adapter.ts` line 20-24).
- `evaluate` MUST be `async`, MUST return a `GateResult` with all 5 required fields (`gateId`, `status`, `findings`, `evaluatedBy`, `evaluatedAt`).
- `gateId` MUST equal `request.gateId` (or `run-adapter.ts` line 15-19 throws).
- `evaluatedAt` MUST match strict ISO-8601 pattern `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$` (per `gate-result.schema.json` line 32).
- Result MUST NOT contain stray keys — `additionalProperties: false` on root, finding, evidence (schema lines 7, 39, 54).

**Fail-closed result pattern** — all non-pass outcomes route through ONE helper:
```typescript
// Pattern: centralize every failure class — missing/unreadable/out-of-root/
// unknown-format/oversized/malformed/zero-lines/below-threshold — into a single
// failResult(gateId, ruleId, message, evidencePath?) function returning a valid GateResult.
function failResult(
  gateId: GateId,
  ruleId: string,
  message: string,
  evidencePath?: string,
): GateResult {
  return {
    gateId,
    status: "fail",
    findings: [{
      // CRITICAL: finding id MUST contain the rule id as a delimited token so
      // verify-gate-hook.ts:33-38 `findingMatchesRule` regex matches.
      // Pattern: `(^|[^A-Za-z0-9])<ruleId>($|[^A-Za-z0-9])`.
      // `${ruleId}:coverage-report` → token boundary on both sides ✓
      id: `${ruleId}:coverage-report`,
      severity: "high",
      message,
      ...(evidencePath ? { evidence: { path: evidencePath } } : {}),
    }],
    evaluatedBy: "coverage-report",
    evaluatedAt: new Date().toISOString(),
  };
}
```

**Pass result pattern** (zero findings, per `noopAdapter`):
```typescript
// Source: adapters.ts:30-37 — zero-findings pass shape
return {
  gateId: request.gateId,
  status: "pass",
  findings: [],
  evaluatedBy: "coverage-report",
  evaluatedAt: new Date().toISOString(),
};
```

**Threshold comparison pattern** — pure integer cross-multiplication, NO floating-point:
```typescript
// Source: CONTEXT.md "Measurement Boundary" — exact integer arithmetic
function meetsThreshold(covered: number, total: number): boolean {
  return covered * 100 >= total * 70; // exactly 70% passes (7/10: 700>=700 ✓)
}
```

**Pitfalls (from RESEARCH.md):**
- DO NOT add `coverage-report` to `STUB_NAMES`/`ADAPTERS`/`ECHO_ADAPTERS` — those stay locked at 7 (adapters.test.ts lines 90, 103, 108 assert exact size).
- DO NOT widen `GateRequest` to carry `reportPath` — factory closure captures config.
- DO NOT throw on missing/malformed/below-threshold — return valid `fail` `GateResult`.
- DO throw on adapter programming faults — `run-adapter.ts` test line 135-143 proves thrown errors propagate (NOT caught).
- Size ceiling: `statSync(path).size > CEILING` → fail-closed BEFORE `readFileSync`. CONTEXT: "small explicit". Freeze constant in tests.

---

### `src/enforcement/coverage-report.test.ts` (integration test, request-response)

**Analog:** `src/enforcement/run-adapter.test.ts` (lines 1-143) + `src/enforcement/adapters.test.ts` (lines 1-128)

**Imports pattern:**
```typescript
// Source: run-adapter.test.ts:1-5
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAdapter } from "./run-adapter.js";
import { createCoverageAdapter } from "./coverage-report.js";
import type { GateRequest } from "./types.js";
```

**runAdapter integration pattern** — every test MUST route through `runAdapter()`, not call `adapter.evaluate()` directly (proves schema + identity validation):
```typescript
// Source: run-adapter.test.ts:25-29
test("runAdapter returns schema-valid pass for 70% report", async () => {
  const adapter = createCoverageAdapter({
    projectRoot: process.cwd(),
    reportPath: "test/fixtures/coverage/jacoco/pass-70.xml",
  });
  const result = await runAdapter(adapter, makeValidGateRequest());
  assert.equal(result.status, "pass");
  assert.equal(result.findings.length, 0);
  assert.equal(result.evaluatedBy, "coverage-report");
});
```

**Valid `GateRequest` factory** — copy shape from `adapters.test.ts:29-45`:
```typescript
// Source: adapters.test.ts:29-45 — shape to copy; change rule id
function makeValidGateRequest(): GateRequest {
  return {
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
}
```

**Fail-closed matrix assertions** (one test per error class — missing/below-70/zero-line/malformed/out-of-root/oversized):
```typescript
// Source: run-adapter.test.ts:36-49 — assert.rejects pattern; here we assert status instead
test("runAdapter returns fail for missing report", async () => {
  const adapter = createCoverageAdapter({
    projectRoot: process.cwd(),
    reportPath: "test/fixtures/coverage/nonexistent.xml",
  });
  const result = await runAdapter(adapter, makeValidGateRequest());
  assert.equal(result.status, "fail");
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].id, /java-spring-unit-line-coverage/);
  assert.equal(result.findings[0].severity, "high");
});
```

**Path-containment test** — symlink-safe rejection (mirror `detail-path.ts` CR-01 pattern, NOT a direct copy — assert fail-closed, not thrown):
```typescript
test("out-of-root reportPath returns fail (not throw)", async () => {
  const adapter = createCoverageAdapter({
    projectRoot: process.cwd(),
    reportPath: "../../../etc/passwd",
  });
  const result = await runAdapter(adapter, makeValidGateRequest());
  assert.equal(result.status, "fail");
});
```

**Regression assertion** (from RESEARCH.md JAVA-COV-03 last row) — verify `adapters.test.ts` "exactly 7" stays GREEN:
```typescript
// Source: adapters.test.ts:90-92, 103-106, 108-110 — DO NOT modify; must stay GREEN
test("ADAPTERS Map has exactly 7 entries keyed by stub name", async () => {
  assert.equal(ADAPTERS.size, 7);  // coverage-report NOT added here
});
```

---

### `src/enforcement/parse-jacoco.ts` (pure parser, transform)

**No existing analog** — first parser module. Pattern from RESEARCH.md section "Pattern 3: Pure Parser Functions" + CONTEXT.md "Parser & Format Contract".

**Signature:**
```typescript
export interface LineCounter { covered: number; total: number; }
export function parseJacoco(xml: string): LineCounter;
```

**Pattern:**
- Narrow regex/substring for the single report-root `<counter type="LINE" missed="N" covered="N"/>`.
- Reject: missing root LINE counter, >1 root LINE counter (duplicate), non-integer attributes, negative integers, unsafe integers (>2^53).
- DO NOT sum nested package/class/method/sourcefile counters — hierarchy repeats, summing double-counts.
- Throw on malformed input — adapter catches and routes to `failResult()`.
- No general XML parser / DOM / entity processing / DTD (CONTEXT forbids; attack surface).

**Pitfall (RESEARCH Pitfall 1):** JaCoCo counter tree repeats LINE at method/class/sourcefile/package/report levels. Only the `<report>` direct child is the aggregate. Reject if 0 or >1 root LINE counters.

---

### `src/enforcement/parse-jacoco.test.ts` (unit test, transform)

**Analog:** `src/select/tokens.test.ts` (pure-function test shape — `node:test` + `node:assert/strict`, one `test()` per edge case)

**Pattern:** Direct parser invocation, no `runAdapter` wrapping:
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJacoco } from "./parse-jacoco.js";

test("parseJacoco extracts root LINE counter (ignores nested)", () => {
  const xml = `<report><package><counter type="LINE" missed="2" covered="8"/></package><counter type="LINE" missed="5" covered="15"/></report>`;
  assert.deepEqual(parseJacoco(xml), { covered: 15, total: 20 });
});

test("parseJacoco throws on duplicate root LINE counter", () => {
  const xml = `<report><counter type="LINE" missed="1" covered="1"/><counter type="LINE" missed="2" covered="2"/></report>`;
  assert.throws(() => parseJacoco(xml), /duplicate/i);
});
```

**Fixture edge cases (CONTEXT "Test & Fixture Contract"):** exactly-70% pass, below-70% fail, malformed, zero-line, duplicate-root-line, negative-counter.

---

### `src/enforcement/parse-lcov.ts` (pure parser, transform)

**No existing analog** — first LCOV parser.

**Signature:** `export function parseLcov(text: string): LineCounter;`

**Pattern (from RESEARCH.md lines 320-345 — code skeleton already specified):**
- Line-based `text.split("\n")` scan.
- State machine: `SF:` opens record, `LF:`/`LH:` set record summaries, `end_of_record` commits.
- Aggregate `LF`→total, `LH`→covered across all records.
- Reject: duplicate `LF`/`LH` in one record, incomplete record (missing `end_of_record`), `LH > LF` inconsistent.
- DO NOT combine `DA` line counts with `LF`/`LH` summaries (double-counts).
- Throw on malformed — adapter catches.

**Pitfall (RESEARCH Pitfall 2):** `DA` is raw per-line execution count; `LF`/`LH` is the summary. Mixing double-counts. Use `LF`/`LH` exclusively.

---

### `src/enforcement/parse-lcov.test.ts` (unit test, transform)

**Analog:** Same as parse-jacoco.test.ts — pure-function `node:test` style.

**Edge cases:** exactly-70% pass, below-70% fail, zero-lines (LF=0), malformed (unterminated record), duplicate-LF in record, lh-gt-lf.

---

### `aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md` (binding rule, static)

**Analog:** `aidlc-rules/domain/java-spring/java-spring-api-contract.md` (exact same pack, same shape)

**Frontmatter pattern** (copy shape from `java-spring-api-contract.md` lines 1-28; DELTA fields marked):
```yaml
---
id: java-spring-unit-line-coverage   # DELTA: new id
scope: domain
triggers:
  taskType:                           # DELTA: taskType triggers (CONTEXT "Binding Rule Contract")
    - feature
    - bugfix
    - refactor
  paths:
    - "**/src/main/java/**"            # DELTA: Java production paths
    - "**/src/main/**/*.java"
  exclude:
    taskType:
      - docs
      - test
      - infra
    paths:
      - "**/src/test/**"               # DELTA: exclude tests to avoid circular coverage
      - "**/generated/**"
      - "**/build/**"
      - "**/target/**"
phases:
  - construction
severity: high                         # DELTA: was medium → high (binding)
summary: "New or changed Java production behavior requires unit-test line coverage ≥70% verified by a real coverage report."
classification: binding                # DELTA: was advisory → binding
enforcement: coverage-report           # DELTA: new field (binding rules MUST name enforcement)
detailPath: details/java-spring-unit-line-coverage-detail.md
---
```

**Body pattern** (mirror `java-spring-api-contract.md` lines 30-43):
```markdown
## Rule JS-COV-01: Unit Line Coverage

[one-paragraph requirement statement — ≥70% line coverage for new/changed Java production code, measured by JaCoCo XML or LCOV report; fail-closed when missing/malformed/below-threshold]

### Verification

- [checkpoint 1]
- [checkpoint 2]
- [checkpoint 3]
- [checkpoint 4]

<!-- BODY_CANARY java-spring-unit-line-coverage -->
```

**Critical pattern elements (from `java-spring-pack.test.ts` lines 76-83, 171-180, 300-340):**
- **BODY_CANARY** comment MUST be present in body or detail file — test asserts it NEVER leaks into `rule-index.json` or `renderInjection` output.
- **Summary one-sentence** — test asserts `!summary.includes("\n")`, `summary.length <= 160`, ends with `.!?` or lacks `. `.
- **`## Rule JS-COV-01:`** heading — essay form, MUST NOT appear in inject fragment.
- **`classification: binding`** + **`enforcement: coverage-report`** — first rule with these values; existing 9 java-spring rules are `advisory`.

**Pitfalls:**
- DO NOT use bare `rest`/`coverage` keyword triggers — use tight path globs only (CONTEXT "Binding Rule Contract").
- DO NOT include `**/*Test*`/`**/src/test/**` in triggers — those are excludes (circular coverage obligation).
- DO NOT use `always-in-phase` trigger — that would select on every construction task; CONTEXT requires Java production path gating.

---

### `aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md` (rule detail, static)

**Analog:** `aidlc-rules/domain/java-spring/details/java-spring-api-contract-detail.md`

**Pattern (mirror `java-spring-api-contract-detail.md` structure):**
```markdown
# JS-COV-01 Detail: Unit Line Coverage

## Rule restatement
[requirement in different words]

## Measurement contract
| Metric | Value |
|--------|-------|
| Type | Aggregate line coverage |
| Threshold | ≥70% (integer cross-multiplication `covered*100 >= total*70`) |
| Formats | JaCoCo XML (root `<counter type="LINE">`), LCOV (`LF`/`LH` aggregation) |

## JaCoCo extraction
- Locate single `<report>` direct-child `<counter type="LINE" missed="N" covered="N"/>`.
- Do NOT sum nested package/class/method/sourcefile counters (hierarchy double-counts).

## LCOV extraction
- Aggregate `LF`/`LH` across all `end_of_record` records.
- Reject duplicate `LF`/`LH`, incomplete records, `LH > LF`.

## Fail-closed behavior
- Missing/malformed/zero-line/out-of-root/oversized → `GateResult` with `status: "fail"`.
- Adapter programming faults throw through `runAdapter()`.

## When to apply
- Java production paths under `**/src/main/java/**`.
- taskType: feature/bugfix/refactor.

## When not
- Docs/test/infra tasks.
- Test/generated/build/target paths.

## Verification checklist
1. [item]
2. [item]

BODY_CANARY java-spring-unit-line-coverage
```

**Critical:** Detail file MUST carry `BODY_CANARY java-spring-unit-line-coverage` (last line, matching existing detail convention).

---

### `src/select/java-spring-coverage.test.ts` (rule suite test, static)

**Analog:** `src/select/java-spring-pack.test.ts` (lines 1-851) — exact same structure

**Imports pattern** (copy from `java-spring-pack.test.ts` lines 43-61):
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import { renderInjection } from "../inject/inject.js";
import type { RuleIndex, RuleIndexRecord, TaskSignal, SelectionConfig } from "../types.js";
```

**Suite structure** (mirror `java-spring-pack.test.ts` test blocks):
1. **Hygiene** — `buildIndex(aidlc-rules)` succeeds; BODY_CANARY absent from serialized index; details/ not indexed as rules.
2. **Binding metadata** — `classification === "binding"`, `enforcement === "coverage-report"`, `severity === "high"`, `scope === "domain"`.
3. **Triggers** — Java production path selects; test/generated/build paths do NOT select; docs/test/infra taskType excluded.
4. **BODY_CANARY quarantine** — canary in body/detail, NOT in `rule-index.json`, NOT in `renderInjection` output.
5. **Inject summary** — one-sentence, ≤160 chars, no body leakage.

**BODY_CANARY pattern** (mirror `java-spring-pack.test.ts` lines 76-83, 171-180):
```typescript
const BODY_CANARY = "BODY_CANARY java-spring-unit-line-coverage";

test("hygiene: JSON.stringify(index) lacks coverage body canary", () => {
  const index = buildIndex(PACK_ROOT);
  const serialized = JSON.stringify(index);
  assert.ok(!serialized.includes(BODY_CANARY), "index must not contain coverage canary");
});
```

**Binding-metadata assertion** (mirror `java-spring-pack.test.ts:300-340`):
```typescript
test("JAVA-COV-01: binding metadata is correct", () => {
  const index = buildIndex(PACK_ROOT);
  const rec = index.rules.find(r => r.id === "java-spring-unit-line-coverage");
  assert.ok(rec, "rule must exist in index");
  assert.equal(rec.classification, "binding");
  assert.equal(rec.severity, "high");
  assert.equal(rec.scope, "domain");
  // enforcement field — check frontmatter carries it
});
```

**Selective trigger test** (mirror `java-spring-pack.test.ts:629-698`):
```typescript
test("JAVA-COV-01: src/main/java path selects under construction", () => {
  const index = buildIndex(PACK_ROOT);
  const result = select(index,
    { taskType: "feature", keywords: [], paths: ["src/main/java/com/acme/Foo.java"] },
    { phase: "construction", domains: ["java-spring"] }
  );
  assert.ok(isSelected(result, "java-spring-unit-line-coverage"));
});

test("JAVA-COV-01: src/test path does NOT select (exclude)", () => {
  const result = select(index,
    { taskType: "feature", keywords: [], paths: ["src/test/java/FooTest.java"] },
    SUBSCRIBED
  );
  assert.ok(!isSelected(result, "java-spring-unit-line-coverage"));
});
```

---

### `test/fixtures/coverage/jacoco/*.xml` + `test/fixtures/coverage/lcov/*.info` (test fixtures)

**Analog:** `test/fixtures/precedence-store/**/*.md` (existing fixture layout — sibling files under named fixture dir)

**Pattern:**
- Directory: `test/fixtures/coverage/jacoco/` (6 XML files) + `test/fixtures/coverage/lcov/` (6 .info files).
- Files loaded at test runtime via `readFileSync` + `process.cwd()` (same as `precedence.test.ts` lines 31-43).
- NOT compiled by tsc (under `test/`, not `src/` — `precedence.test.ts` line 16 confirms convention).

**Required fixtures (CONTEXT "Test & Fixture Contract"):**

JaCoCo (6):
| File | Purpose |
|------|---------|
| `pass-70.xml` | exactly 70% (covered*100 == total*70, e.g. covered=7,total=10) |
| `fail-below-70.xml` | <70% |
| `zero-lines.xml` | total=0 → fail closed |
| `malformed.xml` | structure error → fail |
| `duplicate-root-line.xml` | two root LINE counters → fail |
| `negative-counter.xml` | missed<0 or covered<0 → fail |

LCOV (6):
| File | Purpose |
|------|---------|
| `pass-70.info` | exactly 70% |
| `fail-below-70.info` | <70% |
| `zero-lines.info` | LF=0 across all records → fail closed |
| `malformed.info` | unterminated record → fail |
| `duplicate-lf.info` | two LF in one record → fail |
| `lh-gt-lf.info` | LH>LF → inconsistent → fail |

**JaCoCo fixture template** (root counter is the aggregate — RESEARCH "Code Examples"):
```xml
<!-- pass-70.xml: covered=7, total=10 → 7*100=700 >= 10*70=700 ✓ -->
<report name="demo">
  <package name="com/example">
    <class name="Foo"><counter type="LINE" missed="2" covered="8"/></class>
    <counter type="LINE" missed="2" covered="8"/>
  </package>
  <counter type="INSTRUCTION" missed="50" covered="150"/>
  <counter type="LINE" missed="3" covered="7"/>
</report>
```

**LCOV fixture template** (RESEARCH "Code Examples"):
```
TN:test
SF:src/main/java/com/example/Foo.java
DA:10,3
DA:11,0
LF:2
LH:1
end_of_record
```

---

### `src/index/precedence.test.ts` (MODIFIED — inventory 10 → 11)

**Analog:** Self (existing file — update winners assertion)

**Change scope (RESEARCH line 586, 660-663):**
- Line ~120 region: `expectedIds` array — append `"java-spring-unit-line-coverage"`.
- Winners count assertion: `index.rules.length === 11` (was 10).
- DO NOT touch the precedence collision tests, D-09 mismatch test, or body-leak assertions.

**Exact location to edit (from file read):**
- Line 122-134: `expectedIds` array — add `"java-spring-unit-line-coverage"` to the list.
- Line 135-139: `index.rules.length` comparison updates automatically via `expectedIds.length`.

---

### `src/select/starter-examples.test.ts` (MODIFIED — inventory 10 → 11)

**Analog:** Self (existing file — update constant)

**Change scope:**
- Line 19: `const INVENTORY_COUNT = 10;` → `const INVENTORY_COUNT = 11;`
- Line 221-228: `"inventory regression: real corpus still has exactly 10 winners"` test — update message string to 11 (or parametrize).
- DO NOT touch JAVA-EX-01 layout tests, D-10 tests, or package.json files assertion.

---

## Shared Patterns

### GateAdapter Contract (ALL adapter files)
**Source:** `src/enforcement/adapters.ts` lines 3-6, `src/enforcement/run-adapter.ts` lines 9-26
**Apply to:** `src/enforcement/coverage-report.ts`

```typescript
// Source: adapters.ts:3-6 — interface to implement
export interface GateAdapter {
  readonly name: string;
  evaluate(request: GateRequest): Promise<GateResult>;
}

// Source: run-adapter.ts:13-25 — boundary checks every adapter output MUST pass
// 1. assertGateResult(result)  — schema validation (Ajv draft 2020-12)
// 2. result.gateId === request.gateId
// 3. result.evaluatedBy === adapter.name
```

### runAdapter Boundary (ALL adapter tests)
**Source:** `src/enforcement/run-adapter.ts`, `src/enforcement/run-adapter.test.ts`
**Apply to:** `src/enforcement/coverage-report.test.ts`

EVERY coverage adapter test MUST invoke `runAdapter(adapter, request)`, NOT `adapter.evaluate(request)` directly. This proves:
- Schema-valid output (5 required fields, no stray keys, strict ISO-8601 timestamp).
- `gateId` matches request.
- `evaluatedBy === "coverage-report"`.

### Path Containment (symlink-safe)
**Source:** `src/rules/detail-path.ts` lines 29-136 — `escapesRoot()` + `canonicalize()` + `resolveDetailPath()`
**Apply to:** `src/enforcement/coverage-report.ts` (reportPath containment)

**Pattern to mirror (NOT copy — adapter returns fail Result, not throw):**
```typescript
// Source: detail-path.ts:29-36 — escapesRoot predicate
function escapesRoot(rel: string): boolean {
  return (
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    rel.startsWith("../") ||
    path.isAbsolute(rel)
  );
}

// Source: detail-path.ts:51-57 — canonicalize via realpathSync (CR-01 anti-symlink)
function canonicalize(p: string): string {
  try { return realpathSync(p); } catch { return p; }
}

// Mirror: resolve reportPath against projectRoot, then:
// 1. Lexical escapesRoot check on path.relative(projectRoot, resolved)
// 2. realpathSync both, re-check escapesRoot on canonicalized paths
// 3. On escape → return failResult (NOT throw — CONTEXT "Fail-Closed Gate Evidence")
```

### Finding → Rule Mapping
**Source:** `src/governance/verify-gate-hook.ts` lines 29-54
**Apply to:** `src/enforcement/coverage-report.ts` (finding id construction)

```typescript
// Source: verify-gate-hook.ts:33-38 — regex pattern finding id MUST satisfy
function findingMatchesRule(findingId: string, ruleId: string): boolean {
  if (findingId === ruleId) return true;
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(ruleId)}($|[^A-Za-z0-9])`).test(findingId);
}
```

**Implication:** Coverage finding id `${ruleId}:coverage-report` → `java-spring-unit-line-coverage:coverage-report` → matches because `:` is `[^A-Za-z0-9]` before ruleId, and `:` after. ✓

### Inventory Regression (2 modified test files)
**Source:** `src/index/precedence.test.ts` line 120-134, `src/select/starter-examples.test.ts` line 19
**Apply to:** Both files — bump 10 → 11

```typescript
// precedence.test.ts:122-134 — append to expectedIds
const expectedIds = [
  "require-mfa",
  "java-spring-svc-internal-outbound",
  // ... 8 more ...
  "java-spring-saga-outbox",
  "java-spring-unit-line-coverage",  // ADD — Phase 17
].sort();

// starter-examples.test.ts:19 — bump constant
const INVENTORY_COUNT = 11;  // was 10
```

### Body Canary Quarantine (binding rule + detail + select test)
**Source:** `src/select/java-spring-pack.test.ts` lines 76-83, 171-180, 342-386
**Apply to:** `java-spring-unit-line-coverage.md`, detail file, `java-spring-coverage.test.ts`

```typescript
// Source: java-spring-pack.test.ts:171-180 — canary must NOT leak into index or inject
test("hygiene: JSON.stringify(index) lacks each pack body canary", () => {
  const index = buildIndex(PACK_ROOT);
  const serialized = JSON.stringify(index);
  assert.ok(!serialized.includes(BODY_CANARY), "index must not contain body canary");
});
```

### node:test + node:assert/strict (ALL test files)
**Source:** Every `*.test.ts` in repo — `adapters.test.ts:7-8`, `run-adapter.test.ts:1-2`, `java-spring-pack.test.ts:43-44`
**Apply to:** All 4 new test files

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
```

NO jest, vitest, mocha, or custom harness. NO new test dependencies.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/enforcement/parse-jacoco.ts` | pure parser | transform | First parser module in repo — no existing string→struct parser. Use RESEARCH.md "Pattern 3" + "Code Examples" section. |
| `src/enforcement/parse-lcov.ts` | pure parser | transform | First parser module. Use RESEARCH.md lines 320-345 code skeleton. |

## Phase Boundary Preservations

### 7-Entry Stub Contract (MUST NOT CHANGE)
**Files:** `src/enforcement/adapters.ts`, `src/enforcement/adapters.test.ts`

`STUB_NAMES`, `ADAPTERS`, `ECHO_ADAPTERS` stay locked at exactly 7 entries:
- semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval

Regression assertions (adapters.test.ts lines 90, 103, 108) MUST stay GREEN. `coverage-report` is registered as a SEPARATE export (`createCoverageAdapter` factory only — no static map per RESEARCH Open Question 3 recommendation).

### runAdapter Boundary (MUST NOT BYPASS)
**File:** `src/enforcement/run-adapter.ts`

Every coverage test routes through `runAdapter()`. Direct `adapter.evaluate()` calls only in parser unit tests (which don't construct an adapter).

### verifyGateHook Default Behavior (MUST NOT CHANGE in Phase 17)
**File:** `src/governance/verify-gate-hook.ts`

Line 66: `const adapterName = args.adapterName ?? "generic-exit-ci";` — unchanged. Phase 18 owns auto-selecting `coverage-report` when the binding rule applies. Phase 17 only ensures finding IDs are compatible with `deriveRuleGateStatuses()` (lines 40-54).

### Inventory 10 → 11
Two test files modified; no other inventory locks exist. RESEARCH A5 confirms: `precedence.test.ts` + `starter-examples.test.ts` are the only two assertions.

### Phase 18 Scope Boundary (DEFERRED)
The following are OUT OF SCOPE for Phase 17 (per CONTEXT `<deferred>`):
- Report-path configuration surface and consumer defaults.
- Automatic `verifyGateHook` selection of `coverage-report`.
- Consumer JaCoCo/LCOV production commands and docs.
- Branch coverage (`JAVA-COV-04`).

Phase 17 ships: parsers, adapter factory, binding rule + detail, fixtures, tests, inventory bump. Phase 18 wires configuration + auto-selection.

## Metadata

**Analog search scope:** `src/enforcement/`, `src/governance/`, `src/rules/`, `src/select/`, `src/index/`, `aidlc-rules/domain/java-spring/`, `test/fixtures/`
**Files scanned:** 18 (6 enforcement, 2 governance, 1 rules, 5 select tests, 1 index test, 3 rule+detail analogs, 1 fixture dir)
**Pattern extraction date:** 2026-07-12
