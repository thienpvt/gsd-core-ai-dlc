---
id: input-validation
scope: project
triggers: {}
phases:
  - construction
severity: high
summary: Project input validation.
classification: advisory
---

## Rule PRJ-IV: Project Input Validation

Project tier body canary sentence that must never leak into rule-index.json.
The index carries the frontmatter summary and pointers only (D-05 / PACK-04).
