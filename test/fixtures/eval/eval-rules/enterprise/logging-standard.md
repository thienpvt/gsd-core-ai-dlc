---
id: logging-standard
scope: enterprise
triggers:
  keywords:
    - log
    - logging
  exclude:
    paths:
      - "**/*.test.*"
phases:
  - construction
severity: medium
summary: Application logging must use the structured logger and redact sensitive fields.
classification: advisory
---

## Rule ENT-LOG-01: Structured, Redacted Logging

Runtime logging must flow through the structured logger with sensitive fields
redacted. Test files are carved out via the exclude axis, which wins over any
positive match (D-02).

### Verification

Confirm production log call sites use the structured logger and that no test
fixture is expected to satisfy this rule.
