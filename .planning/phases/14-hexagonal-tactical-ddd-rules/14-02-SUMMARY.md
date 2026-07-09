---
phase: 14-hexagonal-tactical-ddd-rules
plan: 02
subsystem: domain-pack
tags: [java-spring, hexagonal, ddd, advisory, select, inject, body-canary]

requires:
  - phase: 14-01
    provides: RED java-spring-hex-ddd suite, HEX_DDD_IDS, BODY_CANARIES, LOCKED_ENTITY_PATH_GLOB
  - phase: 13
    provides: java-spring pack root + domain subscription gate
provides:
  - Two advisory HEX/DDD domain rules + detailPath targets
  - Green java-spring-hex-ddd suite proving JAVA-HEX-01 / JAVA-DDD-01
  - Rebuilt rule-index.json with 7 winners (mfa + 6 java-spring)
affects:
  - phases 15-18 (same pack root / subscription / summary-only inject patterns)
  - real-corpus inventory lock in precedence.test.ts (7 winners)

tech-stack:
  added: []
  patterns:
    - "Sibling suite for HEX/DDD leaves Phase 13 PACK_IDS suite intact"
    - "Multi-token keywords + domain-scoped Entity glob (Phase 13 CR lessons)"
    - "HEX and DDD may co-select on **/domain/** (no mutual exclude)"

key-files:
  created:
    - aidlc-rules/domain/java-spring/java-spring-hex-layering.md
    - aidlc-rules/domain/java-spring/java-spring-ddd-tactical.md
    - aidlc-rules/domain/java-spring/details/java-spring-hex-layering-detail.md
    - aidlc-rules/domain/java-spring/details/java-spring-ddd-tactical-detail.md
  modified:
    - src/index/precedence.test.ts
    - rule-index.json (generated, gitignored)

key-decisions:
  - "Entity path tightened to **/domain/**/*Entity* to avoid EntityManagerConfig/JpaEntityScanner false positives"
  - "No bare port/entity/event keyword needles (substring matching)"
  - "Expanded real-corpus inventory lock from 5 → 7 ids (mfa + 6 java-spring rules)"
  - "Engine frozen; zero production select/types edits; zero new npm deps"

patterns-established:
  - "Per-phase sibling pack suites for new rule clusters under same domain pack"
  - "Inventory lock grows with pack size; keep exact id list in precedence real-corpus test"

requirements-completed: [JAVA-HEX-01, JAVA-DDD-01]

coverage:
  - id: D1
    description: "Hexagonal layering rule path-primary selects on domain/application/adapter/ports; inject summary only"
    requirement: JAVA-HEX-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-hex-ddd.test.ts#JAVA-HEX-01"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tactical DDD rule path-primary selects on aggregate/entity/VO/event; CR negatives hold"
    requirement: JAVA-DDD-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-hex-ddd.test.ts#JAVA-DDD-01"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-10
status: complete
---

# Phase 14 Plan 02: Hexagonal + Tactical DDD Content Summary

**Two advisory java-spring rules (hex-layering + ddd-tactical) ship under the existing pack; sibling suite 36/36 green; full npm test 480 pass / 0 fail.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-09T17:28:25Z
- **Completed:** 2026-07-10
- **Tasks:** 3/3
- **Files modified:** 5 (+ gitignored rule-index.json)

## Accomplishments

- Authored JS-HEX-01 and JS-DDD-01 as advisory domain rules with one-sentence summaries and lazy `details/` essays
- Rebuilt production `rule-index.json` (7 rules) with no BODY_CANARY leakage
- Turned plan 01 hex-ddd suite GREEN; expanded precedence real-corpus inventory lock 5 → 7

## Task Commits

Each task was committed atomically:

1. **Task 1: Author hex-layering + ddd-tactical rules and detail files** - `8068500` (feat)
2. **Task 2: Rebuild production rule-index.json** - verification only (artifact gitignored; regenerated via `governance build-index`)
3. **Task 3: GREEN hex-ddd suite — inventory lock for full npm test** - `6a4a467` (fix/test)

**Plan metadata:** `1cf8f68` (docs: complete plan) — superseded by this SUMMARY refresh if re-committed

_Note: TDD GREEN content plan; RED gate was plan 01 (`164143a`)._

## Files Created/Modified

- `aidlc-rules/domain/java-spring/java-spring-hex-layering.md` — JS-HEX-01 hexagonal layering advisory
- `aidlc-rules/domain/java-spring/java-spring-ddd-tactical.md` — JS-DDD-01 tactical DDD advisory
- `aidlc-rules/domain/java-spring/details/java-spring-hex-layering-detail.md` — package map + when-not + canary
- `aidlc-rules/domain/java-spring/details/java-spring-ddd-tactical-detail.md` — aggregate/VO/event essay + canary
- `src/index/precedence.test.ts` — real-corpus inventory includes both Phase 14 ids
- `rule-index.json` — regenerated, gitignored durable path

## Decisions Made

- Locked Entity path to `**/domain/**/*Entity*` (RESEARCH A1 / plan 01 handoff)
- Multi-token keywords only for both rules; no mutual exclude on `**/domain/**`
- Content-only + test inventory update; engine and npm deps frozen
- No CQRS rule authored (JAVA-CQRS-01 deferred)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Real-corpus inventory expected exactly 5 winners**
- **Found during:** Task 3 (`npm test` / precedence suite)
- **Issue:** `src/index/precedence.test.ts` locked enterprise MFA + 4 Phase 13 java-spring rules; Phase 14 adds 2 → inventory mismatch would fail GREEN
- **Fix:** Expanded `expectedIds` to 7 (mfa + 6 java-spring including HEX/DDD)
- **Files modified:** `src/index/precedence.test.ts`
- **Commit:** `6a4a467`

None other — plan executed as written for rule content and index rebuild.

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Necessary test-inventory lock update called out in plan constraints; no scope creep.

## Issues Encountered

None — suite went GREEN after content + inventory lock; no engine edits required.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 content complete for JAVA-HEX-01 / JAVA-DDD-01
- Phase 15 can add logging/API/saga rules under the same `java-spring` pack
- Engine remains frozen; continue sibling-suite pattern for new rule clusters

## Known Stubs

None.

## Threat Flags

None new — mitigations T-14-01..T-14-05 held via subscription gate, multi-token keywords, domain-scoped Entity glob, advisory classification, canary quarantine.

## TDD Gate Compliance

- RED gate (plan 01): `164143a` `test(14-01): add failing HEX/DDD selection suite (RED)`
- GREEN gate (this plan): content `8068500` + inventory `6a4a467`; suite 36/36 pass; full npm test 480/0/3

## Self-Check: PASSED

- FOUND: `aidlc-rules/domain/java-spring/java-spring-hex-layering.md`
- FOUND: `aidlc-rules/domain/java-spring/java-spring-ddd-tactical.md`
- FOUND: `aidlc-rules/domain/java-spring/details/java-spring-hex-layering-detail.md`
- FOUND: `aidlc-rules/domain/java-spring/details/java-spring-ddd-tactical-detail.md`
- FOUND: commit `8068500`
- FOUND: commit `6a4a467`
- FOUND: npm test 480 pass / 0 fail / 3 skipped

---
*Phase: 14-hexagonal-tactical-ddd-rules*
*Completed: 2026-07-10*
