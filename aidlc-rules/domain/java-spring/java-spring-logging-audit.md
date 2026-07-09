---
id: java-spring-logging-audit
scope: domain
triggers:
  keywords:
    - correlation-id
    - trace-id
    - mdc
    - audit-log
    - structured-logging
  paths:
    - "**/logging/**"
    - "**/config/*Log*"
    - "**/aop/**"
    - "**/*Correlation*Filter*"
    - "**/*Mdc*Filter*"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
severity: medium
summary: "Propagate correlation/trace ids via MDC, never log PII or secrets, and emit audit events for state-changing operations."
classification: advisory
detailPath: details/java-spring-logging-audit-detail.md
---

## Rule JS-LOG-01: Logging and Audit

Propagate correlation and/or trace ids on every request path (MDC or equivalent structured fields). Never log PII, secrets, tokens, or PAN. Prefer structured logging fields over free-text concatenation of sensitive data. Emit audit events for state-changing operations with actor, action, resource, outcome, and correlation id.

### Verification

- Confirm correlation/trace ids are available on the request path (filter/interceptor → MDC) for production handlers under construction.
- Confirm log statements and structured fields exclude PII, secrets, tokens, and PAN.
- Confirm state-changing / money-moving operations emit an audit event with actor, action, resource, outcome, and correlation id.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-logging-audit -->
