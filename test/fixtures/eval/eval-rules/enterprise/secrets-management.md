---
id: secrets-management
scope: enterprise
triggers: {}
phases:
  - construction
  - inception
severity: critical
summary: Secrets must never be committed; use a managed secret store for all credentials.
classification: advisory
---

## Rule ENT-SM-01: No Secrets In Source

Credentials, tokens, and private keys must be sourced from a managed secret store
at runtime. Committing a secret to the repository is never acceptable, regardless
of task type — this is the always-in-phase never-miss critical rule (D-03).

### Verification

Confirm no secret material is present in the working tree and that every
credential resolves from the configured secret store at load time.
