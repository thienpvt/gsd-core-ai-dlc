---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Developer Coding Conventions
status: planning
last_updated: "2026-07-09T18:00:00.000Z"
last_activity: 2026-07-09
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-09)

**Core value:** The rule selection engine injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.
**Current focus:** Phase 13 — Domain Pack + Service Classification + Integrations

## Current Position

Phase: 13 of 18 (v4.0 phases 13-18)
Plan: —
Status: Ready to plan
Last activity: 2026-07-09 — v4.0 roadmap created (6 phases, 18/18 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 36 (all milestones)
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
| 13. Domain Pack + Service Classification + Integrations | 0/? | Not started — next to plan |
| 14. Hexagonal + Tactical DDD Rules | 0/? | Not started |
| 15. Logging, API Contract & Saga Decision Rules | 0/? | Not started |
| 16. Starter Examples Outside Index | 0/? | Not started |
| 17. Coverage Parser + Binding GateAdapter | 0/? | Not started |
| 18. Verify/Ship Wire + Consumer Docs | 0/? | Not started |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 11-summary-frontmatter-hygiene P01 | 7min | 2 tasks | 7 files |
| Phase 12 P01 | 14min | 2 tasks | 2 files |
| Phase 12 P02 | 16min | 2 tasks | 2 files |

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

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- RUN-01 upstream gsd-core capability-manifest `consumes` constraint still open (deferred from v2/v3) — DOC-01 consent-activate path blocked until upstream fix.
- Phase 13 discuss must lock Internal vs internet-facing machine signal (path/module/config).
- Phase 17 must freeze single adapter name (`coverage-report`) + measurement boundary (unit line ≥70%, excludes) in same PR as parser.

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

Last session: 2026-07-09
Stopped at: v4.0 ROADMAP.md written — ready for `/gsd-plan-phase 13`
Resume file: None

## Operator Next Steps

- Plan Phase 13: `/gsd-plan-phase 13` (or discuss first if Internal vs internet-facing signal unresolved)
