---
id: missing-target
scope: enterprise
triggers: {}
phases:
  - construction
severity: low
summary: Declares a detailPath whose target file does not exist.
classification: advisory
detailPath: details/does-not-exist.md
---

## Rule ENT-MT: Negative Fixture — Missing detailPath Target

This rule's frontmatter is fully schema-valid; its ONLY defect is that the
declared `detailPath` (`details/does-not-exist.md`) has no target on disk.
buildIndex must fail loudly at the D-07 build-time validation stage, naming
this rule id + the bad path — NOT at frontmatter validation.
