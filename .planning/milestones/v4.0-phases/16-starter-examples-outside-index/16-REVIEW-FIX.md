---
phase: 16-starter-examples-outside-index
fixed_at: 2026-07-12T13:24:15Z
review_path: .planning/phases/16-starter-examples-outside-index/16-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-07-12T13:24:15Z
**Source review:** .planning/phases/16-starter-examples-outside-index/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: JAVA-EX-02 D-10 backstop diluted — frontmatter fail accepted as proof

**Files modified:** `src/select/starter-examples.test.ts`
**Commit:** fbaccc2
**Applied fix:** Split diluted buildIndex backstop into (1) plain-README frontmatter failure assertion and (2) genuine public `deriveScope(path.join(EXAMPLES_ROOT, "README.md"), EXAMPLES_ROOT)` D-10 assertion. Does not claim buildIndex reaches D-10.

### WR-01: Suite drops PLAN-required README content assertions

**Files modified:** `src/select/starter-examples.test.ts`
**Commit:** 276dbf7
**Applied fix:** README test now locks non-selectability wording and required rule ids (`java-spring-hex-layering`, `java-spring-inbound-rest`, `java-spring-inbound-kafka`).

### WR-02: REST adapter returns domain Order — contradicts JS-IN-01 / README guidance

**Files modified:** `examples/java-spring/adapter/in/web/PlaceOrderController.java`, `src/select/starter-examples.test.ts`
**Commit:** 0d1540b
**Applied fix:** Nested package-local `PlaceOrderResponse` boundary record; `place()` maps from domain `Order` and returns the DTO. Test locks return type + record presence.

### WR-03: Kafka listener lacks Spring component stereotype — incomplete mirror

**Files modified:** `examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java`, `src/select/starter-examples.test.ts`
**Commit:** b84f08d
**Applied fix:** Added `@Component` + import. Test asserts stereotype present.

### WR-04: Package declaration vs on-disk path mismatch (compile-shape gap)

**Files modified:** `examples/java-spring/README.md`
**Commit:** bbfba5d
**Applied fix:** README states layer-oriented paths intentionally differ from Maven `src/main/java/com.example.orders` layout; consumers should relocate when copying. How-to step 5 added.

## Skipped Issues

None — all in-scope findings fixed. Info findings (IN-01..IN-03) out of scope.

## Verification

- Focused: `node --test dist-test/select/starter-examples.test.js` — 13/13 pass
- Full: `npm test` — 535 pass, 0 fail, 3 skipped

---

_Fixed: 2026-07-12T13:24:15Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
