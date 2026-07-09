---
id: java-spring-inbound-kafka
scope: domain
triggers:
  keywords:
    - kafka
    - kafka-consumer
    - kafka-listener
    - message-listener
  paths:
    - "**/*KafkaListener*"
    - "**/*MessageListener*"
    - "**/messaging/**/*Listener*"
    - "**/kafka/**"
    - "**/adapter/in/messaging/**"
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
summary: Kafka consumers must be idempotent with explicit retry/DLQ policy, and Kafka client types stay in adapters—not in domain.
classification: advisory
detailPath: details/java-spring-inbound-kafka-detail.md
---

## Rule JS-IN-02: Idempotent Kafka Consumers

Kafka consumers must process events idempotently, declare explicit retry and dead-letter (DLQ) policy, and keep Kafka client types in inbound adapters—not in domain packages. Listener methods should map payloads and delegate to application ports.

### Verification

- Confirm consumer handlers are idempotent under at-least-once delivery (dedupe key, upsert, or equivalent).
- Confirm retry/backoff and DLQ (or poison-message) policy is documented and configured.
- Confirm `KafkaListener` / consumer client types live under messaging adapters, not domain.
- Confirm REST-only controller paths do not select this rule; docs and tests are excluded.

<!-- BODY_CANARY java-spring-inbound-kafka -->
