# Phase 08: Remaining Gate Hooks - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/governance/paths.ts` | utility | transform | `src/governance/paths.ts` | exact |
| `src/governance/gate-evidence-store.ts` | utility/store | file-I/O | `src/governance/state-store.ts` | exact |
| `src/governance/plan-hook.ts` | hook | request-response + file-I/O | `src/governance/discuss-hook.ts` | exact |
| `src/governance/verify-gate-hook.ts` | hook | request-response + file-I/O | `src/governance/execute-hook.ts` + `src/enforcement/run-adapter.ts` | role-match |
| `src/governance/ship-gate-hook.ts` | hook | request-response + file-I/O | `src/governance/execute-hook.ts` + `src/governance/audit-artifact.ts` | role-match |
| `src/governance/gate-evidence-store.test.ts` | test | file-I/O | `src/governance/state-store.test.ts` | exact |
| `src/governance/plan-hook.test.ts` | test | request-response + file-I/O | `src/governance/discuss-hook.test.ts` | exact |
| `src/governance/verify-gate-hook.test.ts` | test | request-response | `src/enforcement/run-adapter.test.ts` | exact |
| `src/governance/ship-gate-hook.test.ts` | test | file-I/O | `src/governance/execute-hook.test.ts` | role-match |
| `src/governance/audit-hook-contract.test.ts` | test | config contract | `src/governance/audit-hook-contract.test.ts` | exact |
| `src/governance/consent.test.ts` | test | event-driven | `src/governance/consent.test.ts` | exact |
| `src/governance/consent-verify-post.test.ts` | test | event-driven | `src/governance/consent-verify-post.test.ts` | exact |
| `.claude/skills/aidlc-governance-plan/SKILL.md` | config/skill | request-response | `.claude/skills/aidlc-governance-discuss/SKILL.md` | exact |
| `.claude/skills/aidlc-governance-verify/SKILL.md` | config/skill | request-response | `.claude/skills/aidlc-governance-audit/SKILL.md` | role-match |
| `.claude/skills/aidlc-governance-ship/SKILL.md` | config/skill | request-response | `.claude/skills/aidlc-governance-execute/SKILL.md` | role-match |
| `.gsd/capabilities/aidlc-governance/capability.json` | config | event-driven | `.gsd/capabilities/aidlc-governance/capability.json` | exact |

## Pattern Assignments

### `src/governance/paths.ts` (utility, transform)

**Analog:** `src/governance/paths.ts`

**Path helper pattern** (lines 12-20):

```typescript
import path from "node:path";
import type { Phase } from "../types.js";

export function governanceDir(projectRoot: string): string {
  return path.join(projectRoot, ".planning", "governance");
}
```

**Existing canonical state path** (lines 29-30):

```typescript
export function selectionStatePath(projectRoot: string): string {
  return path.join(governanceDir(projectRoot), "selection-state.json");
}
```

**Copy pattern:** add fixed helpers here, not inline path strings in hooks:

```typescript
export function gateEvidencePath(projectRoot: string, phase: string, gateId: GateId): string {
  return path.join(governanceDir(projectRoot), "gates", `${phase}-${gateId}.json`);
}
```

Keep pure: no I/O, clock, random, config reads.

---

### `src/governance/gate-evidence-store.ts` (utility/store, file-I/O)

**Analog:** `src/governance/state-store.ts`

**Imports pattern** (lines 22-37):

```typescript
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { atomicWriteFile } from "./atomic-write.js";
import type {
  Phase,
  RuleIndex,
  SelectionConfig,
  SelectionResult,
  TaskSignal,
} from "../types.js";
import type { RiskTier } from "./risk.js";
import {
  phaseDir,
  phaseRecordPath,
  selectionStatePath,
} from "./paths.js";
```

**Atomic JSON write pattern** (lines 58-66):

```typescript
function atomicWriteJson(finalPath: string, record: GovernanceRecord): void {
  atomicWriteFile(finalPath, JSON.stringify(record, null, 2));
}
```

**Read-loud pattern** (lines 75-108):

```typescript
function readJsonRecord(filePath: string): GovernanceRecord | null {
  if (!existsSync(filePath)) return null;
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `malformed governance state at ${filePath}: unreadable (${String(err)})`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `malformed governance state at ${filePath}: ${String(err)}`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("selectionResult" in parsed) ||
    typeof (parsed as { selectionResult: unknown }).selectionResult !== "object" ||
    (parsed as { selectionResult: unknown }).selectionResult === null
  ) {
    throw new Error(
      `malformed governance state at ${filePath}: record missing or invalid selectionResult`,
    );
  }
  return parsed as GovernanceRecord;
}
```

**Atomic primitive** from `src/governance/atomic-write.ts` (lines 29-40):

```typescript
export function atomicWriteFile(finalPath: string, data: string): void {
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmpPath = `${finalPath}.${process.pid}-${randomUUID()}.tmp`;
  try {
    writeFileSync(tmpPath, data, "utf8");
    renameSync(tmpPath, finalPath);
  } catch (err) {
    rmSync(tmpPath, { force: true });
    throw err;
  }
}
```

**Copy pattern:** missing evidence returns `null`; malformed evidence throws. Shape check should require `{ request, result, metadata }`, `metadata.phase`, `metadata.writtenAt`, `metadata.source`, and matching `request.gateId === result.gateId`.

---

### `src/governance/plan-hook.ts` (hook, request-response + file-I/O)

**Analog:** `src/governance/discuss-hook.ts`

**Imports pattern** (lines 23-40):

```typescript
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type {
  Phase,
  RuleIndex,
  SelectionConfig,
  TaskSignal,
} from "../types.js";
import { validateSignal } from "../select/validate-signal.js";
import { select } from "../select/select.js";
import { renderInjection } from "../inject/inject.js";
import { buildIndex } from "../index/build.js";
import { validateIndex } from "../index/validate-index.js";
import { classifyRisk, riskAdjustedDomains } from "./risk.js";
```

**Core hook flow** (lines 166-213):

```typescript
export function discussHook(args: DiscussHookArgs): DiscussHookResult {
  const phase = resolvePhase(args);
  const indexPath = args.indexPath ?? path.join(args.projectRoot, "rule-index.json");
  const index = resolveIndex(indexPath);
  validateSignal(args.taskSignal);
  const tier = classifyRisk(args.taskSignal, phase);
  const domains = riskAdjustedDomains(tier, args.baseDomains ?? []);
  const config: SelectionConfig = {
    phase,
    domains,
    ...(args.budget !== undefined ? { budget: args.budget } : {}),
  };
  const result = select(index, args.taskSignal, config);
  const fragment = renderInjection(result);
  const record: GovernanceRecord = {
    phase,
    taskSignal: args.taskSignal,
    selectionConfig: config,
    selectionResult: result,
    riskTier: tier,
    timestamp: new Date().toISOString(),
  };
  writeSelection(record, args.projectRoot);
  return { fragment, record };
}
```

**Copy pattern:** keep same selector/render chain. Replace `writeSelection()` with gate evidence write under `.planning/governance/gates/{NN}-plan.json` so plan does not corrupt execute's canonical `selection-state.json`.

**Error pattern:** copy fail-loud index and signal behavior. Do not emit empty governance on missing index, malformed STATE, or invalid `TaskSignal`.

---

### `src/governance/verify-gate-hook.ts` (hook, request-response + file-I/O)

**Analogs:** `src/enforcement/run-adapter.ts`, `src/enforcement/adapters.ts`, `src/enforcement/types.ts`

**Adapter boundary** from `src/enforcement/run-adapter.ts` (lines 9-26):

```typescript
export async function runAdapter(
  adapter: GateAdapter,
  request: GateRequest,
): Promise<GateResult> {
  const result = await adapter.evaluate(request);
  assertGateResult(result);
  if (result.gateId !== request.gateId) {
    throw new Error(
      `invalid gate-result: gateId '${result.gateId}' does not match request gateId '${request.gateId}'`,
    );
  }
  if (result.evaluatedBy !== adapter.name) {
    throw new Error(
      `invalid gate-result: evaluatedBy '${result.evaluatedBy}' does not match adapter '${adapter.name}'`,
    );
  }
  return result;
}
```

**Request/result contract** from `src/enforcement/types.ts` (lines 43-58):

```typescript
export interface GateRequest {
  gateId: GateId;
  phase: Phase;
  taskSignal: TaskSignal;
  rules: AuditAppliedRule[];
  requestedAt: string;
}

export interface GateResult {
  gateId: GateId;
  status: "pass" | "fail" | "waived";
  findings: GateFinding[];
  evaluatedBy: string;
  evaluatedAt: string;
}
```

**Production no-op adapter registry** from `src/enforcement/adapters.ts` (lines 26-39, 66-72):

```typescript
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

export const ADAPTERS: ReadonlyMap<string, GateAdapter> = new Map(
  STUB_NAMES.map((name) => [name, noopAdapter(name)] as const),
);
```

**Copy pattern:** build `GateRequest` with `gateId: "verify"` and call `runAdapter(adapter, request)`. Never call `adapter.evaluate()` directly. Production path uses `ADAPTERS`; tests may inject `ECHO_ADAPTERS` or custom bad adapters.

---

### `src/governance/ship-gate-hook.ts` (hook, request-response + file-I/O)

**Analogs:** `src/governance/execute-hook.ts`, `src/governance/audit-artifact.ts`

**Fail-loud missing state pattern** from `src/governance/execute-hook.ts` (lines 41-47):

```typescript
export function executeHook(args: ExecuteHookArgs): ExecuteHookResult {
  const readRoot = projectRootForState(args);
  const statePath = args.statePath ?? selectionStatePath(args.projectRoot);
  const record = readSelection(readRoot);
  if (record === null) {
    throw new Error(`executeHook: missing governance selection state at ${statePath}`);
  }
```

**Small assertion helpers** from `src/governance/audit-artifact.ts` (lines 71-93):

```typescript
function assertRecordObject(value: unknown, field: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`malformed governance state: ${field} must be an object`);
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`malformed governance state: ${field} must be a non-empty string`);
  }
}
```

**Strict timestamp pattern** from `src/governance/audit-artifact.ts` (lines 108-126):

```typescript
const ISO_8601_STRICT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function assertTimestamp(value: unknown, field: string): asserts value is string {
  assertString(value, field);
  if (!ISO_8601_STRICT.test(value)) {
    throw new Error(
      `malformed governance state: ${field} must be an ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)`,
    );
  }
}
```

**Copy pattern:** read required `plan` and `verify` evidence. Missing, malformed, `status: "fail"`, or unexpected gate id must throw with file path. On pass, write `ship` evidence.

---

### `src/governance/gate-evidence-store.test.ts` (test, file-I/O)

**Analog:** `src/governance/state-store.test.ts`

**Imports and fixture style** (lines 7-27):

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
```

**Temp root helper** (lines 69-77):

```typescript
function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-governance-store-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
```

**Missing and malformed tests** (lines 142-180):

```typescript
test("readSelection returns null when the file does not exist yet (no record - not an error)", () => {
  withTempRoot((root) => {
    const result = readSelection(root);
    assert.equal(result, null);
  });
});

test("readSelection THROWS on a malformed (non-JSON) file - never silently returns null/empty (Pitfall 7)", () => {
  withTempRoot((root) => {
    const finalPath = selectionStatePath(root);
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(finalPath, "{not valid json", "utf8");
    assert.throws(
      () => readSelection(root),
      /malformed governance state/i,
    );
  });
});
```

**Copy pattern:** test write/read round trip, null on missing, throw on non-JSON, throw on missing `request/result/metadata`, strict path `.planning/governance/gates/{NN}-{gate}.json`, and no leftover `.tmp`.

---

### `src/governance/plan-hook.test.ts` (test, request-response + file-I/O)

**Analog:** `src/governance/discuss-hook.test.ts`

**Fixture index and state pattern** (lines 92-162):

```typescript
function writeFixtureIndex(root: string): void {
  const corpusDir = path.join(root, "fixture-corpus");
  mkdirSync(path.join(corpusDir, "enterprise"), { recursive: true });
  mkdirSync(path.join(corpusDir, "domain", "security"), { recursive: true });
  writeFileSync(path.join(corpusDir, "enterprise", "baseline.md"), baselineRuleContents("baseline-always-on"), "utf8");
  writeFileSync(path.join(corpusDir, "domain", "security", "auth-rule.md"), securityAuthRuleContents("security-auth-rule"), "utf8");
  const index = buildIndex(corpusDir);
  writeIndex(index, path.join(root, "rule-index.json"));
}

function withFixtureRoot<T>(fn: (root: string) => T, statePhase = 2): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-discuss-hook-"));
  try {
    writeFixtureIndex(root);
    writeState(root, statePhase);
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
```

**Fragment and persisted record assertion** (lines 166-183):

```typescript
test("discussHook baseline: produces a <governance> fragment AND persists a record (deep-equal selectionResult)", () => {
  withFixtureRoot((root) => {
    const { fragment, record } = discussHook({
      projectRoot: root,
      taskSignal: signal({ keywords: ["docs"] }),
    });
    assert.ok(fragment.startsWith("<governance>"));
    assert.ok(fragment.includes("</governance>"));
    const reloaded = readSelection(root);
    assert.ok(reloaded !== null, "expected a persisted record, got null");
    assert.deepEqual(reloaded.selectionResult, record.selectionResult);
  });
});
```

**No rederive pattern** from `src/governance/execute-hook.test.ts` (lines 165-180):

```typescript
unlinkSync(path.join(root, "rule-index.json"));
writeState(root, 5);

const captured = captureProcessWrites(() => executeHook({ projectRoot: root }));
assert.equal(captured.result.fragment, expected);
assert.deepEqual(captured.result.record.selectionResult, discussed.record.selectionResult);
```

**Copy pattern:** assert plan hook writes `08-plan.json`, renders summary-only governance, and does not create or overwrite `.planning/governance/selection-state.json`.

---

### `src/governance/verify-gate-hook.test.ts` (test, request-response)

**Analog:** `src/enforcement/run-adapter.test.ts`

**Gate request fixture** (lines 7-23):

```typescript
function makeValidGateRequest(): GateRequest {
  return {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "feature", keywords: [], paths: [] },
    rules: [
      {
        id: "require-mfa",
        severity: "critical",
        summary: "All access requires MFA.",
        matchedAxis: "always-in-phase",
        matchedValue: "always-in-phase",
      },
    ],
    requestedAt: "2026-07-07T00:00:00.000Z",
  };
}
```

**Malformed adapter tests** (lines 36-60, 98-127):

```typescript
test("runAdapter throws when an adapter returns a status out of enum", async () => {
  const bad = {
    name: "bad",
    async evaluate() {
      return {
        gateId: "verify",
        status: "maybe",
        findings: [],
        evaluatedBy: "bad",
        evaluatedAt: "2026-07-07T00:00:00.000Z",
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /invalid gate-result/);
});
```

```typescript
test("runAdapter throws when result gateId does not match the request gateId", async () => {
  const bad = {
    name: "semgrep",
    async evaluate() {
      return {
        gateId: "ship",
        status: "pass",
        findings: [],
        evaluatedBy: "semgrep",
        evaluatedAt: "2026-07-07T00:00:00.000Z",
      };
    },
  } as unknown as GateAdapter;
  await assert.rejects(runAdapter(bad, makeValidGateRequest()), /gateId 'ship'/);
});
```

**Copy pattern:** include a custom adapter that would pass direct `evaluate()` but fail through `runAdapter()`. Assert evidence file contains validated `GateResult`.

---

### `src/governance/ship-gate-hook.test.ts` (test, file-I/O)

**Analog:** `src/governance/execute-hook.test.ts`

**Missing and malformed state tests** (lines 235-254):

```typescript
test("executeHook loud-on-missing throws when selection-state.json is absent", () => {
  withFixtureRoot((root) => {
    assert.throws(
      () => executeHook({ projectRoot: root }),
      /selection-state\.json|missing|governance selection state/i,
    );
  });
});

test("executeHook loud-on-malformed propagates state-store parse failures", () => {
  withFixtureRoot((root) => {
    const statePath = selectionStatePath(root);
    mkdirSync(path.dirname(statePath), { recursive: true });
    writeFileSync(statePath, "{not json", "utf8");

    assert.throws(
      () => executeHook({ projectRoot: root }),
      /malformed governance state/i,
    );
  });
});
```

**No-write-on-failure pattern** from `src/governance/audit-artifact.test.ts` (lines 197-216):

```typescript
assert.throws(
  () => writeGovernanceAudit({ projectRoot: root, outputPath }),
  /selectionResult\.selected\[0\]\.id/i,
);
assert.equal(existsSync(outputPath), false);
```

**Copy pattern:** table-test missing plan, missing verify, malformed plan, malformed verify, failed plan, failed verify, and both pass. Assert ship evidence is not written on failure and is written on pass.

---

### `src/governance/audit-hook-contract.test.ts` (test, config contract)

**Analog:** `src/governance/audit-hook-contract.test.ts`

**Manifest loader and step filter pattern** (lines 58-68):

```typescript
function manifest(): CapabilityManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as CapabilityManifest;
}

function auditSteps(capability: CapabilityManifest): CapabilityStep[] {
  return (capability.steps ?? []).filter(
    (step) =>
      step.point === "verify:post" &&
      step.ref?.skill === "aidlc-governance-audit",
  );
}
```

**Step contract assertion** (lines 118-135):

```typescript
test("capability manifest declares one artifact-only audit verify:post step", () => {
  const capability = manifest();
  const steps = auditSteps(capability);
  assert.equal(steps.length, 1);
  const step = steps[0] as CapabilityStep;

  assert.ok(capability.skills?.includes("aidlc-governance-audit"));
  assert.deepEqual(step.produces, ["GOVERNANCE.md"]);
  assert.deepEqual(step.consumes, [".planning/governance/selection-state.json"]);
  assert.equal(step.when, "governance.enabled");
  assert.equal(step.onError, "halt");
});
```

**Copy pattern:** add filters/assertions for:

```text
plan:pre  -> aidlc-governance-plan   produces planner-context + .planning/governance/gates/{NN}-plan.json
verify:post -> aidlc-governance-verify produces .planning/governance/gates/{NN}-verify.json
ship:pre  -> aidlc-governance-ship   consumes plan + verify evidence, produces ship evidence
```

Keep existing audit assertion; governance verify must compose with audit, not replace it.

---

### `src/governance/consent.test.ts` and `src/governance/consent-verify-post.test.ts` (test, event-driven)

**Analogs:** same files

**Runtime shim skill registration** from `src/governance/consent.test.ts` (lines 80-125):

```typescript
function writeRuntimeShim(tmpRoot: string): { configDir: string; gsdTools: string } {
  const sourceGsdCore = resolveInstalledGsdCore();
  const configDir = path.join(tmpRoot, "runtime");
  const runtimeGsdCore = path.join(configDir, "gsd-core");
  cpSync(sourceGsdCore, runtimeGsdCore, { recursive: true });

  writeSkill(configDir, "gsd-aidlc-governance-discuss");
  writeSkill(configDir, "gsd-aidlc-governance-execute");
  writeSkill(configDir, "gsd-aidlc-governance-audit");
}

function writeSkill(configDir: string, dirName: string): void {
  const skillDir = path.join(configDir, "skills", dirName);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      `name: "${dirName}"`,
      'description: "Consent integration test fixture."',
      "---",
      "",
    ].join("\n"),
    "utf8",
  );
}
```

**Hook assertion helper** from `src/governance/consent.test.ts` (lines 215-227):

```typescript
function assertGovernanceHook(
  envelope: RenderHooksEnvelope,
  skill: string,
  produces: string[],
  consumes: string[] = [],
): void {
  const hook = hookFor(envelope);
  assert.ok(hook, `${envelope.point} includes ${CAP_ID}`);
  assert.equal(hook.kind, "step");
  assert.equal(hook.ref?.skill, skill);
  assert.deepEqual(hook.produces ?? [], produces);
  assert.deepEqual(hook.consumes ?? [], consumes);
}
```

**Verify onError policy assertion** from `src/governance/consent-verify-post.test.ts` (lines 336-346):

```typescript
const envelope = renderHooks(gsdTools, projectRoot, configDir, "verify:post");
const hook = verifyPostHook(envelope);
assert.ok(hook, "verify:post post-consent must include aidlc-governance-audit hook");
assert.equal(hook.ref?.skill, "aidlc-governance-audit");
assert.deepEqual(hook.produces ?? [], ["GOVERNANCE.md"]);
assert.deepEqual(hook.consumes ?? [], [".planning/governance/selection-state.json"]);
assert.equal(hook.onError, "halt");
```

**Copy pattern:** add fixture skills for `gsd-aidlc-governance-plan`, `gsd-aidlc-governance-verify`, and `gsd-aidlc-governance-ship`. Assert pre-consent inactive, post-consent active, revoke inactive, tamper inactive for new points.

---

### `.claude/skills/aidlc-governance-plan/SKILL.md` (config/skill, request-response)

**Analog:** `.claude/skills/aidlc-governance-discuss/SKILL.md`

**Frontmatter pattern** (lines 1-4):

```markdown
---
name: aidlc-governance-discuss
description: AI-DLC governance discuss gate - derives the task signal + risk tier, calls the selection pure core, and attaches the rendered <governance> fragment to the discussion context. Fires at discuss:pre when governance.enabled is true.
---
```

**Thin skill command pattern** (lines 19-43):

```markdown
3. **Invoke the discuss hook.** Run:

   ```
   node dist/governance/discuss-hook.js
   ```

   The hook:
   - classifies risk via `classifyRisk(signal, phase)`,
   - widens the domain subscription via `riskAdjustedDomains(tier, base)`,
   - validates the signal via `validateSignal`,
   - selects via the pure `select(index, signal, config)` core,
   - renders the fragment via `renderInjection(result)`,
   - persists the full `SelectionResult` atomically to
     `.planning/governance/selection-state.json` (temp-then-rename).
```

**Copy pattern:** skill derives host planning signal, runs `node dist/governance/plan-hook.js`, attaches stdout planner context, and does not reimplement selection/rendering/evidence writes.

---

### `.claude/skills/aidlc-governance-verify/SKILL.md` (config/skill, request-response)

**Analog:** `.claude/skills/aidlc-governance-audit/SKILL.md`

**Fail-loud locate and invoke pattern** (lines 10-35):

```markdown
1. **Locate persisted state.** Confirm `.planning/governance/selection-state.json`
   exists under the project root. It MUST have been written by a prior
   `discuss:pre` run. If it is missing, FAIL LOUD - do not synthesize audit
   content.

3. **Invoke the audit writer.** Run:

   ```bash
   node dist/governance/audit-artifact.js <projectRoot> <phaseDir>/GOVERNANCE.md
   ```
```

**Copy pattern:** verify skill resolves phase, invokes `node dist/governance/verify-gate-hook.js <projectRoot> <phase>`, and fails the hook if the runner exits non-zero. Do not call adapters or parse results in markdown.

---

### `.claude/skills/aidlc-governance-ship/SKILL.md` (config/skill, request-response)

**Analog:** `.claude/skills/aidlc-governance-execute/SKILL.md`

**Missing state fail-loud pattern** (lines 13-31):

```markdown
1. **Locate persisted state.** Confirm `.planning/governance/selection-state.json`
   exists. It MUST have been written by a prior `discuss:pre` run. If it is
   missing, FAIL LOUD - do not silently skip governance.

2. **Invoke the execute hook.** Run:

   ```bash
   node dist/governance/execute-hook.js
   ```
```

**Copy pattern:** ship skill checks no policy itself. It invokes `node dist/governance/ship-gate-hook.js <projectRoot> <phase>` and surfaces stderr. The TS hook owns evidence loading and blocking.

---

### `.gsd/capabilities/aidlc-governance/capability.json` (config, event-driven)

**Analog:** same file

**Current skill list and steps** (lines 16-57):

```json
"skills": [
  "aidlc-governance-discuss",
  "aidlc-governance-execute",
  "aidlc-governance-audit"
],
"steps": [
  {
    "point": "discuss:pre",
    "ref": { "skill": "aidlc-governance-discuss" },
    "produces": ["CONTEXT.md", ".planning/governance/selection-state.json"],
    "consumes": [],
    "when": "governance.enabled",
    "onError": "skip"
  },
  {
    "point": "verify:post",
    "ref": { "skill": "aidlc-governance-audit" },
    "produces": ["GOVERNANCE.md"],
    "consumes": [".planning/governance/selection-state.json"],
    "when": "governance.enabled",
    "onError": "halt"
  }
]
```

**Copy pattern:** append new skills to `skills`; append additive steps. Preserve existing discuss, execute, and audit steps. Use canonical points:

```json
{ "point": "plan:pre", "ref": { "skill": "aidlc-governance-plan" }, "when": "governance.enabled" }
{ "point": "verify:post", "ref": { "skill": "aidlc-governance-verify" }, "when": "governance.enabled", "onError": "halt" }
{ "point": "ship:pre", "ref": { "skill": "aidlc-governance-ship" }, "when": "governance.enabled", "onError": "halt" }
```

## Shared Patterns

### Thin Hook Wrappers

**Source:** `src/governance/discuss-hook.ts` lines 166-213 and `src/governance/execute-hook.ts` lines 41-58

**Apply to:** `plan-hook.ts`, `verify-gate-hook.ts`, `ship-gate-hook.ts`

```typescript
validateSignal(args.taskSignal);
const tier = classifyRisk(args.taskSignal, phase);
const domains = riskAdjustedDomains(tier, args.baseDomains ?? []);
const result = select(index, args.taskSignal, config);
const fragment = renderInjection(result);
```

Keep wrappers thin. Core logic belongs in selector, renderer, adapter wrapper, and evidence store.

### Adapter Boundary

**Source:** `src/enforcement/run-adapter.ts` lines 9-26

**Apply to:** `verify-gate-hook.ts`

```typescript
const result = await adapter.evaluate(request);
assertGateResult(result);
if (result.gateId !== request.gateId) throw new Error(...);
if (result.evaluatedBy !== adapter.name) throw new Error(...);
return result;
```

Planner must require `runAdapter(adapter, request)`, not direct `adapter.evaluate(request)`.

### Atomic Evidence Writes

**Source:** `src/governance/atomic-write.ts` lines 29-40

**Apply to:** all gate evidence writes

```typescript
mkdirSync(path.dirname(finalPath), { recursive: true });
const tmpPath = `${finalPath}.${process.pid}-${randomUUID()}.tmp`;
writeFileSync(tmpPath, data, "utf8");
renameSync(tmpPath, finalPath);
```

Use `atomicWriteFile()` via evidence store. No direct `writeFileSync()` in hooks.

### Strict Timestamps

**Source:** `src/governance/audit-artifact.ts` lines 108-126

**Apply to:** `GateRequest.requestedAt`, `GateResult.evaluatedAt`, evidence `metadata.writtenAt`

```typescript
const ISO_8601_STRICT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
```

Use `new Date().toISOString()` for writes; reject non-canonical persisted timestamps on reads where validation happens.

### Manifest And Consent Gates

**Source:** `src/governance/audit-hook-contract.test.ts` lines 118-135, `src/governance/consent-verify-post.test.ts` lines 336-346

**Apply to:** new capability steps and skills

```typescript
assert.equal(step.when, "governance.enabled");
assert.equal(step.onError, "halt");
assert.deepEqual(step.consumes, [".planning/governance/selection-state.json"]);
```

Plan may use `onError: "skip"` only if planner explicitly preserves existing anti-bloat behavior. Verify and ship should use `onError: "halt"` because evidence loss is blocking.

## No Analog Found

None. All planned files have strong local analogs.

## Metadata

**Analog search scope:** `src/governance/**`, `src/enforcement/**`, `.claude/skills/aidlc-governance-*`, `.gsd/capabilities/aidlc-governance/capability.json`

**Files scanned:** 101 repository files plus CodeGraph symbol index.

**Project instructions:** no repo-root `AGENTS.md` file exists; user-supplied AGENTS instructions applied. `.codegraph/` exists and CodeGraph was used before text/file search.

**Pattern extraction date:** 2026-07-07
