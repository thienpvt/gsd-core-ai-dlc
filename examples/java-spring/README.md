# Java/Spring starter examples (reference only)

Thin hexagonal Order slice under `com.example.orders` for LLM mirroring.

**Not selectable.** This tree lives outside `aidlc-rules/`. `build-index` never
indexes it. Do not put YAML rule frontmatter here.

**Not runnable.** No Maven/Gradle, no Spring Boot main, no broker/DB wiring.
Snippets are compile-shaped pointers, not a sample application.

**Layout is layer-oriented, not Maven.** Paths intentionally differ from a
`src/main/java/com/example/orders/...` package tree. Packages are logical
(`com.example.orders…`); the on-disk tree is by hex layer for readability.
Relocate under a standard source root when copying into a real project.

## Layout

```
examples/java-spring/
  domain/                          # plain aggregate + command
  application/port/                # input + output ports (plain Java)
  application/PlaceOrderHandler.java
  adapter/in/web/                  # REST inbound (framework annotations OK)
  adapter/in/messaging/            # Kafka inbound (idempotency / retry / DLQ)
  adapter/out/persistence/         # output-port adapter (persistence omitted)
```

## How to mirror

1. Keep domain and application ports free of Spring/JPA stereotypes.
2. Put framework annotations only in `adapter/**`.
3. REST and Kafka adapters both call the same input port.
4. Leave concrete JPA/driver/Kafka client details to the consumer project.
5. Move files under `src/main/java/com/example/orders/...` (or your root) before compiling.

## Governing rule IDs

| Concern | Rule id |
|---------|---------|
| Hexagonal layering | `java-spring-hex-layering` (JS-HEX-01) |
| Tactical DDD | `java-spring-ddd-tactical` (JS-DDD-01) |
| REST inbound | `java-spring-inbound-rest` (JS-IN-01) |
| Kafka inbound | `java-spring-inbound-kafka` (JS-IN-02) |
| Internal outbound | `java-spring-svc-internal-outbound` (JS-SVC-01) |

Phase 17 covers unit-coverage binding; Phase 18 covers consumer docs.
