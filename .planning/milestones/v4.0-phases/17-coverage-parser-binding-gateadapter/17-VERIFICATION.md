---
phase: 17-coverage-parser-binding-gateadapter
verified: 2026-07-12T20:00:00Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
deferred:
  - truth: "Verify/ship automatically selects and configures coverage-report when binding coverage applies"
    addressed_in: "Phase 18"
    evidence: "ROADMAP Phase 18 success criterion 2 and Phase 17 CONTEXT defer report-path configuration and automatic adapter selection"
---

# Phase 17: Coverage Parser + Binding GateAdapter Verification Report

**Phase Goal:** Binding unit-test line coverage ≥70% is enforced by a real consumer-report parser adapter, not Markdown theater, and fails closed on missing or low coverage.
**Verified:** 2026-07-12T20:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pack carries a binding coverage rule requiring ≥70% unit line coverage with `enforcement: coverage-report` | ✓ VERIFIED | `aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md`; JAVA-COV-01 metadata test |
| 2 | Real `coverage-report` GateAdapter parses JaCoCo XML and LCOV using Node stdlib, then emits schema-valid results through `runAdapter` | ✓ VERIFIED | `createCoverageAdapter`, `parseJacoco`, `parseLcov`; `coverage-report.test.ts` exercises `runAdapter` |
| 3 | Missing reports and line coverage below 70% fail closed with durable evidence compatible with the verify-to-ship block chain | ✓ VERIFIED | High-severity finding ID `java-spring-unit-line-coverage:coverage-report`; `deriveRuleGateStatuses` token matching; existing ship gate blocks failed verify evidence |
| 4 | Fixtures prove threshold pass, below-threshold failure, missing and malformed reports without new dependencies or Java tooling | ✓ VERIFIED | 13 JaCoCo/LCOV fixtures; focused and full suites green; stdlib-only production imports |
| 5 | JaCoCo parser reads exactly one report-root direct-child `LINE` counter and ignores nested counters | ✓ VERIFIED | Structure-aware depth scan and root-counter tests |
| 6 | JaCoCo parser rejects malformed structure, DTD/entity input, and ignored-region spoofing | ✓ VERIFIED | DTD/entity guard; comment, CDATA, processing-instruction, malformed-region tests |
| 7 | LCOV parser aggregates complete-record `LF`/`LH` summaries and rejects duplicate, incomplete, inconsistent, or overflowing data | ✓ VERIFIED | Record parser and malformed/duplicate/`LH > LF`/overflow tests |
| 8 | Exactly 70% passes; below 70% and zero measured lines fail | ✓ VERIFIED | Overflow-safe integer threshold; 7/10 pass, 6/10 fail, zero-line fail tests |
| 9 | Operational errors become valid fail results rather than silent passes | ✓ VERIFIED | Missing, path, file type, size, format, structure, zero-line, low-coverage, absent-rule, and post-open identity matrices |
| 10 | Real adapter remains factory-only; all three stub registries remain exactly seven entries | ✓ VERIFIED | Registry assertions in `coverage-report.test.ts`; `adapters.ts` unchanged |
| 11 | Paths-only triggers select Java production changes without task-type OR overreach or circular test/docs obligations | ✓ VERIFIED | Positive/exclusion/non-Java matrices in `java-spring-coverage.test.ts` |
| 12 | Full rule bodies remain lazy and inventory advances exactly 10 → 11 | ✓ VERIFIED | BODY_CANARY quarantine and dual inventory locks |

**Score:** 12/12 truths verified; 0 present-behavior-unverified.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|--------------|----------|
| 1 | Automatic selection/configuration of `coverage-report`, consumer report-path seam, and docs | Phase 18 | ROADMAP Phase 18 goal and success criteria; Phase 17 CONTEXT and summaries explicitly defer hook wiring; `verifyGateHook` still defaults to `generic-exit-ci` |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/enforcement/parse-jacoco.ts` | Root-LINE parser | ✓ VERIFIED | Substantive structure scan; DTD/entity and ignored-region hardening |
| `src/enforcement/parse-lcov.ts` | Complete-record LF/LH parser | ✓ VERIFIED | Aggregate and integrity checks |
| `src/enforcement/coverage-report.ts` | Real adapter factory and bounded read | ✓ VERIFIED | Path containment, opened-file identity, 8 MiB cap, threshold and fail mapping |
| `src/enforcement/parse-jacoco.test.ts` | JaCoCo behavior matrix | ✓ VERIFIED | Active value/error assertions |
| `src/enforcement/parse-lcov.test.ts` | LCOV behavior matrix | ✓ VERIFIED | Active aggregate/error assertions |
| `src/enforcement/coverage-report.test.ts` | End-to-end adapter matrix | ✓ VERIFIED | `runAdapter` pass/fail, path, size, format and identity checks |
| `test/fixtures/coverage/jacoco/*` | Seven JaCoCo fixtures | ✓ VERIFIED | Threshold, zero, malformed, DTD, duplicate and invalid-counter inputs |
| `test/fixtures/coverage/lcov/*` | Six LCOV fixtures | ✓ VERIFIED | Threshold, zero, malformed, duplicate and inconsistent inputs |
| `aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md` | Binding rule | ✓ VERIFIED | Metadata, triggers, summary and BODY_CANARY |
| `aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md` | Lazy measurement detail | ✓ VERIFIED | Metric/extraction/fail-closed guidance and BODY_CANARY |
| `src/select/java-spring-coverage.test.ts` | Selection and quarantine suite | ✓ VERIFIED | Metadata, positives, negatives, exclusions and injection hygiene |
| `src/index/precedence.test.ts` | Inventory lock | ✓ VERIFIED | Coverage rule included among 11 winners |
| `src/select/starter-examples.test.ts` | Cross-suite inventory lock | ✓ VERIFIED | Inventory count 11 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `coverage-report.ts` | `run-adapter.ts` | Adapter tests call `runAdapter` | ✓ WIRED | Schema and identity boundary exercised |
| `coverage-report.ts` | JaCoCo/LCOV parsers | Format dispatch | ✓ WIRED | Real report bytes produce counters |
| Report path | Bounded filesystem read | Lexical/canonical/post-open checks | ✓ WIRED | Escapes and identity mismatches fail before content use |
| Coverage finding | Per-rule verify evidence | Stable rule-ID token | ✓ WIRED | Failure attributes to binding rule; absent-rule failure does not falsely attribute |
| Failed verify evidence | Ship gate | Existing ship fail check | ✓ WIRED | Ship cannot accept a required coverage result with `status: fail` |
| Binding rule | Index/select/inject | `buildIndex`, `select`, summary rendering | ✓ WIRED | Metadata selectable; body remains quarantined |

### Data-Flow Trace

| Artifact | Data | Source | Produces Real Data | Status |
|----------|------|--------|--------------------|--------|
| `createCoverageAdapter.evaluate` | Covered/total line counts | Bounded consumer report bytes → parser | Yes | ✓ FLOWING |
| Failure findings | ID, reason, safe evidence | Selection state, path handling, parser and threshold result | Yes | ✓ FLOWING |
| Selected rule | Compact indexed metadata | Real rule Markdown | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Focused Phase 17 suite | `npm run build:test && node --test dist-test/enforcement/parse-jacoco.test.js dist-test/enforcement/parse-lcov.test.js dist-test/enforcement/coverage-report.test.js dist-test/select/java-spring-coverage.test.js dist-test/index/precedence.test.js dist-test/select/starter-examples.test.js` | 84 pass / 0 fail / 4 Windows symlink-permission skips | ✓ PASS |
| Full suite | `npm test` | 602 pass / 0 fail / 7 platform skips | ✓ PASS |
| Exactly 70% | JaCoCo and LCOV threshold fixtures through `runAdapter` | `status: pass`, no findings | ✓ PASS |
| Below 70% and missing report | Failure fixtures/path through `runAdapter` | `status: fail`, durable finding | ✓ PASS |

No phase-specific probe scripts declared.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| JAVA-COV-01 | 17-02 | Binding ≥70% rule with named enforcement | ✓ SATISFIED | Rule metadata, selector suite and inventory locks |
| JAVA-COV-02 | 17-01 | Real stdlib JaCoCo/LCOV adapter emits schema-valid results | ✓ SATISFIED | Parsers, factory and `runAdapter` tests |
| JAVA-COV-03 | 17-01 | Missing or low coverage fails closed and can block ship when evidence is required | ✓ SATISFIED at Phase 17 adapter boundary | Durable fail result, rule attribution and existing ship-on-failed-verify chain; automatic adapter choice is Phase 18 |

No orphaned Phase 17 requirements.

### Decision Coverage

All Phase 17 CONTEXT decisions are present: binding metadata, paths-only triggers, line-only integer threshold, JaCoCo root extraction, LCOV complete-record aggregation, zero-line failure, factory configuration, unchanged request schema and stub registries, durable finding identity, zero dependencies, and Phase 18 wiring boundary.

### Test Quality Audit

| Test File | Linked Requirements | Active Coverage | Disabled | Circular | Assertion Level | Verdict |
|-----------|---------------------|-----------------|----------|----------|-----------------|---------|
| `parse-jacoco.test.ts` | JAVA-COV-02 | Root values and malformed-input throws | 0 | no | value/error | strong |
| `parse-lcov.test.ts` | JAVA-COV-02 | Aggregate values and integrity throws | 0 | no | value/error | strong |
| `coverage-report.test.ts` | JAVA-COV-02, JAVA-COV-03 | End-to-end `runAdapter` statuses/findings/security cases | 0 requirement-disabled; platform symlink skips only | no | behavioral | strong |
| `java-spring-coverage.test.ts` | JAVA-COV-01 | Metadata, selection matrices and body quarantine | 0 | no | behavioral/value | strong |
| `precedence.test.ts`, `starter-examples.test.ts` | JAVA-COV-01 | Independent inventory assertions | 0 | no | value | strong |

Disabled requirement tests: 0. Circular expected-value generation: 0. Insufficient assertions: 0. Windows symlink cases skip only on unsupported/permission errors; deterministic containment and post-open identity cases exercise the same branches.

### Anti-Patterns Found

No blocking `TBD`, `FIXME`, `XXX`, placeholder, or not-implemented markers in Phase 17 production artifacts. The `ponytail:` post-open TOCTOU ceiling is deliberate, documented, security-reviewed, and accepted in `17-SECURITY.md`.

### Human Verification Required

None. Infrastructure/library phase; all acceptance criteria are programmatically verified.

### Gaps Summary

No Phase 17 gaps. The binding rule and real fail-closed adapter boundary are complete. Automatic verify/ship adapter selection and report-path documentation remain explicitly deferred to Phase 18, not silently claimed here.

---

_Verified: 2026-07-12T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
