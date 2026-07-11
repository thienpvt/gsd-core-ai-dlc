# Testing Patterns

**Analysis Date:** 2026-07-11

## Test Framework

**Runner:**
- Node built-in test runner (`node:test`) on Node `>=22.0.0`.
- Config: Not detected. Tests are configured through `package.json` scripts and TypeScript compilation, not a Jest/Vitest config file.
- Test compile config: `tsconfig.json` compiles all `src/**/*.ts` to `dist-test/`, including tests.
- Production compile config: `tsconfig.build.json` excludes `**/*.test.ts` and emits `dist/`.

**Assertion Library:**
- `node:assert/strict`.
- Use `assert.equal`, `assert.deepEqual`, `assert.ok`, `assert.match`, `assert.throws`, and `assert.rejects` as seen in `src/select/select.test.ts`, `src/governance/state-store.test.ts`, and `src/enforcement/run-adapter.test.ts`.

**Run Commands:**
```bash
npm test              # Build production + tests, then run all dist-test/**/*.test.js with node --test
npm run build:test    # Compile tests from src/**/*.ts to dist-test/
npm run test:coverage # Run all tests under c8 coverage
npm run build         # Compile production code only to dist/
npm run eval          # Run selector eval CLI from dist/select/eval-cli.js
```

## Test File Organization

**Location:**
- Tests are co-located beside source files under `src/`: `src/select/select.test.ts`, `src/inject/inject.test.ts`, `src/governance/state-store.test.ts`.
- Current inventory: 51 TypeScript test files beside 41 non-test TypeScript source files under `src/`.
- Compiled tests are emitted to `dist-test/` by `tsconfig.json`; do not edit generated `dist-test/` files.
- Persistent fixture corpora live under `test/fixtures/`: `test/fixtures/eval/eval-rules/`, `test/fixtures/eval/cases/eval-cases.json`, `test/fixtures/precedence-store/`.

**Naming:**
- Unit/integration tests: `*.test.ts` such as `src/schema/frontmatter.test.ts` and `src/rules/load.test.ts`.
- Property tests: `*.property.test.ts` such as `src/select/select.property.test.ts`, `src/index/no-body.property.test.ts`, `src/inject/inject.property.test.ts`.
- CLI smoke tests: `*.smoke.test.ts` such as `src/cli/select.smoke.test.ts`, `src/cli/cli.smoke.test.ts`, `src/cli/rule-detail.smoke.test.ts`.
- Production rule-pack contract tests use descriptive domain groupings: `src/select/java-spring-pack.test.ts`, `src/select/java-spring-hex-ddd.test.ts`, and `src/select/java-spring-log-api-evt.test.ts`.

**Structure:**
```
src/
├── select/
│   ├── select.ts
│   ├── select.test.ts
│   ├── select.property.test.ts
│   ├── eval-fixtures.test.ts
│   ├── recall.test.ts
│   ├── java-spring-pack.test.ts
│   ├── java-spring-hex-ddd.test.ts
│   └── java-spring-log-api-evt.test.ts
├── inject/
│   ├── inject.ts
│   ├── inject.test.ts
│   └── inject.property.test.ts
├── governance/
│   ├── state-store.ts
│   ├── state-store.test.ts
│   ├── verify-gate-hook.ts
│   └── verify-gate-hook.test.ts
└── cli/
    ├── index.ts
    ├── select.smoke.test.ts
    └── commands/
        └── eval.test.ts

test/fixtures/
├── eval/
│   ├── eval-rules/
│   └── cases/eval-cases.json
├── precedence-store/
├── scope-mismatch-store/
└── detailpath-store/
```

## Test Structure

**Suite Organization:**
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import type { RuleIndex, TaskSignal, SelectionConfig } from "../types.js";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-feature-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("behavior name explains invariant and expected outcome", () => {
  withTempRoot((root) => {
    // arrange fixture files
    // act through public API
    // assert observable result
  });
});
```

**Patterns:**
- Use one `test()` per behavior, with descriptive names that include invariant IDs where relevant: `SEL-01`, `D-04`, `WR-01`, `CR-01` in `src/select/select.test.ts` and `src/governance/audit-artifact.test.ts`.
- Prefer public APIs over private helpers: `src/governance/audit-artifact.test.ts` exercises `writeGovernanceAudit` and parses output rather than exporting internals.
- Use real filesystem temp directories for file-bound behavior: `src/rules/load.test.ts`, `src/select/select.test.ts`, `src/governance/state-store.test.ts`.
- Always clean temp directories in `finally` with `rmSync(root, { recursive: true, force: true })`: `src/select/select.property.test.ts`, `src/cli/select.smoke.test.ts`, `src/governance/verify-gate-hook.test.ts`.
- Use fixture corpora for cross-layer integration: `buildIndex(EVAL_ROOT)` in `src/select/select.test.ts`, `src/select/skip-reasons.test.ts`, `src/select/tokens.test.ts`.
- Assert both positive and negative evidence when guarding no-leak/no-write behavior: `src/inject/inject.test.ts`, `src/governance/plan-hook.test.ts`, `src/governance/audit-artifact.test.ts`.
- Use `assert.throws` and `assert.rejects` for fail-loud contracts: `src/index/build-guards.test.ts`, `src/governance/state-store.test.ts`, `src/enforcement/run-adapter.test.ts`.
- For rule packs, lock exact IDs and combine build hygiene, body-canary quarantine, subscription gating, positive triggers, false-positive negatives, exclusions, phase gates, summary contracts, and injection assertions in the same suite: `src/select/java-spring-*.test.ts`.

## Mocking

**Framework:** Hand-rolled fakes/stubs. No Jest/Vitest mocking framework detected.

**Patterns:**
```typescript
const badAdapter = {
  name: "bad-adapter",
  async evaluate() {
    return {
      gateId: "verify",
      status: "maybe",
      findings: [],
      evaluatedBy: "bad-adapter",
      evaluatedAt: "2026-07-07T00:00:00.000Z",
    };
  },
} as unknown as GateAdapter;

await assert.rejects(
  verifyGateHook({
    projectRoot: root,
    phaseNumber: "08",
    adapterName: "bad-adapter",
    adapters: new Map([["bad-adapter", badAdapter]]),
  }),
  /invalid gate-result/,
);
```

**What to Mock:**
- Mock external gate adapters with injected `GateAdapter` objects or injected maps: `src/governance/verify-gate-hook.test.ts`, `src/enforcement/run-adapter.test.ts`.
- Mock loader seams by passing functions or fixture data when production code exposes seam parameters: `src/select/eval-cli.test.ts` uses injectable `indexLoader` and `casesLoader` patterns.
- Mock CLI process boundaries by spawning compiled files with `spawnSync` or `execFileSync`, not by stubbing `process.argv`: `src/cli/select.smoke.test.ts`, `src/governance/audit-artifact.test.ts`.

**What NOT to Mock:**
- Do not mock pure core functions when testing integration paths. Use real `buildIndex`, `select`, and `renderInjection` together in `src/governance/plan-hook.test.ts`.
- Do not mock filesystem behavior when atomic/write/read correctness is the behavior under test. Use temp dirs and real files in `src/governance/state-store.test.ts` and `src/governance/gate-evidence-store.test.ts`.
- Do not mock JSON Schema validators at boundaries. Tests import compiled validators directly in `src/schema/frontmatter.test.ts`, `src/enforcement/validate-gate-result.test.ts`, and `src/enforcement/validate-approval.test.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
function record(opts: {
  phase?: Phase;
  riskTier?: "critical" | "elevated" | "baseline";
  result?: SelectionResult;
  taskSignal?: TaskSignal;
} = {}): GovernanceRecord {
  return {
    phase: opts.phase ?? "construction",
    taskSignal: opts.taskSignal ?? {
      taskType: "feature",
      keywords: [],
      paths: [],
    },
    selectionConfig: {
      phase: opts.phase ?? "construction",
      domains: [],
      budget: 2000,
    },
    selectionResult: opts.result ?? ({
      selected: [],
      skipped: [],
      budgetExceeded: false,
      budget: { used: 10, limit: 2000, offenders: [] },
    } satisfies SelectionResult),
    riskTier: opts.riskTier ?? "baseline",
    timestamp: "2026-07-06T00:00:00.000Z",
  };
}
```

**Location:**
- Shared file fixtures live in `test/fixtures/`, outside `src/`, so TypeScript does not compile them.
- Eval corpus fixtures live in `test/fixtures/eval/eval-rules/` and are built through `buildIndex` in `src/select/select.test.ts`, `src/select/eval-fixtures.test.ts`, and `src/select/recall.test.ts`.
- Labeled eval cases live in `test/fixtures/eval/cases/eval-cases.json` and feed `src/select/eval-harness.ts` via `src/select/eval-fixtures.test.ts` and `src/select/eval-cli.test.ts`.
- Java/Spring selector suites intentionally build the real production corpus at `aidlc-rules/`, rather than a copied fixture store, so rule IDs, summaries, triggers, detail paths, and body quarantine stay coupled to shipped content.
- Tests that need bespoke malformed files generate them in `os.tmpdir()` with `mkdtempSync`: `src/select/select.test.ts`, `src/index/no-body.property.test.ts`, `src/governance/plan-hook.test.ts`.

## Coverage

**Requirements:** None enforced by `package.json`. Coverage tooling exists through `c8`, but no threshold config or binding coverage gate is implemented.

**Latest Local Evidence (2026-07-11):**
- `npm test`: 525 tests, 522 passed, 0 failed, 3 skipped.
- `npm run test:coverage`: aggregate 84.87% statements/lines, 80.89% branches, and 84.76% functions.
- Caveat: the current coverage command observes both `dist-test/` and production `dist/` loaded by process-level smoke tests, so the aggregate is not yet a clean single-boundary production metric.

**View Coverage:**
```bash
npm run test:coverage
```

## Test Types

**Unit Tests:**
- Scope: pure functions, validators, schema formatting, and small modules.
- Approach: direct imports from source modules compiled to `dist-test/`; assert deterministic returns and failure messages.
- Examples: `src/schema/frontmatter.test.ts`, `src/select/tokens.test.ts`, `src/enforcement/validate-gate-result.test.ts`, `src/rules/scope.test.ts`.

**Integration Tests:**
- Scope: real rule corpora, filesystem stores, governance hooks, and schema validation across module boundaries.
- Approach: temp directories plus real read/write paths; build fixture rule stores with `buildIndex`; assert persisted evidence.
- Examples: `src/select/eval-fixtures.test.ts`, `src/select/java-spring-pack.test.ts`, `src/select/java-spring-hex-ddd.test.ts`, `src/select/java-spring-log-api-evt.test.ts`, `src/governance/plan-hook.test.ts`, `src/governance/verify-gate-hook.test.ts`, `src/governance/audit-artifact.test.ts`.

**Property Tests:**
- Framework: `fast-check` imported as `import * as fc from "fast-check"`.
- Scope: invariants over arbitrary corpora and no-body/no-leak guarantees.
- Approach: use `fc.assert(fc.property(...), { numRuns: 30 })`, generate clean tokens with `fc.stringMatching(/^[a-z0-9]{4,12}$/)`, write generated rule files to temp directories, then run real `buildIndex` / `select` / `renderInjection`.
- Examples: `src/select/select.property.test.ts`, `src/index/no-body.property.test.ts`, `src/inject/inject.property.test.ts`.

**Smoke Tests:**
- Scope: compiled CLI behavior and process exit semantics.
- Approach: spawn `node dist/cli/index.js ...` or direct compiled runners after `npm run build`; assert exit status, stdout JSON, stderr, and persisted files.
- Examples: `src/cli/select.smoke.test.ts`, `src/cli/cli.smoke.test.ts`, `src/cli/inject.smoke.test.ts`, `src/governance/audit-artifact.test.ts`.

**E2E Tests:**
- Framework: Node process-level tests only; no browser/E2E framework detected.
- Use compiled CLI smoke tests as E2E coverage for this CLI package: `src/cli/select.smoke.test.ts`, `src/cli/rule-detail.smoke.test.ts`, `src/select/eval-cli.test.ts`.

## Common Patterns

**Async Testing:**
```typescript
test("verifyGateHook rejects malformed adapter output through runAdapter and writes no evidence", async () => {
  await withTempRoot(async (root) => {
    writeSelection(record(), root);
    const badAdapter = {
      name: "bad-adapter",
      async evaluate() {
        return {
          gateId: "verify",
          status: "maybe",
          findings: [],
          evaluatedBy: "bad-adapter",
          evaluatedAt: "2026-07-07T00:00:00.000Z",
        };
      },
    } as unknown as GateAdapter;

    await assert.rejects(
      verifyGateHook({
        projectRoot: root,
        phaseNumber: "08",
        adapterName: "bad-adapter",
        adapters: new Map([["bad-adapter", badAdapter]]),
      }),
      /invalid gate-result/,
    );
  });
});
```

**Error Testing:**
```typescript
test("readSelection THROWS on a malformed (non-JSON) file", () => {
  withTempRoot((root) => {
    const finalPath = selectionStatePath(root);
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(finalPath, "{not valid json", "utf8");
    assert.throws(
      () => readSelection(root),
      /malformed governance state/i,
      "readSelection must throw a loud 'malformed governance state' error on non-JSON",
    );
  });
});
```

**CLI Testing:**
```typescript
const proc = spawnSync(
  process.execPath,
  [CLI, "select", "--index", indexPath, "--phase", "construction", "--input", signalPath],
  { encoding: "utf8" },
);
assert.equal(proc.status, 0, `expected exit 0, got ${proc.status} (stderr: ${proc.stderr})`);
const result = JSON.parse(proc.stdout) as SelectionResult;
assert.ok(Array.isArray(result.selected), "stdout has a selected array");
```

**Property Testing:**
```typescript
test("invariant — repeated select() is byte-identical", () => {
  fc.assert(
    fc.property(corpusArb, ({ specs, signalTaskType, signalKeywords }) => {
      const signal = toSignal(signalTaskType, signalKeywords);
      withCorpus(specs, signal, (index) => {
        const first = select(index, signal, CONFIG);
        const second = select(index, signal, CONFIG);
        assert.equal(JSON.stringify(first), JSON.stringify(second));
      });
    }),
    { numRuns: 30 },
  );
});
```

---

*Testing analysis: 2026-07-11*
