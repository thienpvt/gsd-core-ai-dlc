# GSD Governance Overlay (AI-DLC × GSD Core)

## What This Is

A working extension to GSD Core that layers AI-DLC-style enterprise SDLC governance onto GSD's long-running development runtime — without polluting the context window. GSD Core stays the runtime brain (`.planning/`, roadmap, state, phase/execution loop); AI-DLC contributes a governance overlay delivered as indexed, on-demand **rule packs**. Instead of injecting all steering markdown into every request, a selection engine picks only the rules relevant to the current task and phase and injects short summaries, loading full rule detail only when truly needed. It is for teams who want AI-driven development at scale while preserving enterprise compliance, auditability, and human approval gates.

## Core Value

The rule selection engine correctly injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat. If this fails, the entire premise fails.

## Current Milestone: v2.0 Govern (SHIPPED 2026-07-08)

**Goal:** Extend the validated Core to full enterprise SDLC control — remaining gate hooks, a complete audit record, tool-agnostic enforcement contracts with adapter stubs, and a human approval checkpoint — all layered on v1's selection/injection/audit foundation without re-opening the context window.

**Shipped features (21/21 requirements validated):**
- Folded 9 v1.0 tech-debt items (3 correctness: TD-01/02/03; 6 hygiene: TD-04..09) into Phase 6 before the new gate surface opened
- Remaining GSD gate hooks: plan gate (GATE-03), verify gate (GATE-04), ship gate (GATE-05) — all producing durable per-gate evidence under `.planning/governance/gates/`
- Complete audit record: AUDIT-03 (requirements covered), AUDIT-04 (tests executed from real `node --test` TAP), AUDIT-05 (remaining risks), AUDIT-06 (approvals) — audit-artifact v2 with 4 optional enrichment fields + v1 byte-stability
- Tool-agnostic enforcement contracts: ENF-02 (draft 2020-12 JSON Schema gate contracts + Ajv runtime validation), ENF-03 (`GateAdapter` interface + 7 no-op/echo stubs — semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval), ENF-04 (`runAdapter` hard-fail boundary + `x-binding` advisory/binding split)
- SEL-06 standing recall/precision harness (`governance eval` CLI, ship-blocking critical-recall ===1.0 floor, corpus-hash determinism, durable eval evidence)
- APPR-01 human approval checkpoint schema + durable approval store + ship-gate fail-closed on pending/rejected

**Phase numbering:** continues at 6 (no reset). 5 phases / 19 plans / 40 tasks. 417 tests, 0 fail.

**Milestone audit:** `passed` — see `.planning/v2.0-MILESTONE-AUDIT.md` (21/21 reqs, 5/5 phases, 9/9 integration, 7/7 E2E flows, 5/5 Nyquist-compliant). One documented upstream-only deferred item (capability manifest `consumes` extension blocked by installed gsd-core `bundleContentHash` constraint — outside this repo).

## Next Milestone Goals

_(Not yet defined. Run `/gsd-new-milestone` to start the next milestone: questioning → research → requirements → roadmap. Candidate areas from v2.0 deferred items: real scanner/policy integrations beyond no-op stubs, dynamic adapter loading, operations-phase (deploy/monitor) governance (OPS-01), capability manifest `consumes` coordination with gsd-core upstream.)_

## Requirements

### Validated

- [x] Rule-pack format: rules organized by enterprise / domain / project scope, each carrying an index, trigger condition, applicable phase(s), and severity — **Validated in Phase 1: Rule-Pack Format & Index** (PACK-01..04: frontmatter schema + Ajv validation, scope precedence project>domain>enterprise, binding-without-contract build rejection, body-free `rule-index.json`)
- [x] Rule selection engine: given a task + phase, select only matching rules and emit their summaries (not full bodies) — **Validated in Phase 2: Selection Engine** (SEL-01/04/05: deterministic `select()` over the index with per-rule select/skip reasons, `governance select` CLI, a labeled eval set gating 100% `critical` recall, and a per-request token budget with a loud never-truncate overflow signal)
- [x] Summary injection + on-demand detail: summaries injected into the working context (never bodies), and full rule text fetched only when a summary is insufficient — **Validated in Phase 3: Summary Injection & Lazy Detail Loading** (SEL-02/03: `renderInjection()` rendering a body-free `<governance>` fragment by construction, `governance inject` CLI honoring the budget signal, `governance rule-detail <id>` lazy-fetching one body through a single-sourced traversal-guarded resolver with build-time detailPath validation)
- [x] Consent-gated GSD capability integration and persisted governance state: project overlay registers discuss/execute hooks only after CB-3 user consent, discuss computes and persists selection state, execute reloads it without re-deriving — **Validated in Phase 4: GSD Capability Integration & Persistence** (GATE-01/02 + ENF-01: loader-driven consent test, live `render-hooks` verification, atomic `.planning/governance/selection-state.json`, boundary reload test)
- [x] Audit-artifact generation: for every governed task the system produces a machine-derived audit artifact recording which rules applied and which were skipped, each skip reason drawn from a machine-checkable enum, and the record reproducible — **Validated in Phase 5: Audit-Artifact Writer** (AUDIT-01/02: deterministic `writeGovernanceAudit` building `GOVERNANCE.md` from persisted `selection-state.json` (no selector/risk/narration imports), `AUDIT_SKIP_REASONS` enum rejecting out-of-enum reasons with `selector_reason` provenance, byte-identical regeneration, `verify:post` capability step wired via `.gsd/capabilities/aidlc-governance/capability.json`)
- [x] Tool-agnostic gate contracts + audit schemas that any CI/SAST/policy engine can satisfy, with pluggable adapter stubs (no engine lock-in) — **Validated in Phase 7: Enforcement Contracts & Adapter Stubs** (ENF-02/03/04: draft 2020-12 gate-request/gate-result/audit-artifact schemas, Ajv runtime hard-fail for malformed adapter output, `GateAdapter` + 7 no-op/echo stubs, and `runAdapter` as the binding boundary)
- [x] Enforcement boundary honored: markdown steering is advisory context; critical enforcement is delegated to CI/CD, SAST, tests, policy-as-code, and human approval via the contracts — **Validated in Phase 7: Enforcement Contracts & Adapter Stubs** (`x-binding` marks gate request/result as binding and audit artifact as advisory; frontmatter schema requires named `enforcement` for binding rules; Phase 8 consumes the boundary in live gate hooks)
- [x] Remaining GSD gate hooks beyond v1: plan, verify, and ship are registered in the capability host and produce durable gate evidence — **Validated in Phase 8: Remaining Gate Hooks** (GATE-03/04/05: `planHook` derives planner signals and writes plan evidence, `verifyGateHook` routes through `runAdapter` and derives per-rule statuses, `shipGateHook` blocks missing/malformed/failing prior evidence, and capability consent/render-hooks tests prove `plan:pre`, `verify:post`, and `ship:pre` wiring)
- [x] Complete audit record and human approval: requirements covered, test results from real runner output, remaining risks, approvals required/granted, and APPR-01 approval schema — **Validated in Phase 9: Complete Audit Record & Approval** (AUDIT-03/04/05/06 + APPR-01: audit-artifact v2 with optional `requirements_covered`/`tests_executed`/`remaining_risks`/`approvals` fields + v1 byte-stability, `approval.schema.json` + `approval-store.ts` durable lifecycle, `capture-test-evidence.ts` wiring real `node --test` TAP into `tests/{NN}.json`, ship-gate fail-closed on pending/rejected approvals)
- [x] Standing selection-quality harness for recall/precision regression reporting — **Validated in Phase 10: Selection-Quality Harness** (SEL-06: `governance eval` CLI + `eval-cli.ts` wrapping pure `eval-harness.ts` runCases/aggregate, `eval-report.schema.json` (draft 2020-12 + x-binding) + Ajv validation, durable evidence under `eval/{NN}.json` + `{NN}-report.md`, critical-recall ===1.0 ship-blocking floor (D-05), precision reported-not-blocked (D-06), corpus-hash determinism, ship-gate forward-scoped to phase ≥ 10)

### Active

_(All v2.0 requirements validated — milestone ready for completion.)_

### Out of Scope

- Forking or rewriting GSD Core internals — this is an overlay/extension, not a fork (keeps upstream GSD upgradable)
- Shipping concrete enforcement integrations (OPA/Rego, specific SAST tools, GitHub Actions) as first-class — contracts + stubs only, so no vendor lock-in
- Treating markdown steering as hard enforcement — deliberately rejected; enforcement lives in real gates
- Copying the full AI-DLC steering corpus into context per request — the exact anti-pattern this project exists to eliminate

## Context

- **Shipped v1.0 (2026-07-06):** 13,378 LOC TypeScript (8,141 src + 5,237 test), 178 tests passing (0 fail), across 5 phases / 14 plans / 38 tasks over 2 days. The anti-bloat premise is validated end-to-end: rule packs → deterministic selection → summary-only injection → lazy detail → consent-gated persistence → reproducible audit.
- Two source systems informed the design:
  - **GSD Core** (https://github.com/open-gsd/gsd-core) — the runtime for context management, phase/state tracking, planning, execution, verification, shipping. Provides `.planning/`, roadmap, STATE.md, and the execution loop this overlay hooks into.
  - **AI-DLC Workflows** (https://github.com/awslabs/aidlc-workflows) — the governance model: SDLC control, enterprise rules, compliance checks, approval checkpoints, audit artifacts. Contributes the rule semantics, not its delivery mechanism.
- The central problem: naïvely injecting all AI-DLC steering markdown per request causes context bloat and degrades the long-running loop. The solution is indexing + trigger-based selection + summary injection + lazy detail loading.
- Governance must survive context compaction and long-running work, so audit artifacts and rule-selection state are persisted to `.planning/governance/`, not held only in context.
- Known tech debt (advisory, non-blocking): see `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — 8 Phase 5 hardening items (WR-01..05, IN-01..03) + 1 cross-phase config-namespacing item, deferred to v2.
- **Phase 6 complete (2026-07-06):** v1.0 tech-debt folded — 3 correctness fixes (TD-01 strict ISO-8601 `assertTimestamp`, TD-02 consent-gated `verify:post` onError:halt test, TD-03 shared `atomicWriteFile` with PID+UUID suffix eliminating the concurrent-write race) + 6 hygiene cleanups (TD-04 unified `selector_reason` shape, TD-05 `isDirectRun` narrowed to dist entry, TD-06 `buildAuditRecord` de-exported, TD-07 `writeGovernanceAudit` returns resolved absolute path, TD-08 `resolveGsdTools` explicit `string|null` fallback, TD-09 config keys namespaced so gsd-tools no longer warns). 193 tests, 0 fail. Phases 7-10 open on a clean foundation.
- **Phase 7 complete (2026-07-07):** enforcement contracts and adapter boundary shipped — ENF-02/03/04 satisfied by draft 2020-12 gate schemas, strict Ajv validation, `GateAdapter` + semgrep/bandit/checkov/grype/gitleaks/generic-exit-ci/human-approval no-op and echo stubs, and `runAdapter` hard-fail validation before consumers see gate results. 262 tests, 259 pass, 0 fail, 3 skipped. Phase 8 now owns consuming `ADAPTERS` and `runAdapter` in plan/verify/ship hooks.
- **Phase 8 complete (2026-07-07):** remaining gate hooks shipped — GATE-03/04/05 satisfied by fixed gate evidence files under `.planning/governance/gates/{NN}-{gate}.json`, `planHook` summary-only planner context, `verifyGateHook` adapter-boundary evidence plus per-rule statuses, `shipGateHook` fail-closed prior-gate checks, and capability manifest wiring for `plan:pre`, `verify:post`, and `ship:pre`. 289 tests, 286 pass, 0 fail, 3 skipped. Phase 9 now owns complete audit record, APPR-01 approval, rollback, and audit enrichment.
- **Phase 9 complete (2026-07-08):** complete audit record and human approval shipped — AUDIT-03/04/05/06 + APPR-01 satisfied by `audit-artifact.ts` v2 (4 optional fields appended after the existing 7, `schema_version` 1→2, v1 byte-stable), `approval.schema.json` + `approval-store.ts` durable pending→decided lifecycle, `test-evidence.schema.json` + `test-evidence.ts` + `capture-test-evidence.ts` wiring real `node --test --test-reporter=tap` output into `tests/{NN}.json` (D-03/D-04 narration/malformed hard-fail enforced in the production path), and `ship-gate-hook.ts` fail-closed on pending/rejected approvals (D-07 anti-auto-approve, D-08 GATE-05 mirror). One deferred item: capability manifest `consumes` extension blocked by installed gsd-core `bundleContentHash`/`validateConsumesGlobal` consent constraint (outside this repo). 381 tests, 378 pass, 0 fail, 3 skipped. Phase 10 now owns the standing selection-quality harness.
- **Phase 10 complete (2026-07-08):** selection-quality harness shipped — SEL-06 satisfied by `src/select/eval-cli.ts` (CLI producer wrapping pure `eval-harness.ts` `runCases`/`aggregate` over `buildIndex(test/fixtures/eval/eval-rules)` + `eval-cases.json`), `src/governance/eval-evidence.ts` durable store under `.planning/governance/eval/{NN}.json` + `{NN}-report.md`, `src/schema/eval-report.schema.json` (draft 2020-12 + x-binding) with Ajv-2020 validation (7th validate instance), `src/cli/commands/eval.ts` + `governance eval` CLI registration + `npm run eval`, and `src/governance/ship-gate-hook.ts` `readEvalOrFail`/`assertNoFailedEval` fail-closed on missing/failed eval evidence (forward-scoped phase ≥ 10, GATE-05 mirror). Critical-recall ===1.0 ship-blocking floor (D-05); precision reported-not-blocked (D-06); corpus-hash determinism (D-14). Two deferred INFO review findings (IN-01 severity union, IN-03 shim double-parse) documented with rationale. 417 tests, 414 pass, 0 fail, 3 skipped. **v2.0 Govern milestone: all 5 phases (6-10) complete.**

## Constraints

- **Architecture**: Overlay on GSD Core, not a fork — must hook GSD's existing discuss/plan/execute/verify/ship loop cleanly and stay upgrade-safe
- **Context budget**: Per-request injection must be summaries-only; full rule bodies load on demand — this is the defining constraint, not a nice-to-have
- **Enforcement**: Markdown is advisory; binding enforcement must route through CI/CD, SAST, tests, policy-as-code, and human approval via tool-agnostic contracts
- **Portability**: Gate contracts and audit schemas must be engine-neutral with adapter stubs — no hard dependency on any specific policy/scan vendor
- **Auditability**: Every governed task must be able to produce a complete, review-ready audit artifact

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD Core = runtime, AI-DLC = governance overlay | Separation of concerns; keeps GSD upgradable and governance pluggable | ✓ Validated (v1.0) — overlay shipped as a declarative `capability.json` hooking GSD's discuss/execute/verify:post; no second runtime introduced |
| Deliverable is a working GSD extension (not a design doc) | User needs runnable tooling: rule packs, selection engine, hooks, audit generation | ✓ Validated (v1.0) — `governance build-index`/`select`/`inject`/`rule-detail` CLI + audit writer all runnable end-to-end |
| Rule selection engine is the riskiest core to build first | If summary selection is wrong, the anti-bloat premise collapses | ✓ Validated (Phase 2) — deterministic `select()` + per-rule reasons + eval set gating 100% critical recall + token budget shipped |
| Tool-agnostic gate contracts + adapter stubs | Broadest applicability, avoids vendor lock-in for enforcement | ✓ Validated (Phase 7) — gate-request/gate-result/audit-artifact schemas + `GateAdapter` + 7 no-op/echo stubs shipped; `runAdapter` validates adapter output before consumers receive it |
| Durable per-gate evidence files | Plan, verify, and ship gates need stable cross-step artifacts that survive context compaction and can be consumed by ship/audit phases | ✓ Validated (Phase 8) — `.planning/governance/gates/{NN}-{plan,verify,ship}.json` read/write path shipped with fail-closed validation |
| Rules scoped enterprise / domain / project, indexed by trigger + phase + severity | Enables precise, minimal selection per task | ✓ Validated (Phase 1) — frontmatter format + scope precedence + body-free index shipped |
| Markdown steering is advisory, not enforcement | Real enforcement belongs in CI/SAST/tests/policy-as-code/human approval | ✓ Contract boundary validated (Phase 7) — `x-binding` separates binding gate contracts from advisory audit artifacts; live gate hook consumption remains Phase 8 scope |
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
*Last updated: 2026-07-08 — v2.0 Govern milestone shipped (21/21 requirements validated, 5 phases, 417 tests green)*
