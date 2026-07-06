---
id: absolute-detail
scope: enterprise
triggers: {}
phases:
  - construction
severity: low
summary: Declares an absolute detailPath that must be rejected by the traversal guard.
classification: advisory
detailPath: /etc/passwd
---

## Rule ENT-AD: Negative Fixture — Absolute detailPath

This rule's frontmatter is fully schema-valid (detailPath is a non-empty string);
its ONLY defect is that the declared `detailPath` is ABSOLUTE (`/etc/passwd`).
resolveDetailPath must reject it under IN-05 BEFORE any file is opened, so
buildIndex fails loudly at build time — NOT at frontmatter validation.
