---
id: java-spring-unit-line-coverage
scope: domain
triggers:
  paths:
    - "**/src/main/java/**"
    - "**/src/main/**/*.java"
  exclude:
    taskType:
      - docs
      - test
      - infra
    paths:
      - "**/src/test/**"
      - "**/generated/**"
      - "**/build/**"
      - "**/target/**"
phases:
  - construction
severity: high
summary: "New or changed Java production behavior requires unit-test line coverage ≥70% verified by a real coverage report."
classification: binding
enforcement: coverage-report
detailPath: details/java-spring-unit-line-coverage-detail.md
---

## Rule JS-COV-01: Unit Line Coverage

New or changed consumer Java production code requires aggregate unit-test line coverage of at least 70%, measured by a JaCoCo XML or LCOV report produced by the consumer's build. The binding gate fails closed when the report is missing, malformed, zero-line, or below threshold.

### Verification

- Confirm a coverage report (JaCoCo XML or LCOV) is available at the configured path.
- Confirm aggregate line coverage ≥70% using exact-integer threshold (`covered * 100 >= total * 70`).
- Confirm reports with zero total lines fail closed.
- Confirm missing/malformed/out-of-root reports fail closed.

<!-- BODY_CANARY java-spring-unit-line-coverage -->
