# JS-API-01 Detail: API Contract

## Rule restatement

Treat OpenAPI as source-of-truth or generated-and-checked; use one org versioning policy and a uniform error envelope (`code`, `message`, `correlationId`).

## OpenAPI process (pick one, stick to it)

| Mode | Expectation |
|------|-------------|
| Source of truth | Human-authored OpenAPI drives code generation or contract tests |
| Generated-and-checked | Code/annotations generate OpenAPI; CI fails on unintended drift |

Either is acceptable. Do not leave OpenAPI unversioned and unchecked.

## Versioning policy (org default)

**Default: URI path versioning** — e.g. `/api/v1/payments`, `/api/v2/payments`.

- Keep major version in the path; avoid silent breaking changes under the same major.
- Header versioning (`Accept-Version`, custom headers) is an **explicit alternative** only when the org already standardizes on it for that service family.
- Do not mix URI and header major-version schemes in one service without a documented migration plan.

Bank-specific error code catalogs (numeric ranges, domain prefixes) stay in project scope; this pack only locks the envelope shape.

## Error envelope

Every error response should include at least:

```json
{
  "code": "PAYMENT_NOT_FOUND",
  "message": "Payment was not found for the given id",
  "correlationId": "c0ffee-…",
  "details": []
}
```

| Field | Required | Notes |
|-------|----------|-------|
| code | yes | Stable machine code (project catalog) |
| message | yes | Safe human text; no secrets/PII |
| correlationId | yes | Aligns with JS-LOG-01 MDC correlation id |
| details | optional | Field-level validation items |

## When to apply

- Construction tasks under `**/api/**`, `**/openapi/**`, `**/*Resource.java`, `**/web/**`.
- Keywords: `openapi`, `api-version`, `error-envelope`, `swagger-spec`.
- Expected co-selection with `java-spring-inbound-rest` on api/web paths.

## When not

- Do not fire on bare keyword `rest` (substring false positives; inbound REST owns controller keywords).
- Do not claim binding OpenAPI file-presence enforcement here (advisory only; real gates are CI adapters).
- Docs taskType and test sources are excluded.

## Cross-links

- Correlation id in errors aligns with **JS-LOG-01** logging/audit guidance.
- Thin controller mapping remains **JS-IN-01** (inbound REST).

## Verification checklist

1. OpenAPI is SoT or generated-and-checked with drift control.
2. One versioning policy is documented and applied (URI path default).
3. Errors return `code`, `message`, `correlationId` consistently.
4. No bare `rest` / always-on API essays for unrelated tasks.
5. Docs and test paths are excluded from selection.

BODY_CANARY java-spring-api-contract
