---
id: java-spring-svc-internal-outbound
scope: domain
triggers:
  keywords:
    - internal-service
    - internal-only
  paths:
    - "**/internal/**"
    - "**/services/internal/**"
    - "**/module-internal/**"
  exclude:
    keywords:
      - internet-facing
      - external-facing
      - public-edge
      - edge-service
      - api-gateway
      - wso2
    paths:
      - "**/internet-facing/**"
      - "**/external-facing/**"
      - "**/edge/**"
phases:
  - construction
severity: high
summary: Internal services may use JDBC/ORM or direct DB access outbound; do not force an API gateway on internal-only calls.
classification: advisory
detailPath: details/java-spring-svc-internal-outbound-detail.md
---

## Rule JS-SVC-01: Internal Service Outbound Access

Internal-class services may reach persistence outbound via JDBC, JPA/ORM, or other direct database access. Do not force an API gateway hop on internal-only calls when the service is not internet-facing.

Domain code should still avoid driver sprawl and raw connection management; prefer application ports and adapters for persistence boundaries (hexagonal depth is covered in later packs).

### Verification

- Confirm the service is classified internal (module/path markers or explicit internal-service signal).
- Confirm outbound DB access uses approved data-access adapters, not ad-hoc driver usage in domain.
- Confirm no mandatory API gateway requirement was applied solely because an outbound call exists.
- Confirm internet-facing markers are absent; if present, this rule must not apply.

<!-- BODY_CANARY java-spring-svc-internal-outbound -->
