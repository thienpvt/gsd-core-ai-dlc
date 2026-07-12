---
phase: 13-domain-pack-service-classification-integrations
plan: 01
subsystem: testing
tags: [java-spring, domain-pack, node:test, tdd, select, inject, body-canary]

requires:
  - phase: 01-03 (selection + index engine)
    provides: buildIndex, select, renderInjection, domain subscription gate
provides:
  - RED node:test suite locking Phase 13 pack matrix (JAVA-PACK/SVC/IN)
  - Body canary tokens and PACK_IDS contract for plan 02 authoring
affects:
  - 13-02 (pack content authoring must satisfy this suite)
  - phases 14-18 (same pack root / subscription patterns)

tech-stack:
  added: []
  patterns:
    - "TDD RED suite against production aidlc-rules root (not duplicate fixture)"
    - "Body canaries documented in test header for plan 02 parity"
    - "Vendor-token walk over production src/ excluding *.test.ts"

key-files:
  created:
    - src/select/java-spring-pack.test.ts
  modified: []

key-decisions:
  - "Primary suite targets real aidlc-rules via buildIndex (RESEARCH A2) — missing pack is expected RED cause"
  - "Body canaries use exact strings BODY_CANARY java-spring-<id> for index/inject absence proofs"
  - "Vendor needles wso2/tibco/smartvista asserted only against production src; tests may hold string literals"

patterns-established:
  - "Co-located pack proof suites under src/select/<pack>-pack.test.ts"
  - "File-level handoff comment lists PACK_IDS + canaries + RESEARCH pointer for content plan"

requirements-completed: []  # RED-only plan; requirements turn green with 13-02 content

coverage:
  - id: D1
    description: "RED matrix suite for JAVA-PACK-01/02, JAVA-SVC-01/02/03, JAVA-IN-01/02 against aidlc-rules"
    requirement: JAVA-PACK-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts (23 tests; 15 fail / 8 pass expected RED)"
        status: fail
    human_judgment: false
    rationale: "RED is intentional until plan 02 content lands; fail status is the success signal for this plan"

duration: 12min
completed: 2026-07-09
status: complete
---

# Phase 13 Plan 01: Java-Spring Pack RED Suite Summary

**TDD RED suite `java-spring-pack.test.ts` locks all seven Phase 13 requirement matrices against real `aidlc-rules`; 15/23 cases fail for missing pack content (correct RED).**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-09T16:47:59Z
- **Completed:** 2026-07-09T16:55:00Z
- **Tasks:** 2/2
- **Files modified:** 1 created

## Accomplishments

- Authored co-located `src/select/java-spring-pack.test.ts` covering JAVA-PACK-01/02, JAVA-SVC-01/02/03, JAVA-IN-01/02 plus hygiene (index build, canary absence, details/ not indexed).
- Documented plan 02 handoff in file header: PACK_IDS, body canaries, Rule JS essay headings, RESEARCH pointer, vendor-name constraint.
- Proven RED: `npm run build:test` succeeds; targeted suite exits non-zero with content-missing assertion failures (not import/TS errors).

## Task Commits

Each task was committed atomically:

1. **Task 1: RED pack suite — subscription, summary, outbound XOR, inbound paths** - `aa72177` (test)
2. **Task 2: Confirm RED and document expected GREEN handoff** - verification only (handoff comment already in Task 1 file; no additional code change)

**Plan metadata:** (docs commit after this SUMMARY)

_Note: TDD plan is RED-only; GREEN is plan 02._

## Files Created/Modified

- `src/select/java-spring-pack.test.ts` - Full matrix RED suite (node:test + assert/strict) over buildIndex/select/renderInjection

## Decisions Made

- Prefer production `aidlc-rules` root over inventing a parallel fixture store mid-RED (plan + RESEARCH A2).
- Keep engine frozen: no production `src/**` edits outside the new test file; zero new npm deps.
- Fail-open ambiguous outbound and dual-marker XOR encoded as explicit named tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Expected RED observed:

| Assertion class | Example message |
|-----------------|-----------------|
| Missing pack ids | `pack rule java-spring-svc-internal-outbound must exist in aidlc-rules for subscription proof` |
| Empty pack set | `expected 4 pack rules in index, found 0` |
| Selection misses | `must select java-spring-inbound-rest` / `inbound-kafka` |
| Phase skip absent | `inbound-rest must be skipped in inception` (rule not in index yet) |

Passing hygiene/vendor/negative cases (8): index builds; canaries absent from empty pack; details not indexed; dual/ambiguous outbound neither; vendor tokens absent from production src; docs exclude / REST≠Kafka negatives hold without content.

## TDD Gate Compliance

- RED gate commit present: `aa72177` `test(13-01): add failing java-spring pack matrix suite`
- GREEN gate deferred to plan 02 (content authoring) — by design for this `type: tdd` RED-only plan
- No unexpected GREEN on content-dependent cases

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 may author `aidlc-rules/domain/java-spring/` four rules + `details/*-detail.md` using RESEARCH Recommended Rule Specs and the canary strings in the test header.
- After content + `governance build-index`, re-run:
  `npm run build:test && node --test dist-test/select/java-spring-pack.test.js`
  expecting full GREEN.
- Do not edit production select/types/load unless a real pack-loading bug blocks GREEN.

## Self-Check: PASSED

- FOUND: `src/select/java-spring-pack.test.ts`
- FOUND: commit `aa72177`
- RED confirmed: TEST_EXIT=1, 15 fail / 8 pass, content-missing (not compile) failures

---
*Phase: 13-domain-pack-service-classification-integrations*
*Completed: 2026-07-09*
