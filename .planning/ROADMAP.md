# Roadmap: GSD Governance Overlay (AI-DLC × GSD Core)

## Milestones

- ✅ **v1.0 Core** Phases 1-5 (shipped 2026-07-06) proves anti-bloat premise end-to-end
- ✅ **v2.0 Govern** Phases 6-10 (shipped 2026-07-08) — remaining gates, full audit record, approval schema, enforcement contracts, selection-quality harness
- 🚧 **v3.0 Adoption & Hygiene** Phases 11-12 — SUMMARY frontmatter backfill + onboarding/rule-authoring docs

## Phases

<details>
<summary>✅ v1.0 Core (Phases 1-5) SHIPPED 2026-07-06</summary>

- [x] **Phase 1: Rule-Pack Format & Index** - Author rules Markdown+frontmatter across three scopes; compile compact index (completed 2026-07-05)
- [x] **Phase 2: Selection Engine** - Deterministic trigger+scope+phase matching against labeled recall/precision eval set (completed 2026-07-05)
- [x] **Phase 3: Summary Injection & Lazy Detail Loading** - Inject summaries only; load full rule bodies on demand by id (completed 2026-07-06)
- [x] **Phase 4: GSD Capability Integration & Persistence** - Register discuss/execute gate hooks via capability; persist governance state to disk (completed 2026-07-06)
- [x] **Phase 5: Audit-Artifact Writer** - Produce machine-derived per-task audit of rules applied and skipped (completed 2026-07-06)

Full phase details (goals, success criteria, plans, waves) archived at
`.planning/milestones/v1.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.0 Govern (Phases 6-10) SHIPPED 2026-07-08</summary>

Govern milestone extends the validated Core to full enterprise SDLC control: remaining GSD loop gates, complete audit record, tool-agnostic enforcement contracts with adapter stubs, and a selection-quality harness.

- [x] **Phase 6: v1.0 Tech-Debt Fold-In** - 3 correctness fixes + 6 hygiene cleanups on a clean foundation (completed 2026-07-06)
- [x] **Phase 7: Enforcement Contracts & Adapter Stubs** - JSON Schema gate contracts + GateAdapter no-op/echo stubs for AI-DLC-implied scanners (completed 2026-07-07)
- [x] **Phase 8: Remaining Gate Hooks** - Plan/verify/ship hooks with per-rule pass/fail/waived evidence (completed 2026-07-07)
- [x] **Phase 9: Complete Audit Record & Approval** - Audit v2 enrichment fields + test-evidence capture + human approval flows through contracts (completed 2026-07-07)
- [x] **Phase 10: Selection-Quality Harness** - Standing recall/precision harness against labeled eval set, repeatable and auditable check (completed 2026-07-08)

Full phase details (goals, success criteria, plans, waves) archived at
`.planning/milestones/v2.0-ROADMAP.md`.

</details>

### v3.0 Adoption & Hygiene (Active)

- [ ] **Phase 11: SUMMARY Frontmatter Hygiene** - Backfill `requirements-completed` on the 6 v2.0 SUMMARYs that omitted it so the 3-source cross-reference is fully satisfied
- [ ] **Phase 12: Onboarding & Rule-Authoring Docs** - End-user onboarding/install/consent/first-run docs, core governance workflow usage examples, and governance-rule authoring guide

## Phase Details

### Phase 11: SUMMARY Frontmatter Hygiene
**Goal**: Archived v2.0 SUMMARYs carry verified `requirements-completed` frontmatter, so the 3-source milestone-audit cross-reference (VERIFICATION + SUMMARY frontmatter + traceability) no longer reports "partial (verify manually)" for any v2.0 requirement
**Depends on**: Nothing — edits archived v2.0 SUMMARY files in place under `.planning/milestones/v2.0-phases/` (the live `.planning/phases/` dir is now empty after `/gsd-cleanup`)
**Requirements**: TD-10
**Success Criteria** (what must be TRUE):
  1. All 6 target SUMMARY files (06-02, 06-03, 07-01, 07-02, 10-01, 10-02) carry a `requirements-completed` frontmatter field populated with verified REQ-IDs drawn from their corresponding VERIFICATION.md / PLAN.md
  2. A re-run of the 3-source milestone-audit cross-reference (VERIFICATION + SUMMARY frontmatter + REQUIREMENTS.md traceability) reports every v2.0 requirement as "satisfied", not "partial (verify manually)"
  3. No other SUMMARY frontmatter fields are altered — the backfill is purely additive (`requirements-completed` inserted, existing fields untouched)
**Plans:** 1 plan
- [ ] 11-01-PLAN.md — Backfill `requirements-completed` on 6 v2.0 SUMMARYs + verify 3-source cross-reference

### Phase 12: Onboarding & Rule-Authoring Docs
**Goal**: An end user can install, activate, and first-run the governance overlay, operate the core governance CLI workflow, and a rule author can write, integrate, and verify a new governance rule — all by following documentation alone
**Depends on**: Nothing — greenfield docs. MAY reference Phase 11's verified requirement mapping (via the existing v2.0 VERIFICATION.md) at implementer's discretion; no hard dependency
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. A new end user following the onboarding doc can install the overlay, complete the CB-3 consent flow, and run a first-run smoke check that confirms governance is active — without reading source code
  2. An end user can operate the core governance workflow end-to-end (`governance build-index`, `governance select`, `governance inject`, `governance rule-detail`, `governance eval`, and the audit/ship gate chain) using documented usage examples as the sole reference
  3. A rule author following the authoring guide can write a new Markdown+frontmatter rule (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`), integrate it at the correct enterprise/domain/project scope, declare binding-vs-advisory via `x-binding`, and verify via `build-index` + `select`/`eval` that the rule fires for its intended task/phase
  4. The three doc deliverables (onboarding, workflow usage, rule-authoring guide) are discoverable from the repo root and cross-reference each other so a reader can navigate between install → operate → author without leaving the docs
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Rule-Pack Format & Index | v1.0 | 4/4 | Complete | 2026-07-05 |
| 2. Selection Engine | v1.0 | 3/3 | Complete | 2026-07-05 |
| 3. Summary Injection & Lazy Detail Loading | v1.0 | 2/2 | Complete | 2026-07-06 |
| 4. GSD Capability Integration & Persistence | v1.0 | 3/3 | Complete | 2026-07-06 |
| 5. Audit-Artifact Writer | v1.0 | 2/2 | Complete | 2026-07-06 |
| 6. v1.0 Tech-Debt Fold-In | v2.0 | 3/3 | Complete | 2026-07-06 |
| 7. Enforcement Contracts & Adapter Stubs | v2.0 | 4/4 | Complete | 2026-07-07 |
| 8. Remaining Gate Hooks | v2.0 | 5/5 | Complete | 2026-07-07 |
| 9. Complete Audit Record & Approval | v2.0 | 5/5 | Complete | 2026-07-07 |
| 10. Selection-Quality Harness | v2.0 | 2/2 | Complete | 2026-07-08 |
| 11. SUMMARY Frontmatter Hygiene | v3.0 | 0/? | Not started | - |
| 12. Onboarding & Rule-Authoring Docs | v3.0 | 0/? | Not started | - |

---
*See `.planning/MILESTONES.md` for shipped-milestone summaries, `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 phase detail, and `.planning/milestones/v2.0-ROADMAP.md` for v2.0 phase detail.*

<!-- gsd:roadmap v3.0 2026-07-08 -->