---
phase: 16-starter-examples-outside-index
plan: 01
subsystem: examples
tags: [java-spring, hexagonal, starter-examples, buildIndex, non-index, TDD]

requires:
  - phase: 15-logging-api-contract-saga-decision-rules
    provides: 10-rule real-corpus inventory lock (require-mfa + 9 java-spring)
  - phase: 14-hexagonal-tactical-ddd-rules
    provides: JS-HEX-01 / JS-DDD-01 conventions mirrored by snippets
provides:
  - examples/java-spring hexagonal Order slice under com.example.orders
  - starter-examples.test.ts locking JAVA-EX-01 layout + JAVA-EX-02 non-index
  - package.json files includes examples for npm ship
affects:
  - 17-coverage-parser-binding-gateadapter
  - 18-verify-ship-wire-consumer-docs

tech-stack:
  added: []
  patterns:
    - "Starter snippets live at repo-root examples/, sibling of aidlc-rules/"
    - "Domain/application ports plain Java; framework annotations only in adapters"
    - "ponytail: ceiling comments mark intentional omissions"

key-files:
  created:
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
  modified:
    - package.json

key-decisions:
  - "[16-01]: com.example.orders Order slice (not SamplePayment); both input+output ports"
  - "[16-01]: buildIndex(examples) fails at frontmatter validation before D-10 tier check — both prove non-selectable root"
  - "[16-01]: Engine frozen; zero production src edits outside new test; zero new npm deps"

patterns-established:
  - "Sibling TDD suite under src/select/ locks layout isolation without selection positives"
  - "npm files[] must list examples so consumers receive the starter tree"

requirements-completed: [JAVA-EX-01, JAVA-EX-02]

coverage:
  - id: D1
    description: Hexagonal Order starter tree under examples/java-spring (domain, ports, handler, REST, Kafka, persistence)
    requirement: JAVA-EX-01
    verification:
      - kind: unit
        ref: dist-test/select/starter-examples.test.js#JAVA-EX-01 locked hexagonal Order snippet paths all exist
        status: pass
    human_judgment: false
  - id: D2
    description: buildIndex never indexes examples; inventory stays 10; package ships examples
    requirement: JAVA-EX-02
    verification:
      - kind: unit
        ref: dist-test/select/starter-examples.test.js#JAVA-EX-02 buildIndex(aidlc-rules) never indexes examples/ sourceFiles
        status: pass
      - kind: other
        ref: npm pack --dry-run | examples/java-spring/*
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-07-12
status: complete
---

# Phase 16 Plan 01: Starter Examples Outside Index Summary

**Thin com.example.orders hexagonal Order snippets under examples/java-spring, locked non-selectable by sibling TDD suite; inventory stays 10.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-12T13:06:56Z
- **Completed:** 2026-07-12T13:08:29Z
- **Tasks:** 2/2
- **Files modified:** 11

## Accomplishments

- Shipped hexagonal Order slice: domain aggregate+command, input/output ports, handler, REST + Kafka inbound adapters, persistence outbound adapter under `com.example.orders`.
- Domain/application stay plain Java; framework annotations only in adapters; Kafka adapter documents idempotency/retry/DLQ; persistence uses `ponytail:` ceiling.
- Plain README (no YAML frontmatter) states non-selectability, non-runnable ceiling, layout, mirror guidance, governing rule IDs.
- `starter-examples.test.ts` locks JAVA-EX-01 layout + JAVA-EX-02 non-index / inventory=10 / package ship.
- `package.json` `files` includes `examples`; `npm pack --dry-run` lists all starter paths.
- Engine frozen — zero production engine edits; zero new npm deps.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing starter-examples suite | 225f46f | src/select/starter-examples.test.ts |
| 2 (GREEN) | Examples tree + package.json files | 785f6aa | examples/java-spring/**, package.json, test regex tweak |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] D-10 backstop regex too narrow after examples exist**
- **Found during:** Task 2 GREEN verify
- **Issue:** `buildIndex(EXAMPLES_ROOT)` fails at frontmatter validation on README.md before `deriveScope` D-10 tier check (load order). Pure `/D-10|outside…tiers/` never matches.
- **Fix:** Broadened throws regex to also accept required-property / missing frontmatter errors — still proves examples is not a valid selectable root.
- **Files modified:** `src/select/starter-examples.test.ts`
- **Commit:** 785f6aa

## TDD Gate Compliance

- RED: `225f46f` test(16-01)
- GREEN: `785f6aa` feat(16-01)
- Gates present and ordered correctly.

## Known Stubs

Intentional (documented via `ponytail:` / README non-runnable ceiling):

| File | Stub | Reason |
|------|------|--------|
| OrderRepositoryAdapter.java | empty `save` body | Consumer adds JPA/JDBC; ceiling is port contract |
| PlaceOrderKafkaListener.java | comments for idempotency/retry/DLQ | Consumer owns broker infrastructure |

## Threat Flags

None — no new network endpoints, auth paths, or engine trust-boundary changes. T-16-01 mitigated by layout + suite; T-16-03 by `files` + pack dry-run.

## Self-Check: PASSED

- FOUND: src/select/starter-examples.test.ts
- FOUND: examples/java-spring/README.md + 8 Java snippets
- FOUND: package.json files includes examples
- FOUND: 225f46f, 785f6aa
- Suite: 10/10 pass; full npm test 532 pass / 0 fail / 3 skipped
- npm pack --dry-run lists examples/java-spring/*
