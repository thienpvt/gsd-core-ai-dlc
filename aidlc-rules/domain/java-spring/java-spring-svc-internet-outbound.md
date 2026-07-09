---
id: java-spring-svc-internet-outbound
scope: domain
triggers:
  keywords:
    - internet-facing
    - external-facing
    - public-edge
    - edge-service
  paths:
    - "**/internet-facing/**"
    - "**/external-facing/**"
    - "**/edge/**"
    - "**/adapter/out/http/**"
    - "**/infrastructure/gateway/**"
  exclude:
    keywords:
      - internal-service
      - internal-only
    paths:
      - "**/internal/**"
      - "**/services/internal/**"
      - "**/module-internal/**"
phases:
  - construction
severity: high
summary: Internet-facing services must send outbound calls through the approved API gateway; do not use raw WebClient, RestTemplate, or SDKs from domain.
classification: advisory
detailPath: details/java-spring-svc-internet-outbound-detail.md
---

## Rule JS-SVC-02: Internet-Facing Outbound Via Gateway

Internet-facing services must route outbound calls to external systems through the approved API gateway. Domain and application code must not call external systems with raw WebClient, RestTemplate, Feign clients, or vendor SDKs.

Place HTTP/SDK clients only in outbound adapters that target the gateway contract. Mutual exclusion with the internal-outbound rule is intentional: when both class markers appear, select neither rather than guessing. Bare client-library names without an internet-facing class marker do not select this rule (fail-open).

### Verification

- Confirm the service is classified internet-facing (edge markers or explicit internet-facing signal).
- Confirm external outbound traffic exits via the approved gateway adapter, not a direct client from domain.
- Confirm WebClient/RestTemplate/SDK usage is confined to infrastructure adapters when present at all.
- Confirm internal-only markers are absent; if present, this rule must not apply.

<!-- BODY_CANARY java-spring-svc-internet-outbound -->
