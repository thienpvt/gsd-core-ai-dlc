# GSD Governance Overlay (AI-DLC × GSD Core)

## What This Is

A working extension to GSD Core that layers AI-DLC-style enterprise SDLC governance onto GSD's long-running development runtime — without polluting the context window. GSD Core stays the runtime brain (`.planning/`, roadmap, state, phase/execution loop); AI-DLC contributes a governance overlay delivered as indexed, on-demand **rule packs**. Instead of injecting all steering markdown into every request, a selection engine picks only the rules relevant to the current task and phase and injects short summaries, loading full rule detail only when truly needed. It is for teams who want AI-driven development at scale while preserving enterprise compliance, auditability, and human approval gates.

## Core Value

The rule selection engine correctly injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat. If this fails, the entire premise fails.

## Requirements

### Validated

- [x] Rule-pack format: rules organized by enterprise / domain / project scope, each carrying an index, trigger condition, applicable phase(s), and severity — **Validated in Phase 1: Rule-Pack Format & Index** (PACK-01..04: frontmatter schema + Ajv validation, scope precedence project>domain>enterprise, binding-without-contract build rejection, body-free `rule-index.json`)
- [x] Rule selection engine: given a task + phase, select only matching rules and emit their summaries (not full bodies) — **Validated in Phase 2: Selection Engine** (SEL-01/04/05: deterministic `select()` over the index with per-rule select/skip reasons, `governance select` CLI, a labeled eval set gating 100% `critical` recall, and a per-request token budget with a loud never-truncate overflow signal)
- [x] Summary injection + on-demand detail: summaries injected into the working context (never bodies), and full rule text fetched only when a summary is insufficient — **Validated in Phase 3: Summary Injection & Lazy Detail Loading** (SEL-02/03: `renderInjection()` rendering a body-free `<governance>` fragment by construction, `governance inject` CLI honoring the budget signal, `governance rule-detail <id>` lazy-fetching one body through a single-sourced traversal-guarded resolver with build-time detailPath validation)
- [x] Consent-gated GSD capability integration and persisted governance state: project overlay registers discuss/execute hooks only after CB-3 user consent, discuss computes and persists selection state, execute reloads it without re-deriving — **Validated in Phase 4: GSD Capability Integration & Persistence** (GATE-01/02 + ENF-01: loader-driven consent test, live `render-hooks` verification, atomic `.planning/governance/selection-state.json`, boundary reload test)

### Active

- [ ] Remaining GSD gate hooks beyond v1: plan (requirements, risks, acceptance criteria, impacted modules), verify (tests, lint, security scans, policy checks), ship (audit records, approvals, rollback plan, test evidence)
- [ ] Tool-agnostic gate contracts + audit schemas that any CI/SAST/policy engine can satisfy, with pluggable adapter stubs (no engine lock-in)
- [ ] Audit-artifact generation recording: requirements covered, rules applied, rules skipped + reasons, tests executed, remaining risks, approvals required
- [ ] Enforcement boundary honored: markdown steering is advisory context; critical enforcement is delegated to CI/CD, SAST, tests, policy-as-code, and human approval via the contracts

### Out of Scope

- Forking or rewriting GSD Core internals — this is an overlay/extension, not a fork (keeps upstream GSD upgradable)
- Shipping concrete enforcement integrations (OPA/Rego, specific SAST tools, GitHub Actions) as first-class — contracts + stubs only, so no vendor lock-in
- Treating markdown steering as hard enforcement — deliberately rejected; enforcement lives in real gates
- Copying the full AI-DLC steering corpus into context per request — the exact anti-pattern this project exists to eliminate

## Context

- Two source systems inform the design:
  - **GSD Core** (https://github.com/open-gsd/gsd-core) — the runtime for context management, phase/state tracking, planning, execution, verification, shipping. Provides `.planning/`, roadmap, STATE.md, and the execution loop this overlay hooks into.
  - **AI-DLC Workflows** (https://github.com/awslabs/aidlc-workflows) — the governance model: SDLC control, enterprise rules, compliance checks, approval checkpoints, audit artifacts. Contributes the rule semantics, not its delivery mechanism.
- The central problem: naïvely injecting all AI-DLC steering markdown per request causes context bloat and degrades the long-running loop. The solution is indexing + trigger-based selection + summary injection + lazy detail loading.
- Governance must survive context compaction and long-running work, so audit artifacts and rule-selection state need to be persisted, not held only in context.

## Constraints

- **Architecture**: Overlay on GSD Core, not a fork — must hook GSD's existing discuss/plan/execute/verify/ship loop cleanly and stay upgrade-safe
- **Context budget**: Per-request injection must be summaries-only; full rule bodies load on demand — this is the defining constraint, not a nice-to-have
- **Enforcement**: Markdown is advisory; binding enforcement must route through CI/CD, SAST, tests, policy-as-code, and human approval via tool-agnostic contracts
- **Portability**: Gate contracts and audit schemas must be engine-neutral with adapter stubs — no hard dependency on any specific policy/scan vendor
- **Auditability**: Every governed task must be able to produce a complete, review-ready audit artifact

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD Core = runtime, AI-DLC = governance overlay | Separation of concerns; keeps GSD upgradable and governance pluggable | — Pending |
| Deliverable is a working GSD extension (not a design doc) | User needs runnable tooling: rule packs, selection engine, hooks, audit generation | — Pending |
| Rule selection engine is the riskiest core to build first | If summary selection is wrong, the anti-bloat premise collapses | ✓ Validated (Phase 2) — deterministic `select()` + per-rule reasons + eval set gating 100% critical recall + token budget shipped |
| Tool-agnostic gate contracts + adapter stubs | Broadest applicability, avoids vendor lock-in for enforcement | — Pending |
| Rules scoped enterprise / domain / project, indexed by trigger + phase + severity | Enables precise, minimal selection per task | ✓ Validated (Phase 1) — frontmatter format + scope precedence + body-free index shipped |
| Markdown steering is advisory, not enforcement | Real enforcement belongs in CI/SAST/tests/policy-as-code/human approval | — Pending |
| Project-scope overlay activation uses user-owned CB-3 consent bound to bundle hash | Keeps project overlays discoverable in git while preventing untrusted or tampered hook activation | ✓ Validated (Phase 4) — `.gsd-capabilities.json` is discoverability; consent store outside repo is activation authority |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-06 after Phase 4 completion (GSD Capability Integration & Persistence)*
