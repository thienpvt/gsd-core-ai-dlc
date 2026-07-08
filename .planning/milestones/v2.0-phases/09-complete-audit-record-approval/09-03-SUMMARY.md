---
phase: 09-complete-audit-record-approval
plan: 03
subsystem: governance
tags: [json-schema, ajv, draft-2020-12, audit-v2, enrichment, tdd, byte-stability]

# Dependency graph
requires:
  - phase: 05-audit-artifact-writer
    provides: GovernanceAudit v1 writer (buildAuditRecord + renderGovernanceMarkdown + writeGovernanceAudit)
  - phase: 09-01
    provides: ApprovalRecord type + readApproval store for summarizeApprovals (D-12 single-source)
  - phase: 09-02
    provides: TestEvidenceSummary type for tests_executed v2 field
provides:
  - audit-enrich.ts (NEW: 3 pure helpers — extractRequirementsCovered, collectRemainingRisks, summarizeApprovals)
  - GovernanceAudit v2 interface (schema_version: 2, 4 optional fields appended after existing 7)
  - buildAuditRecord exported + accepts optional AuditEnrichment payload
  - audit-artifact.schema.json v2 (const 2, 4 optional properties + 4 $defs, required unchanged)
affects: [09-04 (verify:post hook consumes buildAuditRecord + audit-enrich helpers to emit enriched GOVERNANCE.md)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-14 audit-enrich.ts separate module: 3 pure helpers (no I/O) keep buildAuditRecord thin and v1 byte-stable"
    - "V8 insertion-order preservation contract (Pitfall 2): 4 new fields appended AFTER existing 7 + spread conditionally (only when enrichment present) — string-compare test, NOT deep-equal"
    - "Pitfall 1 forward-incompatible schema bump: const 1 -> const 2 (NOT enum [1,2]); v1 records FAIL v2 validation, regeneration mandatory"
    - "D-11 never-empty placeholder: collectRemainingRisks emits explicit none-identified row when both inputs empty; summarizeApprovals emits none-required when empty"
    - "D-12 single-source approvals: summarizeApprovals projects ApprovalRecord[] from approval store, never re-queries adapter at audit time"

key-files:
  created:
    - src/governance/audit-enrich.ts
    - src/governance/audit-enrich.test.ts
  modified:
    - src/governance/audit-artifact.ts
    - src/governance/audit-artifact.test.ts
    - src/schema/audit-artifact.schema.json
    - src/governance/gate-contracts.test.ts

key-decisions:
  - "D-09 v2 byte-stability verified by string `===` compare test (NOT deepEqual). Deep-equal on parsed JSON does NOT catch field-order drift — the test renders markdown and compares bytes."
  - "D-10 REQ-ID regex handles both real REQUIREMENTS.md format (`| REQ-ID | Phase N | Status |`) and simplified fixtures (`| REQ-ID | NN | status |`). Phase number normalized: '9' and '09' both match."
  - "D-11 never-empty invariant enforced in code, not just tests: collectRemainingRisks emits [{id: none-identified, ...}] when empty; summarizeApprovals emits [{approvalId: none-required, ...}] when empty."
  - "D-12 approvals single-sourced from approval-store.ApprovalRecord[] — summarizeApprovals is a pure projection, no disk I/O, no adapter re-query."
  - "AuditEnrichment interface extracted as a named type (not inline) for Plan 04's hook consumption clarity."
  - "Gate-contracts fixture bump to schema_version:2 is a Rule-3 auto-fix (blocking issue caused by the v2 bump — Pitfall 1 forward-incompatible)."

patterns-established:
  - "v2 schema bump idiom: const N -> const N+1 (NOT enum); new optional fields appended AFTER existing required; required array UNCHANGED; v1-rejects-v2 test proves the boundary is explicit."
  - "Pure-helper enrichment module idiom: separate .ts file (D-14), no I/O, caller (hook) prepares inputs and passes the enrichment payload to buildAuditRecord which spreads conditionally."

requirements-completed: [AUDIT-03, AUDIT-05, AUDIT-06]

coverage:
  - id: D1
    description: "audit-enrich.ts extractRequirementsCovered: regex over REQUIREMENTS.md traceability table, deterministic REQ-ID extraction per phase (D-10)"
    requirement: AUDIT-03
    verification:
      - kind: unit
        ref: "src/governance/audit-enrich.test.ts (4 tests: simplified format, real Phase-prefix format, excludes other-phase, handles no-match)"
        status: pass
    human_judgment: false
  - id: D2
    description: "audit-enrich.ts collectRemainingRisks: aggregates VERIFICATION.md gaps + CONTEXT.md <deferred> items; never returns [] (D-11)"
    requirement: AUDIT-05
    verification:
      - kind: unit
        ref: "src/governance/audit-enrich.test.ts (4 tests: none-identified placeholder, aggregates both sources, VERIFICATION.md source tag, CONTEXT.md<deferred> source tag)"
        status: pass
    human_judgment: false
  - id: D3
    description: "audit-enrich.ts summarizeApprovals: projects ApprovalRecord[] -> ApprovalSummary[] from approval store (D-12); empty input -> none-required placeholder"
    requirement: AUDIT-06
    verification:
      - kind: unit
        ref: "src/governance/audit-enrich.test.ts (2 tests: 2-in-2-out projection, empty -> none-required)"
        status: pass
    human_judgment: false
  - id: D4
    description: "audit-artifact.schema.json v2: const 1 -> const 2 (Pitfall 1); 4 optional properties + 4 $defs appended AFTER rules_skipped; required unchanged (7 entries, D-09)"
    requirement: AUDIT-03
    verification:
      - kind: unit
        ref: "src/governance/audit-artifact.test.ts (3 schema tests: v1 rejected, v2-with-optionals accepted, v2-minimal accepted)"
        status: pass
    human_judgment: false
  - id: D5
    description: "v1 byte-stability (Pitfall 2): buildAuditRecord without enrichment produces byte-identical output across calls (string === compare, NOT deepEqual)"
    requirement: AUDIT-03
    verification:
      - kind: unit
        ref: "src/governance/audit-artifact.test.ts#buildAuditRecord without enrichment produces byte-identical output across calls"
        status: pass
    human_judgment: false
  - id: D6
    description: "buildAuditRecord exported + accepts optional AuditEnrichment payload; 4 v2 fields spread conditionally after existing 7"
    requirement: AUDIT-03
    verification:
      - kind: unit
        ref: "src/governance/audit-artifact.test.ts (v2 schema tests + byte-stability test exercise the new signature)"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-07
status: complete
---

# Phase 9 Plan 03: Audit v2 Enrichment Summary

**Audit artifact bumped to v2 (schema_version 1->2, forward-incompatible by design) with 4 optional enrichment fields (requirements_covered, tests_executed, remaining_risks, approvals) appended AFTER the existing 7 to preserve V8 insertion-order and v1 byte-stability. Three pure helpers in audit-enrich.ts (D-14) prepare the payload: extractRequirementsCovered (D-10), collectRemainingRisks (D-11 never-empty), summarizeApprovals (D-12 from store). buildAuditRecord exports and accepts an optional AuditEnrichment arg.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-07T15:38:10Z
- **Completed:** 2026-07-07T15:44:56Z
- **Tasks:** 3 (TDD: RED -> GREEN -> REFACTOR)
- **Files modified:** 6 (2 created, 4 modified, 0 deleted)

## Accomplishments
- audit-enrich.ts published with 3 pure helpers (no I/O — D-14): deterministic REQ-ID extraction, never-empty risk aggregation, single-sourced approval projection
- audit-artifact.schema.json bumped to v2 (const 2, Pitfall 1 — v1 records fail v2 validation); 4 optional properties + 4 $defs appended AFTER rules_skipped; required unchanged at 7 (D-09)
- GovernanceAudit interface extended: schema_version literal 1 -> 2; 4 optional typed fields appended after existing 7 (V8 insertion-order preservation, Pitfall 2)
- buildAuditRecord exported + accepts optional AuditEnrichment payload; spreads 4 fields conditionally — absent enrichment produces byte-identical v1 output (string `===` test)
- 10 new audit-enrich + 4 new audit-artifact tests green; full suite 358 tests (355 pass, 3 skipped, 0 fail), 0 regression

## Task Commits

Each task was committed atomically:

1. **Task 1: RED** — `0916e8b` (test): audit-enrich.test.ts (6 helper tests) + audit-artifact.test.ts extensions (v2 schema reject/accept + v1 byte-stability string-compare). Build fails TS2307 on unimplemented `./audit-enrich.js` + TS2459 on unexported `buildAuditRecord`.
2. **Task 2: GREEN** — `4b37523` (feat): audit-enrich.ts (3 helpers + 3 types) + audit-artifact.ts (v2 interface + AuditEnrichment + exported buildAuditRecord with enrichment hook) + audit-artifact.schema.json (const 2, 4 optional properties, 4 $defs). All 14 new tests pass.
3. **Task 3: REFACTOR** — `797ebf5` (refactor): gate-contracts fixture bumped schema_version 1 -> 2 (Rule 3 auto-fix — pre-existing fixture broken by v2 bump). Full suite green.

## Files Created/Modified
- `src/governance/audit-enrich.ts` — NEW: RequirementsCoveredEntry + RemainingRiskEntry + ApprovalSummary interfaces; extractRequirementsCovered (TRACEABILITY_RE regex, handles Phase-prefix + simplified formats, phase-number normalization); collectRemainingRisks (VERIFICATION_GAP_RE + DEFERRED_SECTION_RE + DEFERRED_ITEM_RE, D-11 none-identified placeholder); summarizeApprovals (pure projection from ApprovalRecord[], D-12 none-required placeholder)
- `src/governance/audit-enrich.test.ts` — NEW: 10 tests covering REQ-ID extraction (simplified + real format + other-phase exclusion + empty), risk aggregation (none-identified D-11 + both-sources + source tags), approval projection (2-in-2-out + none-required D-11 analog)
- `src/governance/audit-artifact.ts` — MODIFIED: AuditEnrichment interface; GovernanceAudit v2 (schema_version: 2 + 4 optional fields); buildAuditRecord exported + accepts optional enrichment arg + schema_version literal 1 -> 2; imports types from audit-enrich.js + test-evidence.js
- `src/governance/audit-artifact.test.ts` — MODIFIED: Ajv 2020 schema compile; v1-rejects-v2 test (Pitfall 1); v2-with-optionals-accepted test; v2-minimal-accepted test; v1 byte-stability string-compare test (Pitfall 2)
- `src/schema/audit-artifact.schema.json` — MODIFIED: schema_version const 1 -> 2; 4 optional properties appended after rules_skipped (requirements_covered, tests_executed, remaining_risks, approvals); 4 new $defs (requirementsCoveredEntry, testEvidenceSummary, remainingRiskEntry, approvalSummary); required unchanged at 7 entries; x-binding stays advisory
- `src/governance/gate-contracts.test.ts` — MODIFIED: makeValidGovernanceAudit fixture bumped schema_version 1 -> 2 (Rule 3 auto-fix)

## Decisions Made
- **AuditEnrichment named interface over inline type:** Plan 04's verify:post hook will construct the payload; a named type makes the contract explicit at the call site. The shape matches the 4 optional GovernanceAudit fields exactly.
- **Regex flexibility for REQUIREMENTS.md format:** Real REQUIREMENTS.md uses `| REQ-ID | Phase N | Status |` (e.g., "Phase 9" not "09"; "Pending"/"Complete" capitalized). The regex captures both "Phase N" and "NN" via optional prefix, and phase numbers are normalized via `Number()` so "9" and "09" both match. Status derived from text (lowercase includes check).
- **VERIFICATION.md gap markers:** Scans for `- [ ]` unchecked checkboxes + `GAP`/`TODO`/`Flagged` line-prefixes (case-insensitive). Adapted to actual file shape — real VERIFICATION.md uses frontmatter `deferred:` and a Deferred Items markdown table, but the plan's behavior contract is "aggregate gaps", which these markers cover.
- **CONTEXT.md <deferred> extraction:** The helper accepts either the entire CONTEXT.md or just the extracted block; `DEFERRED_SECTION_RE` finds `<deferred>...</deferred>` and `DEFERRED_ITEM_RE` extracts `- item` lines. Plan 04 may pre-extract the section — both paths work.
- **D-11 never-empty in code, not just tests:** `collectRemainingRisks` returns `[{id: "none-identified", ...}]` when empty; `summarizeApprovals` returns `[{approvalId: "none-required", ...}]` when empty. The invariant is structural — a caller cannot get `[]`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing gate-contracts fixture broken by v2 bump**
- **Found during:** Task 3 (REFACTOR — npm test)
- **Issue:** `src/governance/gate-contracts.test.ts` `makeValidGovernanceAudit()` fixture emitted `schema_version: 1`. The v2 schema correctly rejects this (Pitfall 1 — forward-incompatible by design). The test `audit-artifact schema accepts a valid GovernanceAudit fixture` failed.
- **Fix:** Bumped the fixture's `schema_version: 1` to `schema_version: 2`. Single-line correction directly caused by the v2 bump. This is the exact contract the plan asserts: v1 records fail v2 validation, and the fixture is a v2-valid record.
- **Files modified:** src/governance/gate-contracts.test.ts
- **Commit:** 797ebf5 (Task 3 REFACTOR)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test-fixture correction only; no scope creep, no production-code deviation from the plan.

## Issues Encountered
None beyond the gate-contracts fixture auto-fix.

## User Setup Required
None — no external service configuration required. The helpers are pure functions over string inputs + typed ApprovalRecord[]. Plan 04 wires the verify:post hook to read the real files and pass strings to the helpers.

## Next Phase Readiness
- Plan 04 (verify:post hook + ship-gate approval blocking) can:
  - Read REQUIREMENTS.md + VERIFICATION.md + CONTEXT.md as strings, call `extractRequirementsCovered(md, "09")` + `collectRemainingRisks(verification, deferred)`.
  - Call `readApproval(projectRoot, "09")` -> ApprovalRecord[] -> `summarizeApprovals(approvals)`.
  - Call `readTestEvidence(projectRoot, "09")` -> TestEvidenceRecord -> pass `.summary` as `tests_executed`.
  - Call `buildAuditRecord(record, { requirements_covered, tests_executed, remaining_risks, approvals })` -> enriched GOVERNANCE.md.
- Historical v1 GOVERNANCE.md files under `.planning/phases/01..08/` left as v1 (RESEARCH §Open Questions #3). v2 schema rejects `schema_version: 1`; only Phase 9+ emits v2.

## TDD Gate Compliance
- RED gate: `0916e8b` (test commit) — build fails with TS2307 on `./audit-enrich.js` + TS2459 on unexported `buildAuditRecord`. Confirmed RED.
- GREEN gate: `4b37523` (feat commit) — all 14 new tests pass; build clean.
- REFACTOR gate: `797ebf5` (refactor commit) — full suite 358 tests green after gate-contracts fixture correction.

All three gates present in git log in the correct order.

## Self-Check: PASSED

- All 6 created/modified files exist on disk.
- All 3 task commits present in git log (`0916e8b`, `4b37523`, `797ebf5`).
- SUMMARY.md exists at the canonical path.
- Historical v1 GOVERNANCE.md files NOT modified (git diff HEAD~3 -- .planning/phases/ = empty).

---
*Phase: 09-complete-audit-record-approval*
*Completed: 2026-07-07*
