---
id: require-mfa
scope: enterprise
triggers: {}
phases:
  - common
severity: critical
summary: All privileged access requires multi-factor authentication.
classification: advisory
---

## Rule ENT-01: Multi-Factor Authentication For Privileged Access

Every account holding elevated or administrative privilege must present a second
authentication factor before its session is granted. Single-factor credentials
alone are never sufficient to reach a privileged operation.

### Verification

Confirm the identity provider enforces a second factor for every role mapped to a
privileged scope, and that any break-glass account is time-boxed and audited.

<!--
Body-leak canary: none of these prose sentences may ever appear in rule-index.json.
The index carries only the frontmatter summary and pointers (D-05 / PACK-04).
-->
