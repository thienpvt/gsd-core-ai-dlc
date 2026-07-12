# Phase 15: Logging, API Contract & Saga Decision Rules - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add three advisory coding-convention rules to the existing `java-spring` domain pack for logging/audit, API contracts, and saga/outbox decision guidance — including explicit when-NOT-to-use for saga. Summaries only in inject; essays behind `detailPath`. Engine frozen (content + tests only). No CQRS. No coverage binding (Phase 17). No starter examples (Phase 16). No consumer docs (Phase 18).

</domain>

<decisions>
## Implementation Decisions

### Rule Inventory
- Exactly **three** advisory rules under `aidlc-rules/domain/java-spring/`:
  1. `java-spring-logging-audit` — heading `## Rule JS-LOG-01` (JAVA-LOG-01)
  2. `java-spring-api-contract` — heading `## Rule JS-API-01` (JAVA-API-01)
  3. `java-spring-saga-outbox` — heading `## Rule JS-EVT-01` (JAVA-EVT-01)
- All `classification: advisory`
- Same domain subscription `java-spring` as Phases 13–14

### Triggers & Content
- **Logging:** multi-token keywords `correlation-id`, `trace-id`, `mdc`, `audit-log`, `structured-logging`; paths `**/logging/**`, `**/config/*Log*`, `**/aop/**` — **no bare `log`/`logger`**
- **API:** path-primary `**/api/**`, `**/openapi/**`, `**/*Resource.java`, `**/web/**`; keywords `openapi`, `api-version`, `error-envelope`, `swagger-spec` — **no bare `rest`**
- **Saga/outbox:** keywords `saga`, `outbox`, `transactional-outbox`, `choreography`, `orchestration`, `distributed-transaction`; paths `**/outbox/**`, `**/saga/**`, `**/messaging/**`
- **`phases: [construction]` only** for all three
- **Excludes:** `taskType: [docs]` + test path excludes (`**/*Test*`, `**/*Tests*`, `**/src/test/**`)
- **One-sentence summaries** ≤160 chars; full prose + decision tables under `details/`
- **Saga when-NOT-to-use:** single-service ACID → plain call (no saga cargo-cult); outbox when same-TX DB+message needed; saga when multi-service business TX

### Proof & Hygiene
- Sibling suite `src/select/java-spring-log-api-evt.test.ts` (TDD RED then GREEN)
- Grow real-corpus inventory lock **7 → 10** winners in `precedence.test.ts`
- BODY_CANARY tokens per rule; inject quarantine
- Zero production engine `src/` edits; zero new npm deps

### Claude's Discretion
- Exact keyword/path lists beyond seeds (must avoid Phase 13 CR-style substring traps)
- Detail prose depth for OpenAPI versioning policy default (URI vs header — pick one org default in detail)
- Whether logging also triggers on `**/filter/**` or security filter paths

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Pack under `aidlc-rules/domain/java-spring/` (6 rules after Phase 14) + `domains: ["java-spring"]`
- Sibling suite pattern: `java-spring-hex-ddd.test.ts`
- Phase 13 pack suite + CR regression lessons (multi-token only)
- Inventory lock in `src/index/precedence.test.ts` (currently 7 winners)

### Established Patterns
- Path-primary + multi-token keywords; construction; docs/test excludes
- One-sentence summary; details/; advisory; BODY_CANARY
- Engine frozen; content + tests only

### Integration Points
- Same subscribe path; rebuild `rule-index.json` via build-index (gitignored)
- Phase 16 examples may reference these rules; Phase 17 coverage separate

</code_context>

<specifics>
## Specific Ideas

- Roadmap SC: correlation/trace id + no PII/secrets + audit for state-changing ops; OpenAPI + one versioning policy + error envelope (`code`, `message`, `correlationId`); saga/outbox/domain-event with when-NOT-to-use
- microservices.io: outbox for atomic DB+message; saga for multi-service TX; skip when single-service ACID

</specifics>

<deferred>
## Deferred Ideas

- Starter examples → Phase 16
- Binding coverage ≥70% → Phase 17
- Consumer docs → Phase 18
- CQRS (JAVA-CQRS-01) — out of v4.0
- Binding OpenAPI/file-presence gate — advisory only this phase

</deferred>
