---
id: escape-detail
scope: enterprise
triggers: {}
phases:
  - construction
severity: low
summary: Declares a parent-escaping detailPath that must be rejected by the traversal guard.
classification: advisory
detailPath: ../../escape.md
---

## Rule ENT-ED: Negative Fixture — Parent-Escaping detailPath

This rule's frontmatter is fully schema-valid; its ONLY defect is that the
declared `detailPath` (`../../escape.md`) escapes the pack root via `..`
segments. resolveDetailPath must reject it under IN-05 BEFORE any file is
opened, so buildIndex fails loudly at build time — NOT at frontmatter validation.
