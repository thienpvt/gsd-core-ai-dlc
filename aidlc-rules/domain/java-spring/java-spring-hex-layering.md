---
id: java-spring-hex-layering
scope: domain
triggers:
  keywords:
    - hexagonal
    - ports-and-adapters
    - inbound-port
    - outbound-port
  paths:
    - "**/domain/**"
    - "**/application/**"
    - "**/adapter/**"
    - "**/adapters/**"
    - "**/port/**"
    - "**/ports/**"
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
summary: "Keep dependencies pointing inward: domain must not import Spring, JPA, or framework/gateway types; adapters implement ports at the edges."
classification: advisory
detailPath: details/java-spring-hex-layering-detail.md
---

## Rule JS-HEX-01: Hexagonal Layering

Keep dependencies pointing inward. Domain packages must not import Spring stereotypes, JPA entities/repositories, HTTP clients, or framework/gateway SDKs. Application depends on domain; adapters implement ports at the edges and never reverse the dependency direction.

Ports are interfaces at the application/domain boundary; adapters live in infrastructure and implement those ports. Prefer a thin ports-and-adapters slice over always-on architecture essays.

### Verification

- Confirm domain packages import no Spring, JPA, HTTP-client, or gateway SDK types.
- Confirm adapters implement ports rather than domain depending on adapter types.
- Confirm dependency arrows point inward: domain ← application ← adapters.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-hex-layering -->
