---
phase: 16-starter-examples-outside-index
reviewed: 2026-07-12T13:16:30Z
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
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-07-12T13:16:30Z
**Depth:** deep
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Deep review of Phase 16 starter examples (JAVA-EX-01/JAVA-EX-02) against PLAN/CONTEXT. Scope: `examples/java-spring/**` Order hex slice, isolation suite, `package.json` files ship. Engine frozen correctly; layout and plain-vs-adapter split mostly sound; inventory=10 and non-index of real corpus hold.

Primary defect: JAVA-EX-02 D-10 backstop was **weakened after RED** so it no longer proves the locked D-10 tier failure. Secondary defects: suite drops PLAN-mandated README content asserts; REST adapter returns domain `Order` (contradicts JS-IN-01 "return response DTOs"); Kafka `@KafkaListener` without Spring stereotype leaves misleading mirror shape; package-relative paths do not match declared packages (compile-shape gap for consumers who try to compile).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: JAVA-EX-02 D-10 backstop diluted — frontmatter fail accepted as proof

**File:** `src/select/starter-examples.test.ts:167-174`
**Issue:** PLAN and CONTEXT lock a D-10 backstop: `assert.throws(() => buildIndex(EXAMPLES_ROOT), /outside the enterprise\/domain\/project tiers|D-10/)`. RED suite (225f46f) used that pattern. GREEN (785f6aa) widened the matcher to also accept `must have required property|missing '` because load order hits frontmatter validation on `README.md` **before** `deriveScope`/D-10.

That means the named "D-10 backstop" test can pass forever without ever exercising D-10. Worse structural risk: first path segment under `examples/java-spring/` includes `domain/`. If a future `.md` under `examples/java-spring/domain/` carries valid rule frontmatter with `scope: domain`, `deriveScope` would accept the tier and the file could enter the index when that root is scanned. Accepting any frontmatter error as "proof of non-selectability" does not lock the tier isolation PLAN claims.

**Fix:** Restore a real D-10 assertion. Options (pick one):

1. Point the backstop at a non-md-only fixture path that is still outside tiers after frontmatter is satisfied, **or**
2. Temporarily assert via a controlled call to `deriveScope`/`assertScopeMatchesDirectory` on a synthetic path under EXAMPLES_ROOT, **or**
3. Keep frontmatter-fail as a separate test and add a second test that builds a tiny temp tree with valid frontmatter under `examples/java-spring/domain/` and asserts D-09 mismatch or documents why D-10 cannot fire — do **not** claim D-10 when only frontmatter fails.

```ts
// Prefer: two distinct proofs
test("JAVA-EX-02: plain README fails frontmatter validation", () => {
  assert.throws(() => buildIndex(EXAMPLES_ROOT), /must have required property|missing '/);
});

test("JAVA-EX-02 backstop: path under examples is outside enterprise/domain/project tiers (D-10)", () => {
  // Use deriveScope / a valid-frontmatter fixture that still fails tier placement.
  // Do not accept frontmatter errors as D-10.
  assert.throws(
    () => deriveScope(path.join(EXAMPLES_ROOT, "README.md"), EXAMPLES_ROOT),
    /outside the enterprise\/domain\/project tiers|D-10/,
  );
});
```

## Warnings

### WR-01: Suite drops PLAN-required README content assertions

**File:** `src/select/starter-examples.test.ts:135-142`
**Issue:** PLAN behavior for JAVA-EX-01 README requires:

- non-selectability language (`examples outside aidlc-rules` / not selectable)
- citation of at least `java-spring-hex-layering`, `java-spring-inbound-rest`, `java-spring-inbound-kafka` by id string

Shipped suite only checks "does not start with `---`". README content today matches PLAN, but the lock is absent — a future edit can strip governing rule IDs or non-selectability wording while tests stay green. False-confidence for JAVA-EX-01 discoverability.

**Fix:**

```ts
test("JAVA-EX-01: README states non-selectability and cites governing rule ids", () => {
  const readme = readSnippet("README.md");
  assert.ok(!readme.startsWith("---"));
  assert.match(readme, /not selectable|outside `?aidlc-rules`?/i);
  for (const id of [
    "java-spring-hex-layering",
    "java-spring-inbound-rest",
    "java-spring-inbound-kafka",
  ]) {
    assert.ok(readme.includes(id), `README must cite ${id}`);
  }
});
```

### WR-02: REST adapter returns domain `Order` — contradicts JS-IN-01 / README guidance

**File:** `examples/java-spring/adapter/in/web/PlaceOrderController.java:22-28`
**Issue:** Controller signature is `public Order place(...)`. Governing detail JS-IN-01 says: validate request DTOs, map to ports, **return response DTOs**. Returning the domain aggregate from the HTTP boundary teaches the opposite of the rule this skeleton is meant to mirror. Misleading for LLM copy.

**Fix:** Introduce a boundary response record and map from `Order`:

```java
@PostMapping("/api/v1/orders")
public PlaceOrderResponse place(@RequestBody PlaceOrderRequest body) {
  if (body == null || body.customerId() == null || body.customerId().isBlank()) {
    throw new IllegalArgumentException("customerId required");
  }
  Order order = placeOrder.place(new PlaceOrderCommand(body.customerId(), body.amountCents()));
  return new PlaceOrderResponse(order.orderId(), order.customerId(), order.amountCents());
}

public record PlaceOrderResponse(String orderId, String customerId, long amountCents) {}
```

### WR-03: Kafka listener lacks Spring component stereotype — incomplete mirror

**File:** `examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java:12-19`
**Issue:** Class has `@KafkaListener` but no `@Component`/`@Service` (and no constructor-injection stereotype). Compile-shaped Spring consumers typically need a bean. REST uses `@RestController` (bean-forming); Kafka side does not. LLM mirror of this file will produce a non-discoverable listener unless the consumer invents the missing stereotype. CONTEXT allows framework annotations only in adapters — stereotype is allowed and expected for inbound messaging.

**Fix:**

```java
import org.springframework.stereotype.Component;

@Component
public class PlaceOrderKafkaListener {
  // ...
}
```

### WR-04: Package declaration vs on-disk path mismatch (compile-shape gap)

**File:** `examples/java-spring/**` (all `.java`)
**Issue:** Declared packages are `com.example.orders...` but files live at `examples/java-spring/domain/...` not `examples/java-spring/com/example/orders/domain/...`. PLAN allows non-runnable compile-shaped snippets and path discretion, but for consumers (or IDEs) that try `javac` with standard source roots, package/path mismatch is an immediate hard error. README says "compile-shaped pointers" without stating package≠path is intentional. Risk: false "broken sample" signal.

**Fix (docs minimum):** In README, one line: package names are logical; directory tree is layer-oriented, not a Maven `src/main/java` layout. Optional stronger fix: nest under `src/main/java/com/example/orders/...` while keeping layer folders — only if it does not bloat the "thin skeleton" ceiling.

## Info

### IN-01: Aggregate root has no invariant enforcement

**File:** `examples/java-spring/domain/Order.java:7-16`
**Issue:** JS-DDD-01 says invariants belong on the aggregate root. `Order` is a pure data holder; amount/customer validation lives only in the REST adapter (and not at all on Kafka path). Acceptable for thin skeleton, but DDD mirror is weak.

**Fix:** Optional factory or constructor guards (`amountCents > 0`, non-blank ids) on `Order` / `PlaceOrderCommand`. Mark remaining gaps with `ponytail:` if deferred.

### IN-02: Kafka path skips input validation present on REST

**File:** `examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java:20-24`
**Issue:** REST validates `customerId`; Kafka maps blindly. Intentional thinness is fine; without a comment, readers may copy asymmetric validation.

**Fix:** Comment that application/domain owns shared validation, or call the same guard helper. Optional `ponytail:` for shared validator.

### IN-03: README omits logging / API-contract / saga rule IDs from later packs

**File:** `examples/java-spring/README.md:30-39`
**Issue:** Table lists HEX/DDD/REST/Kafka/internal-outbound only. Phase 15 LOG/API/EVT rules exist in corpus; skeleton has no logging/outbox slice (in scope to omit). Not a defect vs PLAN (PLAN lists the five ids). Note for Phase 18 docs if examples grow.

**Fix:** None required for Phase 16. Phase 18 may extend the table when coverage/docs land.

---

_Reviewed: 2026-07-12T13:16:30Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
