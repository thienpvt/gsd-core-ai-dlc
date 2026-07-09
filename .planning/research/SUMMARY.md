# Project Research Summary

**Project:** GSD Governance Overlay (AI-DLC x GSD Core)
**Domain:** v4.0 Developer Coding Conventions -- Java/Spring rule packs + starter examples + consumer coverage GateAdapter
**Researched:** 2026-07-09
**Confidence:** HIGH

## Executive Summary

v4.0 is **content + one real adapter**, not a new runtime. Engine shipped in v1-v3 (rule packs, deterministic select, summary inject, lazy detail, GateAdapter/runAdapter, verify/ship fail-closed, eval harness) stays frozen. Milestone adds a selectable domain/java-spring coding-convention pack (Hexagonal + CQRS + DDD, Internal vs internet-facing/WSO2 outbound, REST/Kafka inbound, logging/API/saga decision rules), thin non-indexed starter snippets under examples/, and the first **real** consumer-side GateAdapter that parses JaCoCo XML / LCOV and enforces unit-test line coverage >70%.

Experts ship coding conventions as short, trigger-scoped guidance plus machine gates for what can be measured -- not as always-on architecture essays or markdown theater. Recommended path: domain pack under existing frontmatter (no schema change), summaries at most one sentence with full prose behind detailPath, examples **outside** aidlc-rules/ so they never enter buildIndex, coverage adapter as pure stdlib parse registered in ADAPTERS and always called via runAdapter. Zero new npm dependencies.

Key risks: essay summaries kill the token budget; broad keywords / empty triggers make architecture rules fire on every typo fix; binding coverage without a real report parser is governance theater; starters under the rule walk get indexed as policy; vendor product names (WSO2/Tibco/SmartVista) leaking into src/ fork the overlay. Mitigate with summary lint, path+taskType triggers + negative eval cases, fixture-proven JaCoCo/LCOV adapter before marking coverage binding, top-level examples/ + index guard, and CI grep keeping src/ vendor-neutral.

## Key Findings

### Recommended Stack

No new packages. Reuse shipped rule format, Ajv/runAdapter, gray-matter, picomatch. Coverage parse = Node stdlib (fs/path + string/regex scan). JaCoCo: last-wins report-level counter type=LINE missed/covered. LCOV: sum LF/LH. Threshold default 0.70; missing report = fail closed. Report path from adapter options/env/convention -- not untrusted rule body; path resolved under project root (same discipline as detail-path.ts).

**Core technologies:**
- Existing rule-pack format (YAML frontmatter + MD body) -- zero new rule runtime; enforcement: coverage-report free-form string already valid
- Node stdlib JaCoCo/LCOV parse -- report shapes fixed/simple; avoids XML DOM deps and ESM/CJS friction
- Existing GateAdapter + runAdapter -- register real coverage-report (or coverage); Ajv hard-fail + evaluatedBy equals adapter name
- Top-level examples/java-spring/ -- outside scan roots; never in rule-index.json
- tsc + node:test + c8 + fixture XML/LCOV -- no JDK in overlay CI

**Do not add:** Spring/Maven/Gradle/JDK as overlay deps; fast-xml-parser unless stdlib abandoned; OPA/GHA as core enforcement; embeddings for selection; gate JSON Schema expansion unless proven needed; Node engines above GSD floor.

Detail: .planning/research/STACK.md

### Expected Features

v4.0 ships **content + one real consumer adapter**. Engine features are baseline, not re-scoped.

**Must have (table stakes):**
- Hexagonal ports/adapters + CQRS + tactical DDD rules (advisory summaries; lazy detail)
- Service classification: Internal (JDBC/ORM OK) vs internet-facing (outbound via WSO2/gateway only)
- Inbound REST + Kafka conventions
- Binding unit-test coverage >70% + real JaCoCo (primary) / LCOV parser GateAdapter
- Logging (correlation id, no PII) + API contract (OpenAPI/version/error shape)
- Saga / domain-event / outbox **decision** rules with explicit when-not-to-use
- Starter folder layout + thin mirror snippets (not a bank product app)
- Eval cases for classification, coverage binding, hexagonal direction, no-PII

**Should have (differentiators):**
- Task-scoped pack via existing selector (not whole architecture every task)
- Summary-first architecture + lazy detail (reuses Phase 3)
- Real coverage adapter as first non-stub consumer enforcement proof
- Pattern decision matrix (saga vs outbox vs direct) to stop cargo-cult
- Domain subscription (--domains java-spring) so non-Java work stays clean

**Defer (v4.x / later milestones):**
- Branch coverage as binding; ArchUnit consumer template as first-class product
- BA/PM packs; Next.js/SPA conventions; deep SmartVista/legacy protocol rules
- Multi-adapter verify orchestration; governance example CLI; auto-fix codemods
- Full runnable multi-module Spring Boot bank sample

**Anti-features (do not build):** Full Hexagonal/CQRS essays in every inject; empty triggers on architecture rules; markdown-as-hard-coverage; examples under aidlc-rules as indexed rules; saga mandatory on every service; vendor strings in engine TS; strategic DDD essay packs; single architecture score.

Detail: .planning/research/FEATURES.md

### Architecture Approach

Spine unchanged:

    aidlc-rules -> build-index -> body-free index -> select() -> summary inject -> lazy rule-detail
    GateAdapter -> runAdapter -> gates/{NN}-verify.json -> verify/ship fail-closed

Coding conventions = **domain pack** aidlc-rules/domain/java-spring/ (not enterprise -- language-specific; not project -- reusable for consumers). Starters = examples/java-spring/ outside the rule walk. Coverage = real adapter that **parses** consumer CI reports (never runs Maven/this repo c8 as the consumer check).

**Major components:**
1. **Domain pack java-spring** -- classification, outbound boundary, inbound REST/Kafka, Hex/CQRS/DDD, logging/API/saga, binding coverage rule
2. **Coverage GateAdapter** -- pure parse modules + I/O edge; schema-valid GateResult; register in ADAPTERS
3. **Starter examples tree** -- layout + thin .java snippets; detail prose points to paths; inject path has **no** coupling
4. **Verify/ship wire + docs** -- adapterName: coverage-report when binding coverage in play; consumer CI docs for report path + domain subscribe
5. **Eval corpus extension** -- positive + negative cases; critical-recall floor stays 1.0; budget fixture with full pack enabled

**Unchanged:** frontmatter schema, select() core, body-free inject, runAdapter validation, approval/audit shapes, eval harness engine.

Detail: .planning/research/ARCHITECTURE.md

### Critical Pitfalls

1. **Essay summaries / budget death** -- Cap summary ~120 chars / one sentence; body under detailPath; lint at build-index; never raise default 2000 budget to fit essays.
2. **Architecture always-on** -- No empty triggers for style rules; prefer paths + taskType + exclude; negative eval: README typo must not select CQRS/DDD.
3. **Coverage theater** -- Adapter parses consumer JaCoCo/LCOV fixtures; fails under 70% and missing report; never reuse capture-test-evidence / always-pass noop under a coverage label.
4. **Starters indexed as rules** -- Keep under top-level examples/; loader only skips details/ today; guard against examples under rule roots.
5. **Binding without real gate / CQRS cargo-cult / vendor-in-engine** -- Default architecture to advisory; only coverage binding this milestone if non-noop wired; encode when-not-to-apply; no WSO2/Tibco/SmartVista strings in src/.

Also lock measurement boundary (unit line coverage, excludes, evidence records ratio) and extend Phase 10 eval for every new rule ID.

Detail: .planning/research/PITFALLS.md

## Implications for Roadmap

Continue numbering after v3.0 phases 11-12. Dependency-driven; content pack first, binding adapter before claiming coverage enforced, eval last on full corpus.

### Phase 13: Java-spring domain pack -- classification + integration boundaries
**Rationale:** Content-only proof of domain subscription with highest-value bank boundary rules; no adapter risk; unblocks pack root for later rules.
**Delivers:** aidlc-rules/domain/java-spring/ with service-classification, outbound-wso2-only (capability language in summary; product names in detail), inbound-rest, inbound-kafka + details; rebuild index; subscribe/unsubscribe + hybrid classification eval cases; pack IA + summary length contract.
**Addresses:** JAVA-SVC-*, JAVA-IN-* (partial), authoring standards.
**Avoids:** Pitfalls 1 (essay), 4 (vendor in engine), 5 (ambiguous classification), 9 (integration detail everywhere), 10 (FE/BA creep).

### Phase 14: Architecture style rules (Hexagonal + CQRS + DDD)
**Rationale:** Needs pack root; separate concern IDs for precise select/eval; content design before mass examples.
**Delivers:** hexagonal-layering, cqrs-command-query, ddd-aggregates (+ details); path globs for domain/application/adapter packages; when-not-to-apply for small CRUD; advisory classification.
**Addresses:** JAVA-HEX-*, JAVA-CQRS-*, JAVA-DDD-*.
**Avoids:** Pitfalls 2 (always-on), 3 (cargo-cult mega-rule), 11 (binding without gate).

### Phase 15: Cross-cutting conventions (logging, API, saga/events)
**Rationale:** Completes advisory corpus with id/prefix consistency after structure rules exist.
**Delivers:** logging-audit, api-contract-openapi, saga-outbox-events decision rules (include skip when single-service ACID); advisory unless later real tool.
**Addresses:** JAVA-LOG-*, JAVA-API-*, JAVA-EVT-*.
**Avoids:** Pitfalls 3 (saga everywhere), 9 (vendor trivia in every rule), 11 (fake binding).

### Phase 16: Starter examples (non-indexed)
**Rationale:** Rules that point at examples should exist first; layout guard before sample volume.
**Delivers:** examples/java-spring/ layout + thin snippets (minimal + complex); detail links; regression: examples absent from rule-index.json; optional loader/CI guard for nested examples/.
**Addresses:** JAVA-EX-*.
**Avoids:** Pitfall 6 (starters as rules); anti-pattern full bank app.

### Phase 17: Coverage parser + GateAdapter
**Rationale:** Binding coverage without real adapter = theater; can parallel content after binding rule id frozen; pure parse independent of snippet polish.
**Delivers:** coverage-parse.ts (JaCoCo XML + LCOV), coverage-adapter.ts, register real adapter, fixture tests (pass at or above 70, fail under 70, missing, malformed), threshold/default paths configurable, binding rule unit-test-coverage-70 with matching measurement boundary docs.
**Uses:** Node stdlib; existing GateAdapter/runAdapter.
**Addresses:** JAVA-COV-*.
**Avoids:** Pitfalls 7, 8, 11; no Maven shell-out; no this-repo c8 as consumer metric.

### Phase 18: Verify/ship wiring + consumer CI docs
**Rationale:** Adapter alone does not enforce; wire evidence path and document consumer report path + domain subscribe.
**Delivers:** verifyGateHook / config path for coverage-report; ship fail-closed on fail/missing coverage evidence when binding rule applies (prefer single-adapter call -- YAGNI multi-adapter loop); onboarding section for Java consumers; optional capability config keys (governance.domains, coverage report path/min).
**Implements:** Pattern 3 wire option A from ARCHITECTURE.
**Avoids:** Leaving default generic-exit-ci while claiming coverage enforced.

### Phase 19: Selection-quality eval + token budget lock
**Rationale:** Full corpus required before locking recall/precision/budget; continuous eval also part of DoD for 13-15.
**Delivers:** Labeled eval set for java-spring (positive + negative); critical-recall 1.0 on expanded corpus; precision report for noisy keywords; inject budget fixture with full pack + enterprise enabled.
**Addresses:** JAVA-EVAL-*.
**Avoids:** Pitfall 12 (pack ships without harness); Pitfall 1 budget regression as ship-blocker.

### Phase Ordering Rationale

- 13 then 14 then 15 then 16 content chain: pack root, structure, cross-cutting, examples that reference rules.
- 17 can spike early after binding rule id frozen; must complete before coverage is treated as binding in ship.
- 18 depends on 17 (plus binding rule from 13/17).
- 19 last quality gate on complete corpus; eval cases still added continuously in 13-15 DoD.
- Pitfall-driven: authoring standards + pack IA first; coverage adapter before binding claim; starters after index isolation is clear; no FE/BA phases.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 17:** JaCoCo XML schema variants / real plugin path differences if fixtures disagree with bank reports; confirm last-wins counter semantics on production samples.
- **Phase 13 (discuss):** Org signal for Internal vs internet-facing (path convention vs module tag vs config) -- FEATURES gap; decision table must land in detail.
- **Phase 18:** Only if multi-adapter orchestration demanded; else standard single-adapter pattern.

Phases with standard patterns (skip research-phase):
- **Phases 14-16:** Standard pack authoring + examples layout; follow docs/rule-authoring.md + existing domain scope.
- **Phase 19:** Extend Phase 10 harness; do not rebuild eval engine.
- **Phase 15:** Advisory rule content; established frontmatter only.

## What NOT to Build (v4.0)

| Do not | Why |
|--------|-----|
| New selection algorithms / embeddings | Engine works; content quality is the bottleneck |
| Frontmatter schema expansion (examplePath, service-tier enums) | additionalProperties false churn; detail prose + triggers suffice |
| Spring Boot / Maven / JDK in overlay package | Wrong runtime; fixtures only |
| Full multi-module bank sample app | Scope explosion; thin snippets only |
| BA/PM / SPA convention packs | PROJECT.md out of scope |
| Deep SmartVista / legacy protocol rule packs | Boundary via WSO2/ACL only |
| Binding Hexagonal/CQRS/logging without real tools | Theater; advisory until enforceable |
| Enterprise dump of all Java rules | Wrong scope; forces Java on all domains |
| Empty-trigger architecture pack | Over-injection / budget death |
| Raise token budget to fit essays | Fix content |
| Vendor product names in src/ | Overlay becomes one-bank fork |
| Multi-adapter verify loop (unless proven) | YAGNI; option A single adapter first |
| OPA/GHA/Semgrep as first-class product | Contracts + one real coverage parser |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | In-repo adapter boundary + zero-dep parse proof; npm versions only MEDIUM and unused |
| Features | MEDIUM-HIGH | Overlay capabilities HIGH; bank WSO2 policy surface LOW-MEDIUM (practice-level) |
| Architecture | HIGH | Integration seams read from live src/; pack layout matches shipped scope model |
| Pitfalls | HIGH | Grounded in load/select/adapters/verify/frontmatter schema + prior theater/budget pitfalls |

**Overall confidence:** HIGH

### Gaps to Address

- **Internal vs internet-facing machine signal:** Path/module/config convention -- resolve in Phase 13 discuss; document decision table + hybrid eval fixtures.
- **Coverage metric boundary:** Unit-only line default; generated-source excludes; whether branch is report-only -- lock in Phase 17 rule+adapter same PR.
- **Default consumer report paths:** Maven vs Gradle layouts vary -- configurable path; document both conventions (STACK MEDIUM).
- **JaCoCo real-report fixtures:** Phase 17 should validate parser against samples from jacoco-maven-plugin / Gradle jacoco, not only hand-written XML.
- **OpenAPI check depth:** Advisory-only in v4.0 unless file-presence gate explicitly added -- keep advisory default.
- **Java language level for snippets:** 17 vs 21 bank baseline -- pick in Phase 16 discuss; does not block pack rules.
- **WSO2 detail depth:** must call gateway vs naming/version headers -- capability language in summary; org specifics in detail/project pack later.
- **Adapter name string consistency:** Research uses coverage-report / coverage / coverage:min-70 -- freeze one adapter name + one enforcement id in Phase 17 plan and use everywhere.

## Sources

### Primary (HIGH confidence)

- In-repo code: src/enforcement/adapters.ts, run-adapter.ts, types.ts; src/governance/verify-gate-hook.ts, ship-gate-hook.ts, capture-test-evidence.ts; src/rules/load.ts, detail-path.ts, scope.ts; src/select/select.ts, tokens.ts; src/inject/inject.ts; src/schema/frontmatter.schema.json; docs/rule-authoring.md
- .planning/PROJECT.md -- v4.0 goals, constraints, deferred FE/BA/SmartVista
- Local zero-dep JaCoCo/LCOV parse proof (STACK)
- Shipped v1-v3 capability baseline (selection, inject, gates, eval)

### Secondary (MEDIUM confidence)

- JaCoCo report DTD (counter LINE/BRANCH, missed/covered)
- microservices.io Transactional Outbox + Saga (when to use / when not)
- Cursor rules docs -- short rules, examples over essays, avoid alwaysApply walls
- ArchUnit layered/onion patterns as consumer-side complement (not overlay runtime)
- npm registry package pins for optional fast-xml-parser (not required v4)

### Tertiary (LOW confidence)

- Exact WSO2 API Manager policy surface / org naming -- practice-level; keep out of engine
- Default Gradle JaCoCo report path across plugin versions -- confirm per consumer

---
*Research completed: 2026-07-09*
*Milestone: v4.0 Developer Coding Conventions*
*Ready for roadmap: yes*
