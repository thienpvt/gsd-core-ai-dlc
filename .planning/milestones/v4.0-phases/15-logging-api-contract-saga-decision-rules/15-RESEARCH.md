# Phase 15: Logging, API Contract & Saga Decision Rules - Research

**Researched:** 2026-07-10
**Domain:** Domain rule-pack content (java-spring) — logging/audit, API contract, saga/outbox decision rules on frozen select/inject engine
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Exactly **three** advisory rules under `aidlc-rules/domain/java-spring/`:
  1. `java-spring-logging-audit` — heading `## Rule JS-LOG-01` (JAVA-LOG-01)
  2. `java-spring-api-contract` — heading `## Rule JS-API-01` (JAVA-API-01)
  3. `java-spring-saga-outbox` — heading `## Rule JS-EVT-01` (JAVA-EVT-01)
- All `classification: advisory`
- Same domain subscription `java-spring` as Phases 13–14
- **Logging:** multi-token keywords `correlation-id`, `trace-id`, `mdc`, `audit-log`, `structured-logging`; paths `**/logging/**`, `**/config/*Log*`, `**/aop/**` — **no bare `log`/`logger`**
- **API:** path-primary `**/api/**`, `**/openapi/**`, `**/*Resource.java`, `**/web/**`; keywords `openapi`, `api-version`, `error-envelope`, `swagger-spec` — **no bare `rest`**
- **Saga/outbox:** keywords `saga`, `outbox`, `transactional-outbox`, `choreography`, `orchestration`, `distributed-transaction`; paths `**/outbox/**`, `**/saga/**`, `**/messaging/**`
- **`phases: [construction]` only** for all three
- **Excludes:** `taskType: [docs]` + test path excludes (`**/*Test*`, `**/*Tests*`, `**/src/test/**`)
- **One-sentence summaries** ≤160 chars; full prose + decision tables under `details/`
- **Saga when-NOT-to-use:** single-service ACID → plain call (no saga cargo-cult); outbox when same-TX DB+message needed; saga when multi-service business TX
- Sibling suite `src/select/java-spring-log-api-evt.test.ts` (TDD RED then GREEN)
- Grow real-corpus inventory lock **7 → 10** winners in `precedence.test.ts`
- BODY_CANARY tokens per rule; inject quarantine
- Zero production engine `src/` edits; zero new npm deps

### Claude's Discretion
- Exact keyword/path lists beyond seeds (must avoid Phase 13 CR-style substring traps)
- Detail prose depth for OpenAPI versioning policy default (URI vs header — pick one org default in detail)
- Whether logging also triggers on `**/filter/**` or security filter paths

### Deferred Ideas (OUT OF SCOPE)
- Starter examples → Phase 16
- Binding coverage ≥70% → Phase 17
- Consumer docs → Phase 18
- CQRS (JAVA-CQRS-01) — out of v4.0
- Binding OpenAPI/file-presence gate — advisory only this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JAVA-LOG-01 | Logging rules inject correlation/trace id propagation, no-PII/secrets in logs, and audit events for state-changing operations | Rule `java-spring-logging-audit` (JS-LOG-01): multi-token log keywords + logging/config/aop (and tight correlation/MDC filter) paths; one-sentence summary encodes correlation + no-PII + audit; detail checklist; advisory; construction only; docs/test excludes |
| JAVA-API-01 | API contract rules inject OpenAPI as source-of-truth or generated-and-checked, one org versioning policy, and uniform error envelope (`code`, `message`, `correlationId`) | Rule `java-spring-api-contract` (JS-API-01): path-primary api/openapi/Resource/web + multi-token contract keywords (no bare `rest`); summary encodes OpenAPI + versioning + error envelope; detail locks URI versioning as org default; advisory |
| JAVA-EVT-01 | Saga/outbox/domain-event decision rules inject when to use saga vs outbox vs plain call, including explicit when-NOT-to-use | Rule `java-spring-saga-outbox` (JS-EVT-01): saga/outbox/messaging paths + multi-token distributed-workflow keywords; summary + detail decision table (outbox / saga / plain call); explicit no cargo-cult when single-service ACID |
</phase_requirements>

## Summary

Phase 15 is a **content + proof** phase on the **frozen** selection engine. Phases 13–14 already delivered the subscribe-able `java-spring` pack with six advisory rules (service classification, inbound REST/Kafka, hexagonal layering, tactical DDD) and sibling select suites. This phase adds **exactly three** more advisory rules so construction work on logging/audit plumbing, API contracts, and distributed-workflow decisions injects short convention guidance — never always-on essays, never binding gates, never starter examples.

Engine behavior is unchanged: `domains: ["java-spring"]` gates the pack; keyword matching is **case-insensitive substring** (trigger = needle, signal keyword = haystack); paths use **picomatch** with `dot: true`; inject is summary-only; `details/` is skipped by the loader. Phase 13 code review proved bare short needles (`log`, `logger`, `rest`, `api`, `event`) and over-broad globs cause bank-realistic false positives — LOG/API/EVT authoring must not reintroduce those failure modes.

**Primary recommendation:** Author `java-spring-logging-audit`, `java-spring-api-contract`, and `java-spring-saga-outbox` (+ one detail each) under `aidlc-rules/domain/java-spring/`, rebuild `rule-index.json`, extend `precedence.test.ts` inventory **7 → 10**, and lock selection with sibling suite `src/select/java-spring-log-api-evt.test.ts` (RED→GREEN). Do **not** use bare `**/filter/**` for logging; prefer tight `**/*Correlation*Filter*` / `**/*Mdc*Filter*` if filter paths are desired. Default OpenAPI versioning policy in detail: **URI path** (`/v1/...`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Correlation / no-PII / audit logging guidance | Content store (`aidlc-rules/domain/java-spring/`) | Select path/keyword axes | Style rule is Markdown+frontmatter; engine only matches |
| OpenAPI / versioning / error-envelope guidance | Content store | Select path/keyword axes | Same; no engine schema for “API mode” |
| Saga vs outbox vs plain-call decision guidance | Content store | Select path/keyword axes | Decision table is content; microservices.io patterns inform prose only |
| Domain pack subscription | Select pure core (`inScope` / `domains`) | CLI `--domains` | Already shipped Phase 13 |
| Summary injection / lazy detail | Inject + detailPath resolver | CLI `rule-detail` | Frozen; essays never in index |
| Selection correctness proof | Test layer (`node:test`) | Real `aidlc-rules` root via `buildIndex` | Content phase; zero production `src/` edits |
| Real-corpus inventory lock | `src/index/precedence.test.ts` | buildIndex winners | Grow 7 → 10 expected ids |
| Binding OpenAPI/coverage enforcement | — (out of scope) | Phase 17 / consumer CI | Advisory only this phase |

## Project Constraints (from CLAUDE.md)

| Directive | Planning implication |
|-----------|----------------------|
| Overlay on GSD Core, not a fork | Content under `aidlc-rules/` only; no GSD core patches |
| Context budget: summaries only | One-sentence summaries; full prose only under `details/` |
| Markdown advisory; binding via real gates | All three rules `classification: advisory` (no OpenAPI file-presence theater) |
| Vendor strings not hard-coded in `src/` | LOG/API/EVT content stays vendor-neutral; no WSO2/new vendor tokens required |
| Zero new npm deps | Content + tests only |
| Engine frozen (v1–v3) | Zero production `src/` edits; tests may add under `src/select/` and inventory line in `precedence.test.ts` |
| GSD workflow enforcement | Plans/execution go through GSD phase commands |
| Auditability | Selection still explainable via matched axis + skip reasons; decision table must be explicit in detail |

## Current Pack State (verified)

**Observed layout under `aidlc-rules/domain/java-spring/`:** [VERIFIED: filesystem]

```
aidlc-rules/domain/java-spring/
├── java-spring-svc-internal-outbound.md
├── java-spring-svc-internet-outbound.md
├── java-spring-inbound-rest.md
├── java-spring-inbound-kafka.md
├── java-spring-hex-layering.md
├── java-spring-ddd-tactical.md
└── details/
    ├── java-spring-svc-internal-outbound-detail.md
    ├── java-spring-svc-internet-outbound-detail.md
    ├── java-spring-inbound-rest-detail.md
    ├── java-spring-inbound-kafka-detail.md
    ├── java-spring-hex-layering-detail.md
    └── java-spring-ddd-tactical-detail.md
```

**Real-corpus inventory lock (today):** enterprise `require-mfa` + 6 java-spring winners = **7** ids in `src/index/precedence.test.ts`. [VERIFIED: precedence.test.ts]

**After Phase 15:** same lock must list **10** winners (add the three new ids).

**Shared authoring contract already proven on pack rules:** [VERIFIED: Phase 13–14 content + suites]
- `scope: domain`, `classification: advisory`, `phases: [construction]`
- `detailPath: details/<id>-detail.md` (relative; loader skips `details/`)
- One-sentence `summary` (suite asserts ≤160 chars, no `\n`)
- Body heading `## Rule JS-…` + `### Verification` + `<!-- BODY_CANARY <id> -->`
- Path-primary and/or multi-token keywords; `exclude.taskType: [docs]` + test path globs
- Sibling suite pattern: `src/select/java-spring-hex-ddd.test.ts` [VERIFIED]

**Engine matching (critical):** [VERIFIED: `src/select/select.ts`]
- Keywords: `haystack.includes(needle)` after lower/trim — short needles over-match
- Paths: `picomatch(glob, { dot: true })`
- Empty positive triggers = always-in-phase after phase/scope — **forbidden** for these style rules
- Exclude wins over any positive match
- Axes OR-combine in order taskType → keywords → paths

## Exact Files to Create / Touch

```
aidlc-rules/domain/java-spring/
├── java-spring-logging-audit.md                 # NEW — JS-LOG-01
├── java-spring-api-contract.md                  # NEW — JS-API-01
├── java-spring-saga-outbox.md                   # NEW — JS-EVT-01
└── details/
    ├── java-spring-logging-audit-detail.md      # NEW
    ├── java-spring-api-contract-detail.md       # NEW
    └── java-spring-saga-outbox-detail.md        # NEW

src/select/java-spring-log-api-evt.test.ts       # NEW sibling suite (locked)
src/index/precedence.test.ts                     # TOUCH — inventory 7 → 10
rule-index.json                                  # REBUILD via governance build-index (gitignored durable path)
```

**Do not create:**
- CQRS rule / `java-spring-cqrs-*`
- Binding OpenAPI gate / coverage rule
- Pack README (Phase 18 owns consumer docs)
- Production engine changes under `src/**` excluding tests + inventory lock
- Examples under `examples/` (Phase 16)
- Empty-trigger “always apply logging/API” rule
- New npm dependencies

## Recommended Rule Specs (planner-ready)

### Shared frontmatter defaults (all three)

| Field | Value |
|-------|--------|
| `scope` | `domain` |
| `classification` | `advisory` |
| `severity` | `medium` (style/decision guidance; not bank outbound boundary) |
| `phases` | `[construction]` only |
| `detailPath` | `details/<id>-detail.md` |
| `enforcement` | omit |
| `exclude.taskType` | `[docs]` |
| `exclude.paths` | `**/*Test*`, `**/*Tests*`, `**/src/test/**` |

### 1) `java-spring-logging-audit` (JS-LOG-01 / JAVA-LOG-01)

**Summary (one sentence, ≤160 chars):**  
`Propagate correlation/trace ids via MDC, never log PII or secrets, and emit audit events for state-changing operations.`

(~119 chars — inject-safe.) [VERIFIED: length probe]

**Body heading:** `## Rule JS-LOG-01: Correlation, No-PII Logging & Audit`

**Recommended frontmatter triggers:**

```yaml
triggers:
  keywords:
    - correlation-id
    - trace-id
    - mdc
    - audit-log
    - structured-logging
  paths:
    - "**/logging/**"
    - "**/config/*Log*"
    - "**/aop/**"
    - "**/*Correlation*Filter*"
    - "**/*Mdc*Filter*"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
```

**Keyword discipline (locked + probed):** [VERIFIED: local substring probes]
- **Use:** locked multi-token list only (`correlation-id`, `trace-id`, `mdc`, `audit-log`, `structured-logging`).
- **Never add bare:** `log` (hits `login`, `catalog`, `dialog`, `prolog`, `logger`, `logging`), `logger`, `audit` alone is riskier (`auditor` OK-ish but prefer `audit-log`), `correlation` alone, `trace` alone.
- **`mdc` is short but safe** for bank vocabulary in probes (hits `mdc-context` intentionally).

**Path discretion — filter breadth (recommended):**

| Glob | Hits (probed) | Verdict |
|------|---------------|---------|
| `**/filter/**` | `AuthFilter`, any security filter | **Too broad** — security/auth filter edits would inject logging essays |
| `**/*Correlation*Filter*`, `**/*Mdc*Filter*` | Correlation/MDC filters only | **Prefer** — covers common Spring filter placement without AuthFilter noise |
| Locked seeds `**/logging/**`, `**/config/*Log*`, `**/aop/**` | MdcFilter package, LogbackConfig, AuditAspect | **Keep** |

CONTEXT allows this discretion. Planner should **not** ship bare `**/filter/**`.

**Body / detail must encode:**
- Propagate correlation id and/or trace id on the request path (MDC / structured fields).
- Never log PAN/PII/secrets/tokens (denylist examples in detail).
- Audit events for state-changing / money-moving operations: actor + action + outcome (+ correlation id).
- Prefer structured logging fields over free-text concatenation of sensitive data.
- Verification checklist + `BODY_CANARY java-spring-logging-audit`.

### 2) `java-spring-api-contract` (JS-API-01 / JAVA-API-01)

**Summary (one sentence, ≤160 chars):**  
`Treat OpenAPI as source-of-truth or generated-and-checked; use one org versioning policy and a uniform error envelope (code, message, correlationId).`

(~149 chars.) [VERIFIED: length probe]

**Body heading:** `## Rule JS-API-01: OpenAPI, Versioning & Error Envelope`

**Recommended frontmatter triggers:**

```yaml
triggers:
  keywords:
    - openapi
    - api-version
    - error-envelope
    - swagger-spec
  paths:
    - "**/api/**"
    - "**/openapi/**"
    - "**/*Resource.java"
    - "**/web/**"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
```

**Keyword discipline:**
- **Use only:** `openapi`, `api-version`, `error-envelope`, `swagger-spec`.
- **Never bare:** `rest` (hits `restore`, `forest`, `interest` — Phase 13 CR class), `api` alone (hits every `openapi` signal and many non-API tasks if signal is just `api`), `swagger` alone is lower risk but prefer `swagger-spec` / `openapi` per CONTEXT seeds.
- Do **not** reintroduce Phase 13 bare `rest` needle.

**Path notes:**
- Path-primary is intentional: controller/API package work should get contract guidance even without OpenAPI keywords.
- **Expected overlap with `java-spring-inbound-rest`:** paths `**/api/**` and `**/web/**` also match inbound REST. Construction API work may select **both** thin-controller and contract rules. That is correct; do **not** mutual-exclude. [VERIFIED: picomatch probe]

**Body / detail must encode:**
- OpenAPI is source-of-truth **or** generated-and-checked in CI (either is fine; pick a process and stick to it).
- **One org versioning policy default (discretion locked here):** **URI path versioning** (`/api/v1/...`) as the default documented policy; header versioning is an allowed alternative only if the org standardizes on it instead — never mix both in one service without an explicit migration plan.
- Uniform error envelope fields: `code`, `message`, `correlationId` (optional `details` array in detail prose).
- Cross-link: correlation id aligns with JS-LOG-01; thin controllers remain JS-IN-01.
- Verification checklist + `BODY_CANARY java-spring-api-contract`.
- **Not binding:** no file-presence gate this phase (deferred).

### 3) `java-spring-saga-outbox` (JS-EVT-01 / JAVA-EVT-01)

**Summary (one sentence, ≤160 chars):**  
`Use outbox for same-TX DB+message, saga only for multi-service business TX, and plain calls for single-service ACID—no saga cargo-cult.`

(~135 chars.) [VERIFIED: length probe]

**Body heading:** `## Rule JS-EVT-01: Saga, Outbox & Plain-Call Decisions`

**Recommended frontmatter triggers:**

```yaml
triggers:
  keywords:
    - saga
    - outbox
    - transactional-outbox
    - choreography
    - orchestration
    - distributed-transaction
  paths:
    - "**/outbox/**"
    - "**/saga/**"
    - "**/messaging/**"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
```

**Keyword discipline:**
- **Use:** locked list. Probes show `saga`, `outbox`, `choreography`, `orchestration` do not substring-match unrelated bank tokens the way `event` / `rest` / `log` do. [VERIFIED: local probes]
- **Never bare:** `event` (hits `prevent-duplicate`, `eventual-consistency` — Phase 14 CR), `message` alone, `transaction` alone (too broad for every DB TX task).
- Prefer `transactional-outbox` and `distributed-transaction` for multi-token precision; keep short `saga`/`outbox` because they are distinctive pattern names and CONTEXT-locked.

**Path notes:**
- `**/messaging/**` may co-select with inbound Kafka only when Kafka listener globs also match; plain `messaging/EventRelay.java` selects EVT without forcing Kafka. Expected; suite should not treat co-selection as failure when both globs hit.

**Body / detail must encode decision table (mandatory when-NOT):**

| Situation | Choose | Do not |
|-----------|--------|--------|
| Single service, local ACID enough | Plain application call / local TX | Saga orchestration/choreography cargo-cult |
| Same service must update DB **and** publish message atomically | Transactional outbox (+ idempotent consumers) | Dual-write without outbox; 2PC |
| Business transaction spans multiple services / DBs | Saga (orchestration or choreography) | Distributed 2PC; pretend one local TX spans services |
| Consumer receives outbox/saga messages | Idempotent handling (align JS-IN-02) | Assume exactly-once without dedupe |

Grounding: microservices.io Transactional Outbox + Saga — outbox when DB commit must imply message publish; saga when multi-service local TXs replace 2PC; drawbacks include compensation complexity and lack of isolation. [CITED: microservices.io/patterns/data/transactional-outbox.html] [CITED: microservices.io/patterns/data/saga.html]

Also encode:
- Outbox relay may deliver duplicates → consumers must be idempotent.
- Compensating transactions required for saga failure paths.
- Domain events naming remains tactical DDD (JS-DDD-01); this rule is about **distributed consistency choices**, not past-tense naming.
- Verification checklist + `BODY_CANARY java-spring-saga-outbox`.

### Overlap behavior (expected, not a bug)

| Pair | When | Action |
|------|------|--------|
| API contract + inbound REST | `**/api/**`, `**/web/**`, Resource/Controller work | Both may select — keep both |
| Saga/outbox + inbound Kafka | messaging/kafka listener paths | Both may select when globs overlap |
| Logging + anything | Only when logging paths/keywords fire | Independent |
| EVT + DDD | Domain event naming vs distributed TX | Different concerns; no mutual exclude |

### Summaries language checklist (suite-assertable)

| Rule | Summary must convey |
|------|---------------------|
| LOG | correlation/trace + no PII/secrets + audit for state-changing ops |
| API | OpenAPI source-of-truth or generated-and-checked + one versioning policy + error envelope fields |
| EVT | outbox for same-TX DB+message + saga only multi-service + plain call for single-service ACID / no cargo-cult |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Existing pack toolchain | in-repo | gray-matter, picomatch, ajv, node:test | Engine frozen; content-only phase |
| Node.js | ≥22 | Runtime | Matches package engines |
| TypeScript | ^6.0.3 | Tests compile via `tsc -p tsconfig.json` | Existing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| — | — | — | No new deps |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Content-only rules | New SelectionConfig fields (`serviceClass`, `apiMode`) | Rejected — engine freeze |
| Binding OpenAPI gate | Advisory contract rule | Binding deferred; would need real adapter |
| Always-on logging rule | Empty triggers | Rejected — context bloat after subscribe |
| Bare FEATURES keywords (`log`, `rest`, `event`) | Multi-token locked lists | FEATURES lists partially stale post Phase 13 CR |

**Installation:** none — zero new packages.

## Package Legitimacy Audit

> No external packages are installed this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | N/A — content + tests only |

**Packages removed due to [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
TaskSignal (taskType, keywords[], paths[])
        +
SelectionConfig { phase: construction, domains: ["java-spring"]? }
        │
        ▼
┌────────────────────────────────────┐
│ aidlc-rules/domain/java-spring/    │
│  Phase13×4 + Phase14×2 + Phase15×3 │──► buildIndex → rule-index.json (no bodies)
│  details/*-detail.md               │     (details/ skipped by loader)
└────────────────────────────────────┘
        │
        ▼
 select() gates: phase → domain subscribe → triggers/exclude
        │
        ├─ domains=[]              → LOG/API/EVT skipped out-of-scope
        ├─ README / docs           → no match or exclude
        ├─ **/logging/** / MDC     → logging-audit
        ├─ **/api/** / openapi     → api-contract (+ often inbound-rest)
        ├─ **/outbox/** / saga/**  → saga-outbox
        └─ single-service CRUD kw  → EVT only if saga/outbox keywords fire (path-empty)
        │
        ▼
 renderInjection() → summaries only (no BODY_CANARY, no ## Rule JS-LOG/API/EVT essays)
        │
        ▼ on demand
 governance rule-detail <id> → details/*-detail.md (decision tables, denylists)
```

### Recommended Project Structure

```
aidlc-rules/domain/java-spring/     # pack root (subscription name: java-spring)
├── java-spring-*.md                # selectable summaries + short bodies
└── details/
    └── java-spring-*-detail.md     # lazy essays / decision tables (not indexed)

src/select/
├── java-spring-pack.test.ts        # Phase 13 (leave PACK_IDS four-rule narrative intact)
├── java-spring-hex-ddd.test.ts     # Phase 14
└── java-spring-log-api-evt.test.ts # Phase 15 NEW

src/index/precedence.test.ts        # real-corpus inventory lock 7 → 10
```

### Pattern 1: Path-primary + multi-token keywords
**What:** Prefer package/type path globs for construction file work; use multi-token keywords for prose-only tasks.  
**When:** All three Phase 15 rules (same as Phase 13–14 after CR).

### Pattern 2: Sibling suite per phase additive growth
**What:** Keep Phase 13 `PACK_IDS` and Phase 14 `HEX_DDD_IDS` suites stable; prove new ids in `java-spring-log-api-evt.test.ts`.  
**When:** Additive pack growth across v4.0 phases.

### Pattern 3: Decision-table detail for anti-cargo-cult rules
**What:** EVT detail is a decision matrix with explicit when-NOT rows, not a saga tutorial.  
**When:** JAVA-EVT-01 — core differentiator vs “event-driven always”.

### Anti-Patterns to Avoid
- **Empty `triggers: {}`** — always-on spam after subscribe.
- **Bare short needles** (`log`, `logger`, `rest`, `api`, `event`, `message`, `transaction`) — Phase 13/14 CR class.
- **Bare `**/filter/**`** — Auth/security filter false positives.
- **Essay summaries / multi-line summaries** — core-value failure.
- **`classification: binding` without adapter** — theater (OpenAPI file presence, coverage).
- **Saga mandatory on every service** — FEATURES anti-feature; microservices.io does not require it for single-service ACID.
- **Mutual-exclude API vs inbound REST** — wrong; both apply on API paths.
- **Mega-rule combining LOG+API+EVT** — CONTEXT locks three separate rules.
- **CQRS content smuggled into EVT** — deferred.
- **Production engine edits “just for a keyword”** — engine freeze.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distributed TX selection engine | New config flags / embeddings | Existing path+keyword triggers + decision detail | Engine frozen; audit-simple |
| OpenAPI CI enforcement | Binding gate without parser | Advisory summary + consumer CI later | Out of scope this phase |
| PII redaction runtime | Custom log scrubber product | Advisory denylist in detail | Overlay is guidance, not a logging SDK |
| Frontmatter parse | Custom YAML | gray-matter + Ajv (existing) | Fail-loud |
| Path matching | Hand regex | picomatch via select | Deterministic |
| Body quarantine | Trust authors | `details/` skip + canary tests | Core value |
| False-positive prevention | Hope | Suite negatives + multi-token needles | Phase 13 CR lesson |
| Inventory drift | Forget precedence lock | Update expectedIds 7 → 10 | Ship surface correctness |

**Key insight:** Phase 15 fails only if triggers are noisy, when-NOT guidance is missing from EVT, or inventory/suite proofs are incomplete — not because the engine lacks features.

## Common Pitfalls

### Pitfall 1: Bare keyword needles (`log` / `logger` / `rest` / `api` / `event`)
**What goes wrong:** `log` selects on `login`/`catalog`/`dialog`; `rest` on `interest`/`restore`; `event` on `prevent-duplicate`.  
**Why it happens:** `matchKeywords` is substring needle-in-haystack. [VERIFIED: select.ts]  
**How to avoid:** Only locked multi-token lists; suite keyword-only negatives for bank vocabulary without matching paths.  
**Warning signs:** Non-logging/API/saga tasks inject these three rules.

### Pitfall 2: Bare `**/filter/**` for logging
**What goes wrong:** Every AuthFilter/SecurityFilterChain edit injects logging guidance.  
**How to avoid:** Use `**/*Correlation*Filter*` / `**/*Mdc*Filter*` (discretion) + locked logging/config/aop paths.  
**Warning signs:** Security-only path work selects JS-LOG-01.

### Pitfall 3: Missing when-NOT on saga rule
**What goes wrong:** LLMs invent saga orchestrators for 3-endpoint single-DB CRUD (FEATURES anti-feature).  
**How to avoid:** Summary + detail decision table with explicit single-service ACID → plain call row; suite asserts summary language includes cargo-cult / plain-call / multi-service cues.  
**Warning signs:** Detail is only “how to implement saga” without skip criteria.

### Pitfall 4: Essay summaries / multi-line summaries
**What goes wrong:** Token budget overflow; inject becomes architecture dump.  
**How to avoid:** ≤160 chars, one sentence, no `\n`; assert in suite like JAVA-PACK-02.

### Pitfall 5: Empty or always-on triggers
**What goes wrong:** Every subscribed construction task gets LOG+API+EVT.  
**How to avoid:** Non-empty path/keyword positives; exclude docs/tests; negative README case.

### Pitfall 6: Index body leak / details indexed
**What goes wrong:** Canary in `rule-index.json` or detail file becomes a rule.  
**How to avoid:** `details/` placement; hygiene asserts; rebuild index after authoring.

### Pitfall 7: Editing production engine
**What goes wrong:** Breaks engine freeze / upgrade story.  
**How to avoid:** Content + tests only; inventory lock is the only non-suite test touch.

### Pitfall 8: Forgetting precedence inventory 7 → 10
**What goes wrong:** `precedence.test.ts` fails after content lands, or worse, is not updated and suite stays stale.  
**How to avoid:** Plan task updates `expectedIds` to include the three new ids (sorted).  
**Warning signs:** Real corpus length assertion still expects 7.

### Pitfall 9: Breaking Phase 13/14 suites by rewriting their ID lists
**What goes wrong:** Phase 13 exact-count narratives rewritten incorrectly.  
**How to avoid:** Sibling suite for LOG/API/EVT; leave `PACK_IDS` / `HEX_DDD_IDS` intact.

### Pitfall 10: Treating API∩REST co-selection as a bug
**What goes wrong:** Incorrect mutual excludes remove thin-controller or contract guidance.  
**How to avoid:** Assert both may select on `**/api/**` / `**/web/**`.

### Pitfall 11: Inception / docs noise
**What goes wrong:** Discuss-phase or README tasks inject contract/saga essays.  
**How to avoid:** `phases: [construction]` only; `exclude.taskType: [docs]`.

### Pitfall 12: Forgetting index rebuild
**What goes wrong:** CLI consumers of local `rule-index.json` miss new ids.  
**How to avoid:** Plan task: `node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json` after `npm run build`. Suite uses live `buildIndex` so unit tests pass even if index file stale — still rebuild for ship surface. [CITED: docs/governance-workflow.md]

## Code Examples

### Minimal logging rule skeleton

```markdown
---
id: java-spring-logging-audit
scope: domain
triggers:
  keywords:
    - correlation-id
    - trace-id
    - mdc
    - audit-log
    - structured-logging
  paths:
    - "**/logging/**"
    - "**/config/*Log*"
    - "**/aop/**"
    - "**/*Correlation*Filter*"
    - "**/*Mdc*Filter*"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
severity: medium
summary: Propagate correlation/trace ids via MDC, never log PII or secrets, and emit audit events for state-changing operations.
classification: advisory
detailPath: details/java-spring-logging-audit-detail.md
---

## Rule JS-LOG-01: Correlation, No-PII Logging & Audit

Propagate correlation and trace identifiers via MDC (or equivalent structured fields). Never log PII, PAN, secrets, or tokens. Emit audit events for state-changing operations with actor, action, outcome, and correlation id.

### Verification

- Confirm request path propagates correlation/trace ids into logs.
- Confirm no PII/secrets appear in log statements or structured fields.
- Confirm state-changing operations emit audit events with actor and outcome.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-logging-audit -->
```

### Minimal API contract rule skeleton

```markdown
---
id: java-spring-api-contract
scope: domain
triggers:
  keywords:
    - openapi
    - api-version
    - error-envelope
    - swagger-spec
  paths:
    - "**/api/**"
    - "**/openapi/**"
    - "**/*Resource.java"
    - "**/web/**"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
severity: medium
summary: Treat OpenAPI as source-of-truth or generated-and-checked; use one org versioning policy and a uniform error envelope (code, message, correlationId).
classification: advisory
detailPath: details/java-spring-api-contract-detail.md
---

## Rule JS-API-01: OpenAPI, Versioning & Error Envelope

Treat OpenAPI as the API source of truth or generate-and-check it in CI. Apply exactly one org versioning policy (default URI path `/v1`). Return a uniform error envelope with `code`, `message`, and `correlationId`.

### Verification

- Confirm OpenAPI is either authored as source-of-truth or generated and checked.
- Confirm a single versioning policy is used (not mixed URI+header ad hoc).
- Confirm error responses include `code`, `message`, and `correlationId`.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-api-contract -->
```

### Minimal saga/outbox rule skeleton

```markdown
---
id: java-spring-saga-outbox
scope: domain
triggers:
  keywords:
    - saga
    - outbox
    - transactional-outbox
    - choreography
    - orchestration
    - distributed-transaction
  paths:
    - "**/outbox/**"
    - "**/saga/**"
    - "**/messaging/**"
  exclude:
    taskType:
      - docs
    paths:
      - "**/*Test*"
      - "**/*Tests*"
      - "**/src/test/**"
phases:
  - construction
severity: medium
summary: Use outbox for same-TX DB+message, saga only for multi-service business TX, and plain calls for single-service ACID—no saga cargo-cult.
classification: advisory
detailPath: details/java-spring-saga-outbox-detail.md
---

## Rule JS-EVT-01: Saga, Outbox & Plain-Call Decisions

Prefer the simplest consistency mechanism that is correct. Single-service ACID → plain local call. Same-TX database update plus message publish → transactional outbox. Multi-service business transaction → saga (orchestration or choreography) with compensations. Do not cargo-cult sagas onto single-service flows.

### Verification

- Confirm single-service ACID flows do not introduce saga machinery.
- Confirm DB+message atomicity uses outbox (or equivalent), not dual-write without relay.
- Confirm multi-service workflows use saga with explicit compensations and idempotent consumers.
- Confirm docs tasks and test sources are excluded from this guidance injection.

<!-- BODY_CANARY java-spring-saga-outbox -->
```

### Suite selection probe shape (sibling test)

```typescript
// Source: Phase 14 java-spring-hex-ddd.test.ts pattern [VERIFIED]
const LOG_API_EVT_IDS = [
  "java-spring-logging-audit",
  "java-spring-api-contract",
  "java-spring-saga-outbox",
] as const;

const SUBSCRIBED = { phase: "construction" as const, domains: ["java-spring"] };

// domains=[] + rich signal → none; skip out-of-scope
// path .../logging/MdcFilter.java → logging-audit
// path .../config/LogbackConfig.java → logging-audit
// path .../aop/AuditAspect.java → logging-audit
// path .../filter/CorrelationIdFilter.java → logging-audit (tight filter globs)
// path .../filter/AuthFilter.java → NOT logging-audit
// path .../api/PaymentResource.java → api-contract (and often inbound-rest)
// path .../openapi/openapi.yaml → api-contract
// path .../outbox/OutboxPublisher.java → saga-outbox
// path .../saga/OrderSaga.java → saga-outbox
// path .../messaging/EventRelay.java → saga-outbox
// keywords ["correlation-id"] paths [] → logging-audit
// keywords ["openapi"] paths [] → api-contract
// keywords ["saga"] / ["outbox"] paths [] → saga-outbox
// keywords ["login","catalog"] paths [] → none (no bare log)
// keywords ["interest-rate"] paths [] → none (no bare rest)
// keywords ["prevent-duplicate"] paths [] → none (no bare event)
// taskType docs + logging path → none
// *Test* / src/test → none
// phase inception → out-of-phase
// renderInjection: summaries present; BODY_CANARY and ## Rule JS-LOG/API/EVT absent
// precedence.test.ts expectedIds length 10 including the three new ids
```

## Test Plan

### Recommendation (locked)

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Extend pack or hex-ddd suite | Shared helpers | Mixes era narratives; large files | Not preferred |
| **Sibling `java-spring-log-api-evt.test.ts`** | Isolates JAVA-LOG/API/EVT; leaves Phase 13–14 inventories alone; clear CR regression home | Slight helper duplication | **Locked by CONTEXT** |

### TDD wave shape (mirror Phase 13–14)

1. **Wave 1 (RED):** Author sibling suite + update `precedence.test.ts` expected list to 10 ids — fails until content exists (or fails length until rules land).
2. **Wave 2 (GREEN):** Author three rules + three details; rebuild index; suite green; full `npm test` green.

### Required cases (map to ROADMAP success criteria)

| # | Case | Expect |
|---|------|--------|
| 1 | `domains=[]` + rich log/api/evt signal | None of three selected; skip `out-of-scope` |
| 2 | Subscribed + `.../logging/MdcFilter.java` | logging-audit |
| 3 | Subscribed + `.../config/LogbackConfig.java` | logging-audit |
| 4 | Subscribed + `.../aop/AuditAspect.java` | logging-audit |
| 5 | Subscribed + correlation/MDC filter path | logging-audit |
| 6 | Subscribed + `.../api/PaymentResource.java` | api-contract |
| 7 | Subscribed + `.../openapi/...` | api-contract |
| 8 | Subscribed + `.../web/*Controller.java` | api-contract (overlap with inbound-rest OK) |
| 9 | Subscribed + `.../outbox/...` | saga-outbox |
| 10 | Subscribed + `.../saga/...` | saga-outbox |
| 11 | Subscribed + `.../messaging/EventRelay.java` | saga-outbox |
| 12 | Keyword-only positives for each locked multi-token list | matching rule |
| 13 | README.md / non-matching path only | none of three |
| 14 | `taskType: docs` + matching path | none (exclude) |
| 15 | `**/src/test/**` or `*Test*` path | none |
| 16 | `phase: inception` + matching path | none; skip `out-of-phase` |
| 17 | Summary contract | one line, ≤160, advisory, domain, detailPath set |
| 18 | Inject quarantine | summary present; no BODY_CANARY; no `## Rule JS-LOG-01` / `JS-API-01` / `JS-EVT-01` |
| 19 | Hygiene | details not indexed; canaries ∉ `JSON.stringify(index)` |
| 20 | Real corpus inventory | `precedence.test.ts` expects 10 sorted winners including three new ids |

### CR regression negatives (mandatory)

| # | Signal | Must NOT select |
|---|--------|-----------------|
| N1 | keywords `["login"]` or `["catalog"]` or `["dialog"]`, paths `[]` | logging-audit (no bare `log`) |
| N2 | keywords `["logger"]` alone if not also multi-token, paths `[]` | none of three if only bare logger — **do not add `logger` as trigger** |
| N3 | keywords `["interest-rate"]` / `["restore"]`, paths `[]` | api-contract (no bare `rest`) |
| N4 | keywords `["prevent-duplicate"]` / `["eventual-consistency"]`, paths `[]` | saga-outbox (no bare `event`) |
| N5 | path `.../filter/AuthFilter.java` or `.../security/SecurityFilterChain.java` | logging-audit (no bare `**/filter/**`) |
| N6 | keywords `["transaction"]` alone, paths `[]` | saga-outbox (do not add bare `transaction`) |
| N7 | path domain service only (no log/api/evt globs), keywords bank terms only | none of three |

### Summary language asserts (recommended)

- LOG: `/correlation|trace|mdc|pii|secret|audit/i`
- API: `/openapi/i` + `/version/i` + `/error|envelope|correlationid|correlation id/i`
- EVT: `/outbox/i` + `/saga/i` + (`plain` or `single-service` or `cargo-cult` or `acid`)

### Inventory lock snippet (precedence.test.ts)

```typescript
// After Phase 15 — 1 enterprise + 9 java-spring = 10
const expectedIds = [
  "require-mfa",
  "java-spring-svc-internal-outbound",
  "java-spring-svc-internet-outbound",
  "java-spring-inbound-rest",
  "java-spring-inbound-kafka",
  "java-spring-hex-layering",
  "java-spring-ddd-tactical",
  "java-spring-logging-audit",
  "java-spring-api-contract",
  "java-spring-saga-outbox",
].sort();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Always-on logging/API essays in prompt | Path/keyword triggered one-sentence summaries + `detailPath` | v1 inject + v4 pack | Core value preserved |
| FEATURES research bare keywords `log`, `rest`, `event` | Multi-token only after Phase 13 CR | 2026-07-09/10 | Avoid bank false positives |
| “Event-driven everywhere” | Decision table with when-NOT (plain call / outbox / saga) | Phase 15 CONTENT | Prevents cargo-cult |
| Binding OpenAPI presence check | Advisory only | v4.0 scope | No theater without adapter |
| microservices.io 2PC alternatives | Outbox + saga as content guidance | pattern literature | Grounds when-NOT prose |

**Deprecated/outdated for this phase:**
- Authoring from early FEATURES keyword lists that include bare `log`/`logger`/`rest` without CR filters.
- Research fantasy filenames; use locked kebab ids `java-spring-logging-audit` / `java-spring-api-contract` / `java-spring-saga-outbox`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tight correlation/MDC filter globs are preferable to bare `**/filter/**` under CONTEXT discretion | Rule specs / pitfalls | If org places all logging only under generic `filter/` without Correlation/Mdc in type names, under-inject — mitigate with `**/logging/**` + keywords |
| A2 | URI path versioning is the right **default** org policy to document in detail | API detail | If bank standard is header-only, detail text needs one-line swap — engine unaffected |
| A3 | Short keywords `saga` / `outbox` / `mdc` are safe enough despite substring matching | Keyword probes | Low for these tokens; suite negatives catch regressions |
| A4 | API∩REST co-selection is desirable | Overlap | If product wants contract-only on openapi paths, would need path narrowing — not locked |

## Open Questions

1. **Filter path final lock**
   - What we know: bare `**/filter/**` is noisy; CONTEXT allows discretion.
   - What's unclear: consumer filter naming conventions beyond Correlation/Mdc.
   - Recommendation: ship tight globs; rely on keywords for prose tasks.

2. **Should `**/rest/**` be added to API paths?**
   - What we know: CONTEXT lists api/openapi/Resource/web only; inbound-rest already covers `**/rest/**`.
   - Recommendation: do **not** add unless suite shows contract gaps; avoids double-authoring path sprawl.

3. **Eval corpus extension (JAVA-EVAL-01)**
   - Deferred this milestone; Phase 15 suite is sufficient for pack proof.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests / build | ✓ | v24.14.0 | — |
| npm | scripts | ✓ | 11.9.0 | — |
| `npm test` (node:test + dist-test) | suite proof | ✓ | package.json scripts | — |
| `bin/governance.cjs build-index` | rebuild rule-index.json | ✓ | in-repo after `npm run build` | suite uses live `buildIndex` |
| New npm packages | — | n/a | — | not required |
| Java / Spring runtime | — | n/a | — | content-only phase; consumer owns Java |

**Missing dependencies with no fallback:** none  
**Missing dependencies with fallback:** none material

Step 2.6: no blocking external services for this content phase.

## Validation Architecture

> `workflow.nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` (via `npm test` → `dist-test/**/*.test.js`) |
| Config file | `package.json` scripts (`pretest`: `build` + `build:test`; `test`: `node --test "dist-test/**/*.test.js"`) |
| Quick run command | `npm test -- --test-name-pattern="java-spring-log-api-evt|logging-audit|api-contract|saga-outbox|real corpus"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JAVA-LOG-01 | Subscribed + logging paths/keywords select `java-spring-logging-audit`; summary encodes correlation/no-PII/audit; inject quarantine | unit | `npm test -- --test-name-pattern="JAVA-LOG|logging-audit"` | ❌ Wave 0 |
| JAVA-API-01 | Subscribed + api/openapi paths/keywords select `java-spring-api-contract`; summary encodes OpenAPI/version/envelope; inject quarantine | unit | `npm test -- --test-name-pattern="JAVA-API|api-contract"` | ❌ Wave 0 |
| JAVA-EVT-01 | Subscribed + saga/outbox/messaging select `java-spring-saga-outbox`; when-NOT language present; inject quarantine | unit | `npm test -- --test-name-pattern="JAVA-EVT|saga-outbox"` | ❌ Wave 0 |
| Inventory | Real corpus winners = 10 ids | unit | `npm test -- --test-name-pattern="real corpus"` | ✅ exists (must update expectedIds) |
| CR negatives | bare log/rest/event/filter traps silent | unit | same sibling suite | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** focused pattern run for touched suite + precedence
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/select/java-spring-log-api-evt.test.ts` — covers JAVA-LOG-01 / JAVA-API-01 / JAVA-EVT-01 matrices + CR negatives + inject quarantine
- [ ] `aidlc-rules/domain/java-spring/java-spring-logging-audit.md` + detail
- [ ] `aidlc-rules/domain/java-spring/java-spring-api-contract.md` + detail
- [ ] `aidlc-rules/domain/java-spring/java-spring-saga-outbox.md` + detail
- [ ] Update `src/index/precedence.test.ts` inventory 7 → 10
- [ ] Rebuild `rule-index.json` after content lands
- [ ] Framework install: none — existing `npm test` sufficient

## Security Domain

> `security_enforcement` enabled; phase is content + unit tests (no new network/auth surface). Logging rule content **names** PII/secrets as anti-patterns (advisory), which is intentional governance guidance.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | Domain subscription already gates pack (not new) |
| V5 Input Validation | yes (existing) | Ajv frontmatter schema on build-index; no new parsers |
| V6 Cryptography | no | — |
| Logging / sensitive data (content) | yes (advisory) | JS-LOG-01 no-PII/secrets guidance; not a runtime scrubber |

### Known Threat Patterns for rule-pack content

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Context-bloat / prompt stuffing via essay summaries | Denial of service (context) | One-sentence summary contract + inject tests |
| Over-injection of wrong guidance (selection false positive) | Elevation of privilege (process) | Multi-token needles + tight paths + suite negatives |
| Saga cargo-cult over-engineering | Tampering (architecture quality) | Explicit when-NOT decision table in EVT |
| Binding theater without enforcement | Spoofing (compliance) | `classification: advisory` only |
| PII leakage encouragement via bad examples | Information disclosure | Detail denylist; never show real PAN/secret samples |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/15-logging-api-contract-saga-decision-rules/15-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md` — JAVA-LOG-01, JAVA-API-01, JAVA-EVT-01
- `.planning/ROADMAP.md` — Phase 15 success criteria
- `src/select/select.ts` — keyword substring + picomatch path matching
- `src/select/java-spring-hex-ddd.test.ts` — sibling suite pattern
- `src/select/java-spring-pack.test.ts` — pack suite + CR lessons
- `src/index/precedence.test.ts` — real-corpus inventory lock (7 winners today)
- `aidlc-rules/domain/java-spring/*.md` — Phase 13–14 pack templates
- Local picomatch + substring probes (log/rest/event/filter/globs) — 2026-07-10
- `docs/rule-authoring.md` — frontmatter contract
- `package.json` — test/build scripts; zero new deps needed

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — logging / API / saga expected behavior (keyword lists partially stale)
- microservices.io Transactional Outbox — when DB commit must imply message publish [CITED: https://microservices.io/patterns/data/transactional-outbox.html]
- microservices.io Saga — multi-service local TX sequence; compensations; not for free when single-service ACID suffices [CITED: https://microservices.io/patterns/data/saga.html]
- `.planning/phases/14-.../14-RESEARCH.md` — authoring/proof template reused

### Tertiary (LOW confidence)
- Org-specific preference for URI vs header API versioning beyond default recommendation — documented as A2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; reuse Phase 13–14 toolchain
- Architecture: HIGH — frozen engine + verified pack layout + matching semantics
- Pitfalls: HIGH — Phase 13 CR + in-session false-positive probes + microservices.io when-NOT grounding

**Research date:** 2026-07-10  
**Valid until:** 2026-08-09 (stable content phase; revalidate if select matching semantics change)

---

## RESEARCH COMPLETE

**Phase:** 15 - Logging, API Contract & Saga Decision Rules  
**Confidence:** HIGH

### Key Findings
- Ship exactly three advisory rules: `java-spring-logging-audit` (JS-LOG-01), `java-spring-api-contract` (JS-API-01), `java-spring-saga-outbox` (JS-EVT-01); engine frozen; zero new npm deps.
- Multi-token keywords only — ban bare `log`/`logger`/`rest`/`api`/`event`; do not use bare `**/filter/**` (prefer Correlation/Mdc filter globs).
- EVT must include explicit when-NOT: single-service ACID → plain call; outbox for same-TX DB+message; saga for multi-service TX (microservices.io-aligned).
- Prove with sibling suite `java-spring-log-api-evt.test.ts` + grow `precedence.test.ts` inventory **7 → 10**.
- API∩inbound-REST co-selection on `**/api/**` / `**/web/**` is expected; default OpenAPI versioning policy in detail = URI path `/v1`.

### File Created
`.planning/phases/15-logging-api-contract-saga-decision-rules/15-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Content-only; existing gray-matter/picomatch/ajv/node:test |
| Architecture | HIGH | Pack + select/inject verified in-repo |
| Pitfalls | HIGH | Phase 13 CR + live probes + pattern literature |

### Open Questions
- Final filter-path naming conventions for consumers (recommend tight Correlation/Mdc globs).
- Header-only versioning orgs may swap detail default (engine unaffected).

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
