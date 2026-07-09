---
phase: 14-hexagonal-tactical-ddd-rules
plan: 01
subsystem: testing
tags: [tdd, java-spring, hexagonal, ddd, selection, node-test]

requires:
  - phase: 13-domain-pack-service-classification-integrations
    provides: java-spring domain pack subscription + pack suite pattern (buildIndex/select/renderInjection)
provides:
  - RED node:test suite locking JAVA-HEX-01 and JAVA-DDD-01 selection matrices
  - Plan 02 handoff constants (HEX_DDD_IDS, BODY_CANARIES, essay headings, Entity glob)
affects:
  - 14-02 (GREEN content authoring for hex-layering + ddd-tactical rules)

tech-stack:
  added: []
  patterns:
    - Sibling suite pattern (java-spring-hex-ddd.test.ts) keeps Phase 13 PACK_IDS inventory stable
    - Real aidlc-rules root via buildIndex — missing pack content is expected RED
    - Entity glob string built from path segments to avoid block-comment */ terminator issues

key-files:
  created:
    - src/select/java-spring-hex-ddd.test.ts
  modified: []

key-decisions:
  - "Sibling suite java-spring-hex-ddd.test.ts (not extending Phase 13 pack suite)"
  - "LOCKED_ENTITY_PATH_GLOB = **/domain/**/*Entity* (domain-scoped; infra EntityManagerConfig/JpaEntityScanner negatives)"
  - "Engine frozen — zero production src edits outside new test file; zero new npm deps"

patterns-established:
  - "Plan 02 handoff block documents HEX_DDD_IDS, BODY_CANARY tokens, ## Rule JS-HEX-01 / JS-DDD-01, Entity glob"
  - "CR keyword-only negatives (identity, prevent-duplicate, eventual-consistency, report/support, interest-rate)"

requirements-completed: []  # Locked by RED suite; mark complete after plan 02 GREEN

coverage:
  - id: D1
    description: "RED suite locks JAVA-HEX-01 path/keyword positives, subscription gate, excludes, inject quarantine"
    requirement: JAVA-HEX-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-hex-ddd.test.ts#JAVA-HEX-01"
        status: fail
    human_judgment: false
  - id: D2
    description: "RED suite locks JAVA-DDD-01 path/keyword positives, CR Entity negatives, summary contract"
    requirement: JAVA-DDD-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-hex-ddd.test.ts#JAVA-DDD-01"
        status: fail
    human_judgment: false

duration: 12min
completed: 2026-07-10
status: complete
---

# Phase 14 Plan 01: HEX/DDD RED Suite Summary

**TDD RED suite `java-spring-hex-ddd.test.ts` locks JAVA-HEX-01 and JAVA-DDD-01 against real `aidlc-rules` (21 fail / 15 pass until plan 02 content lands).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-09T17:25:07Z
- **Completed:** 2026-07-10
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments

- Created sibling proof suite (36 named tests) covering hygiene, subscription gate, HEX/DDD path and keyword positives, CR bank-trap negatives, infra Entity path negatives, docs/test/README excludes, inception out-of-phase, summary contract, inject quarantine
- Documented plan 02 handoff: `HEX_DDD_IDS`, `BODY_CANARY java-spring-hex-layering` / `java-spring-ddd-tactical`, `## Rule JS-HEX-01` / `## Rule JS-DDD-01`, locked Entity glob `**/domain/**/*Entity*`
- Confirmed RED for content-missing assertions only — `npm run build:test` succeeds; no import/TS errors; engine frozen

## Task Commits

Each task was committed atomically:

1. **Task 1: RED hex-ddd suite — path matrices, CR negatives, inject quarantine** - `164143a` (test)
2. **Task 2: Confirm RED and document expected GREEN handoff** - verification only (no additional code changes; handoff already in Task 1 file)

**Plan metadata:** (docs commit after this SUMMARY)

_Note: TDD plan type — RED commit present; GREEN content is plan 02._

## Files Created/Modified

- `src/select/java-spring-hex-ddd.test.ts` — full JAVA-HEX-01 / JAVA-DDD-01 RED matrix against production `aidlc-rules`

## Decisions Made

- Sibling suite instead of extending `java-spring-pack.test.ts` so Phase 13 four-rule inventory assertions stay stable
- Domain-scoped Entity glob constant `LOCKED_ENTITY_PATH_GLOB` built via `["**","domain","**","*Entity*"].join("/")` so star-slash never closes a block comment
- Prefer real `aidlc-rules` via `buildIndex` — missing `java-spring-hex-layering` / `java-spring-ddd-tactical` is the expected RED cause

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Block-comment terminator in Entity glob docs/string**
- **Found during:** Task 1 compile
- **Issue:** Contiguous `*/` inside block comments and string literals (`**/domain/**/*Entity*`) terminated TypeScript comments / broke parse
- **Fix:** Prose-only header wording; `LOCKED_ENTITY_PATH_GLOB` built from path segments with `.join("/")`
- **Files modified:** `src/select/java-spring-hex-ddd.test.ts`
- **Commit:** `164143a`

None other — plan executed as written for scope and assertions.

## Test Results (expected RED)

```
npm run build:test  → exit 0
node --test dist-test/select/java-spring-hex-ddd.test.js → exit 1
  tests 36 | pass 15 | fail 21
```

Failures are content-missing (rules not in index / not selected), not compile or import errors. Passes are hygiene + CR/unrelated negatives that correctly stay silent without HEX/DDD rules.

## Plan 02 Handoff

Author under `aidlc-rules/domain/java-spring/`:

| Artifact | Notes |
|----------|--------|
| `java-spring-hex-layering.md` + `details/java-spring-hex-layering-detail.md` | id `java-spring-hex-layering`, heading `## Rule JS-HEX-01`, canary `BODY_CANARY java-spring-hex-layering` |
| `java-spring-ddd-tactical.md` + `details/java-spring-ddd-tactical-detail.md` | id `java-spring-ddd-tactical`, heading `## Rule JS-DDD-01`, canary `BODY_CANARY java-spring-ddd-tactical`, Entity path `**/domain/**/*Entity*` |

See `14-RESEARCH.md` "Recommended Rule Specs". Rebuild index after authoring; do not invent a fixture store.

## Known Stubs

None — suite intentionally fails until plan 02 content exists (TDD RED, not a product stub).

## Threat Flags

None new — suite mitigates T-14-01..T-14-04 from plan threat model (subscription, CR false positives, body leak, essay bloat).

## TDD Gate Compliance

- RED gate commit present: `164143a` `test(14-01): add failing HEX/DDD selection suite (RED)`
- GREEN gate deferred to plan 02 (content authoring)
- Suite observed RED: 21 failures citing missing HEX/DDD index entries / selection

## Self-Check: PASSED

- FOUND: `src/select/java-spring-hex-ddd.test.ts`
- FOUND: commit `164143a`
- FOUND: build:test succeeds; suite fails with content-missing assertions
