# JS-EVT-01 Detail: Saga, Outbox & Plain-Call Decisions

## Rule restatement

Use outbox for same-TX DB+message, saga only for multi-service business TX, and plain calls for single-service ACID — no saga cargo-cult.

## Decision table

| Situation | Pattern | Why |
|-----------|---------|-----|
| Single service, one DB, local ACID sufficient | **Plain call** | No distributed coordination cost; avoid saga ceremony |
| Same service must write DB row and publish a message atomically | **Transactional outbox** | Prevents dual-write inconsistency without 2PC |
| Business transaction spans multiple services / ownership boundaries | **Saga** (orchestration or choreography) | Compensating steps replace distributed ACID |
| Internal single-DB tool / one-module CRUD | **Plain call** | when-NOT for saga — cargo-cult risk |

## When-NOT (explicit)

Do **not** introduce a saga when:

- One service owns the aggregate and a single ACID transaction completes the use-case.
- The change is local CRUD, configuration, or an internal batch with no cross-service commit requirement.
- The only “message” is an in-process domain event handled in the same JVM without durable publish needs (still may use domain events per DDD; that is not a saga).

Prefer plain application service + repository in those cases.

## Outbox sketch

1. Begin DB transaction.
2. Persist business state.
3. Insert outbox row (payload + metadata) in the **same** transaction.
4. Commit.
5. Relay/poller publishes to broker and marks outbox processed (idempotent).

## Saga notes

- **Orchestration:** a coordinator drives steps and compensations.
- **Choreography:** services react to events; each owns local decisions and compensations.
- Document failure and compensation paths; do not assume happy-path-only messaging.

Domain-event naming and aggregate design remain under **JS-DDD-01** (tactical DDD). This rule does **not** mandate CQRS.

## When to apply

- Construction tasks under `**/outbox/**`, `**/saga/**`, `**/messaging/**`.
- Keywords: `saga`, `outbox`, `transactional-outbox`, `choreography`, `orchestration`, `distributed-transaction`.
- Expected co-selection with inbound Kafka on messaging paths.

## When not

- Bare `event`, `message`, or `transaction` are not triggers (substring / breadth noise).
- Docs taskType and test sources are excluded.
- No CQRS command/query split is required by this rule.

## Verification checklist

1. Single-service ACID → plain call (no saga cargo-cult).
2. Same-TX DB + message → transactional outbox.
3. Multi-service business TX → explicit saga with compensations.
4. Domain-event naming deferred to tactical DDD; CQRS not mandated.
5. Docs and test paths are excluded from selection.

BODY_CANARY java-spring-saga-outbox
