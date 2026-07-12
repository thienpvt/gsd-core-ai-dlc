---
phase: 15-logging-api-contract-saga-decision-rules
plan: 01
subsystem: testing
tags: [tdd, java-spring, logging, api-contract, saga, outbox, selection, inject]

requires:
  - phase: 14-hexagonal-tactical-ddd-rules
    provides: Sibling suite pattern (java-spring-hex-ddd.test.ts) and 7-winner inventory baseline
  - phase: 13-domain-pack-service-classification-integrations
    provides: java-spring domain pack + buildIndex/select/renderInjection proof style
provides:
  - RED node:test suite locking JAVA-LOG-01 / JAVA-API-01 / JAVA-EVT-01 matrices
  - Plan 02 handoff constants (LOG_API_EVT_IDS, BODY_CANARIES, essay headings, keywords, paths)
affects:
  - 15-02 rule content authoring
  - precedence.test.ts inventory lock 7→10

tech-stack:
  added: []
  patterns:
    - "Sibling RED suite against real aidlc-rules via buildIndex (missing content = expected RED)"
    - "Bare-needle negatives for log/logger/rest before multi-token keywords land"

key-files:
  created:
    - src/select/java-spring-log-api-evt.test.ts
  modified: []

key-decisions:
  - "[15-01]: Sibling suite java-spring-log-api-evt.test.ts (does not extend Phase 13/14 inventories)"
  - "[15-01]: Filter path positive not required in RED matrix — plan 02 may add tight Correlation/Mdc filter globs only"
  - "[15-01]: Engine frozen; zero production src edits; zero new npm deps"

patterns-established:
  - "Phase 15 LOG/API/EVT proof mirrors Phase 14 HEX/DDD suite structure with three-id inventory"
  - "Handoff comment locks canaries, essay headings, when-NOT saga table, and 7→10 inventory note for plan 02"

requirements-completed: [JAVA-LOG-01, JAVA-API-01, JAVA-EVT-01]

coverage:
  - id: D1
    description: "RED suite for JAVA-LOG-01 path/keyword positives, bare-needle negatives, excludes, summary/inject contracts"
    requirement: JAVA-LOG-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-log-api-evt.test.ts#JAVA-LOG-01"
        status: fail
    human_judgment: false
    rationale: "Expected RED until plan 02 content lands; fail is the gate, not a defect"
  - id: D2
    description: "RED suite for JAVA-API-01 path/keyword positives, bare rest negative, excludes, summary/inject contracts"
    requirement: JAVA-API-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-log-api-evt.test.ts#JAVA-API-01"
        status: fail
    human_judgment: false
    rationale: "Expected RED until plan 02 content lands; fail is the gate, not a defect"
  - id: D3
    description: "RED suite for JAVA-EVT-01 path/keyword positives, saga when-NOT summary language, excludes, inject quarantine"
    requirement: JAVA-EVT-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-log-api-evt.test.ts#JAVA-EVT-01"
        status: fail
    human_judgment: false
    rationale: "Expected RED until plan 02 content lands; fail is the gate, not a defect"

duration: 12min
completed: 2026-07-10
status: complete
---

# Phase 15 Plan 01: LOG/API/EVT RED Suite Summary

**TDD RED suite locks JAVA-LOG-01 / JAVA-API-01 / JAVA-EVT-01 selection matrices against real `aidlc-rules` before content lands**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-09T17:45:22Z
- **Completed:** 2026-07-10T00:50:00Z
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments

- Added sibling suite `src/select/java-spring-log-api-evt.test.ts` encoding full LOG/API/EVT matrices (path-primary + multi-token keywords)
- Locked bare-needle negatives (`log`, `logger`, `rest`), docs/test/README excludes, inception out-of-phase, summary contracts, inject quarantine
- Documented plan 02 handoff: `LOG_API_EVT_IDS`, `BODY_CANARY` tokens, `## Rule JS-LOG/API/EVT-01` headings, saga when-NOT table, inventory 7→10

## Task Commits

Each task was committed atomically:

1. **Task 1: RED log-api-evt suite — path matrices, bare-needle negatives, inject quarantine** - `8355fb4` (test)
2. **Task 2: Confirm RED and document expected GREEN handoff** - (verification only; handoff comment shipped in Task 1 commit; no additional file delta)

**Plan metadata:** (pending final docs commit)

_Note: TDD RED plan — no GREEN feat commit until plan 02._

## Files Created/Modified

- `src/select/java-spring-log-api-evt.test.ts` - RED node:test suite for JAVA-LOG-01 / JAVA-API-01 / JAVA-EVT-01

## Decisions Made

- Sibling suite only — Phase 13 `PACK_IDS` and Phase 14 `HEX_DDD_IDS` inventories left intact
- Do not require `**/filter/**` path positives in RED; optional tight Correlation/Mdc filter globs deferred to plan 02 discretion
- Prefer production `aidlc-rules` via `buildIndex` — missing pack content is the expected RED cause (no fixture store)

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: `test(15-01): add failing test for LOG/API/EVT selection matrices` (`8355fb4`) present
- GREEN gate: deferred to plan 02 (content authoring)
- REFACTOR gate: n/a for this RED-only plan

## Test Results

```
npm run build:test  → exit 0
node --test dist-test/select/java-spring-log-api-evt.test.js
  tests 42 | pass 11 | fail 31 | exit 1
```

**Fail reasons (expected RED):** missing `java-spring-logging-audit` / `java-spring-api-contract` / `java-spring-saga-outbox` index records and consequent selection/summary/inject assertions — not import or TypeScript errors.

**Pass subset (already green without content):** hygiene canary absence, details/ not indexed, bare-needle negatives, README/docs/test excludes (none-of-three holds vacuously when rules absent).

## Known Stubs

None — suite is intentional RED; no production stubs introduced.

## Threat Flags

None — test-only surface; no new network endpoints, auth paths, or schema boundaries.

## Plan 02 Handoff

| Constant | Values |
|----------|--------|
| LOG_API_EVT_IDS | `java-spring-logging-audit`, `java-spring-api-contract`, `java-spring-saga-outbox` |
| BODY_CANARIES | `BODY_CANARY java-spring-logging-audit`, `BODY_CANARY java-spring-api-contract`, `BODY_CANARY java-spring-saga-outbox` |
| RULE_ESSAY_HEADINGS | `## Rule JS-LOG-01`, `## Rule JS-API-01`, `## Rule JS-EVT-01` |
| LOG keywords | `correlation-id`, `trace-id`, `mdc`, `audit-log`, `structured-logging` |
| API keywords | `openapi`, `api-version`, `error-envelope`, `swagger-spec` |
| EVT keywords | `saga`, `outbox`, `transactional-outbox`, `choreography`, `orchestration`, `distributed-transaction` |
| Inventory | precedence.test.ts winners 7 → 10 |

## Self-Check: PASSED

- FOUND: `src/select/java-spring-log-api-evt.test.ts`
- FOUND: commit `8355fb4`
- FOUND: suite RED (31 fail / 11 pass) with content-missing assertions
