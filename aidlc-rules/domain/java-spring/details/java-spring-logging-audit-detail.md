# JS-LOG-01 Detail: Logging and Audit

## Rule restatement

Propagate correlation/trace ids via MDC, never log PII or secrets, and emit audit events for state-changing operations.

## MDC / filter wiring sketch

```
Inbound HTTP/message
  → Correlation*Filter / Mdc*Filter (read or generate correlation id; put trace id)
  → MDC: correlationId, traceId, (optional) service, tenant
  → Handler / aspect logs with structured fields only
  → AuditLoggingAspect (or port) on state-changing use-cases
```

Common placement under construction:

- `**/logging/**` — MDC helpers, structured log formatters
- `**/config/*Log*` — Logback/Log4j2 appenders, JSON layout
- `**/aop/**` — audit aspects around mutating application services
- `**/*Correlation*Filter*`, `**/*Mdc*Filter*` — request-scoped id propagation

Do **not** rely on bare `**/filter/**` (security/auth filters would over-inject this guidance).

## PII / secrets denylist (bank services)

Never place these in log messages, structured fields, or exception messages that reach log sinks:

- PAN / card numbers, CVV, full account numbers
- Government IDs, full national ID numbers
- Passwords, API keys, tokens, session cookies, private keys
- Biometric templates, full auth codes / OTPs
- Unredacted free-text that may contain the above

Prefer redaction, hashing, or last-4 truncation when an identifier is required for support.

## Audit event minimum fields

For state-changing / money-moving operations, emit at least:

| Field | Purpose |
|-------|---------|
| actor | Who initiated (user/service principal) |
| action | What was attempted (verb + domain op) |
| resource | Target entity/id (non-sensitive form) |
| outcome | success / failure / denied |
| correlationId | Same id as request MDC |

Optional: reason code, amount bucket (not raw free-text secrets), client channel.

## When to apply

- Construction tasks touching logging config, AOP audit aspects, or Correlation/Mdc filters.
- Keywords: `correlation-id`, `trace-id`, `mdc`, `audit-log`, `structured-logging`.
- Not for docs taskType or test sources (`*Test*`, `*Tests*`, `**/src/test/**`).

## When not

- Do not inject always-on logging essays for unrelated domain edits.
- Do not treat bare keyword `log` / `logger` as a trigger (substring noise).
- Binding log-PII scanners remain CI/SAST concerns — this rule is advisory.

## Verification checklist

1. Correlation/trace id is set before business handlers run.
2. No PII/secrets/PAN appear in application or audit logs.
3. Mutating operations produce audit records with actor/action/resource/outcome/correlationId.
4. Structured fields preferred over string concatenation of sensitive data.
5. Docs and test paths are excluded from selection.

BODY_CANARY java-spring-logging-audit
