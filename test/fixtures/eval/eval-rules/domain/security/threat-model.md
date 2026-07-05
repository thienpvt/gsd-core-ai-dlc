---
id: threat-model
scope: domain
triggers:
  taskType:
    - security
  keywords:
    - threat
    - auth
phases:
  - construction
severity: high
summary: Security-sensitive features require a documented threat model before build.
classification: advisory
---

## Rule DOM-SEC-01: Threat Model Security Work

Security-sensitive features must have a documented threat model before
implementation begins. This rule sits in the `security` domain and is a candidate
only when that domain is subscribed.

### Verification

Confirm the feature carries a threat model enumerating assets, entry points, and
mitigations before code lands.
