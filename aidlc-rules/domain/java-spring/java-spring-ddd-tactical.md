---
id: java-spring-ddd-tactical
scope: domain
triggers:
  keywords:
    - aggregate-root
    - value-object
    - domain-event
    - tactical-ddd
  paths:
    - "**/domain/**"
    - "**/*Aggregate*"
    - "**/domain/**/*Entity*"
    - "**/*ValueObject*"
    - "**/*DomainEvent*"
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
summary: "Model one aggregate root per consistency boundary; keep value objects immutable; name domain events in past tense."
classification: advisory
detailPath: details/java-spring-ddd-tactical-detail.md
---

## Rule JS-DDD-01: Tactical DDD

Model one aggregate root per consistency boundary. Entities are identity-based; value objects are immutable and compared by value. Name domain events in past tense (`OrderPlaced`, not `PlaceOrder`). Keep strategic DDD (context maps, bounded-context essays) out of this tactical guidance.

Domain entities should live under domain packages. Do not invent an aggregate per table for simple CRUD internal tools.

### Verification

- Confirm each aggregate has one root that owns the consistency boundary.
- Confirm value objects are immutable after construction.
- Confirm domain event type names use past-tense phrasing.
- Confirm infra `*Entity*` types outside domain do not force this rule when path globs are narrowed.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-ddd-tactical -->
