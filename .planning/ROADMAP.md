# Roadmap: GSD Governance Overlay (AI-DLC × GSD Core)

## Milestones

- ✅ **v1.0 Core** — Phases 1-5 (shipped 2026-07-06) — proves the anti-bloat premise end-to-end
- 📋 **v2.0 Govern** — remaining gates, full audit record, approval schema, enforcement contracts (not started)

## Phases

<details>
<summary>✅ v1.0 Core (Phases 1-5) — SHIPPED 2026-07-06</summary>

- [x] Phase 1: Rule-Pack Format & Index (4/4 plans) — completed 2026-07-05
- [x] Phase 2: Selection Engine (3/3 plans) — completed 2026-07-05
- [x] Phase 3: Summary Injection & Lazy Detail Loading (2/2 plans) — completed 2026-07-06
- [x] Phase 4: GSD Capability Integration & Persistence (3/3 plans) — completed 2026-07-06
- [x] Phase 5: Audit-Artifact Writer (2/2 plans) — completed 2026-07-06

Full phase details (goals, success criteria, plans, waves) archived to
`.planning/milestones/v1.0-ROADMAP.md`.

</details>

### 📋 v2.0 Govern (Planned)

The Govern milestone extends the validated Core to full enterprise SDLC control.
Phase numbering continues from 6 (never restart at 01). Requirements live in
`.planning/REQUIREMENTS.md` (fresh, created during `/gsd-new-milestone`).

Planned scope (from REQUIREMENTS.md v2 deferred section):

- **Remaining gates:** plan gate (GATE-03), verify gate (GATE-04), ship gate (GATE-05)
- **Full audit record:** AUDIT-03 (requirements covered), AUDIT-04 (tests executed), AUDIT-05 (remaining risks), AUDIT-06 (approvals)
- **Tool-agnostic enforcement:** ENF-02 (JSON Schema gate contracts), ENF-03 (`GateAdapter` + no-op stubs), ENF-04 (binding rules route through named contracts)
- **Selection quality:** SEL-06 (standing recall/precision harness)
- **Human-in-the-loop:** APPR-01 (human approval checkpoint schema)

## Progress

**Execution Order:**
v1.0 phases executed 1 → 2 → 3 → 4 → 5 (all shipped). v2.0 phases start at 6.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Rule-Pack Format & Index | v1.0 | 4/4 | Complete | 2026-07-05 |
| 2. Selection Engine | v1.0 | 3/3 | Complete | 2026-07-05 |
| 3. Summary Injection & Lazy Detail Loading | v1.0 | 2/2 | Complete | 2026-07-06 |
| 4. GSD Capability Integration & Persistence | v1.0 | 3/3 | Complete | 2026-07-06 |
| 5. Audit-Artifact Writer | v1.0 | 2/2 | Complete | 2026-07-06 |

---
*See `.planning/MILESTONES.md` for the shipped-milestone summary and `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 phase detail.*