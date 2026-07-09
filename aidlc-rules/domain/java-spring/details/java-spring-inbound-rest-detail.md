# JS-IN-01 Detail: Thin REST Controllers

## Rule restatement

Keep REST controllers thin: validate at the HTTP boundary, map to application ports/use-cases, and keep business logic out of controllers. Domain purity (no HTTP client types in domain) is guidance embedded here—not a fifth pack rule.

## When to apply

- Construction phase tasks touching `*Controller*`, `**/api/**`, `**/web/**`, `**/rest/**`, or `**/adapter/in/web/**`.
- Keywords `rest`, `controller`, or `endpoint` in the task signal.
- Not for docs taskType or test sources (`*Test*`, `*Tests*`, `**/src/test/**`).

## Do

- Validate request DTOs at the controller boundary.
- Map to application ports / use-case services immediately.
- Return response DTOs; keep orchestration thin.

## Don't

- Do not put business rules, transactions, or multi-aggregate workflows in controller methods.
- Do not inject repositories or external HTTP clients into controllers when an application port exists.
- Do not import outbound HTTP client types into domain packages.

## Verification checklist

1. Controllers are mapping + validation only.
2. Business logic lives in application/domain layers.
3. Controllers depend on ports, not infrastructure clients.
4. Docs and test paths are excluded from selection.

Forward pointer: Hexagonal inbound adapters and application services → Phase 14 rules.

BODY_CANARY java-spring-inbound-rest
