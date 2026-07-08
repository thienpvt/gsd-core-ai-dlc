---
phase: 09-complete-audit-record-approval
plan: 05
subsystem: governance
tags: [audit-04, gap-closure, test-evidence, tap, tdd, verify-post-hook]

# Dependency graph
requires:
  - phase: 09-02
    provides: parseTapSummary + writeTestEvidence + readTestEvidence durable store (TestEvidenceRecord interface)
  - phase: 09-03
    provides: buildEnrichmentFromPersistedState — the WR-01 READ-side consumer that now has a producer file to read
provides:
  - capture-test-evidence.ts — production producer path (captureTestEvidence orchestrator + defaultSpawnRunner spawnSync + isDirectRun/runDirect CLI main)
  - parseTapSummary + writeTestEvidence gain their first production callers (VERIFICATION §Anti-Patterns BLOCKER lifted)
  - aidlc-governance-verify SKILL.md step 4 — runs capture-test-evidence.js BEFORE aidlc-governance-audit reads tests/{NN}.json
affects: [10-selection-quality-harness (producer path now demonstrable end-to-end for future recall/precision checks)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable spawnRunner seam: captureTestEvidence({ spawnRunner }) accepts a () => string override so tests inject TAP fixtures without spawning a real node --test process. Default is defaultSpawnRunner (child_process.spawnSync, shell:false, hardcoded argv). Same seam pattern as adapter-injection in verify-gate-hook tests."
    - "Orchestrator/persist split: captureTestEvidence returns the record; CLI main (runDirect) calls writeTestEvidence to persist. Keeps the function pure-ish and testable; mirrors audit-artifact.ts isDirectRun/runDirect/exitCode=1 convention."

key-files:
  created:
    - src/governance/capture-test-evidence.ts
    - src/governance/capture-test-evidence.test.ts
  modified:
    - .claude/skills/aidlc-governance-verify/SKILL.md

key-decisions:
  - "Orchestrator/persist split: captureTestEvidence returns the record; runDirect writes. Pure-ish function, testable in isolation. The caller chooses whether to persist (CLI persists; tests vary)."
  - "defaultSpawnRunner uses process.execPath (not bare 'node') with shell:false + hardcoded argv array — closes PATH-hijack and shell-injection surfaces (T-09-05-01)."
  - "parseTapSummary owns the trust boundary (D-03/D-04) — capture-test-evidence does NOT pre-validate stdout shape. Empty stdout or signal-kill → missing # tests N → throws before writeTestEvidence."
  - "Capability manifest UNCHANGED per 09-REVIEW-FIX consent-hash deferral — skill reads files directly (existing pattern)."
  - "SKILL.md step slots AFTER verify-gate-hook (step 3), BEFORE propagate-failures (now step 5). Producer fires before aidlc-governance-audit consumer reads tests/{NN}.json."

patterns-established:
  - "Producer/consumer ordering idiom: a verify-step that produces durable state runs BEFORE the audit skill consumes it. Single phase-number arg + cwd-resolved projectRoot matches the user decision in planning_context."
  - "Injectable spawn seam for slow + env-dependent child processes: tests pass a fixture-returning fn; production omits the arg and defaults to spawnSync. Avoids real node --test in test suite."

requirements-completed: [AUDIT-04]

coverage:
  - id: D1
    description: "captureTestEvidence orchestrator: spawn → parseTapSummary → return TestEvidenceRecord; injectable spawnRunner seam; defaultSpawnRunner (spawnSync shell:false hardcoded argv)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/capture-test-evidence.test.ts#captureTestEvidence parses injected TAP stdout and returns a TestEvidenceRecord with the runner const"
        status: pass
      - kind: integration
        ref: "node dist/governance/capture-test-evidence.js 09 → .planning/governance/tests/09.json (381 tests, 378 pass, 0 fail captured from real node --test)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Producer-side persistence wiring: writeTestEvidence has a production caller in capture-test-evidence.ts runDirect (CLI main)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/capture-test-evidence.test.ts#captureTestEvidence persists via writeTestEvidence to .planning/governance/tests/{NN}.json (D-02)"
        status: pass
      - kind: unit
        ref: "src/governance/capture-test-evidence.test.ts#Production-caller grep evidence: parseTapSummary and writeTestEvidence have a non-test caller"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-04 malformed runner output hard-fails through parseTapSummary BEFORE writeTestEvidence (no corrupted record lands on disk)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/capture-test-evidence.test.ts#D-04 malformed runner output hard-fails through parseTapSummary before writeTestEvidence is called"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-03 narration rejection: TAP-shaped output without # tests N summary line hard-fails (guard is on the summary line, not TAP prefix)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: "src/governance/capture-test-evidence.test.ts#D-03 narration rejection: TAP-shaped output without the # tests N summary line hard-fails"
        status: pass
    human_judgment: false
  - id: D5
    description: "End-to-end: captureTestEvidence → writeTestEvidence → readTestEvidence → writeGovernanceAudit populates tests_executed in GOVERNANCE.md (SC-2 / AUDIT-04 lifted)"
    requirement: AUDIT-04
    verification:
      - kind: integration
        ref: "src/governance/capture-test-evidence.test.ts#End-to-end: captureTestEvidence → writeTestEvidence → readTestEvidence → writeGovernanceAudit populates tests_executed in GOVERNANCE.md"
        status: pass
      - kind: integration
        ref: "Smoke: node dist/governance/capture-test-evidence.js 09 + node dist/governance/audit-artifact.js → GOVERNANCE.md contains tests_executed (381 tests from real runner)"
        status: pass
    human_judgment: false
  - id: D6
    description: "aidlc-governance-verify SKILL.md step 4 invokes capture-test-evidence.js before the audit skill reads tests/{NN}.json (producer/consumer ordering)"
    requirement: AUDIT-04
    verification:
      - kind: unit
        ref: ".claude/skills/aidlc-governance-verify/SKILL.md step 4 text — invokes node dist/governance/capture-test-evidence.js <phaseNumber>"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-07-07
status: complete
---

# Phase 9 Plan 05: Capture-Test-Evidence Producer Summary

**AUDIT-04 producer-side wiring: thin captureTestEvidence orchestrator + injectable spawnRunner seam spawns `node --test --test-reporter=tap`, feeds stdout to parseTapSummary, and persists via writeTestEvidence — giving parseTapSummary and writeTestEvidence their first production callers and lifting the single root cause behind both Phase 9 VERIFICATION failures (SC-2 + D-03/D-04 production enforcement).**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-07T17:45:14Z
- **Completed:** 2026-07-07T17:50:00Z
- **Tasks:** 3 (TDD: RED → GREEN → REFACTOR-noop)
- **Files modified:** 3 (2 created, 1 modified, 0 deleted)

## Accomplishments
- capture-test-evidence.ts published: captureTestEvidence orchestrator + defaultSpawnRunner (spawnSync, shell:false, hardcoded argv, process.execPath) + isDirectRun/runDirect CLI main mirroring audit-artifact.ts convention
- parseTapSummary + writeTestEvidence acquire their first production callers — VERIFICATION §Anti-Patterns BLOCKER (zero production callers) lifted
- D-04 missing-`# tests N` guard now fires in production path (parseTapSummary invoked from non-test code); corrupted/narration stdout cannot land on disk (guard fires before writeTestEvidence)
- aidlc-governance-verify SKILL.md extended with step 4 invoking `node dist/governance/capture-test-evidence.js <phaseNumber>` BEFORE aidlc-governance-audit reads tests/{NN}.json (producer/consumer ordering)
- End-to-end proof: CLI smoke produced GOVERNANCE.md containing `tests_executed` derived from real `node --test` TAP output (381 tests, 378 pass, 0 fail) — was ABSENT before this plan
- Full suite 381 tests green (378 pass, 3 skipped, 0 fail); 6 new capture-test-evidence tests; 0 regression
- Capability manifest UNCHANGED per 09-REVIEW-FIX consent-hash deferral

## Task Commits

Each task was committed atomically:

1. **Task 1: RED** — `b33642a` (test): capture-test-evidence.test.ts with 6 tests (TAP parse, persist path, D-04 pre-persist guard, D-03 summary-line guard, end-to-end GOVERNANCE.md tests_executed, production-caller grep evidence). Build fails TS2307 on `./capture-test-evidence.js`.
2. **Task 2: GREEN** — `4d04555` (feat): capture-test-evidence.ts (captureTestEvidence + defaultSpawnRunner + isDirectRun/runDirect) + aidlc-governance-verify SKILL.md step 4 insertion + test dot-prefix fix (Rule 1). All 6 tests pass.
3. **Task 3: REFACTOR** — no-op commit (module is thin — 4 functions, ~60 lines of logic; no refactor warranted; full suite green + CLI smoke + end-to-end gap-closure proof all pass).

## Files Created/Modified
- `src/governance/capture-test-evidence.ts` — NEW: CaptureTestEvidenceArgs interface; SpawnRunner type; captureTestEvidence orchestrator (spawn → parseTapSummary → return record, pure-ish no persist); defaultSpawnRunner (child_process.spawnSync, shell:false, hardcoded argv `["--test", "--test-reporter=tap", "dist-test/**/*.test.js"]`, process.execPath); runDirect CLI main (parses argv=[phaseNumber], projectRoot=cwd, calls writeTestEvidence); isDirectRun guard (process.argv[1] === __filename)
- `src/governance/capture-test-evidence.test.ts` — NEW: 6 tests covering orchestrator (TAP parse + record shape + ISO 8601 capturedAt), persistence (D-02 path), D-04 malformed pre-persist guard (no file written), D-03 summary-line guard (TAP-shaped rejected), end-to-end (capture → write → read → writeGovernanceAudit populates tests_executed), production-caller grep evidence (parseTapSummary + writeTestEvidence call sites in source)
- `.claude/skills/aidlc-governance-verify/SKILL.md` — MODIFIED: inserted new step 4 invoking `node dist/governance/capture-test-evidence.js <phaseNumber>` after verify-gate-hook (step 3), before propagate-failures (renumbered to step 5). Step text explains AUDIT-04 producer-side role, D-04 hard-fail semantics, and fail-loud ordering.

## Decisions Made
- **Orchestrator/persist split:** captureTestEvidence returns the record; runDirect (CLI main) calls writeTestEvidence to persist. Pure-ish function, testable in isolation. The caller chooses whether to persist (CLI persists; tests vary). Mirrors the audit-artifact.ts `buildAuditRecord` vs `writeGovernanceAudit` split.
- **defaultSpawnRunner uses process.execPath (not bare "node"):** closes PATH-hijack surface (T-09-05-01). `shell: false` + hardcoded argv array closes shell-injection surface. No pre-validation of stdout shape — parseTapSummary owns the trust boundary.
- **Capability manifest unchanged:** 09-REVIEW-FIX deferred the manifest consumes extension (consent-hash constraint). The skill reads files directly — existing pattern holds. Documented deferral honored.
- **SKILL.md step ordering:** capture-test-evidence slots AFTER verify-gate-hook (step 3) and BEFORE propagate-failures. Producer fires before aidlc-governance-audit consumer reads tests/{NN}.json. Single phase-number arg + cwd-resolved projectRoot matches the user decision.
- **CLI smoke artifact cleanup:** `.planning/governance/tests/09.json` + generated GOVERNANCE.md removed after smoke verification (ephemeral governance state; not committed artifacts). The producer path is proven; future invocations regenerate them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Grep-evidence test had asymmetric dot prefix**
- **Found during:** Task 2 (GREEN)
- **Issue:** Plan specified the production-caller grep test assert `.parseTapSummary(` (with dot prefix) AND `writeTestEvidence(` (without). Named-import call sites have no dot prefix — `parseTapSummary(stdout)` not `.parseTapSummary(stdout)`. The asymmetric dot was a plan typo; the test as committed in RED would not match any reasonable call style for a destructured import.
- **Fix:** Dropped the leading dot in the test assertion: `src.includes("parseTapSummary(")`. Both assertions now consistent and match the actual call sites in capture-test-evidence.ts.
- **Files modified:** src/governance/capture-test-evidence.test.ts
- **Commit:** `4d04555` (Task 2 GREEN)

---

**Total deviations:** 1 auto-fixed (1 test bug)
**Impact on plan:** Single-character correction in a test assertion. No scope creep, no production-code deviation from the plan.

## Issues Encountered
None beyond the grep-evidence dot-prefix auto-fix.

## User Setup Required
None — no external service configuration required. The module spawns `node --test` (the actual `npm test` runner) which is already the project's test command. The verify:post skill invokes the compiled dist entrypoint; no env vars, no auth, no dashboard.

## Next Phase Readiness
- AUDIT-04 producer side wired end-to-end. ROADMAP SC-2 now satisfiable from the production path: capture-test-evidence.ts spawns the real runner, parseTapSummary extracts the summary, writeTestEvidence persists; the existing WR-01 read-side wiring in buildEnrichmentFromPersistedState finds the file and populates `tests_executed` in GOVERNANCE.md.
- D-03/D-04 trust boundary enforced in production (parseTapSummary invoked from non-test code on every verify:post run).
- Phase 10 (selection-quality harness) can rely on the producer path being demonstrable end-to-end for future recall/precision checks; the audit trail now reflects real runner output.
- Historical v1 GOVERNANCE.md files under `.planning/phases/01..08/` remain v1 — the v2 bump was forward-incompatible by design (Pitfall 1 from Plan 03).

## TDD Gate Compliance
- RED gate: `b33642a` (test commit) — build fails with TS2307 on `./capture-test-evidence.js`. Confirmed RED.
- GREEN gate: `4d04555` (feat commit) — all 6 capture-test-evidence tests pass; build clean; CLI smoke produces tests/09.json; GOVERNANCE.md contains tests_executed.
- REFACTOR gate: no-op (module is thin; full suite green; no refactor warranted).

All three gates present in git log in the correct order.

## Self-Check: PASSED

- All 3 created/modified files exist on disk (src/governance/capture-test-evidence.ts, src/governance/capture-test-evidence.test.ts, .claude/skills/aidlc-governance-verify/SKILL.md).
- Both task commits present in git log (`b33642a`, `4d04555`).
- SUMMARY.md exists at the canonical path.
- Capability manifest UNCHANGED (verified via `git diff --stat HEAD -- .gsd/capabilities/` = empty).
- parseTapSummary + writeTestEvidence have ≥1 production call site each in src/governance/capture-test-evidence.ts (grep verified).
- GOVERNANCE.md smoke produced `tests_executed` key (was ABSENT before this plan) — end-to-end proof of SC-2 lifted.

---
*Phase: 09-complete-audit-record-approval*
*Completed: 2026-07-07*