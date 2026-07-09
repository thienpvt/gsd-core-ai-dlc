# JS-SVC-02 Detail: Internet-Facing Outbound Via Gateway

## Rule restatement

Internet-facing Java/Spring services must send outbound calls to external systems through the approved API gateway. Do not call external systems with raw WebClient, RestTemplate, Feign, or vendor SDKs from domain code.

## Approved gateway product (org example)

This organization standardizes on **WSO2** as the approved API gateway product for internet-facing egress. Summaries stay capability-oriented (“approved API gateway”); this detail names the product so implementers know which integration contract to use.

## When to apply

- Service or module is marked internet-facing / external-facing / public-edge / edge-service.
- Paths under `**/internet-facing/**`, `**/external-facing/**`, `**/edge/**`, `**/adapter/out/http/**`, or `**/infrastructure/gateway/**`.
- Keywords such as `internet-facing`, `external-facing`, `public-edge`, or `edge-service` appear in the task signal (class markers only — bare client-library names like `webclient` alone do not select).

## Do

- Route external HTTP/SDK calls through the WSO2 (approved gateway) adapter contract.
- Keep WebClient / RestTemplate / Feign / vendor SDK usage in infrastructure outbound adapters only when talking to the gateway, never from domain.
- Fail open when both internal and internet class markers appear: select neither outbound rule rather than guessing.

## Don't

- Do not call external systems with raw WebClient, RestTemplate, or SDKs from domain or application services.
- Do not apply this rule when `internal-service` / `internal-only` or internal paths dominate (mutual exclusion).
- Do not hard-code vendor product names into engine source; they live only in rule content like this file.

## Verification checklist

1. Classification is internet-facing and not dual-marked internal-only.
2. External egress goes through the approved gateway (WSO2) adapter.
3. No raw WebClient/RestTemplate/SDK calls originate from domain packages.
4. Dual class markers result in neither outbound rule (exclude XOR).

Forward pointer: Hexagonal outbound ports and adapters → Phase 14 rules.

BODY_CANARY java-spring-svc-internet-outbound
