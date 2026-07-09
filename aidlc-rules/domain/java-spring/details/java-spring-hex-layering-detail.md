# JS-HEX-01 Detail: Hexagonal Layering

## Rule restatement

Dependencies point inward only. Domain stays free of Spring, JPA, HTTP clients, and gateway/framework types. Adapters implement ports at the edges.

## Package map example

```
com.bank.payments.domain          ← pure domain (no framework imports)
com.bank.payments.application     ← use-cases / ports; depends on domain
com.bank.payments.adapter.in.*    ← inbound adapters (REST, messaging)
com.bank.payments.adapter.out.*   ← outbound adapters (persistence, HTTP)
com.bank.payments.ports           ← port interfaces at the edge
```

Dependency direction: `domain ← application ← adapters`. Adapters may depend on domain/application; domain must never depend on adapters or infrastructure.

## When to apply

- Construction phase tasks touching `**/domain/**`, `**/application/**`, `**/adapter/**`, `**/adapters/**`, `**/port/**`, `**/ports/**`.
- Keywords `hexagonal`, `ports-and-adapters`, `inbound-port`, or `outbound-port`.
- Not for docs taskType or test sources (`*Test*`, `*Tests*`, `**/src/test/**`).

## When not

- Small single-module CRUD may use a thin hexagonal slice (one or two ports + one adapter) without multi-package ceremony.
- Do not mandate CQRS command/query split here — CQRS is out of phase for this pack.

## Do

- Place framework annotations and persistence mapping in adapters, not domain.
- Define ports as interfaces; implement them in adapters.
- Keep domain free of Spring stereotypes, JPA entities/repos, HTTP clients, and gateway SDKs.

## Don't

- Do not reverse dependencies so domain imports adapter or infrastructure packages.
- Do not inject gateway product SDKs or HTTP clients into domain services.
- Do not treat hexagonal packaging as always-on architecture essays for every task.

## Verification checklist

1. Domain packages have no Spring/JPA/framework/gateway imports.
2. Adapters implement ports; domain does not depend on adapters.
3. Application orchestrates via ports and domain types only.
4. Docs and test paths are excluded from selection.
5. CQRS is not required by this rule.

BODY_CANARY java-spring-hex-layering
