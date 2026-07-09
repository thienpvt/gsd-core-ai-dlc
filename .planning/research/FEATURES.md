# Feature Research

**Domain:** Developer coding-convention governance for LLM-assisted enterprise Java/Spring Boot (rule pack + starter examples + real coverage gate), layered on an existing GSD AI-DLC governance overlay
**Researched:** 2026-07-09
**Confidence:** MEDIUM-HIGH (overlay capabilities observed in-repo; Cursor rules + ArchUnit + microservices.io outbox/saga + JaCoCo DTD verified via primary docs/fetch; bank WSO2 classification pattern grounded in gateway mediation practice but org-specific — LOW on exact WSO2 policy surface)

## Grounding: What Already Exists (DO NOT re-ship as v4.0 features)

v1–v3 shipped the **engine**. v4.0 ships **content + one real consumer-side adapter + starter examples**.

| Capability | Status | v4.0 dependency |
|------------|--------|-----------------|
| Rule-pack frontmatter (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `classification`, `detailPath`, `enforcement`) | Shipped | Author new Java convention rules against this schema (`docs/rule-authoring.md`) |
| Index build + deterministic `select()` + summary-only inject + lazy `rule-detail` | Shipped | Domain pack under `aidlc-rules/domain/java-spring/` (or similar); trigger axes already support keywords/taskType/paths |
| Gate hooks discuss/plan/execute/verify/ship + durable gate evidence | Shipped | Coverage binding rule routes through verify/ship |
| `GateAdapter` + 7 no-op stubs (`semgrep`, `bandit`, `checkov`, `grype`, `gitleaks`, `generic-exit-ci`, `human-approval`) | Shipped | Add **one real** adapter: coverage-report parser (JaCoCo XML etc.) — still tool-agnostic contract |
| Audit artifact + approval + selection-quality harness | Shipped | New rules appear in applied/skipped; eval cases for critical-recall |
| Onboarding + rule-authoring docs | Shipped | Extend with Java pack authoring examples; no second authoring system |

**Core Value still holds:** selection injects only relevant *summaries*; full Hexagonal/CQRS/DDD essays stay behind `detailPath`. If Java pack dumps full architecture into every request, premise fails.

## Feature Landscape

### Table Stakes (Enterprises / LLM backend teams expect these)

Missing any of these = coding-convention pack feels incomplete for bank Java microservices work.

| Feature | Why Expected | Complexity | Expected Behavior | Notes / Overlay Dep |
|---------|--------------|------------|-------------------|---------------------|
| **Java/Spring Hexagonal layering rules** | LLM output without ports/adapters direction (domain free of framework) is rejected in code review for Hexagonal shops | MEDIUM | On `construction` + path/keyword match (`controller`, `repository`, `domain`, `port`, `adapter`), inject short rules: dependency points inward; domain has no Spring/JPA; adapters implement ports | Advisory summaries; optional binding via ArchUnit in *consumer* CI (not shipped as product code). Use `detailPath` for package map. |
| **CQRS command/query split rules** | Teams that chose CQRS expect separate write/read paths and handlers, not god services | MEDIUM | Triggers on keywords `command`, `query`, `handler`, `cqrs`. Summaries: commands mutate via write model; queries never mutate; no shared transactional write+read service blob | Pair with starter handler skeletons. Skip for tiny CRUD services — see anti-features. |
| **DDD tactical rules (aggregate, entity, value object, domain event naming)** | DDD shops expect aggregate boundaries and no anemic domain with logic in controllers | MEDIUM | Triggers on `aggregate`, `entity`, `domain`, `event`. Summaries: one aggregate root per consistency boundary; VOs immutable; domain events named past-tense | Keep tactical only; strategic DDD (bounded context maps) is essay-scale — lazy detail only. |
| **Service classification: Internal vs internet-facing** | Bank integration boundary is non-negotiable: wrong outbound path = security finding | MEDIUM | Explicit rule pair: (1) Internal: JDBC/ORM/direct DB OK; (2) Internet-facing: outbound HTTP/SOAP/gRPC **must** go through WSO2 (or declared API gateway) — no raw external SDK in domain | Triggers: `wso2`, `outbound`, `integration`, `feign`, `resttemplate`, `webclient`, paths under `adapter/out/**`. Binding candidate: Semgrep/custom CI for forbidden clients in internet-facing modules. |
| **Inbound REST conventions** | Every Spring service exposes REST; without shape rules LLMs invent inconsistent controllers | LOW-MEDIUM | Triggers: `rest`, `controller`, `api`, paths `**/*Controller.java`, `**/adapter/in/web/**`. Summaries: thin controllers → application ports; validation at boundary; no business logic in controller | Cross-link OpenAPI rules. |
| **Inbound Kafka conventions** | Event-driven bank services use Kafka; LLMs skip idempotency and DLQ | MEDIUM | Triggers: `kafka`, `listener`, `consumer`, `topic`. Summaries: idempotent consumers; explicit topic/DTO ownership; poison → DLQ/retry policy; no domain import of Kafka client types (port+adapter) | Align with outbox on publish side. |
| **Unit-test coverage >70% as binding rule** | Coverage floors are table stakes in enterprise CI; "LLM promised tests" is not | MEDIUM-HIGH | Rule `classification: binding`, `enforcement: coverage:line>=70` (or similar contract id). Verify gate runs **real** report parser adapter; fail closed if report missing or line coverage < 70% | **Only binding feature that must ship a non-stub adapter this milestone.** |
| **Coverage report parser adapter (JaCoCo XML primary)** | Without consumer-side parse, coverage rule is markdown theater | MEDIUM-HIGH | New `GateAdapter` (e.g. `coverage-report`): read JaCoCo `report.xml`/`jacoco.xml`; sum root `counter type="LINE"` `covered/(missed+covered)`; emit `GateResult` pass/fail + findings | JaCoCo DTD: `counter@type` = INSTRUCTION\|BRANCH\|LINE\|…; attrs `missed`/`covered`; percent derived externally. Optional LCOV later. |
| **Error + audit logging conventions** | Correlation IDs and no-PII are bank audit defaults | MEDIUM | Triggers: `log`, `logger`, `audit`, `mdc`, `correlation`. Summaries: propagate correlation/trace id (MDC); never log PAN/PII/secrets; audit events for state-changing ops with actor+outcome | Advisory + optional gitleaks/semgrep stubs already exist for secrets. |
| **API contract conventions (OpenAPI, versioning, error shape)** | Internet-facing and shared APIs need stable contracts | MEDIUM | Triggers: `openapi`, `swagger`, `api version`, paths `**/api/**`, `**/*Resource.java`. Summaries: OpenAPI source-of-truth or generated-and-checked; URI or header versioning (pick one org default); uniform error body (`code`, `message`, `correlationId`, details) | Bank-specific error code catalog stays in `detailPath` / project scope. |
| **Saga / domain-event / outbox decision rules** | Event-driven preference without guidance → LLMs invent 2PC or fire-and-forget | MEDIUM | Triggers: `saga`, `outbox`, `domain event`, `choreograph`, `orchestrat`. Summaries: multi-service business TX → saga; same-TX DB+publish → outbox; single-service ACID → plain call (no saga) | microservices.io: outbox when atomic DB+message required; saga when TX spans services. **Must include "when NOT to use".** |
| **Starter examples (folder layout + thin snippets)** | Cursor docs: concrete examples / file refs beat abstract essays for agent fidelity | MEDIUM | Shipped tree under e.g. `examples/java-spring-hexagonal/`: package layout + thin ports/adapters/command-handler/outbox row/REST controller/Kafka listener. LLM mirrors structure, not essays | Referenced by rule `detailPath` or summary "see examples/...". Not a runnable bank product. |

### Differentiators (Where this milestone competes)

Built on the already-shipped selection engine — competitors usually paste full standards or ship IDE-only rules.

| Feature | Value Proposition | Complexity | Expected Behavior | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Task-scoped Java pack via existing selector** | Only REST rules on controller work; only outbox on messaging work — not the whole architecture every time | LOW (content) / already-HIGH engine | Domain pack + precise `triggers` + `phases: [construction]` (some inception design rules) | Differentiator is *delivery*, not novel Java advice. Eval cases must lock critical recall for classification + coverage. |
| **Summary-first architecture rules + lazy detail** | Hexagonal/CQRS/DDD full text available without context bloat | LOW-MEDIUM | Each rule: 1-line `summary` injectable; long package maps / diagrams in `detailPath` | Directly reuses Phase 3 inject/detail. |
| **Service-class dual rules (Internal vs internet-facing) as selectable pair** | Most generic Spring guides ignore bank outbound boundary | MEDIUM | Two rules (or one rule with mutually exclusive path triggers); skip reasons recorded when class not detected | May need project-scope override for monorepo module tags. |
| **Real coverage adapter (not stub)** | First *binding* consumer-side check beyond no-op stubs — proves enforcement boundary with Java CI artifact | MEDIUM-HIGH | Parses report artifact path from gate request / config; schema-valid `GateResult`; ship fail-closed | Still tool-agnostic: contract is "coverage report"; JaCoCo is first format. |
| **Pattern decision matrix (saga vs outbox vs direct)** | Prevents over-engineering small services while preserving event-driven default where needed | MEDIUM | Explicit decision table in summary + detail; starter shows *simple* path first | Aligns user prompt: "prefer event-driven, avoid over-engineering small services." |
| **Starter snippets as mirror targets** | Cursor best practice: point at canonical files; agents copy structure | MEDIUM | Thin, compilable-enough fragments; no full framework sample app | Differentiator vs pure markdown packs. |
| **Eval corpus for coding-convention recall** | Regression gate: critical rules (service class, coverage binding, no-PII log) always fire on labeled tasks | MEDIUM | Extend `test/fixtures/eval/` with Java task signals | Reuses SEL-06 harness; ship-blocking critical-recall floor already exists. |

### Anti-Features (Seem useful; break premise or scope)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Dump full Hexagonal/CQRS/DDD essay into every prompt** | "Model must always know architecture" | Exact context-bloat anti-pattern PROJECT.md forbids; Cursor: avoid alwaysApply walls of text | Triggered summaries + `detailPath` + starter tree |
| **alwaysApply / empty-trigger all Java rules** | Simpler authoring | Selection becomes no-op; budget overflow; critical rules drown | Specific keywords/paths/taskTypes; `triggers: {}` only for rare always-in-phase safety rules |
| **Markdown as hard coverage/architecture enforcement** | Easy to claim "enforced" | Non-deterministic; auditors reject | Binding rules name `enforcement` contracts; real JaCoCo adapter + optional ArchUnit in consumer |
| **Full runnable Spring Boot bank sample as product** | Demo appeal | Scope explosion; maintenance of fake bank domain; not the overlay's job | Thin starter **snippets** and folder skeleton only |
| **Deep SmartVista / legacy protocol SDKs in domain rules** | Legacy integration pain is real | Couples governance to vendor SDK; Out of Scope in PROJECT.md | Outbound via WSO2 or ACL **adapter** rules; protocol detail deferred |
| **Saga/outbox mandatory on every service** | "We are event-driven" | Over-engineering small services; microservices.io saga only when multi-service TX | Decision rules with **skip when single-service ACID** |
| **BA/PM/frontend convention packs** | Role completeness | Explicitly deferred this milestone | Future milestone |
| **Shipping OPA/Semgrep/Sonar as first-class products** | Turnkey demos | Vendor lock-in; contradicts tool-agnostic contracts | One real coverage parser + existing stubs; consumers wire scanners |
| **Strategic DDD / enterprise architecture repository** | Architects want context maps | Essay-scale; low LLM actionability mid-code task | Tactical DDD only; strategic docs stay human wiki |
| **Auto-rewrite of consumer code to match conventions** | Magic compliance | Dangerous in bank repos; out of governance-overlay charter | Guide generation + gate fail; human (or separate tool) fixes |
| **Single "architecture score"** | Exec dashboards | Hides skipped rules and severity | Structured audit applied/skipped (already shipped) |

## Expected Behavior by Feature Category

### 1. Rule pack content (Hexagonal + CQRS + DDD)

- **Authoring:** Markdown + frontmatter under domain scope (e.g. `aidlc-rules/domain/java-spring/`).
- **Selection:** Fires on construction (and inception for structure decisions); path globs for `**/domain/**`, `**/application/**`, `**/adapter/**`.
- **Injection:** Summary only — e.g. "Domain must not depend on Spring or JPA; put adapters at edges."
- **Detail:** Package diagram, naming table, ArchUnit example rule text.
- **Enforcement:** Default `advisory`. Optional consumer ArchUnit tests referenced, not executed by overlay.

### 2. Service classification (Internal vs internet-facing)

- **Behavior:** Task signals or path prefixes classify service; matching outbound rules inject.
- **Internal:** Direct JDBC/JPA OK; no forced gateway.
- **Internet-facing:** Outbound only via WSO2 (gateway mediation); ban raw `WebClient`/`RestTemplate` to external hosts from domain; ACL adapter for legacy.
- **Audit:** Skip reason when classification unknown (`out-of-scope-by-trigger` or project-defined `classification-unknown` if extended).

### 3. Inbound REST + Kafka

- **REST:** Controller thin; map DTO↔command/query; consistent status codes; link OpenAPI.
- **Kafka:** Listener adapter → application port; idempotency key; retry/DLQ named; schema ownership.
- **Not:** Full Kafka ops runbooks in summaries.

### 4. Coverage >70% + parser adapter

- **Rule:** Binding; severity high/critical; enforcement contract id stable.
- **Adapter:** Input = path to JaCoCo XML (config or convention `target/site/jacoco/jacoco.xml`); compute line %; optional branch % report-only.
- **Gate:** `verify` evaluates adapter; `ship` fail-closed on fail/missing evidence (mirror existing GATE-05).
- **Missing report:** Hard fail (not silent pass) — forces consumer CI to produce artifact.

### 5. Logging / API / saga-event packs

- **Logging:** Correlation id required on request path; PII denylist in summary; audit log for money/state transitions.
- **API:** Versioning policy one-liner; error envelope fields; OpenAPI check deferred to consumer CI unless generic file-presence check added later.
- **Saga/outbox:** Decision table in summary; outbox same-TX write; consumers idempotent; saga only cross-service.

### 6. Starter examples

- **Ship:** Directory tree + 5–15 thin `.java`/`.md` snippets (port interface, adapter, command handler, outbox entity, REST controller, Kafka listener, ArchUnit sample test).
- **Do not ship:** Full multi-module bank app, Docker compose mesh, SmartVista clients.
- **Linking:** Rule summaries say `mirror examples/java-spring-hexagonal/...`; lazy detail can embed relative paths.

## Feature Dependencies

```
Existing rule-pack format + selector + inject + lazy detail
    └──requires──> (foundation — already shipped)
    └──consumed-by──> Java/Spring convention rule pack (content)

Java/Spring Hexagonal + CQRS + DDD rules
    └──enhances──> Starter examples (examples illustrate rules)
    └──optional-binding──> Consumer ArchUnit (out of overlay runtime)

Service classification rules
    └──requires──> Trigger/path (or project metadata) to distinguish Internal vs internet-facing
    └──enhances──> Inbound/outbound integration rules (WSO2, REST, Kafka)

Inbound REST + Kafka rules
    └──requires──> Hexagonal port/adapter rules (placement)
    └──enhances──> API contract rules (REST)

API contract + logging rules
    └──requires──> Rule pack format only
    └──partial-binding──> Existing gitleaks/semgrep stubs for secrets (optional)

Saga / domain-event / outbox rules
    └──requires──> Hexagonal + messaging triggers
    └──enhances──> Kafka inbound (consumer idempotency) + starter outbox snippet
    └──conflicts──> "saga everywhere" anti-feature

Coverage >70% binding rule
    └──requires──> Frontmatter classification:binding + enforcement field
    └──requires──> Coverage report parser GateAdapter (NEW)
    └──requires──> Existing verify/ship gate hooks + GateResult schema
    └──enhances──> Audit tests_executed / gate evidence

Coverage report parser adapter
    └──requires──> GateAdapter interface + runAdapter validation (shipped)
    └──requires──> JaCoCo XML (primary format) available from consumer build
    └──conflicts──> Markdown-only "coverage enforced" claim

Starter examples
    └──requires──> Nothing from engine beyond docs/link from rules
    └──enhances──> All advisory architecture rules (mirror targets)

Eval cases for Java pack
    └──requires──> SEL-06 eval harness (shipped)
    └──requires──> Java pack ids stable
```

### Dependency Notes

- **Content before clever engine work:** Selector already works. v4.0 bottleneck is authoring quality + triggers + examples, not new selection algorithms.
- **Coverage adapter is the only new runtime surface that must be real:** Everything else can be rule markdown + fixtures. This is the milestone's binding proof.
- **Service classification needs a signal:** Prefer path/module conventions and keywords over ML classification. Document expected layout (`internal/` vs `internet-facing/` or build tag) in pack README.
- **Starter examples enhance rules but rules must stand alone:** Selection must work even if examples directory absent (summary still correct).
- **Saga rules conflict with "always event-driven" culture:** Encode opt-out explicitly to match user architect guidance.

## MVP Definition (v4.0)

### Launch With (v4.0 milestone)

Minimum to claim "developer coding-convention governance for Java backend" without context bloat.

- [ ] Domain rule pack: Hexagonal layering + ports/adapters dependency direction
- [ ] CQRS + tactical DDD rule set (summaries + detail paths)
- [ ] Service classification Internal vs internet-facing (WSO2 outbound)
- [ ] Inbound REST + Kafka convention rules
- [ ] Logging (correlation id, no PII) + API contract (OpenAPI/version/error shape) rules
- [ ] Saga / domain-event / outbox **decision** rules (include when-not-to-use)
- [ ] Starter examples: folder structure + thin mirror snippets
- [ ] Binding coverage >70% rule + **real** JaCoCo XML parser `GateAdapter` + verify/ship wiring
- [ ] Eval cases covering critical rules (classification, coverage binding, no-PII, hexagonal direction)

### Add After Validation (v4.x)

- [ ] LCOV / IntelliJ coverage format support — trigger: non-Maven consumers need it
- [ ] Optional ArchUnit example module as consumer template — trigger: teams ask for bytecode enforcement
- [ ] Project-scope pack for org-specific error codes / WSO2 API naming — trigger: first real bank pilot
- [ ] Branch coverage threshold (report or bind) — trigger: policy requires it

### Future Consideration (later milestones)

- [ ] BA/PM role packs — deferred by PROJECT.md
- [ ] Next.js/SPA conventions — deferred
- [ ] Deep SmartVista/legacy protocol rules — deferred; keep ACL/WSO2 boundary only
- [ ] Auto-fix codemods for layer violations — out of charter
- [ ] Embeddings-based rule selection for huge corpora — rejected for audit determinism

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hexagonal + ports/adapters rules | HIGH | LOW-MEDIUM | P1 |
| Service classification (Internal / WSO2) | HIGH | MEDIUM | P1 |
| Coverage >70% binding + JaCoCo adapter | HIGH | MEDIUM-HIGH | P1 |
| Starter examples (structure + snippets) | HIGH | MEDIUM | P1 |
| Inbound REST conventions | HIGH | LOW | P1 |
| Logging + no-PII + correlation id | HIGH | LOW-MEDIUM | P1 |
| CQRS rules | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Tactical DDD rules | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Kafka inbound conventions | MEDIUM-HIGH | MEDIUM | P1 |
| API OpenAPI/version/error shape | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Saga/outbox/event decision rules | MEDIUM-HIGH | MEDIUM | P1 |
| Eval cases for Java pack | HIGH | MEDIUM | P1 |
| Branch coverage / multi-format parser | MEDIUM | MEDIUM | P2 |
| ArchUnit consumer template | MEDIUM | LOW-MEDIUM | P2 |
| Org-specific project pack samples | MEDIUM | LOW | P2 |
| Frontend / BA packs | LOW (this milestone) | HIGH | P3 / out |

**Priority key:** P1 = must ship in v4.0; P2 = fast-follow; P3 = later milestone / out of scope.

## Suggested REQ-ID Categories (for REQUIREMENTS.md)

Use stable prefixes so roadmap phases map cleanly:

| Prefix | Category | Table-stakes count (approx) |
|--------|----------|----------------------------|
| `JAVA-HEX-*` | Hexagonal structure, ports/adapters, package deps | 3–4 |
| `JAVA-CQRS-*` | Command/query split, handlers | 2–3 |
| `JAVA-DDD-*` | Aggregate/VO/entity/domain-event tactical | 2–3 |
| `JAVA-SVC-*` | Internal vs internet-facing / WSO2 outbound | 2–3 |
| `JAVA-IN-*` | Inbound REST + Kafka | 3–4 |
| `JAVA-LOG-*` | Correlation, no PII, audit log | 2–3 |
| `JAVA-API-*` | OpenAPI, versioning, error shape | 2–3 |
| `JAVA-EVT-*` | Saga / domain event / outbox decision | 2–3 |
| `JAVA-COV-*` | Coverage >70% rule + report parser adapter | 2–3 |
| `JAVA-EX-*` | Starter examples tree + snippet set | 1–2 |
| `JAVA-EVAL-*` | Selection eval cases for the pack | 1 |

**Rough table-stakes:** ~12 feature rows above (pack areas + coverage adapter + starters).  
**Differentiators:** ~7.  
**Anti-features:** ~11 documented stops.

## Competitor / Adjacent Feature Analysis

| Concern | Cursor rules / AGENTS.md | ArchUnit | Sonar/JaCoCo CI | AI-DLC raw markdown | Our v4.0 approach |
|---------|--------------------------|----------|-----------------|---------------------|-------------------|
| Delivery of conventions | alwaysApply / globs / agent-request; keep short | N/A (tests) | N/A | Full corpus copy into landing zones | Indexed domain pack + summary inject + lazy detail (existing engine) |
| Architecture layering | Prose rules | Bytecode package rules | Limited | Prose | Advisory rules + point to ArchUnit examples |
| Coverage | Rarely in rules | N/A | Real gate | Model "verification" section | Binding rule + **real** JaCoCo adapter via GateAdapter |
| Bank outbound boundary | Custom if authored | Custom | Custom | Generic | First-class service classification rules |
| Context cost | Bad if alwaysApply essays | Zero in LLM context | Zero in LLM context | High | Budgeted selection (core value) |
| Auditability | Weak | CI logs | CI logs | Compliance summaries | Existing governance audit + gate evidence |

## Sources

- In-repo: `.planning/PROJECT.md` (v4.0 goals, constraints, deferred), `docs/rule-authoring.md` (frontmatter/triggers/classification), `src/enforcement/adapters.ts` + `types.ts` (GateAdapter, stubs), prior `.planning/research/FEATURES.md` (engine landscape 2026-07-05). Confidence: HIGH.
- Cursor rules docs (cursor.com/docs/context/rules): apply modes, <500 lines, examples over essays, avoid alwaysApply walls. Confidence: MEDIUM (verified fetch of rules doc path).
- JaCoCo report DTD (`counter` type LINE/BRANCH/…, `missed`/`covered`; percent derived). Confidence: MEDIUM (DTD fetch).
- microservices.io Transactional Outbox + Saga patterns: when to use, outbox for atomic DB+message, saga for multi-service TX, compensations, avoid when single-service ACID enough. Confidence: MEDIUM-HIGH (primary pattern site).
- ArchUnit user guide: `onionArchitecture` / `layeredArchitecture` static enforcement complementary to advisory rules. Confidence: MEDIUM.
- WSO2 API Manager mediation/proxy as outbound gateway pattern for internet-facing services. Confidence: LOW–MEDIUM (practice-level; org policy not universal).

## Gaps to Address in Phase Research

- Exact org signal for Internal vs internet-facing (module path? Gradle source set? config flag?) — needs discuss-phase decision.
- Coverage threshold 70% line-only vs line+branch; exclude generated sources patterns.
- Whether OpenAPI check is advisory-only in v4.0 or file-presence gate.
- Starter snippet language level (Java 17 vs 21) to match bank baseline.
- WSO2: only "must call gateway" vs specific API naming/version headers.

---
*Feature research for: v4.0 Developer Coding Conventions (Java/Spring governance pack + starters + coverage gate)*
*Researched: 2026-07-09*
*Prior engine FEATURES (2026-07-05) superseded for roadmap consumption; engine capabilities treated as grounded baseline above.*
