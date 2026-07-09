---
id: java-spring-api-contract
scope: domain
triggers:
  keywords:
    - openapi
    - api-version
    - error-envelope
    - swagger-spec
  paths:
    - "**/api/**"
    - "**/openapi/**"
    - "**/*Resource.java"
    - "**/web/**"
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
summary: "Treat OpenAPI as source-of-truth or generated-and-checked; use one org versioning policy and a uniform error envelope (code, message, correlationId)."
classification: advisory
detailPath: details/java-spring-api-contract-detail.md
---

## Rule JS-API-01: API Contract

Treat OpenAPI as the source of truth or as generated-and-checked in CI—pick one process and keep drift controlled. Apply a single org versioning policy (default: URI path `/api/v1/...`). Return a uniform error envelope with `code`, `message`, and `correlationId` (optional `details`).

Thin controller mapping remains under inbound REST guidance; this rule covers contract, versioning, and error shape. Overlap on `**/api/**` and `**/web/**` with inbound REST is expected—do not mutual-exclude.

### Verification

- Confirm OpenAPI is authored as SoT or generated and checked for drift in CI.
- Confirm the service uses one versioning policy (URI path default; header only if org-standard).
- Confirm error responses expose `code`, `message`, and `correlationId` consistently.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-api-contract -->
