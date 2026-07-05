---
id: mislabeled
scope: project
triggers: {}
phases:
  - construction
severity: high
summary: A rule whose frontmatter scope does not match its directory tier.
classification: advisory
---

## Rule MIS-01: Mislabeled Scope

This rule claims scope 'project' while physically living under enterprise/ — a
scope-vs-directory mismatch that must fail the build loudly (D-09).
