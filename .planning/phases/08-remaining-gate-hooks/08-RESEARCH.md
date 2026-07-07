# Phase 08: remaining-gate-hooks - Research

**Researched:** 2026-07-07
**Domain:** TypeScript GSD capability hooks, governance evidence, enforcement adapter contracts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

Source for this whole block: `.planning/phases/08-remaining-gate-hooks/08-CONTEXT.md` [VERIFIED: codebase]

### Locked Decisions
## Implementation Decisions

### Plan Gate Signal And Output
- **D-01:** Add an `aidlc-governance-plan` capability skill at `plan:pre`; it should reuse the existing selection core (`select()` + `renderInjection()` pattern) instead of introducing a second selector.
- **D-02:** The plan gate should derive a `TaskSignal` from planning inputs: phase goal, requirement IDs, risks/threat model when present, acceptance criteria, and impacted modules/files. It should surface summary-only governance context to the planner, matching discuss/execute anti-bloat behavior.
- **D-03:** Plan gate output should be planner context plus a persisted gate evidence record. Do not overwrite the canonical execute selection state used by `executeHook`; plan-time selection is a separate gate evaluation.

### Verify Gate Adapter Flow
- **D-04:** Verify gate evidence must route through `runAdapter(adapter, request)`, not direct `adapter.evaluate(request)`, so Phase 7's malformed-output hard-fail boundary is always honored.
- **D-05:** Start with the existing `ADAPTERS` no-op registry for stable pass records. Use `ECHO_ADAPTERS` only in tests or deliberate failing fixtures; production gate wiring should not manufacture failures from selected rules.
- **D-06:** The verify gate should build a `GateRequest` with `gateId: "verify"`, selected applied rules, the current phase signal, and strict ISO timestamps. Its `GateResult` becomes the per-rule evidence source that Phase 9 will fold into the full audit artifact.

### Ship Blocking Policy
- **D-07:** Add an `aidlc-governance-ship` `ship:pre` gate that fails closed when required prior gate evidence is missing or failed. Required evidence for Phase 8 is plan and verify gate records for the phase.
- **D-08:** Preserve existing GSD/security `ship:pre` gates. The governance ship gate should compose with them, not replace them.
- **D-09:** Do not implement APPR-01 approval capture, full rollback evidence, or complete audit enrichment here. Phase 8 may check for placeholders/absence and report missing evidence, but Phase 9 owns the approval/audit data model.

### Gate Evidence Storage
- **D-10:** Store gate evidence under `.planning/governance/gates/` as one JSON file per phase/gate, for example `.planning/governance/gates/08-plan.json`, `.planning/governance/gates/08-verify.json`, and `.planning/governance/gates/08-ship.json`.
- **D-11:** Each evidence file should contain the `GateRequest`, validated `GateResult`, and small metadata (`phase`, `writtenAt`, `source`). Keep the file schema close to Phase 7 types; do not invent a large audit model before Phase 9.
- **D-12:** Use existing atomic-write helpers for evidence files. Gate evidence is durable workflow state and must survive context compaction, reruns, and ship-time checks.

### the agent's Discretion
- Exact function/file names for new hook modules are flexible, but keep the existing style: thin hook wrappers in `src/governance/`, pure helpers where reuse is real, tests under `src/**` so the current build includes them.
- Exact manifest ordering is flexible, but use canonical GSD hook points: `plan:pre`, `verify:post` (or `verify:pre` only if research proves it better fits the host flow), and `ship:pre`.
- Planner may split Phase 8 into separate TDD plans for plan gate, verify gate/evidence writer, and ship gate/blocking policy if that gives cleaner tests.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- APPR-01 human approval schema and approval decision capture — Phase 9.
- Complete audit artifact expansion for requirements, tests, risks, approvals — Phase 9.
- Real scanner/policy integrations beyond no-op stubs — future milestone after v2.0.
- Dynamic adapter loading through the capability registry — future milestone.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-03 | At the plan gate, the overlay surfaces rules relevant to requirements, risks, acceptance criteria, and impacted modules into the planner's context (summary-only, same selection engine as discuss/execute) | Use `select()` plus `renderInjection()` through a thin `plan:pre` hook; persist plan gate evidence separately from `selection-state.json`. [VERIFIED: 08-CONTEXT.md, CodeGraph] |
| GATE-04 | At the verify gate, the overlay collects verification evidence (tests run, lint, scans, policy) through enforcement adapters and records pass/fail per rule | Build `GateRequest` with `gateId: "verify"` and call `runAdapter()` over `ADAPTERS`; store validated `GateResult` in `.planning/governance/gates/08-verify.json`. [VERIFIED: 08-CONTEXT.md, CodeGraph] |
| GATE-05 | At the ship gate, the overlay checks audit records, approvals, rollback plan, and test evidence before release and blocks on incomplete gates | Implement `ship:pre` fail-closed check for Phase 8-required plan and verify evidence; approvals/rollback completeness remain placeholder/missing evidence until Phase 9. [VERIFIED: 08-CONTEXT.md, REQUIREMENTS.md] |
</phase_requirements>

## Summary

Phase 8 should add three thin governance hook modules and three capability skills: `aidlc-governance-plan` at `plan:pre`, verify evidence at `verify:post`, and `aidlc-governance-ship` at `ship:pre`. Existing project skills establish the pattern: skills marshal host context, invoke compiled `dist/governance/*.js`, attach or write artifacts, and fail loud on malformed state; selection, rendering, validation, and persistence stay in TypeScript modules. [VERIFIED: .claude/skills, CodeGraph]

Do not add scanner integrations, new package dependencies, dynamic adapter loading, or a larger audit model. Phase 8 should use existing no-op `ADAPTERS` for stable production pass records, reserve `ECHO_ADAPTERS` for tests, and make ship block only on missing/failing plan and verify evidence for this phase. [VERIFIED: 08-CONTEXT.md, src/enforcement/adapters.ts]

**Primary recommendation:** Add a small gate-evidence store plus three thin hooks; reuse `select()`, `renderInjection()`, `runAdapter()`, `atomicWriteFile()`, and `node:test`. [VERIFIED: CodeGraph, package.json]

## Project Constraints (from AGENTS.md)

- No `AGENTS.md` or `.codex/AGENTS.md` file exists in the repo root, but the user supplied AGENTS directives in the prompt. [VERIFIED: filesystem]
- Because `.codegraph/` exists, use CodeGraph before grep/find/file reads when locating or understanding code. [VERIFIED: user-provided AGENTS.md]
- Local Codex stop-hook troubleshooting belongs to `C:\Users\thienpv\.codex\hooks.json` and `C:\Users\thienpv\.codex\config.toml`; Phase 8 should not modify those files. [VERIFIED: user-provided AGENTS.md]
- Project governance skills are thin marshal-and-invoke steps and must not duplicate selector, risk, audit, or adapter logic. [VERIFIED: .claude/skills/aidlc-governance-*.md]
- Missing/malformed governance state is a loud failure, not an empty fragment or silent skip. [VERIFIED: .claude/skills/aidlc-governance-*.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Planner governance context | GSD Capability Host | Governance Core | `plan:pre` owns context injection timing; `select()` and `renderInjection()` own rule choice and summary rendering. [VERIFIED: 08-CONTEXT.md, CodeGraph] |
| Verify gate evidence | Governance Core | Enforcement Adapter | Hook builds `GateRequest`; `runAdapter()` validates adapter output before consumers see `GateResult`. [VERIFIED: src/enforcement/run-adapter.ts] |
| Ship blocking | GSD Capability Host | Durable State | `ship:pre` is the release-readiness choke point; evidence JSON under `.planning/governance/gates/` is the durable source. [VERIFIED: 08-CONTEXT.md] |
| Evidence persistence | Durable State | Governance Core | `atomicWriteFile()` already creates parent dirs and temp-then-renames with a unique suffix; gate evidence should reuse that primitive. [VERIFIED: src/governance/atomic-write.ts] |
| Manifest activation/consent | GSD Capability Registry | Tests | Existing consent tests render active hooks after project consent; new hook tests should mirror that pattern. [VERIFIED: src/governance/consent-verify-post.test.ts] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | installed `v25.2.1`; package engine `>=22.0.0` | Runtime, `node:test`, `node:assert/strict`, filesystem/crypto stdlib | Existing project runtime and test runner; no separate test framework needed. [VERIFIED: local command, package.json, CITED: https://nodejs.org/api/test.html] |
| TypeScript | package `^6.0.3`, registry latest `6.0.3`, modified 2026-06-18 | Strict typed hook/store modules | Existing build compiles `src/**/*.ts` to `dist` and tests to `dist-test`. [VERIFIED: package.json, npm registry] |
| Ajv | package `8.20.0`, registry `8.20.0`, modified 2026-04-24 | JSON Schema 2020-12 validation | Existing validators use `Ajv2020`, strict mode, `ajv-formats`, and compile-once validators. [VERIFIED: package.json, npm registry, CITED: https://ajv.js.org/json-schema.html] |
| ajv-formats | package `3.0.1`, registry `3.0.1`, modified 2024-03-30 | `date-time` and URI format validation | Existing schema validators call `addFormats(ajv)` before compile. [VERIFIED: package.json, npm registry, CITED: https://ajv.js.org/guide/formats.html] |
| Project enforcement contracts | local Phase 7 files | `GateRequest`, `GateResult`, `GateAdapter`, `runAdapter()` | Current boundary rejects malformed `GateResult` and mismatched `gateId`/`evaluatedBy`. [VERIFIED: src/enforcement/types.ts, src/enforcement/run-adapter.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| c8 | package `^11.0.0`, registry `11.0.0`, modified 2026-02-25 | Coverage run through `npm run test:coverage` | Optional phase-gate coverage check; not needed for every task. [VERIFIED: package.json, npm registry] |
| fast-check | package `^4.8.0`, registry `4.8.0`, modified 2026-05-11 | Existing property tests | Use only if adding invariants around evidence path/store purity; most Phase 8 tests can stay example-based. [VERIFIED: package.json, npm registry] |
| picomatch | package `4.0.5`, registry `4.0.5`, modified 2026-07-02 | Existing selector path glob matching | Do not touch for Phase 8 unless signal derivation needs path glob behavior; seam flagged current package as too-new if reinstalling. [VERIFIED: package.json, package-legitimacy] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:test` | Vitest/Jest | New dependency and config for no gain; current harness already compiles/runs `dist-test/**/*.test.js`. [VERIFIED: package.json] |
| Ajv contract validation | Zod/custom validators | Would split from existing JSON Schema contract layer and duplicate Phase 7 patterns. [VERIFIED: src/schema/validate.ts, src/enforcement/validate-gate-result.ts] |
| `ADAPTERS` no-op registry | Real Semgrep/Bandit/Checkov/etc. | Real integrations are explicitly out of scope; no-op records keep Phase 8 deterministic. [VERIFIED: 08-CONTEXT.md, src/enforcement/adapters.ts] |

**Installation:**

```bash
# No new packages for Phase 8.
npm install
```

## Package Legitimacy Audit

No new external packages are recommended. Existing packages that Phase 8 may rely on were checked to prevent accidental new installs. [VERIFIED: package-legitimacy, npm registry]

| Package | Registry | Age/Publish Signal | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|--------------------|-----------|-------------|---------|-------------|
| ajv | npm | published 2026-04-24 | 315M/wk | github.com/ajv-validator/ajv | OK | Existing dependency approved. [VERIFIED: package-legitimacy] |
| ajv-formats | npm | published 2024-03-30 | 95M/wk | github.com/ajv-validator/ajv-formats | OK | Existing dependency approved. [VERIFIED: package-legitimacy] |
| typescript | npm | published 2026-04-16 | 211M/wk | github.com/microsoft/TypeScript | OK | Existing dev dependency approved. [VERIFIED: package-legitimacy] |
| picomatch | npm | published 2026-07-02 | 417M/wk | github.com/micromatch/picomatch | SUS | Existing dependency only; planner must add `checkpoint:human-verify` before any reinstall/upgrade. [VERIFIED: package-legitimacy] |
| @types/node | npm | published 2026-07-01 | 357M/wk | github.com/DefinitelyTyped/DefinitelyTyped | SUS | Existing dev dependency only; planner must add `checkpoint:human-verify` before any reinstall/upgrade. [VERIFIED: package-legitimacy] |
| c8 | npm | published 2026-02-22 | 3.2M/wk | github.com/bcoe/c8 | OK | Existing dev dependency approved. [VERIFIED: package-legitimacy] |
| fast-check | npm | published 2026-05-11 | 27M/wk | github.com/dubzzz/fast-check | OK | Existing dev dependency approved. [VERIFIED: package-legitimacy] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy]
**Packages flagged as suspicious [SUS]:** `picomatch`, `@types/node`; both are existing dependencies and should not be changed in Phase 8. [VERIFIED: package-legitimacy]

## Architecture Patterns

### System Architecture Diagram

```text
GSD loop inputs
  |
  +--> plan:pre capability step
  |      -> derive TaskSignal from phase goal/REQs/risks/acceptance/files
  |      -> validateSignal()
  |      -> classifyRisk() + riskAdjustedDomains()
  |      -> select(index, signal, config)
  |      -> renderInjection(selectionResult)
  |      -> write .planning/governance/gates/08-plan.json
  |      -> attach <governance> to planner context
  |
  +--> verify:post capability step
  |      -> load selected/applied rules from gate/selection state
  |      -> build GateRequest { gateId: "verify", phase, taskSignal, rules, requestedAt }
  |      -> for each production adapter in ADAPTERS: runAdapter(adapter, request)
  |      -> merge/store validated GateResult evidence
  |      -> write .planning/governance/gates/08-verify.json
  |
  +--> ship:pre capability step
         -> read .planning/governance/gates/08-plan.json
         -> read .planning/governance/gates/08-verify.json
         -> fail if missing, malformed, fail, or unwaived blocking result
         -> write .planning/governance/gates/08-ship.json when pass
```

All arrows above are local Node/GSD extension flow; no external scanners are executed in Phase 8. [VERIFIED: 08-CONTEXT.md, src/enforcement/adapters.ts]

### Recommended Project Structure

```text
src/
├── governance/
│   ├── plan-hook.ts              # plan:pre selection + planner fragment + plan evidence
│   ├── verify-gate-hook.ts       # verify:post GateRequest/runAdapter evidence
│   ├── ship-gate-hook.ts         # ship:pre fail-closed evidence check
│   ├── gate-evidence-store.ts    # read/write fixed phase-gate evidence JSON
│   └── gate-evidence-store.test.ts
└── enforcement/
    └── run-adapter.ts            # existing Phase 7 boundary; do not bypass

.claude/skills/
├── aidlc-governance-plan/SKILL.md
├── aidlc-governance-verify/SKILL.md
└── aidlc-governance-ship/SKILL.md

.gsd/capabilities/aidlc-governance/capability.json
```

Tests must stay under `src/**` because `tsconfig.json` includes only `src/**/*.ts` for `dist-test`. [VERIFIED: tsconfig.json]

### Pattern 1: Thin Hook Wrapper

**What:** Hook module marshals host inputs into existing pure cores, writes state, and returns/prints a fragment or failure. [VERIFIED: src/governance/discuss-hook.ts, src/governance/execute-hook.ts]

**When to use:** All Phase 8 hook modules. [VERIFIED: .claude/skills]

**Example:**

```typescript
// Source: src/governance/discuss-hook.ts [VERIFIED: CodeGraph]
validateSignal(args.taskSignal);
const tier = classifyRisk(args.taskSignal, phase);
const domains = riskAdjustedDomains(tier, args.baseDomains ?? []);
const result = select(index, args.taskSignal, { phase, domains });
const fragment = renderInjection(result);
```

### Pattern 2: Adapter Boundary

**What:** Call `runAdapter(adapter, request)` and persist only validated `GateResult`. [VERIFIED: src/enforcement/run-adapter.ts]

**When to use:** Verify gate evidence and any future ship/approval adapter flow. [VERIFIED: 08-CONTEXT.md]

**Example:**

```typescript
// Source: src/enforcement/run-adapter.ts [VERIFIED: CodeGraph]
const result = await adapter.evaluate(request);
assertGateResult(result);
if (result.gateId !== request.gateId) throw new Error("invalid gate-result");
if (result.evaluatedBy !== adapter.name) throw new Error("invalid gate-result");
```

### Pattern 3: Atomic Evidence Store

**What:** Store fixed per-phase evidence files under `.planning/governance/gates/` using `atomicWriteFile()`. [VERIFIED: 08-CONTEXT.md, src/governance/atomic-write.ts]

**When to use:** Plan, verify, and ship evidence writes. [VERIFIED: 08-CONTEXT.md]

**Example:**

```typescript
// Source: src/governance/atomic-write.ts + src/governance/paths.ts [VERIFIED: CodeGraph]
export function gateEvidencePath(projectRoot: string, phase: string, gateId: GateId): string {
  return path.join(governanceDir(projectRoot), "gates", `${phase}-${gateId}.json`);
}
```

### Anti-Patterns to Avoid

- **Direct `adapter.evaluate(request)`:** bypasses validation and lets malformed output reach audit state. Use `runAdapter()`. [VERIFIED: 08-CONTEXT.md, src/enforcement/run-adapter.ts]
- **Overwriting `selection-state.json` at plan time:** breaks execute reload semantics. Use separate gate evidence files. [VERIFIED: 08-CONTEXT.md, src/governance/execute-hook.ts]
- **Real scanner execution:** real Semgrep/Bandit/Checkov/Grype/Gitleaks integration is deferred. Use existing `ADAPTERS`. [VERIFIED: REQUIREMENTS.md, 08-CONTEXT.md]
- **Large audit schema in Phase 8:** Phase 9 owns complete audit enrichment and APPR-01. [VERIFIED: REQUIREMENTS.md, 08-CONTEXT.md]
- **Silent missing-state skip:** existing skills and hooks fail loud on missing or malformed governance state. [VERIFIED: .claude/skills, src/governance/execute-hook.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rule selection | New selector for plan gate | `select()` + `validateSignal()` | Existing selector already encodes trigger axes, phase/domain rules, skip reasons, budget. [VERIFIED: src/select/select.ts, src/select/validate-signal.ts] |
| Summary rendering | Custom planner markdown | `renderInjection()` | Existing renderer is summary-only by construction and never reads rule bodies. [VERIFIED: src/inject/inject.ts] |
| Adapter validation | Per-hook result checks | `runAdapter()` | Existing wrapper validates schema, `gateId`, and `evaluatedBy`. [VERIFIED: src/enforcement/run-adapter.ts] |
| Durable writes | `writeFileSync` direct to final path | `atomicWriteFile()` | Existing helper creates dirs and temp-then-renames with unique temp suffix. [VERIFIED: src/governance/atomic-write.ts] |
| Tests | New test runner | `node:test` via existing npm scripts | Existing repo compiles tests from `src/**/*.test.ts` and runs `node --test`. [VERIFIED: package.json, tsconfig.json] |
| Gate schema | New audit model | Phase 7 `GateRequest`/`GateResult` plus `{request,result,metadata}` wrapper | Phase 9 owns larger audit rollup; Phase 8 stores minimal gate evidence. [VERIFIED: 08-CONTEXT.md, src/enforcement/types.ts] |

**Key insight:** Phase 8 is wiring, not invention; shortest working plan adds hook surfaces and a tiny store, while reusing Phase 7 contracts and v1 governance cores. [VERIFIED: 08-CONTEXT.md, PROJECT.md]

## Common Pitfalls

### Pitfall 1: Verify gate bypasses adapter boundary

**What goes wrong:** Hook calls `adapter.evaluate()` directly and persists malformed or spoofed output. [VERIFIED: src/enforcement/run-adapter.ts]
**Why it happens:** Adapter interface looks simple, but Phase 7 made `runAdapter()` the sanctioned boundary. [VERIFIED: STATE.md]
**How to avoid:** Planner tasks must grep/review for `runAdapter(` in verify hook code and forbid direct production adapter calls. [VERIFIED: 08-CONTEXT.md]
**Warning signs:** No test where adapter returns mismatched `gateId` or `evaluatedBy`. [VERIFIED: src/enforcement/run-adapter.test.ts]

### Pitfall 2: Plan evidence corrupts execute state

**What goes wrong:** `plan:pre` writes `.planning/governance/selection-state.json`, so `executeHook()` reloads plan-time selection instead of discuss-time selection. [VERIFIED: 08-CONTEXT.md, src/governance/execute-hook.ts]
**Why it happens:** `discussHook()` already persists selection, and reuse can drift into copy/paste. [VERIFIED: src/governance/discuss-hook.ts]
**How to avoid:** Use a separate gate evidence store under `.planning/governance/gates/`. [VERIFIED: 08-CONTEXT.md]
**Warning signs:** Plan hook imports `writeSelection()`. [VERIFIED: src/governance/state-store.ts]

### Pitfall 3: Hook output includes rule bodies

**What goes wrong:** Planner context bloats and violates core project value. [VERIFIED: PROJECT.md]
**Why it happens:** A hook reads rule files or uses `rule-detail` output instead of `renderInjection()`. [VERIFIED: src/inject/inject.ts]
**How to avoid:** Use `renderInjection(selectionResult)` and add a test that the fragment contains summaries/pointers only. [VERIFIED: src/inject/inject.ts]
**Warning signs:** Imports from `node:fs` or `gray-matter` in render path. [VERIFIED: src/inject/inject.ts]

### Pitfall 4: Ship gate treats missing evidence as pass

**What goes wrong:** Release proceeds without plan/verify evidence. [VERIFIED: 08-CONTEXT.md]
**Why it happens:** Convenience fallback or optional evidence read returns null. [VERIFIED: .claude/skills]
**How to avoid:** `ship:pre` must fail closed on missing/malformed/failing plan or verify evidence, with actionable file names. [VERIFIED: 08-CONTEXT.md]
**Warning signs:** `catch { return pass }` or messages that say missing evidence was skipped. [VERIFIED: .claude/skills]

### Pitfall 5: Same-point hook ordering not tested

**What goes wrong:** New verify evidence and existing audit hook both run at `verify:post`, but order differs from assumptions. [VERIFIED: capability.json, 08-CONTEXT.md]
**Why it happens:** Existing manifest has one verify step; Phase 8 adds another same-point step. [VERIFIED: .gsd/capabilities/aidlc-governance/capability.json]
**How to avoid:** Extend manifest contract tests and render-hooks consent tests for both `verify:post` steps and their `onError` policy. [VERIFIED: src/governance/audit-hook-contract.test.ts, src/governance/consent-verify-post.test.ts]
**Warning signs:** Manifest changed but no test covers step count/order/ref/produces/consumes. [VERIFIED: CodeGraph]

## Code Examples

### Minimal Evidence Wrapper

```typescript
// Source: Phase 8 context + Phase 7 types [VERIFIED: 08-CONTEXT.md, src/enforcement/types.ts]
type GateEvidence = {
  request: GateRequest;
  result: GateResult;
  metadata: {
    phase: string;      // "08"
    writtenAt: string;  // strict new Date().toISOString()
    source: string;     // e.g. "aidlc-governance-verify"
  };
};
```

### Verify Gate Request

```typescript
// Source: src/enforcement/types.ts + src/enforcement/run-adapter.ts [VERIFIED: CodeGraph]
const request: GateRequest = {
  gateId: "verify",
  phase: record.phase,
  taskSignal: record.taskSignal,
  rules: record.selectionResult.selected,
  requestedAt: new Date().toISOString(),
};

const adapter = ADAPTERS.get("generic-exit-ci");
if (!adapter) throw new Error("verify gate: missing generic-exit-ci adapter");
const result = await runAdapter(adapter, request);
```

### Ship Gate Missing Evidence Check

```typescript
// Source: 08-CONTEXT.md fail-closed policy [VERIFIED: 08-CONTEXT.md]
for (const gateId of ["plan", "verify"] as const) {
  const evidence = readGateEvidence(projectRoot, "08", gateId);
  if (evidence === null) {
    throw new Error(`ship gate: missing governance evidence .planning/governance/gates/08-${gateId}.json`);
  }
  if (evidence.result.status === "fail") {
    throw new Error(`ship gate: ${gateId} governance evidence failed`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Markdown guidance as enforcement | Binding `GateRequest`/`GateResult` contracts and advisory audit schema | Phase 7, 2026-07-07 | Phase 8 must wire live hooks through contracts, not markdown narration. [VERIFIED: PROJECT.md, src/schema/*.schema.json] |
| Direct adapter calls | `runAdapter()` hard-fail wrapper | Phase 7, 2026-07-07 | Verify gate gets malformed-output protection for free. [VERIFIED: STATE.md, src/enforcement/run-adapter.ts] |
| Discuss/execute only governance | Discuss, plan, execute, verify, ship loop coverage | Phase 8 scope | Plan/verify/ship hooks complete GSD loop governance. [VERIFIED: ROADMAP.md, REQUIREMENTS.md] |
| Full corpus in context | Summary-only `<governance>` fragments with lazy rule-detail | Phase 3, 2026-07-06 | Plan gate must use `renderInjection()` and never include bodies. [VERIFIED: PROJECT.md, src/inject/inject.ts] |

**Deprecated/outdated:**
- Direct `writeFileSync` to governance state: superseded by `atomicWriteFile()` for durable artifacts. [VERIFIED: src/governance/atomic-write.ts]
- Re-running selection in execute path: execute reloads persisted discuss selection; plan evidence is separate. [VERIFIED: src/governance/execute-hook.ts, 08-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GSD executes same-point capability steps in manifest order. [ASSUMED] | Common Pitfalls / Validation | Verify evidence and audit artifact ordering may differ; planner should add a render-hooks/order test before relying on order. |

## Open Questions

1. **Should verify evidence run before or after existing audit artifact on `verify:post`?**
   - What we know: existing audit skill already owns `verify:post`; Phase 8 may add verify evidence at `verify:post`. [VERIFIED: capability.json, 08-CONTEXT.md]
   - What's unclear: same-point host execution order is not proven by official docs in this session. [ASSUMED]
   - Recommendation: put verify evidence before audit in manifest if Phase 9 will later fold evidence into audit; add a manifest/render-hooks order test either way. [VERIFIED: src/governance/audit-hook-contract.test.ts]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build/test/hooks | yes | v25.2.1 | Package supports `>=22.0.0`. [VERIFIED: local command, package.json] |
| npm | Install/build scripts | yes | 11.11.0 | None needed. [VERIFIED: local command] |
| git | Optional research commit | yes | 2.45.1.windows.1 | Orchestrator can commit if hook commit fails. [VERIFIED: local command] |
| gsd-tools | Capability render/commit helpers | yes | version flag unsupported | Use direct node script path. [VERIFIED: local command] |
| compiled `dist/` | Skill-invoked hooks | yes | current dist files present | Run `npm run build` before hook integration tests. [VERIFIED: filesystem, package.json] |
| rule corpus | Selection | yes | `aidlc-rules/` exists | Build index if `rule-index.json` is absent. [VERIFIED: filesystem, src/governance/discuss-hook.ts] |

**Missing dependencies with no fallback:** none found. [VERIFIED: local commands]

**Missing dependencies with fallback:** `ctx7` CLI missing; official docs were fetched through web fallback. [VERIFIED: local command, WebSearch]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` on Node v25.2.1. [VERIFIED: package.json, local command, CITED: https://nodejs.org/api/test.html] |
| Config file | `package.json`, `tsconfig.json`, `tsconfig.build.json`. [VERIFIED: codebase] |
| Quick run command | `npm run build:test && node --test "dist-test/governance/*gate*.test.js" "dist-test/enforcement/run-adapter.test.js"` [VERIFIED: package.json] |
| Full suite command | `npm test` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-03 | `plan:pre` derives valid `TaskSignal`, selects rules, renders summary-only fragment, writes `08-plan.json` without touching `selection-state.json` | unit + manifest integration | `npm run build:test && node --test "dist-test/governance/plan-hook.test.js"` | Missing - Wave 0. [VERIFIED: filesystem] |
| GATE-04 | `verify:post` builds `GateRequest`, calls `runAdapter()`, stores validated pass/fail evidence | unit | `npm run build:test && node --test "dist-test/governance/verify-gate-hook.test.js" "dist-test/enforcement/run-adapter.test.js"` | Missing - Wave 0. [VERIFIED: filesystem] |
| GATE-05 | `ship:pre` fails closed when plan/verify evidence is missing/malformed/fail and passes when both pass | unit + manifest integration | `npm run build:test && node --test "dist-test/governance/ship-gate-hook.test.js"` | Missing - Wave 0. [VERIFIED: filesystem] |

### Sampling Rate

- **Per task commit:** targeted `npm run build:test && node --test "dist-test/governance/<new-test>.test.js"`. [VERIFIED: package.json]
- **Per wave merge:** `npm test`. [VERIFIED: package.json]
- **Phase gate:** full suite green before `$gsd-verify-work`. [VERIFIED: .planning/config.json]

### Wave 0 Gaps

- [ ] `src/governance/gate-evidence-store.test.ts` - read/write/null/malformed/fixed path behavior for `.planning/governance/gates/{NN}-{gate}.json`. [VERIFIED: filesystem]
- [ ] `src/governance/plan-hook.test.ts` - GATE-03 selection/render/evidence/no-selection-state-overwrite. [VERIFIED: filesystem]
- [ ] `src/governance/verify-gate-hook.test.ts` - GATE-04 `runAdapter()` path and malformed adapter hard-fail. [VERIFIED: filesystem]
- [ ] `src/governance/ship-gate-hook.test.ts` - GATE-05 missing/fail/pass matrix. [VERIFIED: filesystem]
- [ ] Extend `src/governance/audit-hook-contract.test.ts` and consent render-hooks tests for new skill refs/points/onError. [VERIFIED: CodeGraph]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | No user auth/session feature in Phase 8. [VERIFIED: 08-CONTEXT.md] |
| V3 Session Management | no | No session handling in Phase 8. [VERIFIED: 08-CONTEXT.md] |
| V4 Access Control | yes | GSD capability consent/activation remains host concern; hook code should not bypass registry `when`. [VERIFIED: .claude/skills, capability.json] |
| V5 Input Validation | yes | `validateSignal()`, `validateGateResult()`, fixed gate ids, strict ISO timestamps. [VERIFIED: src/select/validate-signal.ts, src/enforcement/validate-gate-result.ts, src/schema/gate-*.schema.json] |
| V6 Cryptography | limited | No custom crypto; existing `atomicWriteFile()` uses Node `crypto.randomUUID()` only for temp-file uniqueness. [VERIFIED: src/governance/atomic-write.ts] |

### Known Threat Patterns for TypeScript/GSD Hooks

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spoofed adapter result | Tampering | Use `runAdapter()` to validate schema and require `result.gateId === request.gateId` plus `result.evaluatedBy === adapter.name`. [VERIFIED: src/enforcement/run-adapter.ts] |
| Malformed persisted evidence | Tampering/Repudiation | Store `{request,result,metadata}` and validate/read loud; ship must fail closed on malformed JSON. [VERIFIED: 08-CONTEXT.md, src/governance/state-store.ts pattern] |
| Context bloat or rule-body leakage | Information Disclosure/DoS | Use `renderInjection()` only; it imports no file-reading modules and renders summaries/pointers. [VERIFIED: src/inject/inject.ts] |
| Missing gate evidence at ship | Repudiation | `ship:pre` blocks on missing `08-plan.json` or `08-verify.json`. [VERIFIED: 08-CONTEXT.md] |
| Same-point hook order drift | Tampering/Repudiation | Manifest contract and render-hooks tests must assert new step refs and order assumptions. [VERIFIED: src/governance/audit-hook-contract.test.ts] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/08-remaining-gate-hooks/08-CONTEXT.md` - locked decisions, deferred scope, canonical refs. [VERIFIED: codebase]
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, `.planning/STATE.md` - requirement mapping and milestone state. [VERIFIED: codebase]
- `.claude/skills/aidlc-governance-*.md` - existing skill patterns and fail-loud behavior. [VERIFIED: codebase]
- `src/governance/discuss-hook.ts`, `execute-hook.ts`, `state-store.ts`, `atomic-write.ts`, `paths.ts`, `audit-artifact.ts`, `src/inject/inject.ts` - hook/state/render patterns. [VERIFIED: CodeGraph/filesystem]
- `src/enforcement/types.ts`, `adapters.ts`, `run-adapter.ts`, `validate-gate-result.ts`, `src/schema/gate-*.schema.json` - Phase 7 contract boundary. [VERIFIED: CodeGraph/filesystem]
- `package.json`, `tsconfig.json`, `tsconfig.build.json` - build/test/dependency facts. [VERIFIED: codebase]

### Secondary (MEDIUM confidence)

- Node.js official test docs - `node:test` behavior and runner usage. [CITED: https://nodejs.org/api/test.html]
- Ajv official docs - JSON Schema 2020-12, strict mode, formats, keywords, compiled validators. [CITED: https://ajv.js.org/json-schema.html], [CITED: https://ajv.js.org/strict-mode.html], [CITED: https://ajv.js.org/api.html]
- npm registry and GSD package-legitimacy seam - current package versions, download signals, postinstall signals, SUS flags. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- Same-point GSD capability execution order follows manifest order. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions came from `package.json`, local commands, npm registry, and official docs. [VERIFIED: codebase, npm registry]
- Architecture: HIGH - phase choices are locked in CONTEXT.md and existing code paths were inspected through CodeGraph/filesystem. [VERIFIED: 08-CONTEXT.md, CodeGraph]
- Pitfalls: HIGH - most pitfalls map directly to existing tests, state helpers, or Phase 7 contracts; only same-point hook order remains assumed. [VERIFIED: CodeGraph, ASSUMED]

**Research date:** 2026-07-07
**Valid until:** 2026-08-06 for local architecture; package freshness should be rechecked before dependency changes. [VERIFIED: local commands, npm registry]
