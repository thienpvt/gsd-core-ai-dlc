# Roadmap: GSD Governance Overlay (AI-DLC × GSD Core)

## Milestones

- ✅ **v1.0 Core** Phases 1-5 (shipped 2026-07-06) proves anti-bloat premise end-to-end
- ✅ **v2.0 Govern** Phases 6-10 (shipped 2026-07-08) — remaining gates, full audit record, approval schema, enforcement contracts, selection-quality harness
- ✅ **v3.0 Adoption & Hygiene** Phases 11-12 (shipped 2026-07-09) — SUMMARY frontmatter backfill + onboarding/rule-authoring docs
- 🚧 **v4.0 Developer Coding Conventions** Phases 13-18 — Java/Spring domain pack + starter examples + real coverage GateAdapter

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

<details>
<summary>✅ v3.0 Adoption & Hygiene (Phases 11-12) SHIPPED 2026-07-09</summary>

Adoption & Hygiene milestone closes the last v2.0 audit debt (SUMMARY frontmatter) and delivers end-user + rule-author documentation.

- [x] **Phase 11: SUMMARY Frontmatter Hygiene** - Backfill `requirements-completed` on the 6 v2.0 SUMMARYs that omitted it so the 3-source cross-reference is fully satisfied (completed 2026-07-08)
- [x] **Phase 12: Onboarding & Rule-Authoring Docs** - End-user onboarding/install/consent/first-run docs, core governance workflow usage examples, and governance-rule authoring guide (completed 2026-07-09)

Full phase details (goals, success criteria, plans, waves) archived at
`.planning/milestones/v3.0-ROADMAP.md`.

</details>

### v4.0 Developer Coding Conventions (Phases 13-18)

Content + one real adapter. Engine from v1–v3 stays frozen. Ship selectable `java-spring` domain pack, non-indexed starters, and a real consumer-side coverage GateAdapter.

- [x] **Phase 13: Domain Pack + Service Classification + Integrations** - Subscribe-able java-spring pack with summary discipline, Internal vs internet-facing outbound rules, REST/Kafka inbound (completed 2026-07-09)
- [x] **Phase 14: Hexagonal + Tactical DDD Rules** - Path-triggered layering and aggregate/VO/event naming rules (advisory) (completed 2026-07-09)
- [x] **Phase 15: Logging, API Contract & Saga Decision Rules** - Correlation/no-PII logging, OpenAPI/error envelope, saga/outbox when-not-to-use (completed 2026-07-09)
- [ ] **Phase 16: Starter Examples Outside Index** - Thin examples/java-spring/ tree never enters rule-index
- [ ] **Phase 17: Coverage Parser + Binding GateAdapter** - JaCoCo/LCOV stdlib parse, binding ≥70% rule, fail-closed on missing/low coverage
- [ ] **Phase 18: Verify/Ship Wire + Consumer Docs** - Coverage evidence path wired; docs for domain subscribe + report path

## Phase Details

### Phase 13: Domain Pack + Service Classification + Integrations

**Goal**: Team can opt into a `java-spring` domain pack whose rules inject one-sentence summaries only, and bank service/integration boundaries (Internal vs internet-facing outbound, REST/Kafka inbound) select correctly
**Depends on**: Nothing (first v4.0 phase; uses shipped pack/select/inject engine)
**Requirements**: JAVA-PACK-01, JAVA-PACK-02, JAVA-SVC-01, JAVA-SVC-02, JAVA-SVC-03, JAVA-IN-01, JAVA-IN-02
**Success Criteria** (what must be TRUE):

  1. Project can subscribe `domains: ["java-spring"]` and only then receive rules from `aidlc-rules/domain/java-spring/` in select/inject output
  2. Every pack rule summary is one sentence suitable for injection; full prose loads only via `detailPath` / `governance rule-detail`
  3. Selector classifies Internal vs internet-facing context and injects the matching outbound rule (Internal: JDBC/ORM OK; internet-facing: outbound via gateway/WSO2 capability language — vendor names only in rule content, not engine `src/`)
  4. Construction tasks on controller/API paths inject thin-controller REST conventions; listener/consumer paths inject idempotent Kafka conventions with no client types in domain

**Plans**: 2/2 plans complete

Plans:

- [x] 13-01-PLAN.md — TDD RED pack suite (subscription, summary, outbound XOR, inbound path matrices)
- [x] 13-02-PLAN.md — Author four java-spring rules + details, rebuild rule-index.json, GREEN suite

### Phase 14: Hexagonal + Tactical DDD Rules

**Goal**: Construction tasks touching domain/application/adapter or aggregate/entity/event paths receive advisory Hexagonal layering and tactical DDD rules without always-on architecture essays
**Depends on**: Phase 13 (pack root + summary contract)
**Requirements**: JAVA-HEX-01, JAVA-DDD-01
**Success Criteria** (what must be TRUE):

  1. Tasks touching domain/application/adapter paths inject Hexagonal layering: dependencies point inward; domain has no Spring/JPA/framework/gateway types
  2. Tasks involving aggregates/entities/domain events inject tactical DDD: aggregate root per consistency boundary; immutable VOs; past-tense domain event names
  3. Unrelated tasks (e.g. README typo, non-Java paths) do not select HEX/DDD rules (path/taskType triggers, no empty always-on triggers)

**Plans**: 2/2 plans complete

Plans:

- [x] 14-01-PLAN.md — TDD RED hex-ddd suite (path matrices, CR negatives, inject quarantine)
- [x] 14-02-PLAN.md — Author HEX/DDD rules + details, rebuild rule-index.json, GREEN suite

### Phase 15: Logging, API Contract & Saga Decision Rules

**Goal**: Cross-cutting advisory conventions for logging, API contracts, and saga/outbox decisions complete the coding-convention corpus with explicit when-not-to-use guidance
**Depends on**: Phase 13 (pack IA); Phase 14 recommended for id/prefix consistency
**Requirements**: JAVA-LOG-01, JAVA-API-01, JAVA-EVT-01
**Success Criteria** (what must be TRUE):

  1. Relevant tasks inject logging rules: correlation/trace id propagation, no PII/secrets in logs, audit events for state-changing operations
  2. API work injects OpenAPI source-of-truth or generated-and-checked, one versioning policy, and uniform error envelope (`code`, `message`, `correlationId`)
  3. Distributed-workflow tasks inject saga/outbox/domain-event decision rules including explicit when-NOT-to-use (no saga cargo-cult on single-service ACID)

**Plans**: 2/2 plans complete

Plans:

- [x] 15-01-PLAN.md — TDD RED log-api-evt suite (path matrices, bare-needle negatives, inject quarantine)
- [x] 15-02-PLAN.md — Author LOG/API/EVT rules + details, rebuild rule-index.json, inventory 7→10, GREEN suite

### Phase 16: Starter Examples Outside Index

**Goal**: LLM can mirror a thin Java/Spring starter layout and snippets without those files ever becoming selectable governance rules
**Depends on**: Phases 13–15 (rules that detail may point at examples exist first)
**Requirements**: JAVA-EX-01, JAVA-EX-02
**Success Criteria** (what must be TRUE):

  1. `examples/java-spring/` ships folder layout plus thin snippets (ports, adapters, handlers, REST, Kafka) outside rule-index scan roots
  2. `build-index` / load path never treats starter content under `examples/` as selectable rules (layout proof and/or explicit guard)

**Plans**: TBD

### Phase 17: Coverage Parser + Binding GateAdapter

**Goal**: Binding unit-test line coverage ≥70% is enforced by a real consumer-report parser adapter (not markdown theater), fail-closed on missing or low coverage
**Depends on**: Phase 13 (domain pack root for binding rule placement); uses shipped GateAdapter/runAdapter
**Requirements**: JAVA-COV-01, JAVA-COV-02, JAVA-COV-03
**Success Criteria** (what must be TRUE):

  1. Pack carries a binding coverage rule (`classification: binding`, named `enforcement` contract) requiring unit line coverage ≥ 70% for consumer Java work
  2. Real `coverage-report` GateAdapter parses consumer JaCoCo XML (primary) and LCOV (secondary) via Node stdlib only and emits schema-valid `GateResult` through `runAdapter`
  3. Missing coverage report or line coverage &lt; 70% fails closed at verify and blocks ship when coverage evidence is required
  4. Fixture tests prove pass-at-threshold, fail-under, missing report, and malformed report — zero new npm deps; no Maven/JDK shell-out; vendor-neutral `src/`

**Plans**: TBD

### Phase 18: Verify/Ship Wire + Consumer Docs

**Goal**: Consumer can subscribe the Java domain pack and point the coverage gate at a real report path using docs alone; verify/ship path uses the coverage adapter when binding coverage applies
**Depends on**: Phase 17 (adapter + binding rule); Phase 13 (domain subscribe)
**Requirements**: JAVA-DOC-01
**Success Criteria** (what must be TRUE):

  1. Consumer docs explain how to subscribe `domains: ["java-spring"]` and how to produce/configure JaCoCo or LCOV report path for the coverage gate
  2. Verify/ship path is configured so binding coverage uses `coverage-report` evidence (not left on always-pass generic-exit-ci while claiming coverage enforced)
  3. Docs are discoverable from existing onboarding/docs entrypoints without reading engine source

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
| 11. SUMMARY Frontmatter Hygiene | v3.0 | 1/1 | Complete | 2026-07-08 |
| 12. Onboarding & Rule-Authoring Docs | v3.0 | 2/2 | Complete | 2026-07-09 |
| 13. Domain Pack + Service Classification + Integrations | v4.0 | 2/2 | Complete    | 2026-07-09 |
| 14. Hexagonal + Tactical DDD Rules | v4.0 | 2/2 | Complete   | 2026-07-09 |
| 15. Logging, API Contract & Saga Decision Rules | v4.0 | 2/2 | Complete    | 2026-07-09 |
| 16. Starter Examples Outside Index | v4.0 | 0/? | Not started | - |
| 17. Coverage Parser + Binding GateAdapter | v4.0 | 0/? | Not started | - |
| 18. Verify/Ship Wire + Consumer Docs | v4.0 | 0/? | Not started | - |

---
*See `.planning/MILESTONES.md` for shipped-milestone summaries, `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 phase detail, `.planning/milestones/v2.0-ROADMAP.md` for v2.0, and `.planning/milestones/v3.0-ROADMAP.md` for v3.0.*

<!-- gsd:roadmap v4.0 2026-07-09 -->
