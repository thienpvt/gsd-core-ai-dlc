# Requirements: GSD Governance Overlay (AI-DLC × GSD Core)

**Defined:** 2026-07-08
**Core Value:** The rule selection engine injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.

## v3 Requirements

Requirements for milestone **v3.0 Adoption & Hygiene**. Each maps to a roadmap phase (numbering continues at 11).

### Tech Debt (continues TD numbering from v2.0)

- [ ] **TD-10**: The 6 v2.0 per-plan SUMMARYs that omitted `requirements-completed` (06-02, 06-03, 07-01, 07-02, 10-01, 10-02) backfill the field with their verified requirement IDs, so the 3-source milestone-audit cross-reference (VERIFICATION + SUMMARY frontmatter + traceability) no longer reports "partial (verify manually)" for any v2.0 requirement.

### Documentation

- [ ] **DOC-01**: An end user can install, consent-activate, and run the governance overlay by following onboarding documentation (prerequisites, install steps, CB-3 consent flow, first-run smoke check).
- [ ] **DOC-02**: An end user can operate the core governance workflow — `governance build-index`, `governance select`, `governance inject`, `governance rule-detail`, `governance eval`, and the audit/ship gate chain — by following documented usage examples.
- [ ] **DOC-03**: A rule author can write, integrate, and verify a new governance rule by following the authoring guide — Markdown + frontmatter (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`), enterprise/domain/project scope, trigger axes (keywords/taskType/paths), binding-vs-advisory (`x-binding`), and `build-index` + `select`/`eval` verification that the rule fires for its intended task/phase.

## v2 Requirements (Deferred)

Deferred to future milestones. Tracked but not in the v3.0 roadmap.

### Enforcement — Real Integrations

- **ENF-05**: Real scanner/policy integrations beyond no-op stubs (semgrep, bandit, checkov, grype, gitleaks as first-class adapters with real tool invocation) — deferred; v2.0 shipped stubs only.
- **ENF-06**: Dynamic adapter loading (runtime-registered adapters vs static `ADAPTERS` map) — deferred.

### Operations — Deploy/Monitor Governance

- **OPS-01**: Overlay surfaces governance at the operations phase (deploy/monitor) — AI-DLC's Operations subphase; intentionally not covered by v2.0 gates, deferred beyond v3.0 (docs + hygiene milestone).

### Runtime — Upstream Coordination

- **RUN-01**: Capability manifest `consumes` extension for the verify:post audit step — blocked by installed gsd-core `bundleContentHash`/`validateConsumesGlobal` consent-hash constraint; revisit after coordinating with the installed runtime's consent-hash expectations.

## Out of Scope

Explicitly excluded from v3.0. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real scanner/policy integrations (semgrep/bandit/checkov/grype/gitleaks first-class) | Feature work beyond docs+hygiene; v2.0 stubs are sufficient for the contract boundary (deferred as ENF-05) |
| Dynamic adapter loading | Feature work; static `ADAPTERS` registry is sufficient for v2.0/v3.0 (deferred as ENF-06) |
| Operations-phase (deploy/monitor) governance | OPS-01 deferred — v2.0 covers discuss→plan→execute→verify→ship only; v3.0 is docs+hygiene |
| Capability manifest `consumes` upstream fix | RUN-01 — upstream gsd-core `bundleContentHash` constraint, not actionable in-repo |
| New enforcement features / new gates | v3.0 is documentation + hygiene only — no new gate surface |
| Forking or rewriting GSD Core internals | Permanent exclusion — overlay/extension, not a fork (keeps upstream GSD upgradable) |
| Treating markdown steering as hard enforcement | Permanent exclusion — enforcement lives in real gates via tool-agnostic contracts |
| Copying the full AI-DLC steering corpus into context per request | Permanent exclusion — the exact anti-pattern this project exists to eliminate |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TD-10 | Phase 11 | Pending |
| DOC-01 | Phase 12 | Pending |
| DOC-02 | Phase 12 | Pending |
| DOC-03 | Phase 12 | Pending |

**Coverage:**
- v3 requirements: 4 total
- Mapped to phases: 4
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-08*
*Last updated: 2026-07-08 after v3.0 Adoption & Hygiene milestone definition*