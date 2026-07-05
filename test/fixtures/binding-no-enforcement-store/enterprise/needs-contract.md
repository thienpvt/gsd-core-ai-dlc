---
id: needs-contract
scope: enterprise
triggers: {}
phases:
  - construction
severity: high
summary: Needs a contract.
classification: binding
---

## Rule ENT-NC: Binding Rule Without An Enforcement Contract

This rule is deliberately `classification: binding` yet OMITS `enforcement`, so the
frontmatter schema's D-15 if/then rejects it. buildIndex must fail loudly at build
time and name this file — proving ROADMAP success criterion 3 at the build level.
