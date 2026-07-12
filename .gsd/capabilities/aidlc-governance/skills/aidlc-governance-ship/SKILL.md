---
name: aidlc-governance-ship
description: AI-DLC governance ship gate - invokes shipGateHook and blocks release on missing or failing plan/verify gate evidence. Fires at ship:pre when governance.enabled is true.
---

# AI-DLC Governance - Ship Gate

This skill fires at **ship:pre**. Its job is to run the compiled ship gate hook
and fail the ship step when required prior governance evidence is missing,
malformed, or failed. It is NOT an approval capture, rollback model, audit
enrichment, or scanner integration.

## Steps

1. **Resolve phase number.** Read `.planning/STATE.md` or host ship context and
   pass the concrete `{NN}` phase number to the runner.

2. **Invoke the ship hook.** Run:

   ```bash
   BIN=$(node -e "process.stdout.write(require('path').join(require('path').dirname(require.resolve('@opengsd/gsd-aidlc-overlay/package.json')),'bin','governance.cjs'))") && node "$BIN" ship <projectRoot> <phaseNumber>
   ```

   The hook reads `.planning/governance/gates/{NN}-plan.json` and
   `.planning/governance/gates/{NN}-verify.json`, blocks on missing/malformed or
   failing evidence, and writes `.planning/governance/gates/{NN}-ship.json` only
   after required prior gates pass or waive.

3. **Propagate failures.** If the runner exits non-zero, surface stderr and fail
   the `ship:pre` step. Release readiness must fail closed.

## Failure mode

Do not catch missing evidence and continue. Do not add APPR-01 approval capture,
rollback evidence, full audit enrichment, or real scanner execution here. Phase
9 owns approval and audit expansion.
