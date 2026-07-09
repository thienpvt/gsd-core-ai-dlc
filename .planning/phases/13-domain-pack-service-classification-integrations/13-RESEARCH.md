# Phase 13: Domain Pack + Service Classification + Integrations - Research

**Researched:** 2026-07-09
**Domain:** Domain rule-pack content (java-spring) + deterministic select/inject proof on frozen engine
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Detect Internal vs internet-facing via **keyword + path hybrid** on the existing `TaskSignal` — no new `SelectionConfig` field and no engine schema change.
- Ship **two mutually exclusive outbound rules** using exclude axes (exclusion already wins per D-02): internal-outbound excludes internet-facing vocabulary; internet-outbound excludes internal vocabulary.
- When the signal is **ambiguous** (neither class named), **select neither** outbound rule — fail-open advisory, no guessed class; docs/task prose must name the class to get the rule.
- Classification vocabulary lives **only in rule frontmatter triggers** — never hardcoded in `src/` (engine freeze + vendor-neutral source).
- Pack root: **`aidlc-rules/domain/java-spring/`** matching existing `domain/<name>/` + `config.domains.includes(name)`.
- Every rule `summary` is **exactly one sentence**, inject-ready (target ≤ ~160 chars); essays stay out of the index.
- Full prose via **`detailPath` under a `details/` sibling** — loader already skips `details/` subtrees (D-05).
- All Phase 13 rules are **`classification: advisory`** — binding coverage is Phase 17; no binding-without-adapter theater.
- REST rule: **path-primary** triggers (`**/*Controller*`, `**/api/**`, `**/web/**`, `**/rest/**`) plus keywords `rest`, `controller`, `endpoint`.
- Kafka rule: **path-primary** (`**/*Listener*`, `**/*Consumer*`, `**/messaging/**`, `**/kafka/**`) plus keywords `kafka`, `consumer`, `listener`.
- Domain purity (“no Kafka/HTTP client types in domain”) is stated in **rule summary + body**, not a separate always-on purity rule (HEX Phase 14 covers broader layering).
- REST/Kafka convention rules apply to **`construction` only** (not `common`) to avoid discuss/docs noise.
- **Two separate rules**, not one mega inbound rule.
- Ship **four content rules** (no empty always-on pack-marker rule — pack opt-in is proven by domain folder + subscription):
  1. `java-spring-svc-internal-outbound`
  2. `java-spring-svc-internet-outbound`
  3. `java-spring-inbound-rest`
  4. `java-spring-inbound-kafka`
- Frontmatter `id`: kebab `java-spring-*`. Body headings: `## Rule JS-SVC-01` / `JS-SVC-02` / `JS-IN-01` / `JS-IN-02` aligned with REQUIREMENTS.
- **Vendor names (WSO2) only in rule Markdown content** — never in `src/` identifiers, adapter names, or engine enums.
- Prove selection with a **fixture store** (`test/fixtures/java-spring-store/` or equivalent) + cases: `domains=[]` → zero pack rules; `domains=["java-spring"]` + signals → correct subset (internal XOR internet outbound; REST vs Kafka path/keyword).

### Claude's Discretion
- Exact keyword lists and path globs beyond the seeds above (as long as Internal/internet mutual exclusion and REST/Kafka path-primary hold).
- Whether detail files are one-per-rule or shared snippets under `details/`.
- Fixture file layout and test file placement matching existing `select.test.ts` / eval-fixture patterns.
- Whether to add a tiny pack README under `aidlc-rules/domain/java-spring/` (optional; consumer docs are Phase 18).

### Deferred Ideas (OUT OF SCOPE)
- Hexagonal + tactical DDD rules → Phase 14
- Logging / API contract / saga decision rules → Phase 15
- Starter examples under `examples/java-spring/` → Phase 16
- Binding coverage ≥70% GateAdapter → Phase 17
- Consumer docs for domain subscribe + report path → Phase 18
- CQRS command/query split (JAVA-CQRS-01) and dedicated java-spring eval corpus (JAVA-EVAL-01) — out of v4.0 scope
- Config-level `serviceClass` field on SelectionConfig — rejected this phase to keep engine frozen
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JAVA-PACK-01 | Team can subscribe `java-spring` so only opted-in projects receive coding-convention rules | Domain gate already implemented: `inScope()` requires `config.domains.includes(domainName)` where `domainName` is path segment after `domain/` in `sourceFile`. Pack root `aidlc-rules/domain/java-spring/` yields subscription name `java-spring`. |
| JAVA-PACK-02 | Every pack rule carries one-sentence `summary`; full prose behind `detailPath` | Frontmatter schema requires `summary`; inject reads only summaries (`renderInjection`). Loader skips `details/`; `detailPath` resolved relative to rule file and validated at `buildIndex` (D-07). |
| JAVA-SVC-01 | Selector classifies Internal vs internet-facing and injects matching outbound rule | Two exclusive rules with positive class vocabulary + cross-exclude; no new SelectionConfig field. Ambiguous → neither. |
| JAVA-SVC-02 | Internal: JDBC/ORM/direct DB OK; no forced API gateway on outbound | Rule `java-spring-svc-internal-outbound` summary + detail body encode this; advisory only. |
| JAVA-SVC-03 | Internet-facing: outbound via gateway/WSO2 capability language; no raw external SDK/WebClient/RestTemplate from domain | Rule `java-spring-svc-internet-outbound` summary + detail; WSO2 string only in Markdown, never `src/`. |
| JAVA-IN-01 | Inbound REST: thin controllers → application ports; validation at boundary; no business logic in controller | Rule `java-spring-inbound-rest`, path-primary + keywords, `phases: [construction]`. |
| JAVA-IN-02 | Inbound Kafka: idempotent consumers; retry/DLQ; no Kafka client types in domain | Rule `java-spring-inbound-kafka`, path-primary + keywords, `phases: [construction]`. |
</phase_requirements>

## Summary

Phase 13 is a **content + proof** phase on a **frozen selection engine** (v1–v3). The engine already supports domain packs: rules under `aidlc-rules/domain/<name>/` are candidates only when `SelectionConfig.domains` includes `<name>`. No new npm dependencies, no schema/engine fields, and no binding adapters land here.

The deliverable is a subscribe-able `java-spring` pack with **four advisory rules** (two mutually exclusive outbound classification rules + two construction-only inbound REST/Kafka rules), each with a one-sentence inject summary and full prose under `details/`. Success is proven by `buildIndex` → `select` → `renderInjection` (and optional `rule-detail`) against fixture/store cases: unsubscribed domains yield zero pack rules; subscribed domains + class/path signals yield the correct XOR/subset.

**Primary recommendation:** Author the four production rules under `aidlc-rules/domain/java-spring/` (plus one-per-rule `details/`), rebuild `rule-index.json`, and lock behavior with a dedicated co-located select/inject fixture suite that exercises `domains=[]` vs `domains=["java-spring"]` and the mutual-exclusion / path-primary matrices — **do not touch `src/select` or `src/types` unless a real pack-loading bug blocks the content path.**

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Domain pack subscription gate | API / Backend (select pure core) | CLI (`--domains`) | `inScope()` + `domainName(sourceFile)` already own opt-in; CLI only passes `domains: string[]`. |
| Rule content authoring (summaries, triggers, bodies) | Content store (`aidlc-rules/`) | Index builder | Markdown + frontmatter is the product surface; engine freezes. |
| Internal vs internet-facing classification | Content (trigger vocabulary) | Select trigger/exclude axes | Classification is data in frontmatter, not a new config enum. |
| Summary injection | Inject pure core | CLI inject | Already summary-only by construction. |
| Lazy full prose | Detail path resolver + CLI `rule-detail` | Loader skip of `details/` | Bodies never index; detailPath validated at build. |
| Fixture proof / regression | Test layer (`node:test`) | Fixtures under `test/fixtures/` | Content correctness proven without engine changes. |
| Binding coverage enforcement | — (deferred Phase 17) | — | Explicitly out of this phase. |

## Project Constraints (from CLAUDE.md)

| Directive | Planning implication |
|-----------|----------------------|
| Overlay on GSD Core, not a fork | Ship rules via `aidlc-rules/` + existing CLI; no GSD core patches. |
| Context budget: summaries only; full bodies on demand | One-sentence summaries; essays only under `detailPath` / `details/`. |
| Markdown advisory; binding via real gates | All four rules `classification: advisory` (no binding theater). |
| Tool-agnostic contracts | No vendor adapter code this phase. |
| Vendor product strings not hard-coded in `src/` | WSO2 only in rule Markdown. |
| Zero new npm deps (v4.0 roadmap) | Content + tests only; reuse picomatch/gray-matter/ajv already present. |
| Engine frozen (v1–v3) | Prefer zero `src/` production edits; tests may co-locate under `src/select/` or pack-focused test file. |
| GSD workflow enforcement | Plans/execution go through GSD phase commands; this research feeds planner only. |

## Current System Behavior (verified in-repo)

### Domain subscription

```
loadRules(root) → findRuleFiles skips any directory named "details"
  → assertScopeMatchesDirectory (scope frontmatter must match tier)
  → resolvePrecedence
  → buildIndex validates detailPath exists + stays in pack root
  → rule-index.json (body-free)

select(index, signal, { phase, domains, budget? })
  gate1 phase: phases includes config.phase OR "common"
  gate2 scope: if scope==="domain" then domains.includes(domainName)
                domainName = path segment after "domain/" in sourceFile
  gate3 triggers: empty positive axes = always-in-phase (avoid for style);
                else OR of taskType | keywords | paths;
                exclude wins → out-of-scope-by-trigger + detail matched-then-excluded
```

**Verified:** `src/select/select.ts` `domainName` / `inScope`; `src/types.ts` `SelectionConfig.domains: string[]`; CLI `governance select --domains a,b` splits comma list (`src/cli/commands/select.ts`).

**Subscription name for this pack:** `java-spring` (folder `domain/java-spring/`, not `java_spring` or `JavaSpring`).

### Frontmatter contract (authoring)

Required: `id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `classification`.  
Optional: `detailPath`, `enforcement` (required only if binding).  
`id` pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$` — `java-spring-*` ids are valid.  
`scope` for pack rules: **`domain`** (must match directory tier under `domain/`).

Template reference: `aidlc-rules/enterprise/require-mfa.md` (summary-only, empty triggers — **do not copy empty triggers** for style/boundary rules).

Detail pattern reference: `test/fixtures/detailpath-store/enterprise/with-detail.md` + `details/with-detail.md`.

### Keyword matching semantics (critical for classification design)

`matchKeywords` treats each **signal keyword as haystack** and each **trigger keyword as needle** (case-insensitive substring). [VERIFIED: `src/select/select.ts`]

Implications:
- Prefer multi-token class markers: `internal-service`, `internet-facing` (not bare short stems that substring-collide).
- Prefer distinct path globs for class when possible.
- Mutual exclusion via **exclude** is mandatory when both rules could fire on shared outbound vocabulary (`jdbc`, `outbound`, etc.).

### Path matching

`picomatch(glob, { dot: true })` against each signal path. [VERIFIED: `src/select/select.ts`]

### Injection

`renderInjection(result)` emits `<governance>` with selected id/severity/summary only — never bodies. [VERIFIED: `src/inject/inject.ts`]

### Package ship surface

`package.json` `"files": ["dist", "bin", "aidlc-rules"]` — domain pack under `aidlc-rules/` ships with the npm package automatically. [VERIFIED: `package.json`]

## Standard Stack

### Core (already in repo — do not reinstall)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `>=22` (env observed v24.14.0) | Runtime | Matches package engines |
| TypeScript | `^6.0.3` | Build/tests | Existing toolchain |
| gray-matter | `4.0.3` | Frontmatter parse | Loader already uses it |
| picomatch | `4.0.5` | Path globs in select | Already wired `dot: true` |
| ajv + ajv-formats | `8.20.0` / `3.0.1` | Frontmatter/index validation | Build fails loud on bad rules |
| node:test + assert/strict | built-in | Tests | Project convention; no jest/vitest |

### Supporting (content artifacts — not npm)

| Artifact | Purpose | When to Use |
|----------|---------|-------------|
| Markdown + YAML frontmatter | Rule authoring | All four rules |
| `details/*.md` (no frontmatter required) | Lazy full prose | Every pack rule with essay-length guidance |
| `rule-index.json` | Body-free index | Rebuild after authoring via `governance build-index` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Keyword+path hybrid on TaskSignal | New `SelectionConfig.serviceClass` | **Rejected (locked)** — freezes engine |
| Two exclusive outbound rules | Single rule with LLM-only classification | Non-deterministic audit; weaker select proof |
| Production pack tested only via eval corpus extension | Dedicated fixture store | Eval is enterprise-heavy; pack proof clearer with focused fixture +/or real `aidlc-rules` root |
| Binding outbound enforcement | Advisory summaries | Phase 17 owns binding; markdown binding without adapter = theater |

**Installation:** none — zero new packages.

## Package Legitimacy Audit

> Phase installs **no** external packages.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | N/A |

**Packages removed due to [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
TaskSignal (taskType, keywords[], paths[])
        +
SelectionConfig { phase, domains: ["java-spring"]? , budget? }
        │
        ▼
┌───────────────────┐     ┌──────────────────────────────┐
│ aidlc-rules/      │     │ buildIndex / rule-index.json │
│  enterprise/*     │────▶│  (no bodies; details/ skip)  │
│  domain/java-spring│    └──────────────┬───────────────┘
│    *.md + details/│                   │
└───────────────────┘                   ▼
                              select() gates:
                              1 phase
                              2 domain subscription  ◀── domains[]
                              3 triggers / exclude
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            selected[]            skipped[]           budget fields
         (summaries only)     (out-of-scope etc.)
                    │
                    ▼
            renderInjection()  →  <governance> fragment
                    │
                    ▼ (on demand)
            governance rule-detail <id>  →  detailPath body
```

### Recommended Project Structure (files to create)

```
aidlc-rules/
└── domain/
    └── java-spring/
        ├── java-spring-svc-internal-outbound.md
        ├── java-spring-svc-internet-outbound.md
        ├── java-spring-inbound-rest.md
        ├── java-spring-inbound-kafka.md
        ├── details/
        │   ├── java-spring-svc-internal-outbound-detail.md
        │   ├── java-spring-svc-internet-outbound-detail.md
        │   ├── java-spring-inbound-rest-detail.md
        │   └── java-spring-inbound-kafka-detail.md
        └── README.md                          # OPTIONAL (Claude discretion; Phase 18 owns consumer docs)

test/fixtures/java-spring-store/               # RECOMMENDED: isolated store for pure select proofs
└── domain/
    └── java-spring/
        ├── java-spring-svc-internal-outbound.md   # can be copies of production frontmatter+minimal body
        ├── java-spring-svc-internet-outbound.md
        ├── java-spring-inbound-rest.md
        ├── java-spring-inbound-kafka.md
        └── details/
            └── … (detail targets required if detailPath set — buildIndex enforces D-07)

src/select/java-spring-pack.test.ts            # RECOMMENDED co-located suite (node:test)
# OR src/select/select.java-spring.test.ts — match kebab co-location style

rule-index.json                                # REBUILD from production aidlc-rules after authoring
```

**Discretion recommendation:** One detail file per rule (clear `detailPath`, simpler D-07 existence checks). Optional pack README is fine if it does **not** use rule frontmatter (a bare README.md under the pack **would be indexed** as a rule — **do not** add README.md unless it is either non-`.md` or placed outside the walk, or is a valid rule — safest: **skip pack README this phase** or put notes only in Phase 18 docs).

### Pattern 1: Domain pack opt-in

**What:** Rules live under `domain/<pack>/`; selection requires `domains` includes pack name.  
**When to use:** Always for stack-specific coding conventions.  
**Example config/CLI:**

```bash
# rebuild production index
node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json

# unsubscribed — pack rules out-of-scope
echo '{"taskType":"feature","keywords":["internet-facing","outbound"],"paths":[]}' \
  | node bin/governance.cjs select --phase construction --index rule-index.json --format json

# subscribed
echo '{"taskType":"feature","keywords":["internet-facing","outbound"],"paths":[]}' \
  | node bin/governance.cjs select --phase construction --domains java-spring --index rule-index.json --format json
```

### Pattern 2: Mutual exclusion via exclude (Internal XOR internet-facing)

**What:** Each outbound rule positively matches its class vocabulary/paths and **excludes** the other class vocabulary/paths so both never select together; ambiguous signals select neither.  
**When to use:** Binary advisory classification without engine schema change.

### Pattern 3: Path-primary inbound conventions

**What:** Prefer path globs that match Spring naming (`*Controller*`, `*Listener*`) so construction file work selects REST/Kafka rules without relying on prose keywords alone.  
**When to use:** Inbound REST/Kafka rules (locked construction-only).

### Anti-Patterns to Avoid

- **Empty `triggers: {}` on pack style rules:** Always-in-phase spam after subscription (PITFALLS #2).
- **Enterprise dump of Java rules:** Forces Java onto all consumers (ARCHITECTURE anti-pattern).
- **Binding without adapter:** `classification: binding` without Phase 17 coverage adapter = theater.
- **WSO2 (or other vendors) in `src/`:** Violates PROJECT/roadmap vendor-neutral engine constraint.
- **Essay summaries / multi-line summaries:** Budget overflow; core-value failure (PITFALLS #1).
- **Pack README with accidental rule frontmatter or bare policy `.md` that becomes a fifth rule:** Loader indexes every `*.md` outside `details/`.
- **Shared positive keywords without exclude:** Both outbound rules select → false dual classification.
- **Putting examples under `aidlc-rules/**`:** Phase 16 concern; do not start it here.

## Recommended Rule Specs (planner-ready)

### Shared frontmatter defaults (all four)

| Field | Value |
|-------|--------|
| `scope` | `domain` |
| `classification` | `advisory` |
| `severity` | `high` for outbound boundaries; `medium` for inbound conventions (discretion: high is OK if short summaries) |
| `phases` | outbound: `[construction]` (optionally add `inception` only if design tasks need class early — **default: construction only** for consistency with inbound lock unless product wants inception); inbound: **`[construction]` only** (locked) |
| `detailPath` | `details/<id>-detail.md` (relative to rule file dir) |
| `enforcement` | omit |

**Discretion lock for phases:** Use **`construction` only** for all four Phase 13 rules to avoid inception noise and keep matrix small. Outbound classification during inception can wait for docs/Phase 14+ if needed.

### 1) `java-spring-svc-internal-outbound` (JS-SVC-01 / JAVA-SVC-02)

**Summary (one sentence, ≤160 chars):**  
`Internal services may use JDBC/ORM or direct DB access outbound; do not force an API gateway on internal-only calls.`

**Body heading:** `## Rule JS-SVC-01: Internal Service Outbound Access`

**Recommended triggers:**

```yaml
triggers:
  keywords:
    - internal-service
    - internal-only
    - jdbc
    - jpa
    - orm
    - datasource
  paths:
    - "**/internal/**"
    - "**/services/internal/**"
    - "**/module-internal/**"
  exclude:
    keywords:
      - internet-facing
      - external-facing
      - public-edge
      - edge-service
      - api-gateway
      - wso2
    paths:
      - "**/internet-facing/**"
      - "**/external-facing/**"
      - "**/edge/**"
```

**Detail body must cover:** JDBC/JPA/ORM allowed; no forced gateway; still keep domain free of raw driver sprawl guidance lightly (HEX deep-dive is Phase 14); verification checklist.

### 2) `java-spring-svc-internet-outbound` (JS-SVC-02 / JAVA-SVC-03)

**Summary:**  
`Internet-facing services must send outbound calls through the approved API gateway; do not call external systems with raw WebClient, RestTemplate, or SDKs from domain code.`

**Body heading:** `## Rule JS-SVC-02: Internet-Facing Outbound Via Gateway`

**Detail may name WSO2** as the org gateway product; summary uses capability language (“approved API gateway”) with optional short “e.g. WSO2” only if still one sentence and ≤~160 chars. Prefer gateway language in summary; put WSO2 in detail.

**Recommended triggers:**

```yaml
triggers:
  keywords:
    - internet-facing
    - external-facing
    - public-edge
    - edge-service
    - api-gateway
    - wso2
    - webclient
    - resttemplate
    - feign
    - outbound-http
  paths:
    - "**/internet-facing/**"
    - "**/external-facing/**"
    - "**/edge/**"
    - "**/adapter/out/http/**"
    - "**/infrastructure/gateway/**"
  exclude:
    keywords:
      - internal-service
      - internal-only
    paths:
      - "**/internal/**"
      - "**/services/internal/**"
      - "**/module-internal/**"
```

**Mutual exclusion proof cases:**
| Signal keywords/paths | Expected selected outbound |
|----------------------|----------------------------|
| `internal-service` | internal only |
| `internet-facing` | internet only |
| both class markers | **neither** (each exclude fires) |
| neither / only `feature` | **neither** |
| `jdbc` alone (no class) | internal (jdbc is internal-leaning) — acceptable; if too noisy, remove bare `jdbc` from positive and require `internal-service` OR internal path |

**Discretion refinement:** Prefer **class markers + paths** as primary; keep `jdbc`/`jpa`/`orm` only if eval shows under-injection on internal DB work. Safer exclusive design: require `internal-service` **or** `**/internal/**` for internal rule; keep client library names on internet rule only.

### 3) `java-spring-inbound-rest` (JS-IN-01)

**Summary:**  
`Keep REST controllers thin: validate at the boundary, map to application ports, and keep business logic out of controllers.`

**Body heading:** `## Rule JS-IN-01: Thin REST Controllers`

**Triggers (path-primary + locked keywords):**

```yaml
triggers:
  keywords:
    - rest
    - controller
    - endpoint
  paths:
    - "**/*Controller*"
    - "**/api/**"
    - "**/web/**"
    - "**/rest/**"
    - "**/adapter/in/web/**"
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

### 4) `java-spring-inbound-kafka` (JS-IN-02)

**Summary:**  
`Kafka consumers must be idempotent with explicit retry/DLQ policy, and Kafka client types stay in adapters—not in domain.`

**Body heading:** `## Rule JS-IN-02: Idempotent Kafka Consumers`

**Triggers:**

```yaml
triggers:
  keywords:
    - kafka
    - consumer
    - listener
  paths:
    - "**/*Listener*"
    - "**/*Consumer*"
    - "**/messaging/**"
    - "**/kafka/**"
    - "**/adapter/in/messaging/**"
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

### Detail file content outline (all four)

Each `details/*-detail.md` (no frontmatter required):
1. Rule restatement
2. Decision / when-to-apply
3. Do / Don't bullets (incl. when-not for outbound class)
4. Verification checklist (model-eval style, matching AI-DLC convention)
5. Optional forward pointer: “Hexagonal layering → Phase 14 rules” (text only)
6. Body-leak canary sentence unique per file (for index leak tests)

## How build-index / select / inject Prove Success Criteria

| Success criterion (ROADMAP) | Proof path |
|-----------------------------|------------|
| 1. Subscribe `domains: ["java-spring"]` only then receive pack rules | `buildIndex(aidlc-rules or fixture)` → `select(..., domains:[])` pack ids all `out-of-scope`; `domains:["java-spring"]` + matching signal → ids in `selected[]` |
| 2. One-sentence summaries; full prose via detailPath | Assert each summary has no `\n`, length ≤160 (test); `renderInjection` contains summary not canary body; `rule-detail` / read detailPath returns canary |
| 3. Internal vs internet-facing classification | Matrix tests on outbound XOR + ambiguous neither; inject contains matching summary only |
| 4. REST/Kafka path construction inject | Paths `.../PaymentController.java` → REST; `.../OrderListener.java` → Kafka; inception phase → out-of-phase for inbound |

**Production index rebuild (required after authoring):**

```bash
node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json
```

Expect: existing `require-mfa` + 4 new domain rules (5 winners if no collisions). Index records include `summary` + `detailPath` pointers, never detail canary strings.

**Inject smoke:**

```bash
# after select JSON saved
node bin/governance.cjs inject --input selection.json
# fragment must not contain detail canaries or "## Rule JS-" essay bodies
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Domain subscription | Custom config field / filter | Existing `domains` + folder layout | Already tested (threat-model out-of-scope) |
| Classification engine | ML/embeddings or `serviceClass` enum | Keyword+path + exclude | Locked; audit-simple |
| Frontmatter parsing | Custom YAML split | gray-matter + Ajv schema | Fail-loud authoring |
| Path globs | regex hand-roll | picomatch via select | Deterministic, `dot: true` |
| Body quarantine | Trust authors | `details/` skip + body-free index schema | Core value |
| Mutual exclusion | Runtime if/else in src | Frontmatter `exclude` | Engine freeze + vendor-neutral |

**Key insight:** Phase 13 fails only if content/triggers are wrong or proofs are missing — not because the engine lacks features.

## Runtime State Inventory

> Not a rename/refactor/migration phase. **Omitted.**

## Common Pitfalls

### Pitfall 1: Essay summaries / multi-line summaries
**What goes wrong:** Budget overflow; inject becomes architecture dump.  
**Why:** Schema has no maxLength on summary.  
**How to avoid:** Authoring contract + unit asserts (one sentence, ≤160, no `\n`).  
**Warning signs:** `budgetExceeded` with only pack selected.

### Pitfall 2: Empty or over-broad triggers
**What goes wrong:** After subscribe, every task gets all four rules.  
**How to avoid:** No `triggers: {}`; path-primary inbound; class-specific outbound; exclude docs/tests.

### Pitfall 3: Dual outbound selection
**What goes wrong:** Signal matches both rules → contradictory advice.  
**How to avoid:** Symmetric exclude axes; test both-markers → neither.

### Pitfall 4: Ambiguous signal still injects a guess
**What goes wrong:** Over-broad `jdbc`/`outbound` without class markers.  
**How to avoid:** Locked fail-open: neither when class unnamed; tighten positives in review if tests show guessy hits.

### Pitfall 5: Binding without enforcement
**What goes wrong:** Marking outbound binding without adapter.  
**How to avoid:** All `advisory` this phase.

### Pitfall 6: WSO2 in `src/`
**What goes wrong:** Vendor lock-in / CI policy failure.  
**How to avoid:** Grep gate in tests: `rg -i 'wso2|tibco|smartvista' src` must be empty for production sources (tests may mention as negative canary only if needed — prefer not).

### Pitfall 7: Index body leak / details indexed
**What goes wrong:** Detail files become rules or canary appears in index.  
**How to avoid:** Keep details under `details/`; property/existing no-body checks; assert canary ∉ `JSON.stringify(index)`.

### Pitfall 8: detailPath missing at build
**What goes wrong:** `buildIndex` throws D-07.  
**How to avoid:** Create detail files in same PR as rules; CI rebuilds index.

### Pitfall 9: Fixture diverges from production pack
**What goes wrong:** Tests green, shipped pack wrong.  
**How to avoid:** Prefer tests that `buildIndex("aidlc-rules")` for subscription/content IDs; use slim fixture only if isolation needed — or generate fixture from same content. **Recommendation:** primary suite against real `aidlc-rules` root; optional smaller fixture if full enterprise noise bothers assertions (only `require-mfa` exists today — real root is clean).

### Pitfall 10: Substring keyword traps
**What goes wrong:** Short needles over-match (`port`∈`report`).  
**How to avoid:** Multi-word class markers (`internet-facing`, `internal-service`); path globs for structure.

## Code Examples

### Minimal production rule skeleton

```markdown
---
id: java-spring-inbound-rest
scope: domain
triggers:
  keywords:
    - rest
    - controller
    - endpoint
  paths:
    - "**/*Controller*"
    - "**/api/**"
    - "**/web/**"
    - "**/rest/**"
  exclude:
    taskType:
      - docs
    paths:
      - "**/src/test/**"
phases:
  - construction
severity: medium
summary: Keep REST controllers thin: validate at the boundary, map to application ports, and keep business logic out of controllers.
classification: advisory
detailPath: details/java-spring-inbound-rest-detail.md
---

## Rule JS-IN-01: Thin REST Controllers

Controllers stay thin. Map HTTP to application ports; validate at the edge.

### Verification

Confirm controllers delegate to application services/ports and contain no domain business rules.

<!-- BODY_CANARY java-spring-inbound-rest: must never appear in rule-index.json -->
```

### Fixture test pattern (matches existing suite style)

```typescript
// Source pattern: src/select/select.test.ts + skip-reasons.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import { renderInjection } from "../inject/inject.js";
import type { TaskSignal, SelectionConfig } from "../types.js";

const PACK_ROOT = path.resolve(process.cwd(), "aidlc-rules");
const PACK_IDS = [
  "java-spring-svc-internal-outbound",
  "java-spring-svc-internet-outbound",
  "java-spring-inbound-rest",
  "java-spring-inbound-kafka",
] as const;

function packIndex() {
  return buildIndex(PACK_ROOT);
}

test("JAVA-PACK-01: domains=[] selects zero java-spring pack rules", () => {
  const index = packIndex();
  const signal: TaskSignal = {
    taskType: "feature",
    keywords: ["internet-facing", "controller", "kafka"],
    paths: ["src/main/java/com/acme/api/PayController.java"],
  };
  const result = select(index, signal, { phase: "construction", domains: [] });
  for (const id of PACK_IDS) {
    assert.ok(!result.selected.some((s) => s.id === id), id);
    const skip = result.skipped.find((s) => s.id === id);
    assert.ok(skip, `${id} must be skipped`);
    assert.equal(skip.reason, "out-of-scope");
  }
});

test("JAVA-SVC-01: internal XOR internet outbound under domains java-spring", () => {
  const index = packIndex();
  const cfg: SelectionConfig = { phase: "construction", domains: ["java-spring"] };
  const internal = select(
    index,
    { taskType: "feature", keywords: ["internal-service", "jdbc"], paths: [] },
    cfg,
  );
  assert.ok(internal.selected.some((s) => s.id === "java-spring-svc-internal-outbound"));
  assert.ok(!internal.selected.some((s) => s.id === "java-spring-svc-internet-outbound"));

  const internet = select(
    index,
    { taskType: "feature", keywords: ["internet-facing", "webclient"], paths: [] },
    cfg,
  );
  assert.ok(internet.selected.some((s) => s.id === "java-spring-svc-internet-outbound"));
  assert.ok(!internet.selected.some((s) => s.id === "java-spring-svc-internal-outbound"));

  const both = select(
    index,
    {
      taskType: "feature",
      keywords: ["internal-service", "internet-facing"],
      paths: [],
    },
    cfg,
  );
  assert.ok(!both.selected.some((s) => s.id.startsWith("java-spring-svc-")));
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paste full AI-DLC steering every request | Indexed domain packs + summary inject | v1.0 | Core value |
| Always-on architecture essays | Triggered one-sentence rules + detailPath | v4.0 content design | Prevents bloat |
| Engine schema for service class | Frontmatter exclude mutual exclusion | Phase 13 locked | Engine stays frozen |
| Binding markdown coverage claims | Deferred real adapter (Phase 17) | roadmap | No theater in Phase 13 |

**Deprecated/outdated for this phase:**
- Adding `serviceClass` to `SelectionConfig` / TaskSignal schema
- Placing Java conventions under `enterprise/`
- Empty-trigger pack marker rules

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Outbound rules should be construction-only (not inception) for matrix simplicity | Rule specs | Inception design tasks miss classification until prose names class in construction — acceptable given locked inbound construction-only |
| A2 | Testing against real `aidlc-rules` is preferred over a duplicated fixture store | Fixtures | If enterprise corpus grows noisy, split fixture later |
| A3 | Optional pack README should be skipped to avoid accidental indexing | Structure | None if Phase 18 docs cover subscribe |
| A4 | Summary may omit the literal string `WSO2` (detail carries it) | Rule specs | Roadmap wording mentions WSO2 in capability language — detail satisfies; summary gateway language is safer for vendor-neutral inject |

**If wrong:** Planner/discuss can flip A1 phases or force WSO2 into internet summary if product insists (still Markdown-only).

## Open Questions

1. **Should bare `jdbc`/`jpa` select internal outbound without an explicit class marker?**
   - What we know: fail-open on ambiguity is locked; `jdbc` is strongly internal-leaning.
   - What's unclear: bank monorepos may say “add repository” without “internal-service”.
   - Recommendation: ship with class markers + internal paths primary; add `jdbc`/`jpa` only if under-injection appears in manual dry-runs; never add `outbound` alone to both rules.

2. **Inception phase for outbound rules?**
   - Recommendation: construction-only for v4.0 Phase 13; revisit if discuss/plan tasks need early classification.

3. **Extend SEL-06 eval corpus now?**
   - JAVA-EVAL-01 deferred; fixture unit tests suffice for Phase 13. Do not block on eval harness expansion.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/test/CLI | ✓ | v24.14.0 | — |
| npm | scripts | ✓ | 11.9.0 | — |
| `bin/governance.cjs` + dist build | build-index/select/inject | ✓ (via `npm run build`) | package 0.1.0 | — |
| Existing `aidlc-rules/enterprise/require-mfa.md` | index non-empty baseline | ✓ | — | — |
| Java/Maven/JDK | — | n/a | — | Not required this phase |
| New npm packages | — | n/a | — | None |

**Missing dependencies with no fallback:** none  
**Step 2.6:** No blocking external services; content/tests only.

## Validation Architecture

> `workflow.nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test` + `node:assert/strict` (TypeScript compiled via `tsc -p tsconfig.json`) |
| Config file | `tsconfig.json` (tests → `dist-test/`); no jest/vitest config |
| Quick run command | `npm test` (runs `pretest` build + `node --test dist-test/**/*.test.js`) |
| Full suite command | `npm test` |
| Targeted (after build:test) | `node --test dist-test/select/java-spring-pack.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JAVA-PACK-01 | `domains=[]` → all four pack ids skipped `out-of-scope`; `domains=["java-spring"]` can select | unit | `npm test` (pack suite) | ❌ Wave 0 |
| JAVA-PACK-02 | summaries one sentence / ≤160 / no newline; inject has summary not body canary; detailPath exists | unit | `npm test` | ❌ Wave 0 |
| JAVA-SVC-01 | internal XOR internet; both → neither; neither class → neither outbound | unit | `npm test` | ❌ Wave 0 |
| JAVA-SVC-02 | internal selected summary asserts JDBC/ORM-allowed / no forced gateway wording | unit (string) | `npm test` | ❌ Wave 0 |
| JAVA-SVC-03 | internet selected summary asserts gateway outbound; detail may contain WSO2; `src/**/*.ts` production has no WSO2 | unit + grep assert | `npm test` | ❌ Wave 0 |
| JAVA-IN-01 | `*Controller*` / api path construction selects REST; inception does not; docs exclude | unit | `npm test` | ❌ Wave 0 |
| JAVA-IN-02 | `*Listener*` / kafka path selects Kafka; not REST-only path; construction only | unit | `npm test` | ❌ Wave 0 |
| (hygiene) | `buildIndex(aidlc-rules)` succeeds; index JSON lacks body canaries; details/ not separate rules | unit | `npm test` | ❌ Wave 0 |
| (hygiene) | `renderInjection` for selected pack rule has no `## Rule JS-` body | unit | `npm test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (or targeted pack test file after `npm run build:test`)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`; manual CLI smoke optional:
  - `governance build-index --root aidlc-rules --out rule-index.json`
  - select with/without `--domains java-spring`

### Wave 0 Gaps

- [ ] `src/select/java-spring-pack.test.ts` — covers JAVA-PACK-01/02, JAVA-SVC-01/02/03, JAVA-IN-01/02 matrices
- [ ] Production rule files under `aidlc-rules/domain/java-spring/*.md` + `details/*`
- [ ] Rebuild `rule-index.json` after rules land
- [ ] Optional: `test/fixtures/java-spring-store/` only if tests must not depend on enterprise rules — **not required today** (enterprise has single rule)
- [ ] Framework install: none — existing `npm test` sufficient

### Pass criteria (phase gate)

1. `npm test` green.
2. `buildIndex("aidlc-rules")` returns exactly the four new domain ids plus existing enterprise rules; each pack rule has `scope:"domain"`, `classification:"advisory"`, non-empty `detailPath`.
3. Selection matrix documented above passes.
4. No production `src/` file contains vendor strings `wso2` / `tibco` / `smartvista` (case-insensitive) unless phase intentionally avoids any src edit (preferred: zero src production edits).
5. Injected fragment for a selected rule does not contain that rule’s body canary.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Content-only phase |
| V3 Session Management | no | — |
| V4 Access Control | partial | Domain subscription is authorization-of-guidance only (not authn); mis-subscribe = under/over injection of advice |
| V5 Input Validation | yes | Ajv frontmatter + `validateSignal` / `validateIndex` at CLI boundaries; path traversal guard on `detailPath` (existing) |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious/malformed rule frontmatter | Tampering | Ajv + build fail-loud |
| detailPath escape to `/etc/passwd` | Elevation / Info disclosure | `resolveDetailPath` IN-05 guard (existing) |
| Index body leak → prompt injection volume | Info disclosure / DoS tokens | Body quarantine + canary tests |
| Vendor lock-in via engine strings | — (governance integrity) | Vendor names only in Markdown; grep test |
| Binding theater (false enforcement) | Spoofing of control | Advisory-only rules this phase |

## Sources

### Primary (HIGH confidence)

- `src/select/select.ts` — domain gate, exclude-wins, keyword/path matching
- `src/rules/load.ts` — `details/` skip, body quarantine
- `src/rules/scope.ts` — domain tier layout, D-09/D-10
- `src/rules/detail-path.ts` — detailPath resolution + traversal guard
- `src/index/build.ts` — D-07 detail existence, body-free index
- `src/types.ts` — Frontmatter, SelectionConfig, TaskSignal
- `src/schema/frontmatter.schema.json` — authoring contract
- `src/cli/commands/select.ts` — `--domains` parsing
- `src/inject/inject.ts` — summary-only inject
- `src/select/select.test.ts`, `src/select/skip-reasons.test.ts` — domain subscription + exclude patterns
- `aidlc-rules/enterprise/require-mfa.md` — production rule template
- `test/fixtures/eval/eval-rules/domain/{security,payments}/*` — domain pack layout examples
- `test/fixtures/detailpath-store/**` — detailPath layout
- `.planning/phases/13-.../13-CONTEXT.md` — locked decisions
- `.planning/REQUIREMENTS.md`, `ROADMAP.md`, `PROJECT.md` — scope
- `.planning/research/ARCHITECTURE.md`, `FEATURES.md`, `PITFALLS.md` — v4.0 content guidance
- `.planning/codebase/STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md` — repo conventions
- `package.json` — scripts, files ship list, zero new deps

### Secondary (MEDIUM confidence)

- `.planning/research/*` trigger tables (refined by locked CONTEXT seeds)

### Tertiary (LOW confidence)

- None material; classification keyword lists are discretion recommendations to validate in tests.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — reuse existing verified toolchain; no new packages
- Architecture: HIGH — domain subscription and select gates observed in source
- Pitfalls: HIGH — grounded in prior PITFALLS + select semantics
- Exact keyword lists: MEDIUM — locked seeds + discretion; finalize via test matrix

**Research date:** 2026-07-09  
**Valid until:** 2026-08-08 (stable content phase; engine frozen)

## RESEARCH COMPLETE
