---
id: api-contract
scope: enterprise
triggers:
  taskType:
    - feature
  keywords:
    - api
    - endpoint
  paths:
    - "src/api/**"
phases:
  - construction
severity: high
summary: Public API changes must preserve the documented contract or version it.
classification: advisory
---

## Rule ENT-API-01: Preserve API Contracts

A change to a public API must remain backward compatible or introduce a new
version. This rule matches on any of three axes — taskType, keywords, or paths —
demonstrating multi-axis OR-combine (D-02).

### Verification

Confirm each API surface change is either backward compatible or accompanied by a
version bump and migration note.
