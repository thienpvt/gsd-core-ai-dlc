---
id: ops-runbook
scope: enterprise
triggers:
  keywords:
    - deploy
    - runbook
phases:
  - operations
severity: high
summary: Every production deploy must have a current runbook and rollback plan.
classification: advisory
---

## Rule ENT-OPS-01: Deploy Runbook Required

A production deployment requires a current runbook covering rollout and rollback.
This rule lives only in the operations phase, so a construction-phase signal must
skip it as out-of-phase.

### Verification

Confirm the deploy has an attached runbook with a tested rollback procedure.
