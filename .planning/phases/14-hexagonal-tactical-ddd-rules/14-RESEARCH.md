# Phase 14: Hexagonal + Tactical DDD Rules - Research

**Researched:** 2026-07-10
**Domain:** Domain rule-pack content (java-spring) — Hexagonal layering + tactical DDD on frozen select/inject engine
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Ship **exactly two** rules matching REQUIREMENTS: `java-spring-hex-layering` (heading `## Rule JS-HEX-01`) and `java-spring-ddd-tactical` (heading `## Rule JS-DDD-01`).
- Both **`classification: advisory`** — ArchUnit/consumer binding is out of scope; no binding-without-adapter theater.
- Live under existing pack root **`aidlc-rules/domain/java-spring/`** (same subscription name as Phase 13).
- **CQRS out of phase** — JAVA-CQRS-01 deferred from v4.0; do not author a cqrs rule here.
- **Hexagonal (path-primary):** paths `**/domain/**`, `**/application/**`, `**/adapter/**`, `**/adapters/**`, `**/port/**`, `**/ports/**`; multi-token keywords `hexagonal`, `ports-and-adapters`, `inbound-port`, `outbound-port`.
- **DDD tactical (path-primary):** paths `**/domain/**`, `**/*Aggregate*`, `**/*Entity*`, `**/*ValueObject*`, `**/*DomainEvent*`; multi-token keywords `aggregate-root`, `value-object`, `domain-event`, `tactical-ddd` — **no bare** `entity` / `event` / `rest`-style short needles (Phase 13 CR lessons).
- **`phases: [construction]` only** for both rules.
- **Excludes:** `taskType: [docs]` plus test path excludes (`**/*Test*`, `**/*Tests*`, `**/src/test/**`) so README/typo and test-only work do not select HEX/DDD.
- **One-sentence summaries** (≤ ~160 chars, no newline); essays only under `details/<id>-detail.md` via `detailPath`.
- Prove with **fixture/unit suite** extending pack proofs (extend `java-spring-pack.test.ts` or sibling hex-ddd suite): `domains=[]` → neither HEX/DDD; subscribed + matching paths → select; unrelated non-Java/README → no select; inject has summary only (no body canaries / `## Rule JS-` essays).
- **Zero production `src/` engine edits** — content + tests only.
- Frontmatter ids kebab `java-spring-hex-layering` / `java-spring-ddd-tactical`; body headings JS-HEX-01 / JS-DDD-01.

### Claude's Discretion
- Exact multi-token keyword lists beyond the seeds above (must avoid substring false positives).
- Whether to co-locate tests in existing pack suite vs new `java-spring-hex-ddd.test.ts`.
- Detail prose depth (package maps, example package trees) as long as inject stays summary-only.
- Whether `**/*Entity*` path is too broad in monorepos — may tighten to `**/domain/**/*Entity*` if suite/false-positive probes require it.

### Deferred Ideas (OUT OF SCOPE)
- CQRS command/query split (JAVA-CQRS-01) — out of v4.0
- Logging / API / saga rules → Phase 15
- Starter examples under `examples/java-spring/` → Phase 16
- Binding coverage GateAdapter → Phase 17
- Consumer docs → Phase 18
- Strategic DDD / context maps — essay-scale, out of tactical pack
- ArchUnit as binding enforcement — consumer-side future, not this overlay
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JAVA-HEX-01 | On construction tasks touching domain/application/adapter paths, inject Hexagonal layering: dependencies point inward; domain has no Spring/JPA/WSO2/framework types | Rule `java-spring-hex-layering` (JS-HEX-01): path-primary globs for domain/application/adapter(s)/port(s) + multi-token hex keywords; one-sentence summary; detail package map; advisory; construction only; docs/test excludes |
| JAVA-DDD-01 | On tasks involving aggregates/entities/domain events, inject tactical DDD: aggregate root per consistency boundary; immutable VOs; past-tense domain event names | Rule `java-spring-ddd-tactical` (JS-DDD-01): path-primary Aggregate/Entity/ValueObject/DomainEvent (+ domain package) + multi-token DDD keywords; no bare entity/event needles; same summary/detail/phase/exclude contract |
</phase_requirements>

## Summary

Phase 14 is a **content + proof** phase on the **frozen** selection engine. Phase 13 already delivered the subscribe-able `java-spring` pack (4 advisory rules + details) and the `src/select/java-spring-pack.test.ts` matrix. This phase adds **exactly two** more advisory rules to the same pack root so construction work on hexagonal package paths or tactical DDD type names injects short layering / aggregate-VO-event guidance — never always-on architecture essays.

Engine behavior is unchanged: `domains: ["java-spring"]` gates the pack; empty positive triggers are forbidden for style rules; keyword matching is **case-insensitive substring** (trigger = needle, signal keyword = haystack); paths use **picomatch** with `dot: true`; inject is summary-only; `details/` is skipped by the loader. Phase 13 code review (CR-01/02/03) proved that bare short needles (`rest`, `consumer`) and over-broad globs (`**/*Listener*`) cause bank-realistic false positives — HEX/DDD authoring must not reintroduce those failure modes.

**Primary recommendation:** Author `java-spring-hex-layering` + `java-spring-ddd-tactical` (+ one detail file each) under `aidlc-rules/domain/java-spring/`, rebuild `rule-index.json`, and lock selection with a **sibling** RED→GREEN suite (`src/select/java-spring-hex-ddd.test.ts`) that reuses the pack’s real `buildIndex(aidlc-rules)` pattern and explicitly includes Phase 13-style false-positive negatives. Tighten DDD entity path to `**/domain/**/*Entity*` (discretion) because bare `**/*Entity*` matches `EntityManagerConfig` / infra scanners.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hexagonal layering guidance | Content store (`aidlc-rules/domain/java-spring/`) | Select path/keyword axes | Style rule is Markdown+frontmatter; engine only matches |
| Tactical DDD naming/boundary guidance | Content store | Select path/keyword axes | Same; no engine schema for “DDD mode” |
| Domain pack subscription | Select pure core (`inScope` / `domains`) | CLI `--domains` | Already shipped Phase 13 |
| Summary injection / lazy detail | Inject + detailPath resolver | CLI `rule-detail` | Frozen; essays never in index |
| Selection correctness proof | Test layer (`node:test`) | Real `aidlc-rules` root via `buildIndex` | Content phase; zero production `src/` edits |
| Binding ArchUnit enforcement | — (out of scope) | Consumer CI (future) | Advisory only this phase |

## Project Constraints (from CLAUDE.md)

| Directive | Planning implication |
|-----------|----------------------|
| Overlay on GSD Core, not a fork | Content under `aidlc-rules/` only; no GSD core patches |
| Context budget: summaries only | One-sentence summaries; full prose only under `details/` |
| Markdown advisory; binding via real gates | Both rules `classification: advisory` (no ArchUnit theater) |
| Vendor strings not hard-coded in `src/` | HEX/DDD content stays vendor-neutral; no WSO2 in these two rules |
| Zero new npm deps | Content + tests only |
| Engine frozen (v1–v3) | Zero production `src/` edits; tests may add under `src/select/` |
| GSD workflow enforcement | Plans/execution go through GSD phase commands |

## Current Pack State (verified)

**Observed layout under `aidlc-rules/domain/java-spring/`:** [VERIFIED: filesystem]

```
aidlc-rules/domain/java-spring/
├── java-spring-svc-internal-outbound.md
├── java-spring-svc-internet-outbound.md
├── java-spring-inbound-rest.md
├── java-spring-inbound-kafka.md
└── details/
    ├── java-spring-svc-internal-outbound-detail.md
    ├── java-spring-svc-internet-outbound-detail.md
    ├── java-spring-inbound-rest-detail.md
    └── java-spring-inbound-kafka-detail.md
```

**Index after Phase 13:** enterprise `require-mfa` + 4 pack winners (suite baseline 444 pass / 0 fail). [VERIFIED: `npm test`]

**Shared authoring contract already proven on pack rules:**
- `scope: domain`, `classification: advisory`, `phases: [construction]`
- `detailPath: details/<id>-detail.md` (relative; loader skips `details/`)
- One-sentence `summary` (suite asserts ≤160 chars, no `\n`)
- Body heading `## Rule JS-…` + `### Verification` + `<!-- BODY_CANARY <id> -->`
- Path-primary + multi-token keywords; `exclude.taskType: [docs]` + test path globs on inbound rules
- Vendor product names only in Markdown where needed (internet-outbound detail); HEX/DDD should stay vendor-neutral

**Engine matching (critical):** [VERIFIED: `src/select/select.ts`]
- Keywords: `haystack.includes(needle)` after lower/trim — short needles over-match
- Paths: `picomatch(glob, { dot: true })`
- Empty positive triggers = always-in-phase after phase/scope — **forbidden** for HEX/DDD
- Exclude wins over any positive match

## Exact Files to Create

```
aidlc-rules/domain/java-spring/
├── java-spring-hex-layering.md                 # NEW — JS-HEX-01
├── java-spring-ddd-tactical.md                 # NEW — JS-DDD-01
└── details/
    ├── java-spring-hex-layering-detail.md      # NEW
    └── java-spring-ddd-tactical-detail.md      # NEW

src/select/java-spring-hex-ddd.test.ts          # NEW sibling suite (recommended)
rule-index.json                                 # REBUILD via governance build-index (gitignored durable path)
```

**Do not create:**
- CQRS rule / `java-spring-cqrs-*`
- Pack README (would be indexed as a rule if plain `.md` with frontmatter risk; Phase 18 owns consumer docs)
- Production engine changes under `src/**` excluding tests
- Examples under `examples/` (Phase 16)
- Empty-trigger “always apply architecture” rule

**Optional touch (not required):** Phase 13 detail forward-pointers already say “Hexagonal → Phase 14”; no need to edit Phase 13 rule bodies for success criteria.

## Recommended Rule Specs (planner-ready)

### Shared frontmatter defaults (both)

| Field | Value |
|-------|--------|
| `scope` | `domain` |
| `classification` | `advisory` |
| `severity` | `medium` (style guidance; not bank outbound boundary) |
| `phases` | `[construction]` only |
| `detailPath` | `details/<id>-detail.md` |
| `enforcement` | omit |
| `exclude.taskType` | `[docs]` |
| `exclude.paths` | `**/*Test*`, `**/*Tests*`, `**/src/test/**` |

### 1) `java-spring-hex-layering` (JS-HEX-01 / JAVA-HEX-01)

**Summary (one sentence, ≤160 chars):**  
`Keep dependencies pointing inward: domain must not import Spring, JPA, or framework/gateway types; adapters implement ports at the edges.`

(~128 chars — inject-safe.)

**Body heading:** `## Rule JS-HEX-01: Hexagonal Layering`

**Recommended frontmatter triggers:**

```yaml
triggers:
  keywords:
    - hexagonal
    - ports-and-adapters
    - inbound-port
    - outbound-port
  paths:
    - "**/domain/**"
    - "**/application/**"
    - "**/adapter/**"
    - "**/adapters/**"
    - "**/port/**"
    - "**/ports/**"
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

**Keyword discipline (discretion locked by probes):**
- **Use:** locked multi-token list only (`hexagonal`, `ports-and-adapters`, `inbound-port`, `outbound-port`).
- **Never add bare:** `port` (hits `report`, `airport`, `support`), `domain` (every domain task sentence), `adapter` alone is lower risk than `port` but path globs already cover adapter packages — prefer **not** adding bare `adapter` keyword.
- **Never add:** `spring`, `java` as positives (always-on noise after subscribe).

**Body / detail must encode:**
- Dependency direction: domain ← application ← adapters (inward only).
- Domain purity: no Spring stereotypes, JPA entities/repos, HTTP clients, gateway SDKs in domain packages.
- Ports are interfaces in application/domain edge; adapters implement them at infrastructure.
- **When-not:** small single-module CRUD may use a thin hexagonal slice (ports + one adapter) without full multi-package ceremony — do not mandate CQRS (out of phase).
- Verification checklist + `BODY_CANARY java-spring-hex-layering`.

### 2) `java-spring-ddd-tactical` (JS-DDD-01 / JAVA-DDD-01)

**Summary (one sentence, ≤160 chars):**  
`Model one aggregate root per consistency boundary; keep value objects immutable; name domain events in past tense.`

(~112 chars.)

**Body heading:** `## Rule JS-DDD-01: Tactical DDD`

**Recommended frontmatter triggers:**

```yaml
triggers:
  keywords:
    - aggregate-root
    - value-object
    - domain-event
    - tactical-ddd
  paths:
    - "**/domain/**"
    - "**/*Aggregate*"
    - "**/domain/**/*Entity*"    # tightened vs bare **/*Entity* (see Pitfalls)
    - "**/*ValueObject*"
    - "**/*DomainEvent*"
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

**Path discretion — Entity glob (recommended tighten):**

| Glob | Hits (probed) | Verdict |
|------|---------------|---------|
| `**/*Entity*` | `OrderEntity`, `PaymentEntityListener`, **`EntityManagerConfig`**, **`JpaEntityScanner`**, persistence `OrderEntity`, tests | **Too broad** — infra/config false positives |
| `**/domain/**/*Entity*` | domain `OrderEntity`, domain `PaymentEntityListener`; misses pure infra Entity* | **Prefer** — still path-primary for domain entities |

CONTEXT allows this tighten. Planner should **lock `**/domain/**/*Entity*`** unless product explicitly wants monorepo-wide `*Entity*` (then add suite negatives for `EntityManagerConfig`).

**Keyword discipline:**
- **Use only:** `aggregate-root`, `value-object`, `domain-event`, `tactical-ddd` (and optional `aggregate-root` synonyms that remain multi-token).
- **Never bare:** `entity` (hits `identity`), `event` (hits `prevent`, `eventual`), `aggregate` alone is safer than `entity` but still prefer `aggregate-root` (CONTEXT seed).
- **Never bare:** `ddd` alone if it collides with unrelated tokens; `tactical-ddd` is explicit.

**Body / detail must encode:**
- One aggregate root per consistency / transactional boundary; no multi-aggregate write without explicit orchestration (application service — not CQRS essay).
- Entities identity-based; value objects immutable and equality by value.
- Domain events **past-tense** names (`OrderPlaced`, not `PlaceOrder` / `OrderPending`).
- Keep strategic DDD / context maps out (forward pointer only).
- **When-not:** simple CRUD internal tools need not invent aggregates for every table.
- Verification checklist + `BODY_CANARY java-spring-ddd-tactical`.

### Overlap behavior (expected, not a bug)

Both rules positively match `**/domain/**`. A construction task editing `.../domain/PaymentAggregate.java` may select **both** HEX and DDD. That is correct: layering + tactical modeling both apply. Suite should assert both can select together; do **not** mutual-exclude HEX vs DDD.

### Summaries language checklist (suite-assertable)

| Rule | Summary must convey |
|------|---------------------|
| HEX | Inward dependencies / domain free of Spring\|JPA\|framework\|gateway types / ports+adapters at edges |
| DDD | Aggregate root per consistency boundary / immutable value objects / past-tense domain events |

## Architecture Patterns

### System Architecture Diagram

```
TaskSignal (taskType, keywords[], paths[])
        +
SelectionConfig { phase: construction, domains: ["java-spring"]? }
        │
        ▼
┌────────────────────────────┐
│ aidlc-rules/               │
│  domain/java-spring/       │
│   Phase13 ×4 + HEX + DDD   │──► buildIndex → rule-index.json (no bodies)
│   details/*-detail.md      │     (details/ skipped by loader)
└────────────────────────────┘
        │
        ▼
 select() gates: phase → domain subscribe → triggers/exclude
        │
        ├─ domains=[]     → HEX/DDD skipped out-of-scope
        ├─ README / docs  → no path/keyword match or exclude
        ├─ **/domain/**   → may select HEX and/or DDD
        └─ *Aggregate*    → DDD (and HEX if under domain/)
        │
        ▼
 renderInjection() → summaries only (no BODY_CANARY, no ## Rule JS-HEX/DDD essays)
        │
        ▼ on demand
 governance rule-detail <id> → details/*-detail.md
```

### Pattern 1: Path-primary architecture rules
**What:** Prefer package/type path globs over vague prose keywords so file-scoped construction work selects correctly.  
**When:** HEX/DDD (same pattern as Phase 13 inbound REST/Kafka after CR fixes).

### Pattern 2: Multi-token keyword needles only
**What:** Trigger keywords must not be short substrings of bank vocabulary.  
**When:** Any keyword axis on this pack.  
**Probed traps:** [VERIFIED: local picomatch + substring probes]
- `port` ⊂ `report`/`airport`/`support`
- `entity` ⊂ `identity`
- `event` ⊂ `prevent`/`eventual`
- bare `**/*Entity*` matches `EntityManagerConfig`

### Pattern 3: Sibling suite for new rule ids
**What:** Keep Phase 13 `PACK_IDS` length assertions stable; prove HEX/DDD in a dedicated suite sharing the same `buildIndex(aidlc-rules)` approach.  
**When:** Additive pack growth across v4.0 phases.

### Anti-Patterns to Avoid
- **Empty `triggers: {}`** — always-on architecture spam after subscribe (PITFALLS #2).
- **Bare short needles** — Phase 13 CR-01/02 class of bugs.
- **Essay summaries** — budget + core-value failure.
- **CQRS content** — deferred; do not sneak into HEX/DDD bodies as mandatory.
- **`classification: binding` without adapter** — theater.
- **Mutual-exclude HEX vs DDD** — wrong; both can apply on domain paths.
- **Mega-rule combining HEX+DDD+CQRS** — CONTEXT locks two separate rules.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Architecture selection engine | New config flags / embeddings | Existing path+keyword triggers | Engine frozen; audit-simple |
| Domain purity enforcement | ArchUnit product in overlay | Advisory summary + consumer ArchUnit later | Out of scope binding |
| Frontmatter parse | Custom YAML | gray-matter + Ajv (existing) | Fail-loud |
| Path matching | Hand regex | picomatch via select | Deterministic |
| Body quarantine | Trust authors | `details/` skip + canary tests | Core value |
| False-positive prevention | Hope | Suite negatives + multi-token needles | Phase 13 CR lesson |

**Key insight:** Phase 14 fails only if triggers are noisy or proofs omit negatives — not because the engine lacks features.

## Runtime State Inventory

> Not a rename/refactor/migration phase. **Omitted.**

## Common Pitfalls

### Pitfall 1: Bare keyword needles (Phase 13 CR-01/02 class)
**What goes wrong:** `entity` selects on `identity`; `event` on `prevent`/`eventual`; `port` on `report`.  
**Why:** `matchKeywords` is substring needle-in-haystack.  
**How to avoid:** Only multi-token locked keywords; suite negatives for `identity`, `interest-rate`, `prevent-duplicate`.  
**Warning signs:** Domain banking vocabulary selects HEX/DDD without path match.

### Pitfall 2: Over-broad `**/*Entity*` path (CR-03 class)
**What goes wrong:** JPA/config types (`EntityManagerConfig`, `JpaEntityScanner`) select tactical DDD.  
**How to avoid:** Prefer `**/domain/**/*Entity*`; negative suite cases for infra Entity* paths.  
**Warning signs:** Non-domain infrastructure edits inject aggregate/VO guidance.

### Pitfall 3: Essay summaries / multi-line summaries
**What goes wrong:** Token budget overflow; inject becomes architecture dump.  
**How to avoid:** ≤160 chars, one sentence, no `\n`; assert in suite like JAVA-PACK-02.

### Pitfall 4: Empty or “always architecture” triggers
**What goes wrong:** Every subscribed construction task gets HEX+DDD.  
**How to avoid:** Non-empty path/keyword positives; exclude docs/tests; negative README case.

### Pitfall 5: Cargo-cult full DDD/CQRS in detail
**What goes wrong:** LLM scaffolds 12 packages for 3-endpoint CRUD (PITFALLS #3).  
**How to avoid:** Explicit when-not in detail; no CQRS rule; summaries stay tactical-only.

### Pitfall 6: Index body leak / details indexed
**What goes wrong:** Canary in `rule-index.json` or detail file becomes a rule.  
**How to avoid:** `details/` placement; hygiene asserts; rebuild index after authoring.

### Pitfall 7: Editing production engine “just for HEX”
**What goes wrong:** Breaks engine freeze / upgrade story.  
**How to avoid:** Content + tests only; if a real bug blocks content, treat as separate fix with evidence.

### Pitfall 8: Breaking Phase 13 suite by rewriting PACK_IDS
**What goes wrong:** Phase 13 exact-count assertions flaky or rewritten incorrectly.  
**How to avoid:** Sibling suite for HEX/DDD ids; leave `PACK_IDS` four-rule inventory intact (filter still works when more domain rules exist).

### Pitfall 9: Inception / docs noise
**What goes wrong:** Discuss-phase or README tasks inject layering essays.  
**How to avoid:** `phases: [construction]` only; `exclude.taskType: [docs]`.

### Pitfall 10: Forgetting index rebuild
**What goes wrong:** CLI consumers of committed/local `rule-index.json` miss new ids.  
**How to avoid:** Plan task: `node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json`. Suite uses live `buildIndex` so tests pass even if index file stale — still rebuild for ship surface.

## Code Examples

### Minimal HEX rule skeleton

```markdown
---
id: java-spring-hex-layering
scope: domain
triggers:
  keywords:
    - hexagonal
    - ports-and-adapters
    - inbound-port
    - outbound-port
  paths:
    - "**/domain/**"
    - "**/application/**"
    - "**/adapter/**"
    - "**/adapters/**"
    - "**/port/**"
    - "**/ports/**"
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
summary: Keep dependencies pointing inward: domain must not import Spring, JPA, or framework/gateway types; adapters implement ports at the edges.
classification: advisory
detailPath: details/java-spring-hex-layering-detail.md
---

## Rule JS-HEX-01: Hexagonal Layering

Dependencies point inward. Domain packages stay free of Spring, JPA, HTTP clients, and gateway/framework types. Application orchestrates via ports; adapters implement ports at the edges.

### Verification

- Confirm domain modules do not import framework/persistence/HTTP gateway types.
- Confirm adapters depend inward on ports, not the reverse.
- Confirm docs tasks and test sources do not select this rule.

<!-- BODY_CANARY java-spring-hex-layering -->
```

### Minimal DDD rule skeleton

```markdown
---
id: java-spring-ddd-tactical
scope: domain
triggers:
  keywords:
    - aggregate-root
    - value-object
    - domain-event
    - tactical-ddd
  paths:
    - "**/domain/**"
    - "**/*Aggregate*"
    - "**/domain/**/*Entity*"
    - "**/*ValueObject*"
    - "**/*DomainEvent*"
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
summary: Model one aggregate root per consistency boundary; keep value objects immutable; name domain events in past tense.
classification: advisory
detailPath: details/java-spring-ddd-tactical-detail.md
---

## Rule JS-DDD-01: Tactical DDD

One aggregate root per consistency boundary. Value objects are immutable. Domain events use past-tense names. Do not invent strategic context maps mid-feature; keep this tactical.

### Verification

- Confirm write boundaries align to a single aggregate root unless orchestration is explicit in application services.
- Confirm value objects have no identity mutators.
- Confirm domain event type names are past tense.
- Confirm infra `*Entity*` types outside domain do not force this rule when path globs are narrowed.

<!-- BODY_CANARY java-spring-ddd-tactical -->
```

### Suite selection probe shape (sibling test)

```typescript
// Source: Phase 13 java-spring-pack.test.ts pattern [VERIFIED]
const HEX_DDD_IDS = [
  "java-spring-hex-layering",
  "java-spring-ddd-tactical",
] as const;

const SUBSCRIBED = { phase: "construction" as const, domains: ["java-spring"] };

// domains=[] → neither
// path domain/PaymentAggregate.java → both
// path application/PlaceOrderHandler.java → hex only (unless DDD keywords)
// path domain/OrderPlacedDomainEvent.java → both (domain/**)
// path infrastructure/EntityManagerConfig.java → neither DDD if Entity glob tightened
// keywords ["identity"] only → neither
// keywords ["aggregate-root"] → ddd
// taskType docs + domain path → neither
// phase inception → out-of-phase
// renderInjection: summaries present; BODY_CANARY and "## Rule JS-HEX-01" / "## Rule JS-DDD-01" absent
```

## Test Plan

### Recommendation (discretion)

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Extend `java-spring-pack.test.ts` | One file, shared helpers | File already large; Phase 13 PACK_IDS narrative mixes eras | OK if carefully sectioned |
| **Sibling `java-spring-hex-ddd.test.ts`** | Isolates JAVA-HEX/DDD; leaves Phase 13 inventory assertions alone; clear CR regression home | Slight helper duplication | **Recommended** |

### TDD wave shape (mirror Phase 13)

1. **Wave 1 (RED):** Author sibling suite against real `aidlc-rules` — fails until content exists.
2. **Wave 2 (GREEN):** Author two rules + two details; rebuild index; suite green; full `npm test` green.

### Required cases (map to ROADMAP success criteria)

| # | Case | Expect |
|---|------|--------|
| 1 | `domains=[]` + rich hex/ddd signal | Neither HEX/DDD selected; skip `out-of-scope` |
| 2 | Subscribed + `.../domain/PaymentService.java` | HEX selected (path `**/domain/**`); DDD selected (same path) |
| 3 | Subscribed + `.../application/...Handler.java` | HEX selected; DDD not required |
| 4 | Subscribed + `.../adapter/...` or `.../ports/...` | HEX selected |
| 5 | Subscribed + `.../domain/PaymentAggregate.java` | DDD (+ HEX) |
| 6 | Subscribed + `.../domain/MoneyValueObject.java` | DDD (+ HEX) |
| 7 | Subscribed + `.../domain/OrderPlacedDomainEvent.java` | DDD (+ HEX) |
| 8 | README.md / non-Java path only | Neither |
| 9 | `taskType: docs` + domain path | Neither (exclude) |
| 10 | `**/src/test/**` or `*Test*` path | Neither |
| 11 | `phase: inception` + domain path | Neither; skip `out-of-phase` |
| 12 | Summary contract | one line, ≤160, advisory, domain, detailPath set |
| 13 | Inject quarantine | summary present; no `BODY_CANARY java-spring-hex-layering` / ddd; no `## Rule JS-HEX-01` / `## Rule JS-DDD-01` |
| 14 | Hygiene | details not indexed; canaries ∉ `JSON.stringify(index)` |

### CR regression negatives (mandatory — Phase 13 lessons)

| # | Signal | Must NOT select |
|---|--------|-----------------|
| N1 | keywords `["interest-rate","pricing"]`, path domain InterestService | HEX/DDD **only if** triggered by bare needles — with path `**/domain/**` InterestService **will** select both (path-primary). This is OK for domain path work. N1 should instead prove **keyword-only** bank terms without architecture paths: keywords `["interest-rate"]`, paths `[]` → **neither** |
| N2 | keywords `["identity"]`, paths `[]` | Neither (no bare `entity`) |
| N3 | keywords `["prevent-duplicate"]` or `["eventual-consistency"]`, paths `[]` | Neither (no bare `event`) |
| N4 | keywords `["report","support"]`, paths `[]` | Neither (no bare `port`) |
| N5 | path `.../infrastructure/EntityManagerConfig.java` | DDD not selected (tight Entity glob) |
| N6 | path `.../config/JpaEntityScanner.java` | DDD not selected |
| N7 | keywords `["consumer-banking"]`, path domain loan service **without** Aggregate/Entity/VO/DomainEvent filename — **will still hit `**/domain/**`**. For keyword purity, use non-domain path + bank keywords → neither |

**Precision note:** Path-primary `**/domain/**` intentionally selects HEX/DDD for any domain-package construction work. That matches JAVA-HEX-01 / JAVA-DDD-01 wording (“touching domain/…”, “involving aggregates/entities/domain events” via domain package). Negatives must focus on **keyword-only** traps and **non-domain Entity\*** paths, plus docs/tests/README — not on “domain path should be silent.”

### Summary language asserts (optional but valuable)

- HEX summary matches `/spring|jpa|framework|gateway|inward|port/i` style tokens (encode purity + direction).
- DDD summary matches aggregate + value object + past-tense event language.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Always-on architecture essays in prompt | Path/keyword triggered one-sentence summaries + `detailPath` | v1 inject + v4 pack | Core value preserved |
| FEATURES research bare keywords `port`, `entity`, `event` | Multi-token only after Phase 13 CR | 2026-07-09/10 | Avoid bank false positives |
| ARCHITECTURE Phase 14 included CQRS | CONTEXT locks HEX+DDD only; CQRS deferred | v4.0 scope | Two rules, not three |
| Binding ArchUnit in overlay | Advisory only | PROJECT out of scope | No theater |

**Deprecated/outdated for this phase:**
- Authoring from early FEATURES keyword lists that include bare `port`/`entity`/`event` without CR filters.
- Research filenames `hexagonal-layering.md` / `ddd-aggregates.md` — use locked kebab ids `java-spring-hex-layering` / `java-spring-ddd-tactical`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tightening Entity path to `**/domain/**/*Entity*` is preferred and acceptable under CONTEXT discretion | Rule specs | If monorepos keep entities outside `domain/`, DDD under-injects — mitigate with `**/*Aggregate*` / `**/*ValueObject*` / `**/*DomainEvent*` / `**/domain/**` still covering common layouts |
| A2 | Sibling test file is better than extending pack suite | Test plan | Low — either works; Phase 13 suite remains valid either way |
| A3 | `severity: medium` for both is appropriate | Rule specs | Low — advisory style; can raise to high without engine change if product wants |

**If this table is empty:** N/A — three discretion assumptions logged.

## Open Questions

1. **Entity path breadth final lock**
   - What we know: `**/*Entity*` false-positives on infra; CONTEXT allows tighten.
   - What's unclear: Whether any consumer places domain entities outside `**/domain/**`.
   - Recommendation: Ship tightened glob; document in detail that entities should live under domain packages.

2. **Should application-layer-only work select DDD?**
   - What we know: DDD paths include `**/domain/**` and type-name globs, not `**/application/**`.
   - What's unclear: Handlers sometimes define events inline.
   - Recommendation: Rely on keywords `domain-event` / `aggregate-root` for non-domain paths; do not add bare `application` keyword.

3. **Eval corpus extension (JAVA-EVAL-01)**
   - Deferred this milestone; optional later. Phase 14 suite is sufficient for pack proof.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Tests / build-index | ✓ | v24.14.0 (≥22) | — |
| npm test (`node:test`) | Proof suite | ✓ | built-in | — |
| `bin/governance.cjs` build-index | Index rebuild | ✓ | package bin | `buildIndex()` in tests |
| picomatch / gray-matter / ajv | Engine (existing) | ✓ | in package.json | Do not reinstall |
| JDK / Maven / ArchUnit | — | N/A | — | Not required (overlay is Node content) |

**Missing dependencies with no fallback:** none  
**Missing dependencies with fallback:** none  

**Step 2.6:** External tools only as already present; phase is content/tests only.

## Validation Architecture

> `workflow.nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` + `node:assert/strict` (TypeScript via `tsc -p tsconfig.json`) |
| Config file | `tsconfig.json` → `dist-test/`; no jest/vitest |
| Quick run command | `npm test` |
| Full suite command | `npm test` |
| Targeted (after build:test) | `node --test dist-test/select/java-spring-hex-ddd.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| JAVA-HEX-01 | Subscribed construction + domain/application/adapter paths select hex-layering; summary encodes inward deps + domain purity | unit | `npm test` | ❌ Wave 0 |
| JAVA-HEX-01 | Unsubscribed / docs / tests / README / inception do not select | unit | `npm test` | ❌ Wave 0 |
| JAVA-HEX-01 | Inject summary only; no body canary / essay heading | unit | `npm test` | ❌ Wave 0 |
| JAVA-DDD-01 | Subscribed construction + aggregate/entity/VO/domain-event paths select ddd-tactical; summary encodes AR / immutable VO / past-tense events | unit | `npm test` | ❌ Wave 0 |
| JAVA-DDD-01 | Keyword false-positive negatives (identity, prevent, report); EntityManagerConfig path negative | unit | `npm test` | ❌ Wave 0 |
| JAVA-DDD-01 | Inject quarantine + detailPath hygiene | unit | `npm test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/select/java-spring-hex-ddd.test.ts` — covers JAVA-HEX-01 / JAVA-DDD-01 matrices + CR negatives
- [ ] `aidlc-rules/domain/java-spring/java-spring-hex-layering.md` + detail
- [ ] `aidlc-rules/domain/java-spring/java-spring-ddd-tactical.md` + detail
- [ ] Rebuild `rule-index.json` after content lands
- [ ] Framework install: none — existing `npm test` sufficient

## Security Domain

> `security_enforcement` enabled; phase is content + unit tests (no new network/auth surface).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | Domain subscription already gates pack (not new) |
| V5 Input Validation | yes (existing) | Ajv frontmatter schema on build-index; no new parsers |
| V6 Cryptography | no | — |

### Known Threat Patterns for rule-pack content

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Context-bloat / prompt stuffing via essay summaries | Denial of service (context) | One-sentence summary contract + inject tests |
| Over-injection of wrong guidance (selection false positive) | Elevation of privilege (process) | Multi-token needles + path narrow + suite negatives |
| Vendor lock-in strings in engine | Tampering / lock-in | Vendor-neutral HEX/DDD content; no `src/` vendor tokens |
| Binding theater without enforcement | Spoofing (compliance) | `classification: advisory` only |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/14-hexagonal-tactical-ddd-rules/14-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md` — JAVA-HEX-01, JAVA-DDD-01
- `.planning/ROADMAP.md` — Phase 14 success criteria
- `src/select/select.ts` — keyword substring + picomatch path matching
- `src/select/java-spring-pack.test.ts` — suite pattern + CR-01/02/03 regressions
- `aidlc-rules/domain/java-spring/*.md` — Phase 13 pack templates
- `.planning/phases/13-.../13-REVIEW.md` — CR findings applied as authoring law
- `.planning/phases/13-.../13-RESEARCH.md` — pack authoring / proof patterns
- Local picomatch + substring probes (Entity glob, port/entity/event needles) — 2026-07-10
- `npm test` baseline — 444 pass / 0 fail / 3 skipped

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — Phase 14 build-order note (includes CQRS historically; **overridden by CONTEXT**)
- `.planning/research/FEATURES.md` — HEX/DDD expected behavior (keyword lists partially stale)
- `.planning/research/PITFALLS.md` — essay bloat, always-on architecture, cargo-cult DDD

### Tertiary (LOW confidence)
- None material

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; reuse Phase 13 toolchain
- Architecture: HIGH — frozen engine + verified pack layout + matching semantics
- Pitfalls: HIGH — Phase 13 CR + in-session false-positive probes

**Research date:** 2026-07-10  
**Valid until:** 2026-08-09 (stable content phase; revalidate if select matching semantics change)

---

## RESEARCH COMPLETE

**Phase:** 14 - Hexagonal + Tactical DDD Rules  
**Confidence:** HIGH

### Key Findings
- Ship exactly two advisory rules in existing `aidlc-rules/domain/java-spring/`: `java-spring-hex-layering` (JS-HEX-01) and `java-spring-ddd-tactical` (JS-DDD-01); no CQRS; zero production engine edits.
- Keyword matching is substring needle-in-haystack — ban bare `port`/`entity`/`event`; use locked multi-token lists only.
- Tighten DDD entity path to `**/domain/**/*Entity*` to avoid `EntityManagerConfig` / infra false positives (CONTEXT discretion).
- Prove with sibling suite `java-spring-hex-ddd.test.ts` (recommended) using Phase 13 `buildIndex(aidlc-rules)` + CR-style negatives + inject canary quarantine.
- Both rules may select together on `**/domain/**` — expected; do not mutual-exclude.

### File Created
`.planning/phases/14-hexagonal-tactical-ddd-rules/14-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Content-only; existing gray-matter/picomatch/ajv/node:test |
| Architecture | HIGH | Pack + select/inject verified in-repo |
| Pitfalls | HIGH | Phase 13 CR + live probes |

### Open Questions
- Final monorepo preference for Entity path breadth (recommend tightened domain-scoped glob).

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
