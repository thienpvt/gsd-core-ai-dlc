# JS-DDD-01 Detail: Tactical DDD

## Rule restatement

One aggregate root per consistency boundary; entities are identity-based; value objects are immutable; domain events use past-tense names. Strategic maps and CQRS are out of this rule's scope.

## When to apply

- Construction phase tasks touching domain packages, aggregates, domain-scoped entities, value objects, or domain events.
- Keywords `aggregate-root`, `value-object`, `domain-event`, or `tactical-ddd`.
- Not for docs taskType or test sources (`*Test*`, `*Tests*`, `**/src/test/**`).

## When not

- Simple CRUD internal tools: do not invent an aggregate root per database table.
- Infrastructure `*Entity*` types outside domain packages (e.g. `EntityManagerConfig`, `JpaEntityScanner`) must not trigger this rule — Entity path globs are domain-scoped.
- Strategic DDD context maps and CQRS command/query split are deferred; do not expand this rule into those essays.

## Do

- Keep one aggregate root that owns transactional consistency for its boundary.
- Model entities under domain packages with identity equality.
- Keep value objects immutable after construction; compare by value.
- Name domain events in past tense (`OrderPlaced`, `PaymentSettled`).

## Don't

- Do not put business invariants only in application services when they belong on the aggregate root.
- Do not use present-tense or command-style names for domain events (`PlaceOrder`).
- Do not treat JPA entity listeners or config scanners outside domain as tactical DDD signals.

## Verification checklist

1. Each aggregate has a single root for its consistency boundary.
2. Value objects are immutable and value-equal.
3. Domain event type names are past tense.
4. Domain entities live under domain packages; infra Entity* types stay silent.
5. Docs and test paths are excluded from selection.
6. Strategic DDD / CQRS are not mandated by this rule.

BODY_CANARY java-spring-ddd-tactical
