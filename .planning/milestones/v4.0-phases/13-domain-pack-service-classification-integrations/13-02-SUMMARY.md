---
phase: 13-domain-pack-service-classification-integrations
plan: 02
subsystem: domain-pack
tags: [java-spring, domain-pack, advisory, select, inject, body-canary, wso2, mutual-exclude]

requires:
  - phase: 13-01
    provides: RED java-spring-pack suite, PACK_IDS, BODY_CANARY contract
  - phase: 01-03
    provides: buildIndex, select, inject, domain subscription gate
provides:
  - Four advisory java-spring domain pack rules + detailPath targets
  - Production aidlc-rules/domain/java-spring content for subscription domains:["java-spring"]
  - Green java-spring-pack suite proving JAVA-PACK/SVC/IN matrices
affects:
  - phases 14-18 (same pack root / subscription / summary-only inject patterns)
  - rule-index generation consumers (gitignored rule-index.json rebuild)

tech-stack:
  added: []
  patterns:
    - "Domain pack content only — engine frozen; zero new npm deps"
    - "Mutual exclude axes for internal vs internet outbound (fail-open neither)"
    - "WSO2 vendor name only in Markdown detail/triggers content, never production src/"
    - "details/ quarantine + BODY_CANARY for index/inject leak proofs"

key-files:
  created:
    - aidlc-rules/domain/java-spring/java-spring-svc-internal-outbound.md
    - aidlc-rules/domain/java-spring/java-spring-svc-internet-outbound.md
    - aidlc-rules/domain/java-spring/java-spring-inbound-rest.md
    - aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md
    - aidlc-rules/domain/java-spring/details/java-spring-svc-internal-outbound-detail.md
    - aidlc-rules/domain/java-spring/details/java-spring-svc-internet-outbound-detail.md
    - aidlc-rules/domain/java-spring/details/java-spring-inbound-rest-detail.md
    - aidlc-rules/domain/java-spring/details/java-spring-inbound-kafka-detail.md
  modified:
    - src/index/precedence.test.ts
    - rule-index.json (generated, gitignored)

key-decisions:
  - "Omitted bare jdbc/jpa/orm positives on internal rule — class markers + internal paths only (RESEARCH fail-open refinement)"
  - "Quoted REST summary YAML because unquoted colon broke gray-matter parse"
  - "rule-index.json remains gitignored; rebuild via governance build-index is the durable path"
  - "Widened real-corpus precedence test to multi-winner non-superseded assertion (blocking GREEN)"

patterns-established:
  - "Domain pack layout: aidlc-rules/domain/<subscription>/<id>.md + details/<id>-detail.md"
  - "Symmetric exclude keywords/paths for mutually exclusive classification pairs"
  - "One-sentence inject summaries ≤160 chars; essays only behind detailPath"

requirements-completed: [JAVA-PACK-01, JAVA-PACK-02, JAVA-SVC-01, JAVA-SVC-02, JAVA-SVC-03, JAVA-IN-01, JAVA-IN-02]

coverage:
  - id: D1
    description: "Four advisory java-spring domain rules with one-sentence summaries and detailPath"
    requirement: JAVA-PACK-02
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-PACK-02: each pack rule summary is one sentence; detailPath set; advisory domain"
        status: pass
    human_judgment: false
  - id: D2
    description: "Domain subscription gate — pack rules only when domains includes java-spring"
    requirement: JAVA-PACK-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-PACK-01"
        status: pass
    human_judgment: false
  - id: D3
    description: "Internal XOR internet outbound with dual/ambiguous → neither"
    requirement: JAVA-SVC-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-SVC-01"
        status: pass
    human_judgment: false
  - id: D4
    description: "Internal summary encodes JDBC/ORM allowed and no forced gateway"
    requirement: JAVA-SVC-02
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-SVC-02"
        status: pass
    human_judgment: false
  - id: D5
    description: "Internet summary gateway language; WSO2 only in detail; no vendor tokens in production src"
    requirement: JAVA-SVC-03
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-SVC-03"
        status: pass
    human_judgment: false
  - id: D6
    description: "REST inbound path-primary construction-only with docs exclude"
    requirement: JAVA-IN-01
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-IN-01"
        status: pass
    human_judgment: false
  - id: D7
    description: "Kafka inbound path-primary construction-only; REST path does not select kafka"
    requirement: JAVA-IN-02
    verification:
      - kind: unit
        ref: "src/select/java-spring-pack.test.ts#JAVA-IN-02"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-09
status: complete
---

# Phase 13 Plan 02: Java-Spring Domain Pack Content Summary

**Subscribe-able `java-spring` domain pack ships four advisory rules with summary-only inject, mutual-exclude outbound classification, and construction-only REST/Kafka inbound conventions — full npm test green.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-09T16:51:03Z
- **Completed:** 2026-07-09T17:09:00Z
- **Tasks:** 3/3
- **Files modified:** 9 tracked (8 pack content + precedence test); rule-index.json regenerated (gitignored)

## Accomplishments

- Authored pack under `aidlc-rules/domain/java-spring/` (four rules + four `details/*-detail.md`) with exact BODY_CANARY tokens from plan 01.
- Mutual-exclude outbound (internal vs internet) and path-primary inbound REST/Kafka matrices all pass via `java-spring-pack.test.ts`.
- Rebuilt production `rule-index.json` (5 winners: 4 pack + require-mfa) with no BODY_CANARY leak; WSO2 confined to internet detail/triggers content.
- Full `npm test`: 440 pass / 0 fail / 3 skipped.

## Task Commits

Each task was committed atomically:

1. **Task 1: Author four java-spring pack rules + detail files** - `be5cb3a` (feat)
2. **Task 2: Rebuild production rule-index.json** - verification only (artifact gitignored; see deviations)
3. **Task 3: GREEN pack suite — fix content/tests until npm test passes** - `6dfc073` (fix)

**Plan metadata:** (docs commit after this SUMMARY)

_Note: TDD GREEN achieved by content + one blocking suite alignment; engine production select/types untouched._

## Files Created/Modified

- `aidlc-rules/domain/java-spring/java-spring-svc-internal-outbound.md` - JS-SVC-01 internal outbound advisory
- `aidlc-rules/domain/java-spring/java-spring-svc-internet-outbound.md` - JS-SVC-02 internet outbound via gateway
- `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md` - JS-IN-01 thin REST controllers
- `aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md` - JS-IN-02 idempotent Kafka consumers
- `aidlc-rules/domain/java-spring/details/*-detail.md` - Full prose + canaries; WSO2 in internet detail
- `src/index/precedence.test.ts` - Real-corpus count assertion updated for multi-rule pack
- `rule-index.json` - Regenerated (gitignored build artifact)

## Decisions Made

- Prefer class-marker + path positives for internal outbound; omit bare `jdbc`/`jpa`/`orm` keywords so ambiguous signals fail open to neither.
- Keep internet summary capability-language (`approved API gateway` + raw client ban); name WSO2 only in detail body (and frontmatter trigger needle).
- Construction-only phases for all four rules (RESEARCH discretion lock).
- Do not force-add gitignored `rule-index.json`; rebuild command is the durable contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unquoted YAML colon in REST summary broke gray-matter parse**
- **Found during:** Task 1 (buildIndex verify)
- **Issue:** `summary: Keep REST controllers thin: validate...` failed frontmatter parse (incomplete mapping pair at colon).
- **Fix:** Quoted the summary string.
- **Files modified:** `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md`
- **Committed in:** `be5cb3a`

**2. [Rule 3 - Blocking] precedence.test.ts assumed corpus size === 1**
- **Found during:** Task 3 (`npm test`)
- **Issue:** Suite assertion `the real corpus holds only require-mfa` expected `index.rules.length === 1`; pack added four domain winners (actual 5). All 23 java-spring-pack tests already green.
- **Fix:** Assert require-mfa remains a winner and every real-corpus record lacks `superseded` (preserves 01-01 shape intent).
- **Files modified:** `src/index/precedence.test.ts`
- **Committed in:** `6dfc073`

**3. [Rule 2 - Critical path] rule-index.json not committed (gitignore)**
- **Found during:** Task 2
- **Issue:** Plan listed `rule-index.json` as a modified/committed file, but `.gitignore` intentionally excludes it as a generated artifact.
- **Fix:** Regenerated via `node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json` and verified 4 pack ids + no BODY_CANARY; did not force-add against gitignore.
- **Files modified:** local `rule-index.json` only
- **Committed in:** n/a (gitignored success path)

## Known Stubs

None.

## Threat Flags

None beyond plan threat model. Vendor tokens remain content-side only; no new network endpoints or engine auth paths.

## TDD Gate Compliance

- RED gate (plan 01): `aa72177` `test(13-01): add failing java-spring pack matrix suite`
- GREEN gate (this plan): content `be5cb3a` + suite unlock `6dfc073`
- Engine production modules under `src/select/` (non-test) and `src/types` not modified

## User Setup Required

None. Consumers subscribe with `domains: ["java-spring"]` and rebuild index when packaging.

## Next Phase Readiness

- Phase 14 may add hexagonal/DDD rules under the same domain subscription patterns.
- Rebuild index after any further pack content: `npm run build && node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json`.

## Self-Check: PASSED

- FOUND: all 8 pack rule/detail files under `aidlc-rules/domain/java-spring/`
- FOUND: commit `be5cb3a`
- FOUND: commit `6dfc073`
- FOUND: `npm test` pass 440 / fail 0
- FOUND: buildIndex pack ids present with advisory domain + detailPath

---
*Phase: 13-domain-pack-service-classification-integrations*
*Completed: 2026-07-09*
