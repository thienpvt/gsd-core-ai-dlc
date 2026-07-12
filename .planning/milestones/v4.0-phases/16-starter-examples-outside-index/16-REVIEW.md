---
phase: 16-starter-examples-outside-index
reviewed: 2026-07-12T13:26:25Z
depth: deep
files_reviewed: 11
files_reviewed_list:
  - src/select/starter-examples.test.ts
  - examples/java-spring/README.md
  - examples/java-spring/domain/Order.java
  - examples/java-spring/domain/PlaceOrderCommand.java
  - examples/java-spring/application/port/PlaceOrderPort.java
  - examples/java-spring/application/port/OrderRepositoryPort.java
  - examples/java-spring/application/PlaceOrderHandler.java
  - examples/java-spring/adapter/in/web/PlaceOrderController.java
  - examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java
  - examples/java-spring/adapter/out/persistence/OrderRepositoryAdapter.java
  - package.json
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
prior_review: 2026-07-12T13:16:30Z
remediation_range: fbaccc2..bbfba5d
---

# Phase 16: Code Review Report (re-review)

**Reviewed:** 2026-07-12T13:26:25Z
**Depth:** deep
**Files Reviewed:** 11
**Status:** clean
**Remediation range:** `fbaccc2..bbfba5d`

## Summary

Re-review Phase 16 after remediation commits `fbaccc2..bbfba5d`. Scope unchanged: `examples/java-spring/**` Order hex slice, isolation suite, `package.json` files ship. Prior review: 1 critical + 4 warnings + 3 info. All critical/warning findings verified fixed. Focused suite green: 8 JAVA-EX-01 + 3 JAVA-EX-02 + inventory + package.json files asserts pass (`npm test` overall 535 pass / 0 fail / 3 skipped). No new blockers or warnings. Residual info items are intentional thin-skeleton ceilings, not correctness/security defects.

## Prior finding disposition

| ID | Disposition | Evidence |
|----|-------------|----------|
| CR-01 | **RESOLVED** | `fbaccc2` — suite splits frontmatter fail vs genuine D-10 `deriveScope` backstop; D-10 assert no longer accepts frontmatter errors |
| WR-01 | **RESOLVED** | `276dbf7` — README asserts non-selectability wording + three governing rule ids |
| WR-02 | **RESOLVED** | `0d1540b` — REST returns `PlaceOrderResponse` boundary DTO; suite locks signature |
| WR-03 | **RESOLVED** | `b84f08d` — Kafka listener has `@Component`; suite locks stereotype |
| WR-04 | **RESOLVED** | `bbfba5d` — README documents layer-oriented path vs Maven package layout + mirror step 5 |
| IN-01 | **OPEN (info)** | Aggregate still pure data holder — thin skeleton ceiling, not ship-blocker |
| IN-02 | **OPEN (info)** | Kafka still skips REST-side `customerId` validation — documented thinness |
| IN-03 | **DROPPED** | Not a defect; README cites planned Phase 15/17/18 coverage intentionally |

## Verification of fixes

### CR-01 — D-10 backstop separated from frontmatter

`src/select/starter-examples.test.ts` now has two distinct tests:

1. `JAVA-EX-02: plain README fails frontmatter validation` — `buildIndex(EXAMPLES_ROOT)` must throw `/must have required property|missing '/` only.
2. `JAVA-EX-02 backstop: path under examples is outside enterprise/domain/project tiers (D-10)` — public `deriveScope(README under EXAMPLES_ROOT, EXAMPLES_ROOT)` must throw `/outside the enterprise\/domain\/project tiers|D-10/`.

Matches `deriveScope` implementation in `src/rules/scope.ts` (first path segment must be enterprise|domain|project). No longer claims D-10 when only frontmatter fails. **Pass.**

### WR-01 — README content locked

Suite asserts:

- no YAML frontmatter fence
- `/not selectable|outside \`?aidlc-rules\`?/i`
- ids: `java-spring-hex-layering`, `java-spring-inbound-rest`, `java-spring-inbound-kafka`

README body contains all three ids and non-selectability language. **Pass.**

### WR-02 — REST boundary response DTO

`PlaceOrderController.place` returns `PlaceOrderResponse`; nested request/response records present; suite forbids `public Order place(`. Aligns with JS-IN-01. **Pass.**

### WR-03 — Kafka Spring stereotype

`PlaceOrderKafkaListener` annotated `@Component` + constructor injection; suite locks `/@Component/`. **Pass.**

### WR-04 — package vs path documented

README adds:

- **Layout is layer-oriented, not Maven.** packages logical; on-disk tree by hex layer
- mirror step 5: relocate under `src/main/java/com/example/orders/...` before compiling

Intentional non-Maven layout no longer silent. **Pass.**

## Focused tests

```
✔ JAVA-EX-01: EXAMPLES_ROOT exists and is not nested under aidlc-rules
✔ JAVA-EX-01: locked hexagonal Order snippet paths all exist
✔ JAVA-EX-01: Java packages are com.example.orders; domain/app plain
✔ JAVA-EX-01: adapters wire ports; Kafka names idempotency/retry/DLQ
✔ JAVA-EX-01: at least one ponytail: ceiling comment under examples tree
✔ JAVA-EX-01: README states non-selectability and cites governing rule ids
✔ JAVA-EX-01: REST adapter returns boundary response DTO, not domain Order
✔ JAVA-EX-01: Kafka listener carries Spring component stereotype
✔ JAVA-EX-02: buildIndex(aidlc-rules) never indexes examples/ sourceFiles
✔ JAVA-EX-02: plain README fails frontmatter validation
✔ JAVA-EX-02 backstop: path under examples is outside enterprise/domain/project tiers (D-10)
✔ inventory regression: real corpus still has exactly 10 winners
✔ package.json files array ships examples
```

Full suite on `bbfba5d`: 535 pass, 0 fail, 3 skipped.

## Narrative Findings (AI reviewer)

No critical or warning findings. Residual info only (optional thin-skeleton polish).

## Info

### IN-01: Aggregate root still has no invariant enforcement

**File:** `examples/java-spring/domain/Order.java:7-16`
**Issue:** JS-DDD-01 says invariants belong on the aggregate root. `Order` remains a pure data holder; amount/customer validation lives only in the REST adapter. Acceptable for a thin skeleton with existing `ponytail:` ceiling on persistence, but DDD mirror is weak if consumers copy literally.
**Fix:** Optional factory/constructor guards (`amountCents > 0`, non-blank ids) on `Order` / `PlaceOrderCommand`. Mark remaining gaps with `ponytail:`. Not required for Phase 16 ship.

### IN-02: Kafka path still skips input validation present on REST

**File:** `examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java:20-24`
**Issue:** REST validates `customerId`; Kafka maps payload fields blindly into `PlaceOrderCommand`. Intentional thinness; without a comment that application/domain owns shared validation, readers may copy asymmetric checks.
**Fix:** One-line comment that shared validation lives on the command/handler. Optional `ponytail:` shared validator. Not required for Phase 16 ship.

---

_Reviewed: 2026-07-12T13:26:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
_Prior: 1 critical + 4 warning fixed in fbaccc2..bbfba5d; re-review clean_
