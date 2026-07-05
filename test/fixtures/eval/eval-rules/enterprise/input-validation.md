---
id: input-validation
scope: enterprise
triggers:
  keywords:
    - validation
    - input
phases:
  - construction
severity: high
summary: Validate and normalize all external input at the trust boundary before use.
classification: advisory
---

## Rule ENT-IV-01: Validate External Input

Every value crossing a trust boundary must be validated and normalized before it
reaches business logic. This rule fires on the keywords axis alone (D-04).

### Verification

Confirm each external entry point applies a validation step whose failure path
rejects the request rather than degrading silently.
