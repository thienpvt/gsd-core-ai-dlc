# Roadmap: GSD Governance Overlay (AI-DLC × GSD Core)

## Milestones

- ✅ **v1.0 Core** Phases 1-5 (shipped 2026-07-06) proves anti-bloat premise end-to-end
- 📋 **v2.0 Govern** Phases 6-10 — remaining gates, full audit record, approval schema, enforcement contracts, selection-quality harness (not started)

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

### 📋 v2.0 Govern (Planned)

The Govern milestone extends the validated Core to full enterprise SDLC control: remaining GSD loop gates, a complete audit record, tool-agnostic enforcement contracts with adapter stubs, a human approval checkpoint, and a standing selection-quality harness — all layered on v1's selection/injection/audit foundation without re-opening the context window.

Phase numbering continues at 6 (no reset). First phase owns the v1.0 tech-debt fold-in atomically before new gate surface opens a fresh debt surface. Requirements live in `.planning/REQUIREMENTS.md`.

- [x] **Phase 6: v1.0 Tech-Debt Fold-In** - Pay down 9 v1.0 debt items (3 correctness, 6 hygiene) before new gate surface opens (completed 2026-07-06)
- [x] **Phase 7: Enforcement Contracts & Adapter Stubs** - JSON Schema gate contracts + GateAdapter interface + no-op stubs named after AI-DLC-implied tools (completed 2026-07-07)
- [x] **Phase 8: Remaining Gate Hooks** - Plan, verify, and ship gates consume Phase 7 contracts and produce per-rule pass/fail records (completed 2026-07-07)
- [ ] **Phase 9: Complete Audit Record & Approval** - Audit artifact records requirements, tests, risks, approvals; human approval flows through contracts
- [ ] **Phase 10: Selection-Quality Harness** - Standing recall/precision harness against the labeled eval set as a repeatable auditable check

## Phase Details

### Phase 6: v1.0 Tech-Debt Fold-In

**Goal**: The v1.0 codebase is hardened (3 correctness fixes + 6 hygiene cleanups + config namespacing) so the new gate surface in Phases 7-10 opens on a clean foundation rather than compounding existing debt.
**Depends on**: Nothing (first v2.0 phase; v1.0 milestone shipped)
**Requirements**: TD-01, TD-02, TD-03, TD-04, TD-05, TD-06, TD-07, TD-08, TD-09
**Success Criteria** (what must be TRUE):

  1. `assertTimestamp` rejects non-ISO 8601 shapes (e.g. `"2026/07/06"`) in audit records, so malformed timestamps cannot enter the audit trail (TD-01).
  2. A consent-gated integration test renders `verify:post` post-consent and asserts the audit hook fires — covering the `onError:halt` silent-failure path (TD-02).
  3. Concurrent writers to a governance artifact do not clobber each other — `atomicWriteText` uses a unique temp suffix (PID/counter) before atomic rename (TD-03).
  4. `gsd-tools` no longer emits warnings on unrelated config keys (`tavily_search`, `ref_search`, `perplexity`, `jina`, `quick_branch_template`) — governance keys are namespaced or split (TD-09).
  5. Hygiene items are merged: unified `selector_reason` validation shape (TD-04), `isDirectRun` narrowed to the dist entry path (TD-05), `buildAuditRecord` export narrowed to module-internal (TD-06), `writeGovernanceAudit` returns the resolved absolute path (TD-07), `resolveGsdTools` handles the `undefined` fallback explicitly (TD-08).

**Plans**: 3/3 plans complete

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Extract shared atomicWriteFile helper with unique temp suffix; delegate atomicWriteText/atomicWriteJson (TD-03)
- [x] 06-03-PLAN.md — Namespace config keys, consent-gated verify:post integration test, explicit resolveGsdTools fallback (TD-02, TD-08, TD-09)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — Tighten assertTimestamp to ISO 8601, unify selector_reason, narrow isDirectRun, de-export buildAuditRecord, return resolved path (TD-01, TD-04, TD-05, TD-06, TD-07)

### Phase 7: Enforcement Contracts & Adapter Stubs

**Goal**: Tool-agnostic JSON Schema (draft 2020-12) contracts for gate-request, gate-result, and audit-artifact shapes are published with a single `GateAdapter` interface and reference no-op/echo stubs named after AI-DLC-implied tools, so any CI/SAST/policy/human-approval engine can be wrapped to produce schema-valid output — with no vendor lock-in.
**Depends on**: Phase 6 (debt folded before new contract surface opens)
**Requirements**: ENF-02, ENF-03, ENF-04
**Success Criteria** (what must be TRUE):

  1. JSON Schema (draft 2020-12) documents define the gate-request, gate-result, and audit-artifact shapes, and Ajv validates each at runtime so malformed adapter output hard-fails rather than silently corrupting the audit trail (ENF-02).
  2. A single `GateAdapter` TypeScript interface (`evaluate(request) → Promise<GateResult>`) ships with reference no-op/echo stubs named semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, and human-approval — as stubs, not first-class integrations (ENF-03).
  3. Binding rules route enforcement through the named gate contracts; markdown steering stays advisory, and the boundary between advisory context and binding enforcement is explicit in the contracts (ENF-04).

**Plans**: 4/4 plans complete

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Publish 3 JSON Schema (draft 2020-12) contract files + enforcement TypeScript types (GateId, GateRequest, GateResult, GateFinding) + schema-compile smoke test

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Implement validateGateResult assert (Ajv 2020 runtime validator, 4th instance of the validate.ts pattern) — ENF-02 integrity gate (TDD)
- [x] 07-03-PLAN.md — Implement GateAdapter interface + noopAdapter/echoAdapter factories + 7 named stubs + static ADAPTERS/ECHO_ADAPTERS Maps — ENF-03 (TDD)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-04-PLAN.md — Implement runAdapter hard-fail boundary wrapper + append malformed-fixture contract tests — ENF-02 + ENF-04 boundary (TDD)

### Phase 8: Remaining Gate Hooks

**Goal**: The plan, verify, and ship gates consume the Phase 7 contracts and produce per-rule pass/fail records, completing the GSD loop coverage so every step from discuss through ship is governed.
**Depends on**: Phase 7 (gates consume the contracts + adapter stubs)
**Requirements**: GATE-03, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):

  1. At the plan gate, the overlay surfaces rules relevant to requirements, risks, acceptance criteria, and impacted modules into the planner's context — summary-only, via the same selection engine as discuss/execute (GATE-03).
  2. At the verify gate, the overlay collects verification evidence (tests run, lint, scans, policy) through enforcement adapters and records pass/fail per rule (GATE-04).
  3. At the ship gate, the overlay checks audit records, approvals, rollback plan, and test evidence before release and blocks on incomplete prior gates (GATE-05).

**Plans**: 5/5 plans complete

- [x] 08-01-PLAN.md
- [x] 08-02-PLAN.md
- [x] 08-03-PLAN.md
- [x] 08-04-PLAN.md
- [x] 08-05-PLAN.md

### Phase 9: Complete Audit Record & Approval

**Goal**: The audit artifact records the full enterprise SDLC evidence set — requirements covered, tests executed (from real runner output), remaining risks, approvals required and granted — and human approval decisions flow through the tool-agnostic contract layer.
**Depends on**: Phase 8 (audit consumes the gate pass/fail records)
**Requirements**: AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06, APPR-01
**Success Criteria** (what must be TRUE):

  1. The audit artifact records which REQ-IDs the phase work addressed (AUDIT-03).
  2. The audit artifact records tests executed and their results, derived from real test-runner output (not model narration) (AUDIT-04).
  3. The audit artifact records remaining risks known at ship time (AUDIT-05).
  4. The audit artifact records approvals required and who granted them (AUDIT-06).
  5. A human approval checkpoint schema captures approval requests, the approver, the artifact under approval, and the decision — produced and consumed through the tool-agnostic contract layer (APPR-01).

**Plans**: 4 plans

Plans:
**Wave 1**

- [ ] 09-01-PLAN.md — Approval store + schema + validator (APPR-01) — clone gate-evidence-store + validate-gate-result patterns; approval.schema.json + validate-approval.ts + approval-store.ts + paths.ts extension
- [ ] 09-02-PLAN.md — Test-evidence capture (AUDIT-04) — TAP summary parser for node --test output + durable store under .planning/governance/tests/{NN}.json + test-evidence.schema.json

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 09-03-PLAN.md — Audit enrichment + v2 bump (AUDIT-03/05/06) — audit-enrich.ts pure helpers (REQ-IDs from traceability, risks from VERIFICATION/CONTEXT, approval summary) + audit-artifact v2 schema bump + buildAuditRecord enrichment hook + v1 byte-stability test
- [ ] 09-04-PLAN.md — Ship-gate approval blocking + capability manifest (AUDIT-06/APPR-01) — readApprovalOrFail + assertNoBlockingApprovals + writePendingApproval in ship-gate-hook.ts + capability.json produces/consumes extension

### Phase 10: Selection-Quality Harness

**Goal**: A standing recall/precision harness exercises the selection engine against the labeled eval set and reports under-injection (critical recall) and over-injection (precision) as a repeatable, auditable check that validates the whole governance pipeline.
**Depends on**: Phase 9 (harness validates selection quality after the full gate/audit pipeline is in place)
**Requirements**: SEL-06
**Success Criteria** (what must be TRUE):

  1. Running the harness against the labeled eval set produces a recall/precision report covering the selection engine's behavior across the eval cases (SEL-06).
  2. The harness flags under-injection (critical-recall misses) and over-injection (precision drops) loudly enough to block a ship on regression (SEL-06).
  3. The harness is repeatable and auditable — its output can be archived as governance evidence alongside the audit artifact (SEL-06).

**Plans**: TBD

## Progress

**Execution Order:**
v1.0 Phases 1 → 2 → 3 → 4 → 5 (shipped 2026-07-06).
v2.0 Phases execute in numeric order: 6 → 7 → 8 → 9 → 10.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Rule-Pack Format & Index | v1.0 | 4/4 | Complete | 2026-07-05 |
| 2. Selection Engine | v1.0 | 3/3 | Complete | 2026-07-05 |
| 3. Summary Injection & Lazy Detail Loading | v1.0 | 2/2 | Complete | 2026-07-06 |
| 4. GSD Capability Integration & Persistence | v1.0 | 3/3 | Complete | 2026-07-06 |
| 5. Audit-Artifact Writer | v1.0 | 2/2 | Complete | 2026-07-06 |
| 6. v1.0 Tech-Debt Fold-In | v2.0 | 3/3 | Complete    | 2026-07-06 |
| 7. Enforcement Contracts & Adapter Stubs | v2.0 | 4/4 | Complete    | 2026-07-07 |
| 8. Remaining Gate Hooks | v2.0 | 5/5 | Complete    | 2026-07-07 |
| 9. Complete Audit Record & Approval | v2.0 | 0/4 | Not started | - |
| 10. Selection-Quality Harness | v2.0 | 0/? | Not started | - |

---
*See `.planning/MILESTONES.md` for shipped-milestone summary and `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 phase detail.*
*Last updated: 2026-07-06 — v2.0 Govern roadmap defined (Phases 6-10).*
