---
id: java-spring-inbound-rest
scope: domain
triggers:
  keywords:
    - rest-controller
    - rest-api
    - rest-endpoint
    - restcontroller
    - controller
    - endpoint
  paths:
    - "**/*Controller.java"
    - "**/api/**"
    - "**/web/**"
    - "**/rest/**"
    - "**/adapter/in/web/**"
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
summary: "Keep REST controllers thin: validate at the boundary, map to application ports, and keep business logic out of controllers."
classification: advisory
detailPath: details/java-spring-inbound-rest-detail.md
---

## Rule JS-IN-01: Thin REST Controllers

REST controllers stay thin: validate and map at the HTTP boundary, delegate to application ports/use-cases, and keep business rules out of controller methods. Domain packages must not import HTTP client or framework transport types for outbound work—that purity is stated here as guidance, not a separate rule.

### Verification

- Confirm controller methods perform request/response mapping and validation only.
- Confirm business logic lives in application services or domain, not in `@RestController` / `@Controller` classes.
- Confirm controllers call application ports rather than repositories or external clients directly.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-inbound-rest -->
