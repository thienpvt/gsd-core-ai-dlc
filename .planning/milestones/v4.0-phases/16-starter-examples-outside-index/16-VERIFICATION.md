---
phase: 16-starter-examples-outside-index
verified: 2026-07-12T13:45:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 16: Starter Examples Outside Index Verification Report

**Phase Goal:** LLM can mirror thin Java/Spring starter layout and snippets without those files ever becoming selectable governance rules
**Verified:** 2026-07-12T13:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `examples/java-spring/` ships at repo root as sibling of `aidlc-rules/` with hexagonal Order layout | ✓ VERIFIED | Glob confirms 9 files; `EXAMPLES_ROOT` resolves to `cwd/examples/java-spring`, not under `aidlc-rules`; suite test "EXAMPLES_ROOT exists and is not nested under aidlc-rules" passes |
| 2 | Thin compile-shaped Java snippets cover domain model/command, input port, output port, handler, REST adapter, Kafka adapter, persistence adapter under `com.example.orders` | ✓ VERIFIED | All 9 files substantive; package declarations `com.example.orders.{domain,application.port,application,adapter.in.web,adapter.in.messaging,adapter.out.persistence}`; suite test "Java packages are com.example.orders" passes |
| 3 | Domain and application port contracts are plain Java; Spring/framework annotations appear only in adapter classes | ✓ VERIFIED | `Order.java`, `PlaceOrderCommand.java`, `PlaceOrderPort.java`, `OrderRepositoryPort.java`, `PlaceOrderHandler.java` contain no framework tokens (`@RestController`/`@KafkaListener`/`@Service`/`@Repository`/`@Entity`/`@Autowired`); adapters carry `@RestController`, `@PostMapping`, `@KafkaListener`, `@Component` |
| 4 | README.md is plain Markdown with no YAML frontmatter and states non-selectability + mirrored rule ids | ✓ VERIFIED | `examples/java-spring/README.md` line 1 `# Java/Spring starter examples` (no `---` fence); body contains "Not selectable" + "outside `aidlc-rules/`"; cites rule ids `java-spring-hex-layering`, `java-spring-inbound-rest`, `java-spring-inbound-kafka`, `java-spring-ddd-tactical`, `java-spring-svc-internal-outbound` |
| 5 | `buildIndex(aidlc-rules)` emits no sourceFile under `examples/` and no example/sample rule ids | ✓ VERIFIED | Runtime invocation: 10 rules, every sourceFile under `aidlc-rules/`; no id starts with `example` or `sample`; suite test "buildIndex(aidlc-rules) never indexes examples/ sourceFiles" passes |
| 6 | `buildIndex(examples/java-spring)` throws D-10 scope error (backstop) | ✓ VERIFIED | Two-layer proof per code review CR-01 fix: (a) `buildIndex(EXAMPLES_ROOT)` throws frontmatter validation errors (non-selection); (b) `deriveScope(README.md, EXAMPLES_ROOT)` throws `outside enterprise/domain/project tiers (D-10)`. Both verified at runtime. Suite tests "plain README fails frontmatter validation" + "D-10 backstop" pass |
| 7 | Real-corpus inventory stays exactly 10 winners; Phase 16 adds zero selectable rules | ✓ VERIFIED | Runtime: `buildIndex(aidlc-rules).rules.length === 10` (require-mfa + 9 java-spring). Suite test "inventory regression: real corpus still exactly 10 winners" passes |
| 8 | `package.json` `files` includes `examples` so npm consumers receive the starter tree | ✓ VERIFIED | `package.json` line 21 `"examples"`; `npm pack --dry-run` lists `examples/java-spring/PlaceOrderKafkaListener.java` (and siblings). Suite test "package.json files array ships examples" passes |
| 9 | No production engine edits under `src/rules`, `src/index`, `src/select` (except new test), `src/inject`, `src/cli`, `src/schema` | ✓ VERIFIED | `git diff 14bf9a4^..d5cba43 -- src/` returns empty for all production engine paths; only `src/select/starter-examples.test.ts` is new. Zero engine source modifications |

**Score:** 9/9 truths verified (0 present-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/select/starter-examples.test.ts` | TDD suite locking JAVA-EX-01 + JAVA-EX-02 | ✓ VERIFIED | 240+ lines; 13 tests covering layout, packages, plain-domain, adapter wiring, ponytail, README content, REST DTO, Kafka stereotype, non-indexing, frontmatter fail, D-10 backstop, inventory=10, package ship |
| `examples/java-spring/README.md` | Purpose, non-runnable ceiling, layout, mirror guidance, governing rule IDs | ✓ VERIFIED | 47 lines; 6 sections; non-Maven layout caveat (WR-04 fix); mirror step 5 |
| `examples/java-spring/domain/Order.java` | Plain domain aggregate root | ✓ VERIFIED | `com.example.orders.domain`; final class; no framework tokens |
| `examples/java-spring/domain/PlaceOrderCommand.java` | Plain domain command type | ✓ VERIFIED | `com.example.orders.domain`; immutable fields |
| `examples/java-spring/application/port/PlaceOrderPort.java` | Input port interface (plain Java) | ✓ VERIFIED | `com.example.orders.application.port`; interface; returns `Order` |
| `examples/java-spring/application/port/OrderRepositoryPort.java` | Output port interface (plain Java) | ✓ VERIFIED | `com.example.orders.application.port`; interface `save(Order)` |
| `examples/java-spring/application/PlaceOrderHandler.java` | Application handler implementing input port via output port | ✓ VERIFIED | `implements PlaceOrderPort`; depends on `OrderRepositoryPort`; no Spring stereotypes |
| `examples/java-spring/adapter/in/web/PlaceOrderController.java` | Thin REST inbound adapter | ✓ VERIFIED | `@RestController`; returns `PlaceOrderResponse` boundary DTO (WR-02 fix); validation at boundary; delegates to `PlaceOrderPort` |
| `examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java` | Kafka inbound adapter with idempotency/retry/DLQ markers | ✓ VERIFIED | `@Component` (WR-03 fix) + `@KafkaListener`; comments name idempotency/retry/DLQ |
| `examples/java-spring/adapter/out/persistence/OrderRepositoryAdapter.java` | Persistence outbound adapter implementing output port | ✓ VERIFIED | `implements OrderRepositoryPort`; `ponytail:` ceiling comment for JPA/JDBC |
| `package.json` | `files` includes `examples` | ✓ VERIFIED | Line 21 `"examples"`; `npm pack --dry-run` lists examples paths |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/select/starter-examples.test.ts` | `aidlc-rules/` | `buildIndex(REAL_RULES_ROOT)` non-indexing + inventory=10 | ✓ WIRED | Test imports `buildIndex` from `../index/build.js`; asserts inventory=10; asserts no `examples/` sourceFile |
| `src/select/starter-examples.test.ts` | `examples/java-spring/` | layout existence + `deriveScope(EXAMPLES_ROOT/README)` D-10 throw | ✓ WIRED | Test imports `deriveScope` from `../rules/scope.js`; asserts D-10 throws on examples path |
| `package.json` | `examples/` | `files` array includes `"examples"` | ✓ WIRED | `npm pack --dry-run` includes `examples/java-spring/*` paths |

### Data-Flow Trace (Level 4)

Not applicable — phase ships static Java snippet documentation files and a test suite. No dynamic data rendering or API/store flows to trace.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 16 suite passes | `node --test dist-test/select/starter-examples.test.js` | 13 pass / 0 fail | ✓ PASS |
| Full workspace suite passes | `npm test` | 535 pass / 0 fail / 3 skipped | ✓ PASS |
| Inventory stays 10 | `node -e "buildIndex(aidlc-rules).rules.length"` | 10 | ✓ PASS |
| `buildIndex(aidlc-rules)` excludes examples | runtime inspection of all 10 sourceFiles | none under `examples/` | ✓ PASS |
| `deriveScope` throws D-10 on examples path | runtime invocation | `outside enterprise/domain/project tiers (D-10)` | ✓ PASS |
| `buildIndex(examples/java-spring)` throws | runtime invocation | frontmatter validation errors | ✓ PASS |
| npm pack ships examples | `npm pack --dry-run \| grep examples` | `examples/java-spring/PlaceOrderKafkaListener.java` etc. | ✓ PASS |
| Engine freeze | `git diff 14bf9a4^..d5cba43 -- src/index src/inject src/cli src/schema src/rules` | empty | ✓ PASS |

### Probe Execution

No conventional probes (`scripts/*/tests/probe-*.sh`) declared by PLAN or applicable to this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| JAVA-EX-01 | 16-01-PLAN | Starter tree under `examples/java-spring/` ships outside rule-index scan roots | ✓ SATISFIED | 9 files at repo-root `examples/java-spring/`; sibling of `aidlc-rules/`; hexagonal layout locked by 8 passing tests |
| JAVA-EX-02 | 16-01-PLAN | Index/load path never treats starter markdown under `examples/` as selectable rules | ✓ SATISFIED | `buildIndex(aidlc-rules)` returns 0 sourceFiles under `examples/`; `deriveScope(examples)` throws D-10; suite 3/3 JAVA-EX-02 tests pass |

No orphaned requirements — REQUIREMENTS.md maps only JAVA-EX-01 and JAVA-EX-02 to Phase 16.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER`/`placeholder`/`not yet implemented` markers in any phase 16 file. Intentional thin-skeleton ceilings documented via `ponytail:` comments (approved pattern) and README non-runnable ceiling.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `examples/java-spring/adapter/out/persistence/OrderRepositoryAdapter.java` | 9-11 | `ponytail:` ceiling comment (empty `save` body) | ℹ️ Info | Intentional — consumer wires JPA/JDBC; documented |
| `examples/java-spring/adapter/in/messaging/PlaceOrderKafkaListener.java` | 23-25 | comment stubs for idempotency/retry/DLQ | ℹ️ Info | Intentional — consumer owns broker infra; documented in README |

### Human Verification Required

None. All truths resolved by automated suite + runtime behavioral spot-checks.

### Gaps Summary

No gaps. All 9 must-have truths verified. All 11 artifacts substantive and wired. Code review findings (1 critical, 4 warnings) fully resolved in commits `fbaccc2..bbfba5d`; re-review clean (0 critical, 0 warning). Engine frozen. Inventory stays 10. Phase goal achieved: LLM can mirror a thin Java/Spring starter layout and the snippets never become selectable governance rules.

---

_Verified: 2026-07-12T13:45:00Z_
_Verifier: Claude (gsd-verifier)_
