# Roadmap: GSD Governance Overlay (AI-DLC × GSD Core)

## Milestones

- ✅ **v1.0 Core** Phases 1-5 (shipped 2026-07-06) proves anti-bloat premise end-to-end
- ✅ **v2.0 Govern** Phases 6-10 (shipped 2026-07-08) — remaining gates, full audit record, approval schema, enforcement contracts, selection-quality harness

## Phases

<details>
<summary>✅ v1.0 Core (Phases 1-5) SHIPPED 2026-07-06</summary>

- [x] **Phase 1: Rule-Pack Format & Index** - Author rules as Markdown+frontmatter across three scopes; compile a compact index (completed 2026-07-05)
- [x] **Phase 2: Selection Engine** - Deterministic trigger+scope+phase matching with a labeled recall/precision eval set (completed 2026-07-05)
- [x] **Phase 3: Summary Injection & Lazy Detail Loading** - Inject summaries only; load full rule bodies on demand by id (completed 2026-07-06)
- [x] **Phase 4: GSD Capability Integration & Persistence** - Register discuss/execute gate hooks as a capability; persist governance state to disk (completed 2026-07-06)
- [x] **Phase 5: Audit-Artifact Writer** - Produce a machine-derived per-task audit of rules applied and skipped (completed 2026-07-06)

Full phase details (goals, success criteria, plans, waves) archived at
`.planning/milestones/v1.0-ROADMAP.md`.

</details>

<details>
<summary>✅ v2.0 Govern (Phases 6-10) SHIPPED 2026-07-08</summary>

The Govern milestone extends the validated Core to full enterprise SDLC control: remaining GSD loop gates, a complete audit record, tool-agnostic enforcement contracts with adapter stubs, a human approval checkpoint, and a standing selection-quality harness — all layered on v1's selection/injection/audit foundation without re-opening the context window.

- [x] **Phase 6: v1.0 Tech-Debt Fold-In** - Pay down 9 v1.0 debt items (3 correctness, 6 hygiene) before new gate surface opens (completed 2026-07-06)
- [x] **Phase 7: Enforcement Contracts & Adapter Stubs** - JSON Schema gate contracts + GateAdapter interface + no-op stubs named after AI-DLC-implied tools (completed 2026-07-07)
- [x] **Phase 8: Remaining Gate Hooks** - Plan, verify, and ship gates consume Phase 7 contracts and produce per-rule pass/fail records (completed 2026-07-07)
- [x] **Phase 9: Complete Audit Record & Approval** - Audit artifact records requirements, tests, risks, approvals; human approval flows through contracts (completed 2026-07-07)
- [x] **Phase 10: Selection-Quality Harness** - Standing recall/precision harness against the labeled eval set as a repeatable auditable check (completed 2026-07-08)

Full phase details (goals, success criteria, plans, waves) archived at
`.planning/milestones/v2.0-ROADMAP.md`.

</details>

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

---
*See `.planning/MILESTONES.md` for shipped-milestone summaries, `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 phase detail, and `.planning/milestones/v2.0-ROADMAP.md` for full v2.0 phase detail.*
*Last updated: 2026-07-08 — v2.0 Govern milestone shipped.*