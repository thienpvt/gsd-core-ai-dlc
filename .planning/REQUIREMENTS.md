# Requirements: GSD Governance Overlay (AI-DLC × GSD Core)

**Defined:** 2026-07-08
**Core Value:** The rule selection engine injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.

## v3 Requirements

Requirements for milestone **v3.0 Adoption & Hygiene**. Each maps to a roadmap phase (numbering continues at 11).

### Tech Debt (continues TD numbering from v2.0)

- [x] **TD-10**: 6 v2.0 per-plan SUMMARYs omitted `requirements-completed` (06-02, 06-03, 07-01, 07-02, 10-01, 10-02) — backfill the field with verified requirement IDs, so the 3-source milestone-audit cross-reference (VERIFICATION + SUMMARY frontmatter + traceability) no longer reports "partial (verify manually)" for any v2.0 requirement.

### Documentation

- [x] **DOC-01**: End user can install, consent-activate, and run the governance overlay following onboarding documentation (prerequisites, install steps, CB-3 consent flow, first-run smoke check).
- [x] **DOC-02**: End user can operate the core governance workflow — `governance build-index`, `governance select`, `governance inject`, `governance rule-detail`, `governance eval`, and the audit/ship gate chain — following documented usage examples.
- [ ] **DOC-03**: Rule author can write, integrate, and verify a new governance rule following the authoring guide — Markdown + frontmatter (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`), enterprise/domain/project scope, trigger axes (keywords/taskType/paths), binding-vs-advisory (`x-binding`), `build-index` + `select`/`eval` verification that the rule fires for its intended task/phase.

## v2 Requirements (Deferred beyond v3.0)

**ENF-05**: scanner/policy no-op first-class — deferred (v2.0 stubs sufficient as contract boundary).
**ENF-06**: (runtime-registered `ADAPTERS` — dynamic adapter loading — deferred; static registry sufficient v2.0/v3.0).

**OPS-01**: (deploy/monitor) AI-DLC's operations phase — deferred beyond v3.0 (docs + hygiene milestone).

### Runtime — Upstream Coordination

- **RUN-01**: Capability manifest `consumes` extension for verify:post audit step blocked by installed gsd-core `bundleContentHash`/`validateConsumesGlobal` consent-hash constraint; revisit by coordinating with the installed runtime's consent-hash expectations.

## Out of Scope

Explicitly excluded from v3.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real scanner/policy integrations (semgrep/bandit/checkov/grype/gitleaks first-class) | Feature work beyond docs+hygiene; v2.0 stubs sufficient contract boundary (deferred as ENF-05) |
| Dynamic adapter loading | Feature work; static `ADAPTERS` registry sufficient v2.0/v3.0 (deferred as ENF-06) |
| Operations-phase (deploy/monitor) governance | OPS-01 deferred — v2.0 covers discuss→plan→execute→verify→ship only; v3.0 is docs+hygiene |
| Capability manifest `consumes` upstream fix | RUN-01 — upstream gsd-core `bundleContentHash` constraint, not actionable in-repo |
| New enforcement features / new gates | v3.0 is documentation + hygiene only — no new gate surface |
| Forking or rewriting GSD Core internals | Permanent exclusion — overlay/extension, not fork (keeps upstream GSD upgradable) |
| Treating markdown steering as hard enforcement | Permanent exclusion — enforcement lives in real gates via tool-agnostic contracts |
| Copying full AI-DLC steering corpus into context per request | Permanent exclusion — the exact anti-pattern this project exists to eliminate |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TD-10 | Phase 11 | Complete |
| DOC-01 | Phase 12 | Complete |
| DOC-02 | Phase 12 | Complete |
| DOC-03 | Phase 12 | Pending |

**Coverage:** 4/4 v3.0 requirements mapped (100%), 0 orphans.

---

*v3.0 Adoption & Hygiene — defined 2026-07-08.*
