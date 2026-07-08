# Phase 9: Complete Audit Record & Approval - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 13 (4 new modules, 3 new schemas, 4 modifies, 3 new tests)
**Analogs found:** 13 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| NEW `src/governance/approval-store.ts` | service / durable-store | file-I/O | `src/governance/gate-evidence-store.ts` | exact |
| NEW `src/governance/test-evidence.ts` | service / durable-store + parser | file-I/O + transform | `src/governance/gate-evidence-store.ts` | role-match (parser half is new — no codebase precedent) |
| NEW `src/governance/audit-enrich.ts` | utility / pure helper | transform | `src/governance/audit-artifact.ts` (`buildAuditRecord` enrichment + `assertOneOf`/`assertTimestamp` guards) | role-match |
| MODIFY `src/governance/audit-artifact.ts` | service / writer | file-I/O + transform | (self — extend in place) | exact (v1→v2 bump) |
| MODIFY `src/governance/ship-gate-hook.ts` | hook / fail-closed gate | request-response | (self — extend `readRequiredEvidence`/`assertNonBlocking`) | exact |
| MODIFY `src/governance/paths.ts` | utility / path helper | pure | (self — add `approvalPath` + `testEvidencePath`) | exact |
| NEW `src/schema/approval.schema.json` | config / contract | n/a (declarative) | `src/schema/gate-result.schema.json` | exact |
| NEW `src/schema/test-evidence.schema.json` | config / contract | n/a (declarative) | `src/schema/gate-result.schema.json` | exact |
| MODIFY `src/schema/audit-artifact.schema.json` | config / contract | n/a (declarative) | (self — v1→v2 bump) | exact |
| NEW `src/enforcement/validate-approval.ts` | service / validator | transform | `src/enforcement/validate-gate-result.ts` | exact |
| NEW `src/governance/approval-store.test.ts` | test | n/a | `src/governance/gate-evidence-store.test.ts` | exact |
| NEW `src/governance/test-evidence.test.ts` | test | n/a | `src/governance/gate-evidence-store.test.ts` + `audit-artifact.test.ts` (determinism) | exact |
| NEW `src/governance/audit-enrich.test.ts` | test | n/a | `src/governance/audit-artifact.test.ts` | role-match |
| MODIFY `.gsd/capabilities/aidlc-governance/capability.json` | config / hook manifest | n/a | (self — extend `steps[].produces`/`consumes`) | exact |

## Pattern Assignments

### `src/governance/approval-store.ts` (service / durable-store, file-I/O)

**Analog:** `src/governance/gate-evidence-store.ts` (read in full, 168 lines)

Clone shape 1:1. Replace `GateEvidence`→`ApprovalRecord`, `assertEvidence`→`assertApproval`, `gateEvidencePath`→`approvalPath`, drop the `validateGateResult` call (approval has its own validator — see validator pattern below), keep the `existsSync → null` + `try/catch readFileSync` + `try/catch JSON.parse` + `assertXxx` loud-fail ladder.

**Imports pattern** (lines 1-5):
```typescript
import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./atomic-write.js";
import { approvalPath } from "./paths.js";
import { validateApproval } from "../enforcement/validate-approval.js";
```

**Durable-store shape** (lines 22-24, 107-168):
```typescript
function fail(filePath: string, detail: string): never {
  throw new Error(`malformed approval at ${filePath}: ${detail}`);
}
// ...assertObject / assertString / assertTimestamp / assertOneOf helpers
// mirroring gate-evidence-store.ts lines 26-62...

export function writeApproval(projectRoot: string, phaseNumber: string, approval: ApprovalRecord): void {
  const filePath = approvalPath(projectRoot, phaseNumber);
  assertApproval(approval, filePath, phaseNumber);  // assert BEFORE write
  atomicWriteFile(filePath, JSON.stringify(approval, null, 2));
}

export function readApproval(projectRoot: string, phaseNumber: string): ApprovalRecord | null {
  const filePath = approvalPath(projectRoot, phaseNumber);
  if (!existsSync(filePath)) return null;
  let raw: string;
  try { raw = readFileSync(filePath, "utf8"); }
  catch (err) { fail(filePath, `unreadable (${String(err)})`); }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch (err) { fail(filePath, String(err)); }
  assertApproval(parsed, filePath, phaseNumber);  // assert AFTER read
  return parsed;
}
```

**Key constraint (D-07):** `writePendingApproval` (ship-hook helper) must write `decision: "pending"` with `decidedBy`/`decidedAt` ABSENT (not empty string). `assertApproval` must reject `decision: "approved"` when `decidedBy` is missing — the model cannot auto-decide.

---

### `src/governance/test-evidence.ts` (service / durable-store + parser, file-I/O + transform)

**Analog (store half):** `src/governance/gate-evidence-store.ts` — clone `writeXxx`/`readXxx`/`assertXxx` shape as above, swap `ApprovalRecord`→`TestEvidenceRecord`, `approvalPath`→`testEvidencePath`.

**Analog (parser half):** NONE in codebase. TAP-summary parser is net-new. Keep it a pure function (no I/O) so it tests in isolation:

```typescript
// NEW (no analog). Parse `node --test --test-reporter=tap` stdout summary block.
const TAP_SUMMARY_RE = /^# (tests|pass|fail|skipped|todo|cancelled|duration_ms) (\d+(?:\.\d+)?)/gm;

export function parseTapSummary(stdout: string): TestEvidenceSummary {
  const counts: Record<string, number> = {};
  let match: RegExpExecArray | null;
  while ((match = TAP_SUMMARY_RE.exec(stdout)) !== null) {
    counts[match[1]] = Number(match[2]);
  }
  // D-04: malformed = hard fail. Missing `# tests N` summary = not real runner output.
  if (counts.tests === undefined || !Number.isFinite(counts.tests)) {
    throw new Error("malformed test runner output: missing `# tests N` summary line");
  }
  return {
    total: counts.tests,
    pass: counts.pass ?? 0,
    fail: counts.fail ?? 0,
    skipped: counts.skipped ?? 0,
    duration_ms: counts.duration_ms ?? 0,
  };
}
```

**TAP target shape verified locally** (RESEARCH §Code Examples): `# tests N`, `# pass N`, `# fail N`, `# skipped N`, `# duration_ms N`. The `# tests N` line is the load-bearing guard — absence = malformed = throw (D-04).

**Malformed-rejection idiom** (mirror `gate-evidence-store.fail`):
```typescript
function fail(filePath: string, detail: string): never {
  throw new Error(`malformed test evidence at ${filePath}: ${detail}`);
}
```

---

### `src/governance/audit-enrich.ts` (utility / pure helper, transform)

**Analog:** `src/governance/audit-artifact.ts` — `buildAuditRecord` (lines 195-220) and the `assertOneOf`/`assertString`/`assertTimestamp`/`assertRecordObject` guard family (lines 71-126). Clone the guard style; produce the 4 optional enrichment arrays.

**Guard idiom to clone** (lines 83-93):
```typescript
function assertOneOf<T extends readonly string[]>(
  value: unknown,
  field: string,
  allowed: T,
): asserts value is T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`malformed governance state: ${field} must be one of ${allowed.join(", ")}`);
  }
}
```

**Module shape (proposed — pure helpers only, no I/O):**
```typescript
// AUDIT-03: machine-extract REQ-IDs from REQUIREMENTS.md traceability table.
export function extractRequirementsCovered(
  requirementsMd: string,
  phaseNumber: string,
): RequirementsCoveredEntry[] { /* regex over traceability rows for phase's REQ-IDs */ }

// AUDIT-05: aggregate gaps from VERIFICATION.md + CONTEXT.md <deferred>. NEVER [].
export function collectRemainingRisks(
  verificationMd: string,
  contextDeferredSection: string,
): RemainingRiskEntry[] {
  const risks = [...parseVerificationGaps(verificationMd), ...parseDeferred(contextDeferredSection)];
  return risks.length === 0
    ? [{ id: "none-identified", severity: "low", detail: "no risks found", source: "none-identified" }]
    : risks;  // D-11: never silently empty
}

// AUDIT-06: project approval store records → audit summary view (no adapter re-query; D-12).
export function summarizeApprovals(
  approvals: ApprovalRecord[],
): ApprovalSummary[] { /* {approvalId, gateId, decision, decidedBy?} */ }
```

**Never-empty placeholder pattern (D-11):** every enrichment helper returns at least one explicit `none-*` row when input yields nothing. Audit distinguishes "researched and found none" from "not checked".

**Anti-pattern (D-14):** do NOT fold this logic into `audit-artifact.ts`. Keep `audit-enrich.ts` separate so `buildAuditRecord` stays thin and the v1 byte-stable subset is preserved.

---

### `src/governance/audit-artifact.ts` (MODIFY — v1→v2 bump)

**Analog:** self — extend `GovernanceAudit` (lines 40-48), `buildAuditRecord` (lines 195-220), bump `schema_version` literal `1`→`2`.

**Type extension (lines 40-48 today):**
```typescript
// EXISTING v1 (lines 40-48) — keep field order and required-ness untouched:
export interface GovernanceAudit {
  schema_version: 1;                    // → 2
  phase: GovernanceRecord["phase"];
  riskTier: GovernanceRecord["riskTier"];
  selection_timestamp: string;
  generated_from: ".planning/governance/selection-state.json";
  rules_applied: AuditAppliedRule[];
  rules_skipped: AuditSkippedRule[];
  // v2 optional — APPEND ONLY (D-09). Insertion order = JSON.stringify order = byte stability.
  requirements_covered?: RequirementsCoveredEntry[];
  tests_executed?: TestEvidenceSummary;
  remaining_risks?: RemainingRiskEntry[];
  approvals?: ApprovalSummary[];
}
```

**`buildAuditRecord` enrichment hook (lines 195-220 today):**
```typescript
// Option: overload signature accepting optional enrichment pre-payload.
function buildAuditRecord(
  record: GovernanceRecord,
  enrichment?: {
    requirements_covered?: RequirementsCoveredEntry[];
    tests_executed?: TestEvidenceSummary;
    remaining_risks?: RemainingRiskEntry[];
    approvals?: ApprovalSummary[];
  },
): GovernanceAudit {
  assertGovernanceRecord(record);
  return {
    schema_version: 2,                  // ← was 1
    // ...existing 6 fields unchanged, same order...
    ...(enrichment?.requirements_covered ? { requirements_covered: enrichment.requirements_covered } : {}),
    ...(enrichment?.tests_executed ? { tests_executed: enrichment.tests_executed } : {}),
    ...(enrichment?.remaining_risks ? { remaining_risks: enrichment.remaining_risks } : {}),
    ...(enrichment?.approvals ? { approvals: enrichment.approvals } : {}),
  };
}
```

**Pitfall 2 (RESEARCH §Common Pitfalls):** V8 preserves object-literal insertion order. The 4 new fields MUST be appended AFTER `rules_skipped` and ONLY when enrichment data is present. A v1-only input must render byte-identical to the v1 writer — existing `audit-artifact.test.ts` "renderGovernanceMarkdown is deterministic" (lines 291-298) stays green; ADD a v1-subset string-compare test (not deep-equal).

---

### `src/governance/ship-gate-hook.ts` (MODIFY — approval blocking)

**Analog:** self — extend `readRequiredEvidence` (lines 18-30) and `assertNonBlocking` (lines 39-45). New check mirrors their shape exactly.

**Existing fail-closed pattern (lines 18-45) — clone for approvals:**
```typescript
function readRequiredEvidence(projectRoot, phaseNumber, gateId): GateEvidence {
  const evidence = readGateEvidence(projectRoot, phaseNumber, gateId);
  if (evidence === null) {
    throw new Error(`ship gate: missing governance evidence ${gateEvidencePath(...)}`);
  }
  return evidence;
}

function assertNonBlocking(evidence, gateId): void {
  if (evidence.result.status === "fail") {
    throw new Error(`ship gate: ${gateId} governance evidence failed - ${findingDetails(evidence)}`);
  }
}
```

**Proposed approval extension (D-07 + D-08):**
```typescript
function readApprovalOrFail(projectRoot, phaseNumber): ApprovalRecord | null {
  const approval = readApproval(projectRoot, phaseNumber);
  // D-07: if absent, create a pending approval for the ship gate itself.
  if (approval === null) {
    writePendingApproval(projectRoot, phaseNumber, {
      approvalId: `ship-${phaseNumber}`,
      gateId: "ship",
      artifactPath: gateEvidencePath(projectRoot, phaseNumber, "ship"),
      requestedBy: "aidlc-governance-ship",
      requestedAt: new Date().toISOString(),
      decision: "pending",
      // decidedBy / decidedAt INTENTIONALLY ABSENT (D-07)
    });
    throw new Error(`ship gate: ${phaseNumber} pending approval created — human resolution required`);
  }
  return approval;
}

function assertNoBlockingApprovals(approval: ApprovalRecord): void {
  if (approval.decision === "pending" || approval.decision === "rejected") {
    throw new Error(
      `ship gate: approval ${approval.approvalId} is ${approval.decision} — human resolution required`,
    );
  }
}
```

**Add to `shipGateHook` body (lines 47-78) AFTER plan/verify checks, BEFORE ship evidence write:**
```typescript
const approval = readApprovalOrFail(args.projectRoot, args.phaseNumber);
assertNoBlockingApprovals(approval);
```

**A2 in RESEARCH Assumptions:** for v2.0 simplicity, ship creates exactly ONE pending approval for the ship gate itself (`gateId: "ship"`). Multi-approval policy is post-v2.0.

**Existing test extension point** (`ship-gate-hook.test.ts` lines 177-184): the assertions `assert.equal("approvals" in asRecord, false)` etc. check the SHIP EVIDENCE record (the `GateEvidence` written under `gates/{NN}-ship.json`) has no approval fields — that contract stays. Approval state lives in a separate file (`approvals/{NN}.json`).

---

### `src/governance/paths.ts` (MODIFY — add approvalPath + testEvidencePath)

**Analog:** `gateEvidencePath` (lines 57-66).

```typescript
const PHASE_NUMBER_RE = /^\d{2}(?:\.\d+)?$/;  // line 16

export function gateEvidencePath(projectRoot, phaseNumber, gateId): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid gate evidence phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "gates", `${phaseNumber}-${gateId}.json`);
}

// NEW — clone for approvals and tests:
export function approvalPath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid approval phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "approvals", `${phaseNumber}.json`);
}

export function testEvidencePath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid test evidence phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "tests", `${phaseNumber}.json`);
}
```

One file per phase (D-06, D-02). Matches the `.planning/governance/{kind}/{NN}.json` layout convention.

---

### `src/schema/approval.schema.json` (NEW — draft 2020-12 + x-binding)

**Analog:** `src/schema/gate-result.schema.json` (read in full, 71 lines).

**Schema header pattern (lines 1-9):**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gsd.dev/schemas/approval.schema.json",
  "title": "Human Approval Checkpoint",
  "description": "APPR-01 ... x-binding: binding — pending/rejected blocks ship (D-08).",
  "type": "object",
  "additionalProperties": false,
  "required": ["approvalId", "phase", "gateId", "artifactPath", "requestedBy", "requestedAt", "decision"],
  "properties": { /* D-05 10 fields */ },
  "x-binding": "binding"
}
```

**Required field convention:** 7 of 10 fields required. `decidedBy`/`decidedAt`/`rationale` are NOT in `required` (D-07 — blank until human resolves).

**Timestamp pattern (reuse from gate-result.schema.json lines 30-34):**
```json
"requestedAt": {
  "type": "string",
  "format": "date-time",
  "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
  "description": "ISO-8601 strict timestamp (TD-01 shape)."
}
```

**D-05 enum vocab:** `decision: pending|approved|rejected|waived` (NOT `pass|fail|waived` — distinct from `GateResult.status` per RESEARCH Pitfall 3).

---

### `src/schema/test-evidence.schema.json` (NEW — draft 2020-12 + x-binding)

**Analog:** `src/schema/gate-result.schema.json` — same header convention.

Shape from RESEARCH §Code Examples `TestEvidenceSummary`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gsd.dev/schemas/test-evidence.schema.json",
  "title": "Test Runner Evidence",
  "description": "AUDIT-04 ... x-binding: binding — parsed from real runner output, model narration rejected (D-03/D-04).",
  "type": "object",
  "additionalProperties": false,
  "required": ["phase", "capturedAt", "runner", "summary"],
  "properties": {
    "phase": { "type": "string", "pattern": "^\\d{2}(?:\\.\\d+)?$" },
    "capturedAt": { "type": "string", "format": "date-time", "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$" },
    "runner": { "type": "string", "const": "node --test --test-reporter=tap" },
    "summary": {
      "type": "object",
      "additionalProperties": false,
      "required": ["total", "pass", "fail", "skipped", "duration_ms"],
      "properties": {
        "total": { "type": "integer", "minimum": 0 },
        "pass": { "type": "integer", "minimum": 0 },
        "fail": { "type": "integer", "minimum": 0 },
        "skipped": { "type": "integer", "minimum": 0 },
        "duration_ms": { "type": "number", "minimum": 0 }
      }
    }
  },
  "x-binding": "binding"
}
```

The `runner: "node --test --test-reporter=tap"` const is the AUDIT-04 trust boundary — anything else fails closed (D-04).

---

### `src/schema/audit-artifact.schema.json` (MODIFY — v1→v2 bump)

**Analog:** self (read in full, 114 lines).

**Bump targets:**
- Line 20: `"const": 1` → `"const": 2`
- Lines 8-16 `required` array: UNCHANGED (7 entries — `schema_version`, `phase`, `riskTier`, `selection_timestamp`, `generated_from`, `rules_applied`, `rules_skipped`)
- Lines 17-52 `properties`: APPEND 4 optional fields AFTER `rules_skipped` (preserves field order for byte-stability)

**Append pattern (after line 52):**
```json
"requirements_covered": {
  "type": "array",
  "items": { "$ref": "#/$defs/requirementsCoveredEntry" },
  "description": "AUDIT-03 v2 optional. Present only when enrichment data exists."
},
"tests_executed": { "$ref": "#/$defs/testEvidenceSummary" },
"remaining_risks": {
  "type": "array",
  "items": { "$ref": "#/$defs/remainingRiskEntry" }
},
"approvals": {
  "type": "array",
  "items": { "$ref": "#/$defs/approvalSummary" }
}
```

Add matching `$defs` entries mirroring the TS interfaces in RESEARCH §Code Examples. None of the 4 new fields go in `required` (D-09).

**Pitfall 1 (RESEARCH):** use `"const": 2`, NOT `"enum": [1, 2]`. The writer always emits 2 once upgraded. A v1 GOVERNANCE.md MUST fail validation against v2 (forward-incompatible by design — regeneration is mandatory).

---

### `src/enforcement/validate-approval.ts` (NEW — Ajv 2020 validator)

**Analog:** `src/enforcement/validate-gate-result.ts` (read in full, 97 lines).

**Clone pattern verbatim** (lines 22-44):
```typescript
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import schema from "../schema/approval.schema.json";
import type { ApprovalRecord } from "../governance/approval-store.js";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
const validate: ValidateFunction = ajv.compile(schema);

export function validateApproval(result: unknown): asserts result is ApprovalRecord {
  if (!validate(result)) {
    throw new Error(`invalid approval:\n${formatErrors(validate.errors)}`);
  }
}
```

**`formatErrors` helper (lines 52-75):** clone verbatim from `validate-gate-result.ts`. Identical shape across all four validators in this repo (validateFrontmatter, validateIndex, validateSignal, validateGateResult) — `validateApproval` is the fifth.

Drop the post-AJV `lineRange` invariant check (lines 88-96) — approval has no line ranges. Replace with a D-07 invariant: if `decision !== "pending"`, then `decidedBy` MUST be present.

```typescript
// D-07 invariant: non-pending decisions require a decider.
const record = result as ApprovalRecord;
if (record.decision !== "pending" && (record.decidedBy === undefined || record.decidedBy.length === 0)) {
  throw new Error(`invalid approval: ${record.approvalId} decision=${record.decision} requires decidedBy`);
}
```

---

### `src/governance/approval-store.test.ts` (NEW — test)

**Analog:** `src/governance/gate-evidence-store.test.ts` (read in full, 182 lines).

**Test harness shape to clone (lines 1-69):**
```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { type ApprovalRecord, readApproval, writeApproval } from "./approval-store.js";
import { approvalPath } from "./paths.js";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-approval-store-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

function approval(overrides: Partial<ApprovalRecord> = {}): ApprovalRecord {
  return {
    approvalId: "ship-09",
    phase: "construction",
    gateId: "ship",
    artifactPath: ".planning/governance/gates/09-ship.json",
    requestedBy: "aidlc-governance-ship",
    requestedAt: "2026-07-07T00:00:00.000Z",
    decision: "pending",
    ...overrides,
  };
}
```

**Test cases to port (gate-evidence-store.test.ts mapping):**
| Source test (lines) | Approval-store equivalent |
|---------------------|---------------------------|
| `gateEvidencePath stores … under .planning/governance/gates/{NN}-{gate}.json` (71-78) | `approvalPath stores … under .planning/governance/approvals/{NN}.json` |
| `readGateEvidence returns null when evidence is missing` (80-84) | `readApproval returns null when missing` |
| `writeGateEvidence round-trips …` (86-93) | `writeApproval round-trips approval record` |
| `writeGateEvidence leaves no temp siblings …` (95-105) | same — atomic-write contract |
| `readGateEvidence throws loud on malformed JSON` (107-117) | `readApproval throws loud on malformed JSON` — `/malformed approval at .*{NN}\.json/i` |
| `readGateEvidence throws loud when … missing` (119-133) | `readApproval throws loud when required field missing` |
| `…metadata phase mismatches the path phase` (151-165) | `…approvalId / gateId / decision enum violations` |

**ADD D-07-specific tests (no analog):**
- `writeApproval rejects decision="approved" with no decidedBy` — `/invalid approval.*decidedBy/i`
- `writeApproval accepts decision="pending" with decidedBy absent`

---

### `src/governance/test-evidence.test.ts` (NEW — test)

**Analog (store half):** `src/governance/gate-evidence-store.test.ts` — port round-trip + malformed-JSON tests as above.

**Analog (determinism half):** `src/governance/audit-artifact.test.ts` "renderGovernanceMarkdown is deterministic" (lines 291-298) — same `parse → assert.deepEqual(first, second)` idiom applied to `parseTapSummary` output.

**ADD parser tests (no analog):**
```typescript
const TAP_OK = `TAP version 13
ok 1 - passes
1..1
# tests 1
# pass 1
# fail 0
# duration_ms 12.34`;

test("parseTapSummary extracts counts from real TAP output", () => {
  const summary = parseTapSummary(TAP_OK);
  assert.deepEqual(summary, { total: 1, pass: 1, fail: 0, skipped: 0, duration_ms: 12.34 });
});

test("parseTapSummary hard-fails on output missing the # tests summary line (D-04)", () => {
  assert.throws(
    () => parseTapSummary("not a real runner output"),
    /malformed test runner output: missing `# tests N` summary line/i,
  );
});

test("parseTapSummary hard-fails on model-authored narration (D-03)", () => {
  assert.throws(
    () => parseTapSummary("All tests passed."),
    /malformed test runner output/i,
  );
});
```

---

### `src/governance/audit-enrich.test.ts` (NEW — test)

**Analog:** `src/governance/audit-artifact.test.ts` (read in full, 448 lines).

**Test idiom to clone:**
- `withTempRoot` + `mkdtempSync`/`rmSync` (lines 26-33) — for tests that touch disk.
- Pure-helper tests (REQ-ID extraction, risk aggregation) need no temp root — call the helper directly with a string fixture.

**ADD specific tests:**
```typescript
test("extractRequirementsCovered returns REQ-IDs from the phase's traceability rows", () => {
  const md = `## Traceability\n\n| ID | Phase |\n|----|-------|\n| AUDIT-03 | 09 |\n| APPR-01 | 09 |`;
  const reqs = extractRequirementsCovered(md, "09");
  assert.deepEqual(reqs.map(r => r.reqId), ["AUDIT-03", "APPR-01"]);
});

test("collectRemainingRisks emits explicit none-identified row when no risks found (D-11)", () => {
  const risks = collectRemainingRisks("# Verification\n\nAll clean.", "");
  assert.equal(risks.length, 1);
  assert.equal(risks[0].id, "none-identified");
});

test("collectRemainingRisks aggregates VERIFICATION.md gaps and CONTEXT <deferred>", () => {
  const verification = "## Gaps\n\n- G1: edge case X unhandled";
  const deferred = "<deferred>\n- Real scanner integrations\n</deferred>";
  const risks = collectRemainingRisks(verification, deferred);
  assert.ok(risks.length >= 2);
  assert.ok(risks.every(r => r.id !== "none-identified"));
});
```

---

### `.gsd/capabilities/aidlc-governance/capability.json` (MODIFY)

**Analog:** self (read in full, 110 lines).

**Verify:post audit step (lines 83-92) — extend `consumes`:**
```json
{
  "point": "verify:post",
  "ref": { "skill": "aidlc-governance-audit" },
  "produces": ["GOVERNANCE.md"],
  "consumes": [
    ".planning/governance/selection-state.json",
    ".planning/governance/tests/{NN}.json",
    ".planning/governance/approvals/{NN}.json",
    ".planning/REQUIREMENTS.md",
    ".planning/phases/{NN}-*/VERIFICATION.md",
    ".planning/phases/{NN}-*/CONTEXT.md"
  ],
  "when": "governance.enabled",
  "onError": "halt"
}
```

**Ship:pre step (lines 93-106) — extend `consumes` + `produces`:**
```json
{
  "point": "ship:pre",
  "ref": { "skill": "aidlc-governance-ship" },
  "produces": [
    ".planning/governance/gates/{NN}-ship.json",
    ".planning/governance/approvals/{NN}.json"
  ],
  "consumes": [
    ".planning/governance/gates/{NN}-plan.json",
    ".planning/governance/gates/{NN}-verify.json",
    ".planning/phases/{NN}-*/GOVERNANCE.md"
  ],
  "when": "governance.enabled",
  "onError": "halt"
}
```

**Constraints (D-13, D-16):**
- Do NOT add a new `aidlc-approval` or `aidlc-audit` capability. Extend the existing one.
- Do NOT add a new `audit:pre` or `ship:post` hook point. The verify:post audit writer and ship:pre blocker already exist.

---

## Shared Patterns

### Atomic Write
**Source:** `src/governance/atomic-write.ts` (read in full, 41 lines)
**Apply to:** `approval-store.ts`, `test-evidence.ts` — both call `atomicWriteFile(filePath, JSON.stringify(record, null, 2))`. Never bypass for a direct `writeFileSync` (TD-03 concurrent-write race).

```typescript
import { atomicWriteFile } from "./atomic-write.js";
// Contract: mkdirSync(dirname, recursive:true) → writeFileSync(tmp) → renameSync(tmp, final)
// Temp suffix `.<pid>-<uuid>.tmp` unique per writer; crash leaves old OR new, never truncated.
```

### Loud-Fail Read Ladder
**Source:** `src/governance/gate-evidence-store.ts` `readGateEvidence` (lines 144-168)
**Apply to:** `approval-store.ts`, `test-evidence.ts` — both follow the same 4-rung ladder.

```typescript
// 1. existsSync → null    (missing = legit, return null)
// 2. try readFileSync      (unreadable = throw with path context)
// 3. try JSON.parse        (bad JSON = throw with path context)
// 4. assertXxx(parsed)     (shape-invalid = throw with field name)
```

Error message format MUST be `malformed {kind} at {absolutePath}: {detail}` — tests regex-match this shape.

### Strict ISO 8601 Timestamp (TD-01)
**Source:** `src/governance/gate-evidence-store.ts` line 19 + `src/governance/audit-artifact.ts` lines 111-126
**Apply to:** every timestamp field on `ApprovalRecord`, `TestEvidenceRecord`, v2 audit enrichment.

```typescript
const ISO_8601_STRICT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
// Rejects "2026/07/07", "2026-07-07", "2026-07-07T00:00:00Z", "2026-07-07T00:00:00.000".
// Date.parse is too lenient — this is the audit-trail trust boundary.
```

### JSON Schema Header Convention
**Source:** `src/schema/gate-result.schema.json` lines 1-8
**Apply to:** `approval.schema.json`, `test-evidence.schema.json`, modified `audit-artifact.schema.json`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gsd.dev/schemas/{name}.schema.json",
  "title": "...",
  "description": "... x-binding: binding|advisory — ...",
  "type": "object",
  "additionalProperties": false,
  ...
  "x-binding": "binding"
}
```

All 7 existing schemas use draft 2020-12 + `$id` URI + `additionalProperties: false` + `x-binding`. Approval and test-evidence are `binding` (their state blocks ship); audit-artifact stays `advisory` (records, not enforces).

### Test Harness Shape
**Source:** `src/governance/gate-evidence-store.test.ts` lines 1-69
**Apply to:** all 3 new test files.

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-{kind}-"));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

// Fixture builder pattern: function record(overrides: Partial<T> = {}): T
// Malformed tests: writeFileSync(filePath, "{not-json"); assert.throws(() => readXxx(), /regex/);
```

## No Analog Found

| File | Sub-feature | Reason | Fallback |
|------|-------------|--------|----------|
| `src/governance/test-evidence.ts` | TAP summary parser | No existing parser of CLI stdout in repo. | RESEARCH §Code Examples "TAP Output Shape" — verified locally on Node v24.14.0. Summary-line regex is the parser. |
| `src/governance/audit-enrich.ts` | REQUIREMENTS.md / VERIFICATION.md / `<deferred>` markdown parsing | No existing markdown-table or fenced-section parser. | Deterministic regex over bounded-format markdown (RESEARCH §Don't Hand-Roll). No AST dep. |
| `src/governance/audit-enrich.ts` | "none-identified" explicit placeholder | No precedent for never-empty array invariant. | RESEARCH §Common Pitfalls 6 — explicit `[{id:"none-identified",...}]` row. |

## Metadata

**Analog search scope:**
- `src/governance/*.ts` (14 files: gate-evidence-store, audit-artifact, ship-gate-hook, verify-gate-hook, plan-hook, paths, state-store, atomic-write, consent-verify-post, + tests)
- `src/enforcement/*.ts` (5 files: types, adapters, run-adapter, validate-gate-result, + test)
- `src/schema/*.schema.json` (7 files: gate-request, gate-result, audit-artifact, task-signal, frontmatter, rule-index, selection-config)
- `.gsd/capabilities/aidlc-governance/capability.json`

**Files scanned:** 27 source + 7 schemas + 1 manifest
**Pattern extraction date:** 2026-07-07
