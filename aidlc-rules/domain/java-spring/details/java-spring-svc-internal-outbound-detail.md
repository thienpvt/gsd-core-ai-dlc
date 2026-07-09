# JS-SVC-01 Detail: Internal Service Outbound Access

## Rule restatement

Internal-class Java/Spring services may use JDBC, JPA/ORM, or other direct database access for outbound persistence. Do not force an API gateway on internal-only outbound calls.

## When to apply

- Service or module is marked internal (`internal-service`, `internal-only`, or paths under `**/internal/**`, `**/services/internal/**`, `**/module-internal/**`).
- Outbound work is primarily persistence or internal collaboration, not public-edge egress.

## Do

- Prefer JDBC/JPA/ORM through data-access adapters behind application ports.
- Keep domain free of raw driver sprawl and connection-string handling.
- Document the internal classification so reviewers do not apply internet-facing gateway rules by habit.

## Don't

- Do not require WSO2 or any API gateway hop solely because the service makes an outbound call.
- Do not apply this rule when internet-facing / edge / external-facing markers are present (mutual exclusion).
- Do not scatter bare `DriverManager` usage across domain packages.

## Verification checklist

1. Classification is internal and not dual-marked with internet-facing.
2. Persistence goes through approved ORM/JDBC adapters.
3. No forced gateway requirement on internal-only calls.
4. Domain remains free of raw driver sprawl (hexagonal layering expands in Phase 14).

Forward pointer: Hexagonal layering and port/adapter depth → Phase 14 rules.

BODY_CANARY java-spring-svc-internal-outbound
