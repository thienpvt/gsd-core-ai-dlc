# Roadmap: GSD Governance Overlay (AI-DLC × GSD Core)

## Overview

This roadmap delivers Milestone 1 (Core / v1): proving the anti-bloat premise end-to-end. It follows a dependency-forced spine that all research converged on — the rule shape must exist before it can be indexed, the index before selection, selection before injection, and selection before audit (skip-reasons are a byproduct of the selector). Phase 1 lands the rule-pack format and the compiled index everything keys off. Phase 2 builds the selection engine — the Core Value and the riskiest component — with a labeled eval set measuring recall/precision, because the top risk is under-injection (a critical rule silently never firing). Phase 3 completes the anti-bloat mechanism with summary-only injection and lazy detail loading. Phase 4 wires the overlay into GSD as a declarative `capability.json` at the discuss and execute gates and makes governance state durable on disk so it survives context compaction and subagent boundaries. Phase 5 produces the machine-derived audit artifact. Milestone 2 (remaining plan/verify/ship gates, the full audit record, human approval schema, and tool-agnostic enforcement contracts) is deferred and not mapped here.

## Phases

- [x] **Phase 1: Rule-Pack Format & Index** - Author rules as Markdown+frontmatter across three scopes; compile a compact index (completed 2026-07-05)
- [ ] **Phase 2: Selection Engine** - Deterministic trigger+scope+phase matching with a labeled recall/precision eval set
- [ ] **Phase 3: Summary Injection & Lazy Detail Loading** - Inject summaries only; load full rule bodies on demand by id
- [ ] **Phase 4: GSD Capability Integration & Persistence** - Register discuss/execute gate hooks as a capability; persist governance state to disk
- [ ] **Phase 5: Audit-Artifact Writer** - Produce a machine-derived per-task audit of rules applied and skipped

## Phase Details

### Phase 1: Rule-Pack Format & Index

**Goal**: Rule authors can define governance rules as Markdown-with-YAML-frontmatter across enterprise/domain/project scopes, and the system compiles them into a compact index carrying summaries and pointers but never bodies.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PACK-01, PACK-02, PACK-03, PACK-04
**Success Criteria** (what must be TRUE):

  1. A rule file with valid frontmatter (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`) validates against the frontmatter schema, and a rule missing a required field is rejected with a clear error.
  2. Rules with a colliding `id` across enterprise/domain/project resolve by defined precedence (project > domain > enterprise), verifiable by a test asserting the winning rule.
  3. A rule classified `binding` that names no enforcement contract is rejected at index-build time (the build fails loudly rather than passing silently).
  4. Running the index-builder CLI subcommand emits `rule-index.json` containing summaries and `detailPath` pointers with no full rule bodies present, verifiable by inspecting the artifact.

**Plans**: 4/4 plans complete

Plans:

- [x] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [x] 01-03-PLAN.md
- [x] 01-04-PLAN.md

**Wave 1**

- [x] 01-01: Walking skeleton — project scaffold + `governance` CLI + minimal schema + one real rule → body-free `rule-index.json` + smoke test (PACK-01, PACK-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02: Harden frontmatter schema (full trigger/severity model) + advisory/binding classification (PACK-01, PACK-03)
- [x] 01-03: Rule-pack store layout (enterprise/domain/project) + scope precedence resolution (PACK-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04: Index no-body hardening — output schema + fast-check property + build-time binding rejection + `detailPath` pointer pass-through (PACK-04, PACK-03)

### Phase 2: Selection Engine

**Goal**: Given a task's signals plus the current phase and scope config, the engine deterministically returns exactly the matching rules with a reason for each, proven against a labeled eval set and held within a per-request token budget.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SEL-01, SEL-04, SEL-05
**Success Criteria** (what must be TRUE):

  1. Running `governance select` with task signals + phase returns a set of rule ids each with a reason, and identical inputs always produce identical output (determinism verifiable by a repeated-run test).
  2. For every candidate rule in the index, the output records whether it was selected or skipped and why (selection observability present in the returned data).
  3. A labeled (task, phase) → expected-rules eval set runs against the engine and reports recall/precision, with `critical`/`high` severity rules meeting a stated recall threshold (target: 100% recall on `critical`).
  4. When selected summaries would exceed the per-request governance token budget, the engine surfaces a loud signal, verifiable by a test that trips the budget.
  5. fast-check property tests confirm core invariants (selected rules are always a subset of triggered rules; ordering is stable).

**Plans**: 3/3 plans planned

Plans:

- [ ] 02-01-PLAN.md
- [ ] 02-02-PLAN.md
- [ ] 02-03-PLAN.md

**Wave 1**

- [ ] 02-01: Construct labeled eval set — controlled `eval-rules/` corpus + labeled `(signal, phase, scopeConfig) → expectedRuleIds` cases + ground-truth integrity test (SEL-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-02: Selection pure function `select()` — phase→scope→trigger gate pipeline reusing D-01..D-04, per-rule select/skip reasons, `TaskSignal` schema/validator (SEL-01, SEL-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03: Recall/precision measurement (100% `critical` recall gate + `high` ≥0.9), fast-check invariants, token-budget estimator + loud overflow, `governance select` CLI (SEL-04, SEL-05)

### Phase 3: Summary Injection & Lazy Detail Loading

**Goal**: The system injects only selected rule summaries into the working context for a governed task and loads a single full rule body on demand by id, completing the anti-bloat mechanism.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SEL-02, SEL-03
**Success Criteria** (what must be TRUE):

  1. For a governed task, the injected context fragment contains only selected rule summaries and no full rule bodies, verifiable by inspecting the rendered fragment.
  2. Running `governance rule-detail <id>` returns exactly one full rule body for the requested id and does not pre-fetch any other bodies (lazy load verifiable).
  3. A property test confirms summary-only injection never emits a full body regardless of selection input.

**Plans**: TBD

Plans:

- [ ] 03-01: Summary injector — render selected summaries into a markdown fragment (summaries only)
- [ ] 03-02: Lazy detail loader — `governance rule-detail <id>` fetches a single body by id

### Phase 4: GSD Capability Integration & Persistence

**Goal**: The overlay registers as a declarative GSD capability firing governance at the discuss and execute gates, injects selected summaries into otherwise-empty subagent contexts, and persists governance state to disk so it survives compaction and subagent boundaries.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: GATE-01, GATE-02, ENF-01
**Success Criteria** (what must be TRUE):

  1. A `capability.json` under `.gsd/capabilities/aidlc-governance/` is discovered and validated by GSD's capability loader and registers governance contributions at `discuss:pre` and `execute:pre`, verifiable via `gsd-tools loop render-hooks`.
  2. At the discuss gate, the overlay classifies task type + risk and the rendered hook attaches the relevant rule summaries to the discussion context.
  3. At the execute gate, the selected rule summaries are present in the executor/subagent context fragment (which otherwise inherits nothing).
  4. Selection decisions and state are written under `.planning/governance/` (`selection-state.json` + per-phase dirs) and reload correctly after a simulated compaction/subagent boundary, verifiable by a test that reads state back from disk.

**Plans**: TBD

Plans:

- [ ] 04-01: `capability.json` + fragments registering `discuss:pre` (task type + risk) and `execute:pre` (subagent injection) hooks
- [ ] 04-02: Disk-backed governance ledger under `.planning/governance/` (selection-state + per-phase dirs)
- [ ] 04-03: First-run project-scope consent handling + forced compaction/subagent persistence test

### Phase 5: Audit-Artifact Writer

**Goal**: For every governed task the system produces a machine-derived audit artifact recording which rules applied and which were skipped, with each skip reason drawn from a machine-checkable enum and the record reproducible.
**Mode:** mvp
**Depends on**: Phase 4 (and Phase 2 selection output)
**Requirements**: AUDIT-01, AUDIT-02
**Success Criteria** (what must be TRUE):

  1. Running the audit writer at `verify:post` produces `<phase>/GOVERNANCE.md` whose `rules_applied` field is derived directly from selector output, not model narration, verifiable by comparing it to `selection-state.json`.
  2. The audit records each skipped rule with a reason drawn from the fixed enum (`out-of-phase` / `out-of-scope-by-trigger` / `superseded` / `explicitly-waived`), and a reason outside the enum is rejected.
  3. The audit is reproducible — regenerating it from the same selection state yields identical applied/skipped records.

**Plans**: TBD

Plans:

- [ ] 05-01: Audit writer → `GOVERNANCE.md` with machine-derived `rules_applied` from selector output
- [ ] 05-02: Skip-reason enum enforcement + provenance tags + reproducibility check

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Rule-Pack Format & Index | 4/4 | Complete    | 2026-07-05 |
| 2. Selection Engine | 0/3 | Not started | - |
| 3. Summary Injection & Lazy Detail Loading | 0/2 | Not started | - |
| 4. GSD Capability Integration & Persistence | 0/3 | Not started | - |
| 5. Audit-Artifact Writer | 0/2 | Not started | - |
