# Requirements: GSD Governance Overlay (AI-DLC × GSD Core)

**Defined:** 2026-07-05
**Core Value:** The rule selection engine injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.

## Milestones

- **Milestone 1 — Core (v1):** Prove the anti-bloat premise end-to-end. Rule packs → deterministic selection → summary-only injection → lazy detail, wired through the two gates where rules matter most (discuss, execute), with a minimum-credibility audit record and disk-backed state. If selection is correct and lean here, the whole model is validated.
- **Milestone 2 — Govern (v2):** Full enterprise SDLC control. Remaining gates (plan/verify/ship), the complete audit record, human approval schema, and the tool-agnostic enforcement contracts that give binding rules real teeth.

## v1 Requirements

Requirements for the Core milestone. Each maps to a roadmap phase.

### Rule Packs

- [x] **PACK-01**: Rule author can define a rule as Markdown with YAML frontmatter carrying `id`, `scope`, `triggers`, `phases`, `severity`, `summary`, and `detailPath`
- [x] **PACK-02**: Rule author can organize rules into enterprise / domain / project scopes, and the system resolves conflicts by defined precedence
- [x] **PACK-03**: Rule author can classify each rule as `advisory` or `binding`, and the system rejects a `binding` rule that names no enforcement contract
- [x] **PACK-04**: System builds a compact `rule-index.json` (summaries and pointers only, never full bodies) from the rule-pack store

### Selection & Injection

- [x] **SEL-01**: Given a task's signals plus the current phase and scope config, the selection engine returns exactly the matching rules and a reason for each, deterministically (trigger + scope-glob + phase matching over the index)
- [x] **SEL-02**: System injects only rule summaries (never full bodies) into the working context for a governed task
- [x] **SEL-03**: Executor can load a single full rule body on demand by `id` when a summary is insufficient for the decision at hand
- [x] **SEL-04**: For every governed task, the system records why each candidate rule was selected or skipped (selection observability)
- [x] **SEL-05**: System enforces a per-request governance token budget and surfaces a loud signal when injected summaries would exceed it

### Governance Gates

- [ ] **GATE-01**: At the discuss gate, the overlay identifies task type and risk and attaches the relevant rule summaries to the discussion context
- [x] **GATE-02**: At the execute gate, the overlay injects the selected rule summaries into the executor/subagent context (which otherwise inherits nothing)

### Audit Artifacts

- [ ] **AUDIT-01**: System produces a per-task audit artifact recording the rules applied, derived from actual selector output (not model narration)
- [ ] **AUDIT-02**: The audit artifact records rules skipped and the reason for each skip, drawn from a machine-checkable reason enum (out-of-phase / out-of-scope-by-trigger / superseded / explicitly-waived)

### Enforcement Boundary

- [x] **ENF-01**: Governance state (selection decisions and audit records) persists to disk under `.planning/governance/` and survives context compaction and subagent boundaries

## v2 Requirements

Deferred to the Govern milestone. Tracked but not in the current roadmap.

### Governance Gates

- **GATE-03**: At the plan gate, the overlay checks requirements, risks, acceptance criteria, and impacted modules against selected rules
- **GATE-04**: At the verify gate, the overlay runs tests, linting, security scans, and policy checks through enforcement adapters
- **GATE-05**: At the ship gate, the overlay checks audit records, approvals, rollback plan, and test evidence before release

### Audit Artifacts

- **AUDIT-03**: The audit artifact records which requirements were covered
- **AUDIT-04**: The audit artifact records which tests were executed, derived from test-runner output
- **AUDIT-05**: The audit artifact records remaining risks
- **AUDIT-06**: The audit artifact records approvals required and who granted them

### Enforcement Boundary

- **ENF-02**: Tool-agnostic gate contracts (JSON Schema, draft 2020-12) define gate-request, gate-result, and audit shapes any CI/SAST/policy engine can satisfy
- **ENF-03**: A single `GateAdapter` interface plus no-op stubs (CI / SAST / test-runner / policy-as-code / human-approval) let an org wire its own engine without touching core
- **ENF-04**: Binding rules route their enforcement through a named contract, and the audit records which adapter returned pass/fail for each

### Selection & Injection

- **SEL-06**: A selection-quality evaluation harness measures recall/precision against a labeled corpus over time (the labeled eval *set* itself lands in v1 as SEL-01's acceptance evidence; the standing *harness* is v2)

### Human-in-the-Loop

- **APPR-01**: A human approval checkpoint schema captures explicit sign-off for governed changes, recorded in the audit artifact

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Markdown steering treated as hard enforcement | LLM-mediated "enforcement" is non-deterministic and bypassable; binding enforcement must route to CI/SAST/tests/policy-as-code/human approval via contracts |
| Copying the full rule corpus into every request | The exact context-bloat anti-pattern this project exists to eliminate (AI-DLC's own landing-zone delivery) |
| Concrete enforcement integrations (OPA/Rego, specific SAST, GitHub Actions) as first-class | Vendor lock-in and maintenance surface; ship tool-agnostic contracts + adapter stubs only |
| Forking or rewriting GSD Core internals | Breaks upstream upgradability; the overlay ships as a declarative capability against GSD's documented seam |
| Embeddings / vector-based rule selection | Non-deterministic, unexplainable — breaks the auditability the layer exists to provide; deterministic trigger/scope/phase matching instead |
| Auto-approving low-risk changes | Erodes the human-in-the-loop tenet auditors rely on; risk-tier the depth of checks, not the existence of a human record |
| Rule authoring UI / rule marketplace | Massive scope expansion orthogonal to the core value; rules are authored as files |
| One global "compliance score" | Collapses distinct rules/severities into a misleading metric that hides skipped rules; keep per-rule status |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PACK-01 | Phase 1 | Complete |
| PACK-02 | Phase 1 | Complete |
| PACK-03 | Phase 1 | Complete |
| PACK-04 | Phase 1 | Complete |
| SEL-01 | Phase 2 | Complete |
| SEL-02 | Phase 3 | Complete |
| SEL-03 | Phase 3 | Complete |
| SEL-04 | Phase 2 | Complete |
| SEL-05 | Phase 2 | Complete |
| GATE-01 | Phase 4 | Pending |
| GATE-02 | Phase 4 | Complete |
| AUDIT-01 | Phase 5 | Pending |
| AUDIT-02 | Phase 5 | Pending |
| ENF-01 | Phase 4 | Complete |

**Coverage:**

- v1 requirements: 14 total
- Mapped to phases: 14 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-05*
*Last updated: 2026-07-05 after roadmap creation (traceability mapped)*
