---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Developer Coding Conventions
current_phase: 18
current_phase_name: Verify/Ship Wire + Consumer Docs
status: executing
stopped_at: Phase 18 context gathered
last_updated: "2026-07-12T16:49:22.808Z"
last_activity: 2026-07-12
last_activity_desc: Phase 17 complete, transitioned to Phase 18
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 9
  completed_plans: 9
  percent: 83
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-09)

**Core value:** The rule selection engine injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.
**Current focus:** Phase 17 — Coverage Parser + Binding GateAdapter

## Current Position

Phase: 18 — Verify/Ship Wire + Consumer Docs
Plan: Not started
Status: Ready to execute
Last activity: 2026-07-12 — Phase 17 complete, transitioned to Phase 18

Progress: [███████░░░] 67%

## Performance Metrics

**Velocity:**

- Total plans completed: 45 (all milestones)
- Average duration: — min
- Total execution time: 0.0 hours

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 02 | 3 | - | - |
| 03 | 2 | - | - |
| 04 | 3 | - | - |
| 05 | 2 | - | - |
| 6 | 3 | - | - |
| 07 | 4 | - | - |
| 08 | 5 | - | - |
| 9 | 5 | - | - |
| 10 | 2 | - | - |
| 11 | 1 | - | - |
| 12 | 2 | - | - |
| 13 | 2 | - | - |
| 14 | 2 | - | - |
| 15 | 2 | - | - |
| 16 | 1 | - | - |
| 17 | 2 | - | - |

**v2.0 Phases:**

| Phase | Plans | Status |
|-------|-------|--------|
| 6. v1.0 Tech-Debt Fold-In | 3/3 | Complete (verified 5/5) |
| 7. Enforcement Contracts & Adapter Stubs | 4/4 | Complete |
| 8. Remaining Gate Hooks | 5/5 | Complete (verified 15/15) |
| 9. Complete Audit Record & Approval | 5/5 | Complete |
| 10. Selection-Quality Harness | 2/2 | Complete (verified) |

**v3.0 Phases:**

| Phase | Plans | Status |
|-------|-------|--------|
| 11. SUMMARY Frontmatter Hygiene | 1/1 | Complete |
| 12. Onboarding & Rule-Authoring Docs | 2/2 | Complete |

**v4.0 Phases:**

| Phase | Plans | Status |
|-------|-------|--------|
| 13. Domain Pack + Service Classification + Integrations | 2/2 | Complete (verified 4/4) |
| 14. Hexagonal + Tactical DDD Rules | 2/2 | Complete (verified 7/7) |
| 15. Logging, API Contract & Saga Decision Rules | 2/2 | Complete (verified 8/8) |
| 16. Starter Examples Outside Index | 1/1 | Complete (verified 9/9) |
| 17. Coverage Parser + Binding GateAdapter | 0/2 | Planned — ready to execute |
| 18. Verify/Ship Wire + Consumer Docs | 0/? | Not started |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 11-summary-frontmatter-hygiene P01 | 7min | 2 tasks | 7 files |
| Phase 12 P01 | 14min | 2 tasks | 2 files |
| Phase 12 P02 | 16min | 2 tasks | 2 files |
| Phase 13 P01 | 12min | 2 tasks | 1 files |
| Phase 13 P02 | 18min | 3 tasks | 9 files |
| Phase 14 P01 | 12min | 2 tasks | 1 files |
| Phase 14 P02 | 15min | 3 tasks | 5 files |
| Phase 15 P01 | 12min | 2 tasks | 1 files |
| Phase 15 P02 | 12min | 3 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap v4.0]: 6-phase structure (13-18) from research content chain; COV kept as own phase (real adapter riskiest); CQRS/EVAL deferred (not in v4.0 reqs).
- [Roadmap v4.0]: Content first (pack → hex/ddd → log/api/evt → examples), then binding coverage adapter, then verify/ship wire + docs.
- [Roadmap v4.0]: Zero new npm deps for coverage parse; examples outside aidlc-rules/; vendor names only in rule content not src/.
- [Roadmap v4.0]: Summaries one sentence; no always-on architecture essays; no empty triggers on style rules.
- [Roadmap v3.0]: 2-phase structure derived from milestone-summary gate — Phase 11 (TD-10 frontmatter backfill) cleanly separable from Phase 12 (DOC-01/02/03 docs). No extra phases invented.
- [Roadmap v3.0]: Phase 11 edits archived SUMMARY files in `.planning/milestones/v2.0-phases/` — live `.planning/phases/` is empty after `/gsd-cleanup`.
- [Roadmap v3.0]: Phase 11 is additive-only — `requirements-completed` inserted, existing SUMMARY fields untouched.
- [Roadmap v3.0]: No hard dependency Phase 11 → Phase 12; docs can cite existing v2.0 VERIFICATION.md regardless of frontmatter backfill.
- [Phase 11]: [11-01]: Used each phase VERIFICATION.md Requirements Coverage Source Plan column as authoritative REQ-ID mapping; no IDs re-derived or invented.
- [Phase 11]: [11-01]: Kept archived SUMMARY edits additive-only: no coverage block added, no existing field/body changed.
- [Phase 11]: [11-01]: Task 2 scanner was made CRLF-tolerant after the literal plan command skipped CRLF frontmatter in existing archived summaries.
- [Phase 12]: [12-01] Documented CB-3 as loader consent grant separate from governance.enabled activation toggle; both are required for governance hooks to fire.
- [Phase 12]: [12-01] Kept CLI docs source-grounded to command source signatures and verified examples against the built bin/governance.cjs.
- [Phase 12]: [12-02] Used require-mfa only as the 6-base-field plus classification example; billing-review demonstrates all fields including detailPath.
- [Phase 12]: [12-02] Placed detail examples under details/ because the loader skips details/ subtrees during indexing.
- [Phase 12]: [12-02] Negative selector docs parse JSON and inspect selected[].id because skipped[] intentionally keeps non-matching rule ids.
- [Quick 260709-uk6]: Kept package name @opengsd/gsd-aidlc-overlay; private registry owns @opengsd scope locally via publishConfig + .npmrc.example placeholders.
- [Quick 260709-uk6]: Docs lead with org private-registry install; git/file/git+ssh demoted to Fallback; never claim public npmjs.com ownership.
- [Phase 13]: Primary RED suite targets real aidlc-rules via buildIndex (missing pack = expected RED)
- [Phase 13]: Body canaries BODY_CANARY java-spring-<id> documented for plan 02 parity
- [Phase 13]: Engine frozen; zero production src edits outside test file
- [Phase 13]: [13-02] Omitted bare jdbc/jpa/orm positives on internal outbound — class markers + paths only for fail-open XOR
- [Phase 13]: [13-02] rule-index.json stays gitignored; rebuild via governance build-index is durable path
- [Phase 13]: [13-02] WSO2 only in internet detail/triggers Markdown; never production src/
- [Phase 13]: Internal vs internet-facing classified via keyword+path hybrid on TaskSignal (no new SelectionConfig field)
- [Phase 14]: Sibling suite java-spring-hex-ddd.test.ts (not extending Phase 13 pack suite)
- [Phase 14]: LOCKED_ENTITY_PATH_GLOB domain-scoped Entity path (infra EntityManagerConfig/JpaEntityScanner negatives)
- [Phase 14]: Engine frozen — zero production src edits outside new test file; zero new npm deps
- [Phase 14]: [14-02] Entity path tightened to domain-scoped Entity glob; inventory lock 5→7; HEX/DDD co-select on domain paths
- [Phase 15]: Sibling suite java-spring-log-api-evt.test.ts (does not extend Phase 13/14 inventories)
- [Phase 15]: Filter path positive not required in RED matrix — plan 02 may add tight Correlation/Mdc filter globs only
- [Phase 15]: Engine frozen; zero production src edits; zero new npm deps
- [Phase ?]: [15-02]: Optional tight Correlation/Mdc filter globs; no bare filter/**
- [Phase ?]: [15-02]: URI path versioning (/api/v1/...) is the documented org default for JS-API-01
- [Phase ?]: [15-02]: Engine frozen — zero production src edits outside inventory test; zero new npm deps
- [Phase 17]: Adapter name frozen as `coverage-report`; unit line threshold is inclusive ≥70% using integer cross-multiplication; zero-line fails closed.
- [Phase 17]: JaCoCo uses one report-root LINE counter; LCOV aggregates complete record LF/LH pairs; producer owns exclusions.
- [Phase 17]: Binding rule uses Java production paths as positive triggers only because selector axes OR-combine; docs/test/infra and test/generated/build/target paths exclude.
- [Phase 17]: `GateRequest` remains unchanged; configured factory closes over projectRoot/reportPath/format; verify/ship auto-wiring remains Phase 18.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- RUN-01 upstream gsd-core capability-manifest `consumes` constraint still open (deferred from v2/v3) — DOC-01 consent-activate path blocked until upstream fix.
- Phase 17 decisions frozen: `coverage-report`, aggregate unit-line ≥70%, producer-owned exclusions; implementation pending.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260709-ucq | Assess private/self-hosted org install fit; fix install docs off public npm claim | 2026-07-09 | 102e6d0 | [260709-ucq-assess-private-org-install](./quick/260709-ucq-assess-private-org-install/) |
| 260709-uk6 | Add private npm registry install/publish path (publishConfig, .npmrc.example, docs) | 2026-07-09 | a03880d | [260709-uk6-add-private-npm-registry-install-publish](./quick/260709-uk6-add-private-npm-registry-install-publish/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Future milestone | OPS-01 operations-phase governance | Deferred | 2026-07-06 |
| Phase 7 | `audit-hook-contract.test.ts` local render-hooks expects `aidlc-governance-audit`, but current Codex render-hooks returns only validate/security hooks | Deferred | 2026-07-07 |
| v3.0 | ENF-05 real scanner/policy first-class integrations | Out of v3.0 scope (docs + hygiene only) | 2026-07-08 |
| v3.0 | ENF-06 dynamic adapter loading | Out of v3.0 scope (static registry sufficient) | 2026-07-08 |
| v3.0 | RUN-01 capability manifest `consumes` upstream fix | Out of v3.0 scope (upstream gsd-core constraint) | 2026-07-08 |
| v4.0 | JAVA-CQRS-01 CQRS command/query split rules | Deferred by scope choice | 2026-07-09 |
| v4.0 | JAVA-EVAL-01 dedicated java-spring eval corpus | Deferred; SEL-06 remains | 2026-07-09 |

## Session Continuity

Last session: 2026-07-12T16:12:49.587Z
Stopped at: Phase 18 context gathered
Resume file: 

.planning/phases/18-verify-ship-wire-consumer-docs/18-CONTEXT.md
