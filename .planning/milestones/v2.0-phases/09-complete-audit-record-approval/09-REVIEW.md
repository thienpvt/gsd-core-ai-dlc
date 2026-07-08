---
phase: 09-complete-audit-record-approval
reviewed: 2026-07-07T00:00:00.000Z
depth: deep
files_reviewed: 20
files_reviewed_list:
  - src/enforcement/validate-approval.ts
  - src/governance/approval-store.ts
  - src/governance/audit-artifact.ts
  - src/governance/audit-enrich.ts
  - src/governance/ship-gate-hook.ts
  - src/governance/test-evidence.ts
  - src/governance/paths.ts
  - src/schema/approval.schema.json
  - src/schema/audit-artifact.schema.json
  - src/schema/test-evidence.schema.json
  - src/governance/ship-gate-hook.test.ts
  - src/governance/approval-store.test.ts
  - src/governance/audit-enrich.test.ts
  - src/governance/test-evidence.test.ts
  - src/enforcement/validate-approval.test.ts
  - src/governance/audit-artifact.test.ts
  - src/governance/audit-hook-contract.test.ts
  - src/governance/consent-verify-post.test.ts
  - src/governance/consent.test.ts
  - src/governance/gate-contracts.test.ts
  - .gsd/capabilities/aidlc-governance/capability.json
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-07-07T00:00:00.000Z
**Depth:** deep
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 09 ships approval lifecycle (APPR-01, D-07/D-08) end-to-end correctly: the ship gate writes pending approvals with `decidedBy` absent, fails closed on pending/rejected, and the validator enforces the anti-auto-approve invariant. Schema validity, atomic writes, and CommonJS conventions are sound. No BLOCKER-level defects.

The most significant finding (WR-01): the four AUDIT v2 enrichment helpers (`extractRequirementsCovered`, `collectRemainingRisks`, `summarizeApprovals`, `parseTapSummary`) and their durable stores (`writeTestEvidence`) are implemented and unit-tested but never wired into the production audit writer. `writeGovernanceAudit` calls `buildAuditRecord(record)` with no `enrichment` argument, so every production `GOVERNANCE.md` omits `requirements_covered`, `tests_executed`, `remaining_risks`, and `approvals`. The v2 schema bump ships four optional fields that are always absent in practice.

Remaining findings are trust-boundary hardening (TOCTOU on approval write, missing cross-phase identity guard, whitespace-only decidedBy bypass) and test/consistency items.

## Warnings

### WR-01: Audit enrichment helpers are dead code — never wired into production audit writer

**File:** `src/governance/audit-artifact.ts:266`
**Issue:**
`writeGovernanceAudit` calls `buildAuditRecord(record)` with NO `enrichment` argument:

```typescript
const audit = buildAuditRecord(record);
```

The `AuditEnrichment` parameter exists on `buildAuditRecord` (line 220) and the conditional spread logic (lines 246-249) is correct, but no caller in the production path ever passes enrichment data. The audit skill (`aidlc-governance-audit/SKILL.md` step 3) invokes `node dist/governance/audit-artifact.js <projectRoot> <outputPath>`, which calls `runDirect` → `writeGovernanceAudit` → `buildAuditRecord(record)` with no enrichment.

Result: AUDIT-03 (`requirements_covered`), AUDIT-04 (`tests_executed`), AUDIT-05 (`remaining_risks`), AUDIT-06 (`approvals`) are NEVER populated in any production `GOVERNANCE.md`. The helpers in `audit-enrich.ts` and the TAP parser/store in `test-evidence.ts` are unit-tested in isolation but have zero production callers. The AUDIT-04 trust boundary (reject model-authored narration via `# tests N` line) is defined but never enforced in production because `parseTapSummary` is never invoked.

Cross-file trace confirms no production wiring:
- `extractRequirementsCovered` — only caller: `audit-enrich.test.ts`
- `collectRemainingRisks` — only caller: `audit-enrich.test.ts`
- `summarizeApprovals` — only caller: `audit-enrich.test.ts`
- `parseTapSummary` / `writeTestEvidence` / `readTestEvidence` — only caller: `test-evidence.test.ts`

The capability manifest (`capability.json` step `verify:post` → `aidlc-governance-audit`) declares `consumes: ["selection-state.json", "CONTEXT.md"]` — it does NOT consume `REQUIREMENTS.md`, `VERIFICATION.md`, or test runner output, confirming the enrichment inputs are not part of the audit skill's contract.

**Fix:**
Wire enrichment into the production path. Either:
(a) Add enrichment to `writeGovernanceAudit` by reading the markdown sources + approval store + test-evidence store inside the writer, or
(b) Extend `runDirect` argv to accept enrichment inputs (file paths), or
(c) Add a separate `writeGovernanceAuditEnriched` entry point invoked by a new/extended skill step that consumes the additional inputs.

If enrichment is explicitly deferred to a future phase, document this in `09-SUMMARY.md` and mark the helpers as scaffolding (not production-tested).

```typescript
// Option (a) sketch — wire enrichment into writeGovernanceAudit
export function writeGovernanceAudit(args: WriteGovernanceAuditArgs): WriteGovernanceAuditResult {
  assertGovernanceOutputPath(args.projectRoot, args.outputPath);
  const record = readSelection(args.projectRoot);
  if (record === null) { throw new Error(/* ... */); }

  const phaseNumber = path.basename(path.dirname(args.outputPath)).slice(0, 2);
  const enrichment: AuditEnrichment = {};
  const reqs = readRequirementsCovered(args.projectRoot, phaseNumber);   // new helper
  if (reqs.length > 0) enrichment.requirements_covered = reqs;
  const testEvidence = readTestEvidence(args.projectRoot, phaseNumber);
  if (testEvidence) enrichment.tests_executed = testEvidence.summary;
  enrichment.remaining_risks = collectRemainingRisks(/* verificationMd, contextMd */);
  const approval = readApproval(args.projectRoot, phaseNumber);
  enrichment.approvals = summarizeApprovals(approval ? [approval] : []);

  const audit = buildAuditRecord(record, enrichment);
  // ... rest unchanged
}
```

### WR-02: TOCTOU race in readApprovalOrFail — concurrent human approval overwritten by pending

**File:** `src/governance/ship-gate-hook.ts:86-93`
**Issue:**
`readApprovalOrFail` performs a read-then-write sequence:

```typescript
const approval = readApproval(projectRoot, phaseNumber);
if (approval === null) {
  writePendingApproval(projectRoot, phaseNumber, phase);  // overwrites whatever lands between read and write
  throw new Error(/* ... */);
}
```

Between the `readApproval` (returns null) and `writePendingApproval`, a human approver could create the approval file with `decision: "approved"`. `writePendingApproval` → `writeApproval` → `atomicWriteFile` atomically renames over the human-created file, replacing `approved` with `pending`. The human's approval decision is silently lost. On the next ship-gate run, `readApprovalOrFail` returns the pending record, `assertNoBlockingApprovals` throws, and the human must re-resolve — but they may believe their first approval took effect.

`atomicWriteFile` prevents torn writes but does NOT prevent this lost-update: the read-null → write-pending window is a TOCTOU gap that the atomic write primitive cannot close (it writes unconditionally).

**Fix:**
Use a create-if-absent primitive instead of read-then-write:

```typescript
import { openSync, closeSync, O_CREAT, O_EXCL, O_WRONLY } from "node:fs";

function writePendingApprovalIfAbsent(
  projectRoot: string,
  phaseNumber: string,
  phase: GateEvidence["request"]["phase"],
): void {
  const filePath = approvalPath(projectRoot, phaseNumber);
  mkdirSync(path.dirname(filePath), { recursive: true });
  // O_CREAT|O_EXCL fails with EEXIST if the file already exists — no overwrite.
  let fd: number;
  try {
    fd = openSync(filePath, O_WRONLY | O_CREAT | O_EXCL);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return; // already present
    throw err;
  }
  try {
    writeFileSync(fd, JSON.stringify(buildPendingApproval(phaseNumber, phase), null, 2));
  } finally {
    closeSync(fd);
  }
}
```

Then `readApprovalOrFail` becomes: try create-if-absent; re-read; throw if pending/rejected.

### WR-03: Approval store lacks cross-phase identity guard that the sibling test-evidence store enforces

**File:** `src/governance/approval-store.ts:81-97`
**Issue:**
`assertApproval` receives `phaseNumber` but discards it:

```typescript
function assertApproval(value, filePath, phaseNumber): asserts value is ApprovalRecord {
  // ... validateApproval ...
  void phaseNumber;  // <-- no cross-check
}
```

The comment justifies this: the record has no numeric phase field (only the `phase` enum). However, `approvalId` embeds the phase number — `writePendingApproval` (ship-gate-hook.ts:64) sets `approvalId: \`ship-${phaseNumber}\``. A tampered record stored at `approvals/09.json` with `approvalId: "ship-08"` would pass `assertApproval` and `validateApproval` without complaint. The audit trail would then carry the wrong phase identity in `approvalId`.

Compare to the sibling `test-evidence.ts:188` which DOES enforce identity:

```typescript
if (record.phase !== phaseNumber) {
  fail(filePath, `phase must be ${phaseNumber}`);
}
```

The approval store's 4-rung loud-fail ladder is missing the identity rung that `test-evidence-store` and `gate-evidence-store` (metadata.phase check) both have.

**Fix:**
Cross-check the phase number embedded in `approvalId` against the path:

```typescript
function assertApproval(value, filePath, phaseNumber): asserts value is ApprovalRecord {
  try { validateApproval(value); } catch (err) { fail(filePath, String(err)); }
  const record = value as ApprovalRecord;
  // Identity guard: approvalId must embed this phase's number.
  if (!record.approvalId.endsWith(`-${phaseNumber}`)) {
    fail(filePath, `approvalId '${record.approvalId}' must end with -${phaseNumber}`);
  }
}
```

### WR-04: D-07 anti-auto-approve check accepts whitespace-only decidedBy

**File:** `src/enforcement/validate-approval.ts:94`
**Issue:**
The anti-auto-approve invariant checks:

```typescript
if (record.decision !== "pending" && (record.decidedBy === undefined || record.decidedBy.length === 0)) {
```

`"   ".length === 0` is `false`, so a whitespace-only `decidedBy` passes both the runtime check and the schema's `minLength: 1`. The invariant's stated purpose — "the model cannot self-approve its own work" — is bypassable with `decidedBy: " "`. While this is visible in git review, it is a trivial bypass of the documented trust boundary.

**Fix:**
Trim before checking emptiness:

```typescript
if (
  record.decision !== "pending" &&
  (record.decidedBy === undefined || record.decidedBy.trim().length === 0)
) {
  throw new Error(
    `invalid approval: ${record.approvalId} decision=${record.decision} requires decidedBy`,
  );
}
```

## Info

### IN-01: summarizeApprovals has unreachable type-coercion branch

**File:** `src/governance/audit-enrich.ts:201`
**Issue:**
```typescript
gateId: typeof a.gateId === "string" ? a.gateId : String(a.gateId),
```
`ApprovalRecord.gateId` is typed `GateId | (string & {})` — always a string at runtime. The `String(a.gateId)` branch is unreachable dead code.
**Fix:** Simplify to `gateId: a.gateId`.

### IN-02: v1 byte-stability test compares two identical calls, not against a recorded baseline

**File:** `src/governance/audit-artifact.test.ts:513-522`
**Issue:**
The test asserts `first === second` on two `renderGovernanceMarkdown(buildAuditRecord(record))` calls with the same input. This proves determinism (same input → same output) but does NOT prove v1 byte-stability against field-order drift. If a future edit inserted a new key before the existing 7, both calls would produce identical-but-wrong output and the test would still pass.

The test name "v1 byte-stability" overstates what is asserted. A true byte-stability test needs a recorded v1 baseline string to compare against, or an explicit key-order assertion on `Object.keys(audit)`.

**Fix:**
Add an explicit key-order assertion:
```typescript
assert.deepEqual(
  Object.keys(buildAuditRecord(record)),
  ["schema_version","phase","riskTier","selection_timestamp","generated_from","rules_applied","rules_skipped"],
);
```

### IN-03: extractRequirementsCovered sets title === reqId (redundant field)

**File:** `src/governance/audit-enrich.ts:96`
**Issue:**
```typescript
entries.push({
  reqId: match[1],
  title: match[1],  // same value as reqId
  status: deriveStatus(match[3]),
});
```
The schema (`audit-artifact.schema.json` lines 135-137) requires both `reqId` and `title` as non-empty strings, but the implementation always sets them equal. The comment acknowledges this ("full titles live in the req body") but the audit consumer gains no information from a redundant field. If the title is never meaningfully populated, the schema requirement creates busywork for future callers.
**Fix:** Either populate title from a REQ-ID → title lookup, or relax the schema to make `title` optional.

### IN-04: consent-verify-post.test.ts hard-fails without installed gsd-core runtime (inconsistent skip pattern)

**File:** `src/governance/consent-verify-post.test.ts:76-86`
**Issue:**
`resolveInstalledGsdConsent` uses `assert.ok(found, ...)` which fails the test if the gsd-core runtime is not installed at `~/.codex/gsd-core` or `~/.claude/gsd-core`. The sibling `audit-hook-contract.test.ts:255-258` calls `t.skip()` when the runtime is absent. This inconsistency makes the test suite fail on fresh clones or CI environments where `gsd install` has not run.
**Fix:** Return `null` and `t.skip("local GSD runtime is not installed")` when no candidate exists, matching `audit-hook-contract.test.ts`.

### IN-05: Inconsistent direct-run detection between audit-artifact.ts and ship-gate-hook.ts

**File:** `src/governance/audit-artifact.ts:285-289` vs `src/governance/ship-gate-hook.ts:157`
**Issue:**
`audit-artifact.ts` uses `isDirectRun()` comparing `path.resolve(process.argv[1]) === __filename` (the TD-05-hardened pattern that avoids false-positives from same-basename siblings on PATH). `ship-gate-hook.ts` uses `require.main === module` (the simpler pattern that TD-05 explicitly replaced in audit-artifact). Both work, but the inconsistency is a maintainability smell — if the same false-positive scenario arises for `ship-gate-hook.js` (another file named `ship-gate-hook.js` elsewhere on PATH), `require.main === module` would not catch it.
**Fix:** Align `ship-gate-hook.ts` on the `__filename` comparison:
```typescript
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;
}
if (isDirectRun()) { /* ... */ }
```

---

_Reviewed: 2026-07-07T00:00:00.000Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
