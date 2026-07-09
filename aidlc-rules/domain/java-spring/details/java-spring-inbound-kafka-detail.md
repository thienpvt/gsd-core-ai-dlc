# JS-IN-02 Detail: Idempotent Kafka Consumers

## Rule restatement

Kafka consumers must be idempotent with explicit retry/DLQ policy, and Kafka client types stay in adapters—not in domain.

## When to apply

- Construction phase tasks touching `*Listener*`, `*Consumer*`, `**/messaging/**`, `**/kafka/**`, or `**/adapter/in/messaging/**`.
- Keywords `kafka`, `consumer`, or `listener` in the task signal.
- Not for docs taskType or test sources; REST-only controller paths must not select this rule.

## Do

- Design handlers for at-least-once delivery (idempotency keys, upserts, or dedupe store).
- Document and configure retry/backoff and dead-letter (DLQ) / poison-message handling.
- Keep `@KafkaListener` and Kafka client types under inbound messaging adapters.
- Map payloads and delegate to application ports.

## Don't

- Do not put Kafka consumer client types in domain packages.
- Do not assume exactly-once without an explicit transactional outbox/inbox design.
- Do not leave retry/DLQ policy implicit or “default broker only.”

## Verification checklist

1. Consumer is idempotent under redelivery.
2. Retry and DLQ policy are explicit and reviewable.
3. Kafka types live in adapters, not domain.
4. REST controller-only signals do not select this rule; docs/tests excluded.

Forward pointer: Messaging adapters and hexagonal inbound ports → Phase 14 rules.

BODY_CANARY java-spring-inbound-kafka
