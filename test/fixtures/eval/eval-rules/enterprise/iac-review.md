---
id: iac-review
scope: enterprise
triggers:
  paths:
    - "**/*.tf"
    - "infra/**"
phases:
  - construction
severity: low
summary: Infrastructure-as-code changes require a second reviewer before merge.
classification: advisory
---

## Rule ENT-IAC-01: Review Infrastructure Changes

Changes under infrastructure directories or Terraform files must be reviewed by a
second engineer. This rule fires on the paths axis via picomatch globs (D-04).

### Verification

Confirm any diff touching infrastructure definitions carries an approving review
from someone other than the author.
