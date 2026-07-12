# Phase 13: Domain Pack + Service Classification + Integrations - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a subscribe-able `java-spring` domain pack under `aidlc-rules/domain/java-spring/` whose rules inject one-sentence summaries only, with full prose behind `detailPath`. Pack proves domain subscription (JAVA-PACK-01/02) and bank service/integration boundaries: Internal vs internet-facing outbound (JAVA-SVC-01/02/03) and inbound REST/Kafka conventions (JAVA-IN-01/02). Engine from v1–v3 stays frozen — selection already gates domain rules via `SelectionConfig.domains` and `domain/<name>/` layout. No Hexagonal/DDD/logging/API/saga/coverage content (Phases 14–18). No binding enforcement adapters this phase.

</domain>

<decisions>
## Implementation Decisions

### Service Classification Signal
- Detect Internal vs internet-facing via **keyword + path hybrid** on the existing `TaskSignal` — no new `SelectionConfig` field and no engine schema change.
- Ship **two mutually exclusive outbound rules** using exclude axes (exclusion already wins per D-02): internal-outbound excludes internet-facing vocabulary; internet-outbound excludes internal vocabulary.
- When the signal is **ambiguous** (neither class named), **select neither** outbound rule — fail-open advisory, no guessed class; docs/task prose must name the class to get the rule.
- Classification vocabulary lives **only in rule frontmatter triggers** — never hardcoded in `src/` (engine freeze + vendor-neutral source).

### Pack Layout & Summary Contract
- Pack root: **`aidlc-rules/domain/java-spring/`** matching existing `domain/<name>/` + `config.domains.includes(name)`.
- Every rule `summary` is **exactly one sentence**, inject-ready (target ≤ ~160 chars); essays stay out of the index.
- Full prose via **`detailPath` under a `details/` sibling** — loader already skips `details/` subtrees (D-05).
- All Phase 13 rules are **`classification: advisory`** — binding coverage is Phase 17; no binding-without-adapter theater.

### Inbound REST & Kafka Triggers
- REST rule: **path-primary** triggers (`**/*Controller*`, `**/api/**`, `**/web/**`, `**/rest/**`) plus keywords `rest`, `controller`, `endpoint`.
- Kafka rule: **path-primary** (`**/*Listener*`, `**/*Consumer*`, `**/messaging/**`, `**/kafka/**`) plus keywords `kafka`, `consumer`, `listener`.
- Domain purity (“no Kafka/HTTP client types in domain”) is stated in **rule summary + body**, not a separate always-on purity rule (HEX Phase 14 covers broader layering).
- REST/Kafka convention rules apply to **`construction` only** (not `common`) to avoid discuss/docs noise.
- **Two separate rules**, not one mega inbound rule.

### Rule Inventory & ID Scheme
- Ship **four content rules** (no empty always-on pack-marker rule — pack opt-in is proven by domain folder + subscription):
  1. `java-spring-svc-internal-outbound` — Internal: JDBC/ORM/direct DB OK; no forced gateway
  2. `java-spring-svc-internet-outbound` — Internet-facing: outbound via gateway/WSO2 capability language; no raw external SDK/WebClient/RestTemplate from domain
  3. `java-spring-inbound-rest` — Thin controllers → application ports; validation at boundary; no business logic in controller
  4. `java-spring-inbound-kafka` — Idempotent consumers; retry/DLQ policy; no Kafka client types in domain (port + adapter)
- Frontmatter `id`: kebab `java-spring-*`. Body headings: `## Rule JS-SVC-01` / `JS-SVC-02` / `JS-IN-01` / `JS-IN-02` aligned with REQUIREMENTS.
- **Vendor names (WSO2) only in rule Markdown content** — never in `src/` identifiers, adapter names, or engine enums.
- Prove selection with a **fixture store** (`test/fixtures/java-spring-store/` or equivalent) + cases: `domains=[]` → zero pack rules; `domains=["java-spring"]` + signals → correct subset (internal XOR internet outbound; REST vs Kafka path/keyword).

### Claude's Discretion
- Exact keyword lists and path globs beyond the seeds above (as long as Internal/internet mutual exclusion and REST/Kafka path-primary hold).
- Whether detail files are one-per-rule or shared snippets under `details/`.
- Fixture file layout and test file placement matching existing `select.test.ts` / eval-fixture patterns.
- Whether to add a tiny pack README under `aidlc-rules/domain/java-spring/` (optional; consumer docs are Phase 18).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `loadRules` / `findRuleFiles` — recursive `*.md` under rule root; skips `details/` (src/rules/load.ts)
- `buildIndex` — body-free `rule-index.json` from store
- `select()` + `inScope()` — domain gate: `scope === "domain"` requires `config.domains.includes(domainName)` derived from `sourceFile` path `domain/<name>/...` (src/select/select.ts)
- `SelectionConfig.domains: string[]` already on types (src/types.ts)
- Frontmatter schema + Ajv validation; require-mfa enterprise rule as authoring template
- Eval/select fixtures under `test/fixtures/` (precedence-store, eval-rules with `domain/security`, `domain/payments`)

### Established Patterns
- Domain pack layout: `aidlc-rules/domain/<pack-name>/<rule>.md` + optional `details/`
- Triggers multi-axis OR; exclude wins; empty triggers = always-in-phase (avoid for style rules)
- Summaries only in injection; full body via `governance rule-detail` / detailPath
- Advisory vs binding independent of severity; binding requires named `enforcement`

### Integration Points
- Consumer opt-in: pass `domains: ["java-spring"]` into select/inject path (config/CLI already supports domains list in select path — plan-phase confirms wire)
- Rebuild index after authoring: `governance build-index`
- Phase 14+ rules extend same pack directory; Phase 17 may add binding coverage rule into pack root

</code_context>

<specifics>
## Specific Ideas

- STATE.md blocker note for Phase 13: lock Internal vs internet-facing **machine signal** — resolved as keyword+path hybrid on TaskSignal, not a new config field.
- Roadmap success criterion names WSO2 in capability language for internet-facing outbound — keep vendor string in rule prose only.
- Zero new npm deps; content-only phase except fixture tests.

</specifics>

<deferred>
## Deferred Ideas

- Hexagonal + tactical DDD rules → Phase 14
- Logging / API contract / saga decision rules → Phase 15
- Starter examples under `examples/java-spring/` → Phase 16
- Binding coverage ≥70% GateAdapter → Phase 17
- Consumer docs for domain subscribe + report path → Phase 18
- CQRS command/query split (JAVA-CQRS-01) and dedicated java-spring eval corpus (JAVA-EVAL-01) — out of v4.0 scope
- Config-level `serviceClass` field on SelectionConfig — rejected this phase to keep engine frozen

</deferred>
