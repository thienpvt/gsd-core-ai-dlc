---
id: java-spring-saga-outbox
scope: domain
triggers:
  keywords:
    - saga
    - outbox
    - transactional-outbox
    - choreography
    - orchestration
    - distributed-transaction
  paths:
    - "**/outbox/**"
    - "**/saga/**"
    - "**/messaging/**"
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
summary: "Use outbox for same-TX DB+message, saga only for multi-service business TX, and plain calls for single-service ACID—no saga cargo-cult."
classification: advisory
detailPath: details/java-spring-saga-outbox-detail.md
---

## Rule JS-EVT-01: Saga and Outbox Decisions

Choose the lightest correct coordination pattern:

- **Plain call** when a single service owns the data and local ACID is enough — no saga cargo-cult.
- **Transactional outbox** when the same database transaction must atomically persist state and publish a message.
- **Saga** (orchestration or choreography) only when a business transaction spans multiple services.

Domain-event naming and aggregate boundaries remain under tactical DDD guidance. Overlap with inbound Kafka on `**/messaging/**` is expected—do not mutual-exclude.

### Verification

- Confirm single-service ACID flows use plain calls (no saga introduced for local CRUD).
- Confirm same-TX DB write + message publish uses transactional outbox (not dual-write without outbox).
- Confirm multi-service business TX uses an explicit saga style (orchestration or choreography) with compensations.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-saga-outbox -->
