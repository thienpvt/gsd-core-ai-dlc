---
phase: 15-logging-api-contract-saga-decision-rules
plan: 02
subsystem: domain-rules
tags: [java-spring, logging, api-contract, saga, outbox, advisory, selection, inject]

requires:
  - phase: 15-logging-api-contract-saga-decision-rules
    provides: RED suite java-spring-log-api-evt.test.ts locking LOG/API/EVT matrices
  - phase: 14-hexagonal-tactical-ddd-rules
    provides: Sibling suite pattern and 7-winner inventory baseline
  - phase: 13-domain-pack-service-classification-integrations
    provides: java-spring domain pack subscription + buildIndex/select/inject path
provides:
  - Three advisory domain rules (logging-audit, api-contract, saga-outbox) under aidlc-rules/domain/java-spring/
  - Lazy detail files with saga when-NOT decision table and URI versioning default
  - Real-corpus inventory lock at 10 winners (mfa + nine java-spring)
  - GREEN java-spring-log-api-evt suite (42/42) and full npm test green
affects:
  - Phase 16 starter examples (may reference LOG/API/EVT rules)
  - Phase 18 consumer docs
  - precedence inventory for future pack growth

tech-stack:
  added: []
  patterns:
    - "Multi-token keywords only for LOG/API/EVT; no bare log/logger/rest"
    - "Tight Correlation/Mdc filter globs instead of bare **/filter/**"
    - "URI path versioning as org default; header versioning as explicit alternative"
    - "Saga when-NOT: single-service ACID → plain call"

key-files:
  created:
    - aidlc-rules/domain/java-spring/java-spring-logging-audit.md
    - aidlc-rules/domain/java-spring/java-spring-api-contract.md
    - aidlc-rules/domain/java-spring/java-spring-saga-outbox.md
    - aidlc-rules/domain/java-spring/details/java-spring-logging-audit-detail.md
    - aidlc-rules/domain/java-spring/details/java-spring-api-contract-detail.md
    - aidlc-rules/domain/java-spring/details/java-spring-saga-outbox-detail.md
  modified:
    - src/index/precedence.test.ts

key-decisions:
  - "[15-02]: Optional tight **/*Correlation*Filter* and **/*Mdc*Filter* globs; no bare **/filter/**"
  - "[15-02]: URI path versioning (/api/v1/...) is the documented org default for JS-API-01"
  - "[15-02]: Engine frozen — zero production src edits outside inventory test; zero new npm deps"

patterns-established:
  - "Phase 15 content turns plan 01 RED suite GREEN without weakening negatives or inject quarantine"
  - "Inventory lock grows by appending new domain rule ids only (7→10)"

requirements-completed: [JAVA-LOG-01, JAVA-API-01, JAVA-EVT-01]

coverage:
  - id: D1
    description: "java-spring-logging-audit (JS-LOG-01) ships with multi-token triggers, correlation/no-PII/audit summary, and detail"
    requirement: JAVA-LOG-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-log-api-evt.test.ts#JAVA-LOG-01"
        status: pass
    human_judgment: false
  - id: D2
    description: "java-spring-api-contract (JS-API-01) ships OpenAPI/versioning/error-envelope guidance with URI default in detail"
    requirement: JAVA-API-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-log-api-evt.test.ts#JAVA-API-01"
        status: pass
    human_judgment: false
  - id: D3
    description: "java-spring-saga-outbox (JS-EVT-01) ships decision table including when-NOT plain call for single-service ACID"
    requirement: JAVA-EVT-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-log-api-evt.test.ts#JAVA-EVT-01"
        status: pass
    human_judgment: false
  - id: D4
    description: "Real-corpus inventory locked at 10 winners; rule-index rebuild free of body canaries"
    verification:
      - kind: unit
        ref: "src/index/precedence.test.ts#real corpus"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-10
status: complete
---

# Phase 15 Plan 02: LOG/API/EVT Rules Summary

**Three advisory java-spring rules for logging/audit, OpenAPI contracts, and saga/outbox decisions — multi-token triggers, when-NOT plain-call, inventory 10 winners, suite GREEN**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-09T17:51:58Z
- **Completed:** 2026-07-10T00:55:00Z
- **Tasks:** 3/3
- **Files modified:** 7 (6 content + precedence inventory; rule-index.json regenerated gitignored)

## Accomplishments

- Authored `java-spring-logging-audit`, `java-spring-api-contract`, and `java-spring-saga-outbox` (+ details) under the existing `java-spring` pack
- Locked multi-token keywords and path globs (no bare log/logger/rest); saga detail encodes single-service ACID → plain call
- Grew precedence real-corpus inventory 7 → 10; rebuilt `rule-index.json` (10 rules, no BODY_CANARY leak)
- Turned plan 01 suite fully GREEN (42/42) and full `npm test` green (522 pass / 0 fail / 3 skipped)

## Task Commits

Each task was committed atomically:

1. **Task 1: Author logging-audit + api-contract + saga-outbox rules and detail files** - `aace394` (feat)
2. **Task 2: Rebuild production rule-index.json and grow inventory lock 7→10** - `8f644d9` (test)
3. **Task 3: GREEN log-api-evt suite — fix content/tests until npm test passes** - (verification only; suite GREEN from Task 1 content with no further deltas)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified

- `aidlc-rules/domain/java-spring/java-spring-logging-audit.md` — JS-LOG-01 advisory rule
- `aidlc-rules/domain/java-spring/java-spring-api-contract.md` — JS-API-01 advisory rule
- `aidlc-rules/domain/java-spring/java-spring-saga-outbox.md` — JS-EVT-01 advisory rule
- `aidlc-rules/domain/java-spring/details/java-spring-logging-audit-detail.md` — MDC/PII/audit detail
- `aidlc-rules/domain/java-spring/details/java-spring-api-contract-detail.md` — OpenAPI/URI versioning/error envelope
- `aidlc-rules/domain/java-spring/details/java-spring-saga-outbox-detail.md` — decision table + when-NOT
- `src/index/precedence.test.ts` — inventory winners 7 → 10
- `rule-index.json` — regenerated via `governance build-index` (gitignored durable path)

## Decisions Made

- Added tight `**/*Correlation*Filter*` and `**/*Mdc*Filter*` globs; rejected bare `**/filter/**` to avoid auth-filter noise
- Documented URI path versioning (`/api/v1/...`) as org default; header versioning only as explicit alternative
- Expected overlap with inbound-rest (api/web) and inbound-kafka (messaging) left intentional — no mutual-exclude
- Engine frozen; zero production `src/` edits outside inventory test; zero new npm deps; no CQRS rule

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate: plan 01 commit `8355fb4` (`test(15-01): add failing test for LOG/API/EVT selection matrices`)
- GREEN gate: plan 02 content commit `aace394` (`feat(15-02): author LOG/API/EVT java-spring advisory rules`) turned suite green
- REFACTOR gate: n/a (no cleanup needed after GREEN)

## Test Results

```
node --test dist-test/select/java-spring-log-api-evt.test.js
  tests 42 | pass 42 | fail 0

node --test dist-test/index/precedence.test.js
  tests 4 | pass 4 | fail 0

npm test
  tests 525 | pass 522 | fail 0 | skipped 3 | exit 0
```

## Known Stubs

None — all three rules have full summaries, triggers, verification checklists, and detail prose. No TODO/FIXME placeholders.

## Threat Flags

None — content-only surface under aidlc-rules; no new network endpoints, auth paths, or schema boundaries. Advisory classification preserved (no binding enforcement theater).

## Self-Check: PASSED

- FOUND: `aidlc-rules/domain/java-spring/java-spring-logging-audit.md`
- FOUND: `aidlc-rules/domain/java-spring/java-spring-api-contract.md`
- FOUND: `aidlc-rules/domain/java-spring/java-spring-saga-outbox.md`
- FOUND: three matching detail files under `details/`
- FOUND: commit `aace394` (feat content)
- FOUND: commit `8f644d9` (inventory lock)
- FOUND: suite GREEN 42/42; full npm test 522 pass / 0 fail
