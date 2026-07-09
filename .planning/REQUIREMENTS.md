# Requirements: GSD Governance Overlay — v4.0 Developer Coding Conventions

**Defined:** 2026-07-09
**Core Value:** The rule selection engine correctly injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.
**Milestone goal:** Ship a selectable Java/Spring developer coding-convention rule pack + non-indexed starter examples + a real consumer-side coverage GateAdapter so LLM-assisted backend work follows Hexagonal/DDD, bank integration boundaries, coverage >70%, logging/API/saga conventions.

## v4.0 Requirements

### Domain Pack

- [x] **JAVA-PACK-01**: Team can subscribe the `java-spring` domain pack (`aidlc-rules/domain/java-spring/`) so only opted-in projects receive coding-convention rules
- [x] **JAVA-PACK-02**: Every pack rule carries a one-sentence `summary` suitable for injection; full prose lives behind `detailPath` (no essay injection)

### Architecture (Hexagonal + DDD)

- [ ] **JAVA-HEX-01**: On construction tasks touching domain/application/adapter paths, inject Hexagonal layering rule: dependencies point inward; domain has no Spring/JPA/WSO2/framework types
- [ ] **JAVA-DDD-01**: On tasks involving aggregates/entities/domain events, inject tactical DDD rules: aggregate root per consistency boundary; immutable VOs; past-tense domain event names

### Service Classification & Integration

- [x] **JAVA-SVC-01**: Selector can classify Internal vs internet-facing service context and inject the matching outbound rule
- [x] **JAVA-SVC-02**: Internal services: JDBC/ORM/direct DB access is allowed; no forced API gateway on outbound
- [x] **JAVA-SVC-03**: Internet-facing services: all outbound calls to external systems MUST go through WSO2 (or declared API gateway); no raw external SDK/WebClient/RestTemplate from domain
- [x] **JAVA-IN-01**: Inbound REST conventions inject on controller/API work: thin controllers → application ports; validation at boundary; no business logic in controller
- [x] **JAVA-IN-02**: Inbound Kafka conventions inject on listener/consumer work: idempotent consumers; retry/DLQ policy; no Kafka client types in domain (port + adapter)

### Logging, API, Events

- [ ] **JAVA-LOG-01**: Logging rules inject correlation/trace id propagation, no-PII/secrets in logs, and audit events for state-changing operations
- [ ] **JAVA-API-01**: API contract rules inject OpenAPI as source-of-truth or generated-and-checked, one org versioning policy, and uniform error envelope (`code`, `message`, `correlationId`)
- [ ] **JAVA-EVT-01**: Saga/outbox/domain-event decision rules inject when to use saga vs outbox vs plain call, including explicit when-NOT-to-use guidance (no saga cargo-cult)

### Coverage Enforcement

- [ ] **JAVA-COV-01**: Binding rule requires unit-test line coverage ≥ 70% for new/changed consumer Java work (`classification: binding`, named `enforcement` contract)
- [ ] **JAVA-COV-02**: Real `coverage-report` GateAdapter parses consumer JaCoCo XML (primary) and LCOV (secondary) via Node stdlib only; emits schema-valid `GateResult`
- [ ] **JAVA-COV-03**: Missing coverage report or line coverage < 70% fails closed at verify (and blocks ship when coverage evidence is required)

### Starter Examples & Docs

- [ ] **JAVA-EX-01**: Starter tree under `examples/java-spring/` (folder layout + thin Java/Spring snippets for ports, adapters, handlers, REST, Kafka) ships outside rule-index scan roots
- [ ] **JAVA-EX-02**: Index/load path never treats starter markdown under `examples/` as selectable rules (guard or layout proof)
- [ ] **JAVA-DOC-01**: Consumer docs explain how to subscribe `domains: ["java-spring"]` and how to produce JaCoCo/LCOV report path for the coverage gate

## Future Requirements

Deferred; not in v4.0 roadmap.

### Architecture

- **JAVA-CQRS-01**: CQRS command/query split rules (separate write/read handlers; no god services) — deferred by scope choice; add in v4.x if needed

### Quality Harness

- **JAVA-EVAL-01**: Dedicated eval corpus extension for java-spring critical recall (classification, coverage binding, hexagonal direction) — deferred; existing SEL-06 harness remains; can land with pack fixtures later

### Roles & Frontend

- **ROLE-BA-01**: BA governance rule packs
- **ROLE-PM-01**: PM governance rule packs
- **FE-NEXT-01**: Next.js / SPA coding conventions

### Deeper Integration

- **JAVA-LEG-01**: Deep SmartVista / DB Configuration protocol rules (beyond outbound-boundary + ACL adapter guidance)
- **JAVA-COV-04**: Branch coverage as binding metric
- **JAVA-ARCH-01**: First-class ArchUnit consumer template productized in overlay

## Out of Scope

| Feature | Reason |
|---------|--------|
| New selection engine / embeddings | Engine shipped v1–v3; determinism + auditability required |
| Full Hexagonal/CQRS essays always-on inject | Core-value anti-pattern (context bloat) |
| Full multi-module bank sample app | Overlay ships thin mirror snippets only |
| Spring/Maven/JDK as overlay runtime deps | Consumer owns Java toolchain; overlay is Node/TS |
| OPA / specific SAST as first-class products | Tool-agnostic GateAdapter contracts only |
| Markdown as hard coverage enforcement | Binding requires real report parser |
| BA/PM/frontend convention packs | Explicitly deferred this milestone |
| Vendor product strings hard-coded in `src/` engine | Vendor names stay in rule content only |
| CQRS rules (this milestone) | User deselected; future |
| Dedicated JAVA-EVAL corpus (this milestone) | User deselected; future |

## Traceability

Which phases cover which requirements. Filled during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| JAVA-PACK-01 | Phase 13 | Complete |
| JAVA-PACK-02 | Phase 13 | Complete |
| JAVA-HEX-01 | Phase 14 | Pending |
| JAVA-DDD-01 | Phase 14 | Pending |
| JAVA-SVC-01 | Phase 13 | Complete |
| JAVA-SVC-02 | Phase 13 | Complete |
| JAVA-SVC-03 | Phase 13 | Complete |
| JAVA-IN-01 | Phase 13 | Complete |
| JAVA-IN-02 | Phase 13 | Complete |
| JAVA-LOG-01 | Phase 15 | Pending |
| JAVA-API-01 | Phase 15 | Pending |
| JAVA-EVT-01 | Phase 15 | Pending |
| JAVA-COV-01 | Phase 17 | Pending |
| JAVA-COV-02 | Phase 17 | Pending |
| JAVA-COV-03 | Phase 17 | Pending |
| JAVA-EX-01 | Phase 16 | Pending |
| JAVA-EX-02 | Phase 16 | Pending |
| JAVA-DOC-01 | Phase 18 | Pending |

**Coverage:**

- v4.0 requirements: 18 total
- Mapped to phases: 18/18 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-09*
*Last updated: 2026-07-09 after v4.0 roadmap*
