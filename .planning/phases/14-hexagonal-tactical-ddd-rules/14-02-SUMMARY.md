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
    description: "Hexagonal layering rule path-primary selects on domain/application/adapter; inject summary only"
    requirement: JAVA-HEX-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-hex-ddd.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tactical DDD rule path-primary selects on aggregate/entity/VO/event; CR negatives hold"
    requirement: JAVA-DDD-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-hex-ddd.test.ts"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-09
status: complete
---

# Phase 14 Plan 02: Hexagonal + Tactical DDD Content Summary

**Two advisory java-spring rules (hex-layering + ddd-tactical) ship under the existing pack; sibling suite 36/36 green; full npm test 480 pass / 0 fail.**

## What shipped

| Artifact | Role |
|----------|------|
| `java-spring-hex-layering.md` + detail | JS-HEX-01 — inward deps; domain free of Spring/JPA/framework/gateway |
| `java-spring-ddd-tactical.md` + detail | JS-DDD-01 — aggregate root, immutable VOs, past-tense domain events |
| `precedence.test.ts` inventory | Exact 7 winners: require-mfa + 6 java-spring rules |
| `rule-index.json` | Rebuilt (gitignored) with 7 rules |

## Test results

- `java-spring-hex-ddd.test.ts`: 36/36 pass
- Full `npm test`: 480 pass / 0 fail / 3 skipped

## Constraints held

- Construction-only; docs/test excludes
- Multi-token keywords only
- One-sentence summaries; BODY_CANARY quarantine
- No CQRS; engine frozen; zero new npm deps
