---
id: test-coverage
scope: enterprise
triggers:
  taskType:
    - test
phases:
  - construction
severity: medium
summary: New and changed behavior must ship with tests that exercise its paths.
classification: advisory
---

## Rule ENT-TC-01: Cover Changed Behavior

Any task that adds or changes behavior must include tests exercising the new
paths. This rule fires on the taskType axis by enum equality (D-04).

### Verification

Confirm the changed behavior has a corresponding test whose assertions would
fail if the behavior regressed.
