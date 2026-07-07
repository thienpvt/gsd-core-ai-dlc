---
name: aidlc-governance-verify
description: AI-DLC governance verify gate - invokes verifyGateHook through the Phase 7 adapter boundary and writes verify gate evidence. Fires at verify:post when governance.enabled is true.
---

# AI-DLC Governance - Verify Gate

This skill fires at **verify:post**. Its single job is to invoke the compiled
verify gate hook and surface any failure. It is a thin marshal-and-invoke prompt,
NOT an adapter implementation and NOT an audit writer.

## Steps

1. **Locate persisted selection state.** Confirm
   `.planning/governance/selection-state.json` exists. It MUST have been written
   by prior governance selection. If missing, FAIL LOUD.

2. **Resolve phase number.** Read `.planning/STATE.md` or host phase context and
   pass the concrete `{NN}` phase number to the runner.

3. **Invoke the verify hook.** Run:

   ```bash
   node dist/governance/verify-gate-hook.js <projectRoot> <phaseNumber>
   ```

   The hook builds a `gateId: "verify"` request, calls `runAdapter`, derives
   per-rule statuses, and writes `.planning/governance/gates/{NN}-verify.json`.

4. **Capture test evidence (AUDIT-04 producer side).** BEFORE the audit skill
   (`aidlc-governance-audit`) reads `.planning/governance/tests/{NN}.json`, this
   step MUST run to write it. Invoke the compiled capture entrypoint:

   ```bash
   node dist/governance/capture-test-evidence.js <phaseNumber>
   ```

   Pass the concrete `{NN}` phase number. The module spawns
   `node --test --test-reporter=tap` (the actual `npm test` runner), parses the
   TAP summary via `parseTapSummary`, and persists a `TestEvidenceRecord` under
   `.planning/governance/tests/{NN}.json` via `writeTestEvidence`. Malformed
   runner output (including model-authored narration) hard-fails through
   `parseTapSummary`'s D-04 guard before any record lands on disk. If the runner
   exits non-zero on this step, surface stderr and fail the `verify:post` step —
   evidence loss is blocking.

5. **Propagate failures.** If the runner exits non-zero, surface stderr and fail
   the `verify:post` step. Evidence loss is blocking.

## Failure mode

Do not call adapters directly. Do not catch malformed adapter output. Do not
write audit markdown. The TypeScript hook owns the adapter boundary and evidence
format.
