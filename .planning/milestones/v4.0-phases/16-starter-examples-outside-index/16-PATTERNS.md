# Phase 16: Starter Examples Outside Index - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 9 (1 test, 6 Java snippets, 1 README, 1 package.json touch)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `examples/java-spring/README.md` | config (docs) | file-I/O | `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md` (for mirrored rule ids); `docs/rule-authoring.md` (prose shape) | exact (docs cross-ref to rules) |
| `examples/java-spring/domain/port/SamplePaymentPort.java` | component (snippet) | n/a (static doc) | `src/select/java-spring-hex-ddd.test.ts` PATHS.domainService pattern (mirrors rule JS-HEX-01) | role-match (mirrors rule, not code) |
| `examples/java-spring/application/SamplePaymentHandler.java` | component (snippet) | n/a | `src/select/java-spring-hex-ddd.test.ts` PATHS.applicationHandler | role-match |
| `examples/java-spring/adapter/in/web/SamplePaymentController.java` | component (snippet) | n/a | `src/select/java-spring-pack.test.ts` PATHS.paymentResource (JS-IN-01) | role-match |
| `examples/java-spring/adapter/in/messaging/SampleKafkaListener.java` | component (snippet) | n/a | `src/select/java-spring-pack.test.ts` (JS-IN-02 inbound-kafka) | role-match |
| `examples/java-spring/adapter/out/persistence/SamplePaymentRepositoryAdapter.java` | component (snippet) | n/a | `src/select/java-spring-hex-ddd.test.ts` PATHS.adapterOut (JS-SVC-01 + JS-HEX-01) | role-match |
| `src/select/starter-examples.test.ts` | test | request-response (buildIndex call + assert) | `src/select/java-spring-hex-ddd.test.ts` (sibling suite); `src/index/precedence.test.ts` (real-corpus inventory lock) | exact |
| `package.json` (touch — add `"examples"` to `files[]`) | config | n/a | self (current `files: ["dist","bin","aidlc-rules"]`) | exact |

## Pattern Assignments

### `src/select/starter-examples.test.ts` (test, buildIndex + assert)

**Primary analog:** `src/select/java-spring-hex-ddd.test.ts` (Phase 14 sibling suite, exact shape)
**Secondary analog:** `src/index/precedence.test.ts` (real-corpus `REAL_CORPUS` + `expectedIds` inventory lock lines 43, 122-134)

**Imports pattern** — copy verbatim from `src/select/java-spring-hex-ddd.test.ts` lines 43-54:
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "../index/build.js";
// add for layout checks:
import { existsSync } from "node:fs";
```

Phase 16 does NOT import `select` or `renderInjection` (no selection assertions needed — examples are non-selectable). Drop those imports from the Phase 14 shape.

**Real-corpus root constant** — copy from `java-spring-hex-ddd.test.ts` line 57:
```typescript
const PACK_ROOT = path.resolve(process.cwd(), "aidlc-rules");
const EXAMPLES_ROOT = path.resolve(process.cwd(), "examples", "java-spring");
```

**Hygiene test pattern** — copy from `java-spring-hex-ddd.test.ts` lines 160-165:
```typescript
test("hygiene: buildIndex(aidlc-rules) succeeds", () => {
  assert.doesNotThrow(() => buildIndex(PACK_ROOT));
  const index = buildIndex(PACK_ROOT);
  assert.equal(index.schemaVersion, 1);
  assert.ok(Array.isArray(index.rules));
});
```

**Real-corpus inventory lock** — copy shape from `src/index/precedence.test.ts` lines 120-134:
```typescript
test("the real corpus emits non-colliding winners with no superseded key (backward compatible with 01-01)", () => {
  const index = buildIndex(REAL_CORPUS);
  const expectedIds = [
    "require-mfa",
    "java-spring-svc-internal-outbound",
    // ... 9 more
  ].sort();
  assert.equal(index.rules.length, expectedIds.length, ...);
  assert.deepEqual(index.rules.map((r) => r.id).sort(), expectedIds, ...);
});
```

Phase 16 must keep `expectedIds` at exactly 10 items — do NOT edit `precedence.test.ts`; add a regression-count assertion in the new sibling suite.

**Throws-on-D-10 assertion pattern** — copy from `precedence.test.ts` line 117:
```typescript
assert.throws(() => buildIndex(MISMATCH_STORE), /does not match directory tier/);
```

Phase 16 shape (regex from `src/rules/scope.ts` line 57-59):
```typescript
assert.throws(
  () => buildIndex(EXAMPLES_ROOT),
  /outside the enterprise\/domain\/project tiers|D-10/,
);
```

**Sourcefile non-inclusion pattern** — copy filter shape from `java-spring-hex-ddd.test.ts` lines 180-189:
```typescript
const detailishIds = index.rules.filter(
  (r) =>
    r.id.includes("detail") ||
    r.sourceFile.replace(/\\/g, "/").includes("/details/"),
);
assert.equal(detailishIds.length, 0, ...);
```

Phase 16 adaptation:
```typescript
const exampleIds = index.rules.filter(
  (r) => r.sourceFile.replace(/\\/g, "/").includes("examples/") ||
         r.id.startsWith("example") || r.id.startsWith("sample"),
);
assert.equal(exampleIds.length, 0, ...);
```

---

### `examples/java-spring/README.md` (docs, cross-references mirrored rule ids)

**Analog:** `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md` (for the rule IDs to cite) + RESEARCH.md "README skeleton" section.

**Critical discipline:** NO YAML frontmatter (`---` block). Open with plain Markdown H1. Reason: Phase 16 RESEARCH Pitfall 3 — even inert frontmatter risks accidental rule parsing if scan-root drifts. This is asserted in the test suite.

**Rule IDs to cite in README's mirror table** (verified from `precedence.test.ts` lines 123-133):
- `java-spring-inbound-rest` (JS-IN-01) — REST controller thin delegation
- `java-spring-inbound-kafka` (JS-IN-02) — idempotent Kafka consumer
- `java-spring-hex-layering` (JS-HEX-01) — inward dependency arrows
- `java-spring-svc-internal-outbound` (JS-SVC-01) — internal outbound via JDBC/ORM
- `java-spring-ddd-tactical` (JS-DDD-01) — aggregate / VO / past-tense event (optional citation)

---

### `examples/java-spring/domain/port/SamplePaymentPort.java` and the 5 other Java snippets

**Analogs:** not source code — these mirror rule bodies and the `PATHS` constants in `src/select/java-spring-{pack,hex-ddd}.test.ts` lines (e.g. `PATHS.domainService`, `PATHS.applicationHandler`, `PATHS.adapterOut`, `PATHS.ports`).

**Snippet design rules** (locked in CONTEXT.md, verified against existing rule files):

1. **Thin stubs only** — package/import/signature + one-line javadoc citing the mirrored rule ID. No method body beyond `// delegate` / `// ponytail:` markers.
2. **Vendor-free** — no `wso2`/`tibco`/`smartvista` tokens (same convention as production `src/`, asserted in `java-spring-pack.test.ts` lines 93-94 `VENDOR_TOKENS`).
3. **No frontmatter, no `id:`, no `scope:`** — `.java` extension is extension-filtered by loader anyway (`load.ts` line 39: `entry.name.endsWith(".md")`); README is the only `.md` under `examples/` and must stay frontmatter-free.
4. **Neutral order-processing example** under `com.example.orders` — CONTEXT locked decision "neutral order-processing example under `com.example.orders`; avoid bank/vendor coupling" (NOT the RESEARCH draft `com.example.hexagonal.payments`).
5. **`ponytail:` comments** mark intentional omissions — convention established at `src/enforcement/adapters.ts:51` and CLAUDE.md `## Developer Profile` guidance:
   ```java
   // ponytail: no JPA/JDBC types here — consumer owns persistence mechanism.
   // Upgrade path: consumer adds @Entity, repository, or driver in this adapter.
   ```

**Hexagonal layering to mirror** (from rule `java-spring-hex-layering`, locked in CONTEXT):
- `domain/port/` — plain Java interface, no framework types
- `application/` — implements port, delegates to outbound port
- `adapter/in/web/` — validates/maps, calls input port
- `adapter/in/messaging/` — maps, calls port, visibly identifies idempotency/retry/DLQ (CONTEXT decision)
- `adapter/out/persistence/` — implements output port; persistence mechanism intentionally omitted

---

### `package.json` (touch — add `"examples"` to `files[]`)

**Analog:** self — current state lines 17-21:
```json
"files": [
  "dist",
  "bin",
  "aidlc-rules"
],
```

**Phase 16 shape:**
```json
"files": [
  "dist",
  "bin",
  "aidlc-rules",
  "examples"
],
```

This is the only field that changes. Do NOT touch `dependencies`, `devDependencies`, `engines`, `scripts`, `bin`, `main`, or `publishConfig`.

---

## Shared Patterns

### node:test + node:assert/strict harness
**Source:** every sibling suite (`java-spring-hex-ddd.test.ts`, `java-spring-log-api-evt.test.ts`, `java-spring-pack.test.ts`, `precedence.test.ts`)
**Apply to:** `src/select/starter-examples.test.ts`
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
```
Zero test deps. Runner: `npm test` → `node --test "dist-test/**/*.test.js"` (package.json line 26).

### Real-corpus via buildIndex (not fixtures)
**Source:** `src/select/java-spring-hex-ddd.test.ts` line 57, `src/index/precedence.test.ts` line 43
**Apply to:** every assertion in the new suite
```typescript
const REAL_RULES_ROOT = path.resolve(process.cwd(), "aidlc-rules");
// buildIndex(REAL_RULES_ROOT) exercises the production scan root.
```
Do NOT build fixture stores — Phase 16 proves properties of the real `aidlc-rules/` + real `examples/` sibling.

### Engine freeze discipline (zero production src/ edits)
**Source:** Phase 13-15 carry-forward (CONTEXT `## Existing Code Insights` → "Established Patterns")
**Apply to:** all Phase 16 work
- Do NOT edit: `src/rules/load.ts`, `src/rules/scope.ts`, `src/index/build.ts`, `src/index/precedence.test.ts`, `src/select/select.ts`, `src/inject/inject.ts`, `src/cli/**`, `src/schema/**`
- Only NEW file under `src/` is `src/select/starter-examples.test.ts`
- `package.json` is config, not engine

### ponytail: deliberate-omission marker
**Source:** `src/enforcement/adapters.ts` line 51 (established convention)
**Apply to:** every Java snippet's intentional omission
```java
// ponytail: <what is omitted> — <ceiling>.
// Upgrade path: <when consumer would add it>.
```

### Layout-as-guard (not engine patch)
**Source:** `src/rules/load.ts` lines 30-44 (`findRuleFiles` recurses only under passed `dir`; only `details/` skipped)
**Apply to:** Phase 16 README "NOT selectable" section + test assertions
- Primary guard: `buildIndex("aidlc-rules")` never visits repo-root `examples/`
- Backstop: `deriveScope` throws D-10 (`src/rules/scope.ts` line 56-59) for any path whose first segment isn't `enterprise`/`domain`/`project`
- `examples/` fails both layers — no engine patch required

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All Phase 16 files have a close analog in codebase test conventions, rule content, or config shape. Java snippets are new as files but mirror rule bodies that already exist under `aidlc-rules/domain/java-spring/`. |

## Metadata

**Analog search scope:** `src/select/*.test.ts`, `src/index/*.test.ts`, `src/rules/{load,scope}.ts`, `src/index/build.ts`, `aidlc-rules/domain/java-spring/*.md`, `package.json`, `src/enforcement/adapters.ts`
**Files scanned:** 14
**Pattern extraction date:** 2026-07-12
