# Architecture Research

**Domain:** Developer coding-convention rule packs + starter examples + coverage GateAdapter on existing GSD governance overlay
**Researched:** 2026-07-09
**Confidence:** HIGH (integration seams read from live `src/` — load/select/adapters/verify/ship; pack layout from `docs/rule-authoring.md` + `scope.ts`)

## Headline Finding

v4.0 is **content + one real adapter**, not a new runtime. Existing spine stays:

```
aidlc-rules → build-index → body-free rule-index.json → select() → summary inject → lazy rule-detail
GateAdapter → runAdapter → gate evidence under .planning/governance/ → verify/ship fail-closed
```

Coding conventions ship as a **domain pack** (`aidlc-rules/domain/java-spring/`). Starter Java examples ship **outside** the rule walk. Coverage >70% is a **real `GateAdapter`** that parses consumer JaCoCo/XML/LCOV — first non-stub enforcement path for consumers. This repo stays Node/TS; adapter only reads report files consumers produce in their CI.

Core value unchanged: summary-only injection. Examples never enter index. Full Java snippets load only via explicit paths or lazy detail prose pointers — never as selected rule bodies.

---

## Standard Architecture (v4.0 delta on existing system)

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  GSD CORE RUNTIME (unmodified) — discuss → plan → execute → verify → ship │
│  capability-loader → loop-resolver → aidlc-governance capability.json      │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ existing hooks (consent-gated)
┌───────────────────────────────▼──────────────────────────────────────────┐
│  GOVERNANCE OVERLAY (shipped v1–v3)                                        │
│                                                                            │
│  Rule-Pack Store          Index Builder         Selection Engine           │
│  enterprise/              build-index ──▶       select(index,signal,cfg)   │
│  domain/<name>/  ◀NEW     rule-index.json       domains: ["java-spring"]   │
│  project/                 (no bodies)           keywords|taskType|paths    │
│       │                         │                      │                   │
│       │                         ▼                      ▼                   │
│       │                  Summary Injector ◀── selected summaries only      │
│       │                  Detail Loader    ◀── governance rule-detail <id>  │
│       │                                                                    │
│  GateAdapter registry + runAdapter (Ajv hard-fail)                         │
│  ├── stubs: semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci,    │
│  │          human-approval                                                 │
│  └── ◀NEW coverage  (JaCoCo XML / LCOV parser → GateResult)                │
│                                                                            │
│  verifyGateHook ──runAdapter──▶ gates/{NN}-verify.json                     │
│  shipGateHook    ──prior evidence + approvals + eval ──▶ block/pass        │
│  Audit Writer    ──GOVERNANCE.md + selection-state.json                    │
└───────────────────────────────────────────────────────────────────────────┘

◀NEW content (not in select path):
  examples/java-spring/   # starter layout + thin snippets; NEVER indexed
  aidlc-rules/domain/java-spring/**/*.md  # rules + optional details/
```

### Component Responsibilities (v4.0 focus)

| Component | Status | Responsibility |
|-----------|--------|----------------|
| **Domain pack `java-spring`** | NEW content | Hexagonal/CQRS/DDD, service classification, WSO2 outbound, REST/Kafka inbound, logging, API contracts, saga/events, coverage binding rule |
| **Rule loader / index / select** | UNCHANGED core | Already supports `domain/<name>/`, subscription via `config.domains`, `details/` skip, body quarantine |
| **Loader skip for `examples/`** | MODIFY (small) | Mirror `details/` skip if examples ever nest under pack; prefer top-level `examples/` so zero loader change |
| **Summary inject + rule-detail** | UNCHANGED | Summaries only; lazy body by id |
| **`coverage` GateAdapter** | NEW code | Parse consumer coverage report → schema-valid `GateResult`; threshold default 70% |
| **`runAdapter` / gate schemas** | UNCHANGED | Hard-fail malformed results; coverage must emit valid `gate-result` |
| **`verifyGateHook`** | MODIFY (wire) | Allow `adapterName: "coverage"` (or multi-adapter later); today single adapter per call — compose via sequential calls or new thin orchestrator |
| **`shipGateHook`** | MODIFY (light) | Fail-closed on missing/failing verify evidence that includes coverage when binding coverage rule selected |
| **Eval corpus** | MODIFY content | Add labeled cases for java-spring triggers (WSO2, hexagonal paths, coverage taskType=test) |
| **capability.json** | MODIFY (light) | Optional config keys: `governance.domains`, `governance.coverage.min`, `governance.coverage.reportPath` |
| **Starter examples tree** | NEW content | Folder layout + thin Java/Spring snippets for LLM mirror — **not rules** |

---

## Recommended Layout (v4.0)

```
aidlc-rules/
├── enterprise/                    # existing (require-mfa, etc.) — leave alone
├── domain/
│   └── java-spring/               # NEW — subscription name = "java-spring"
│       ├── hexagonal-layering.md
│       ├── cqrs-command-query.md
│       ├── ddd-aggregates.md
│       ├── service-classification.md      # Internal vs internet-facing
│       ├── outbound-wso2-only.md          # internet-facing outbound
│       ├── inbound-rest.md
│       ├── inbound-kafka.md
│       ├── unit-test-coverage-70.md       # binding → enforcement: coverage:min-70
│       ├── logging-audit.md
│       ├── api-contract-openapi.md
│       ├── saga-outbox-events.md
│       └── details/                       # lazy full bodies (already skipped by loader)
│           ├── hexagonal-layering-detail.md
│           ├── outbound-wso2-only-detail.md
│           └── ...
└── project/                       # this repo only if overlay-self rules needed

examples/                          # NEW — OUTSIDE aidlc-rules (critical)
└── java-spring/
    ├── README.md                  # how LLM should use these (mirror, don't inject)
    ├── layout/                    # ports/adapters + application/domain tree sketch
    │   └── ...
    └── snippets/                  # thin .java fragments (not full apps)
        ├── domain-aggregate.java.txt
        ├── inbound-rest-adapter.java.txt
        ├── outbound-wso2-client.java.txt
        └── ...

src/enforcement/
├── adapters.ts                    # MODIFY: register "coverage" (real, not noop)
├── coverage-adapter.ts            # NEW: parse JaCoCo XML / LCOV → GateResult
├── coverage-parse.ts              # NEW: pure parsers (testable, no I/O policy)
└── run-adapter.ts                 # UNCHANGED boundary

src/rules/load.ts                  # OPTIONAL MODIFY: skip "examples" dir name if nested
src/governance/verify-gate-hook.ts # MODIFY: coverage adapter selection / multi-run
```

### Structure Rationale

- **`domain/java-spring/` not enterprise:** Coding conventions are language/stack-specific. Enterprise pack is org-wide non-negotiables (MFA, etc.). Putting Java rules in enterprise forces them onto every domain subscription — wrong for this Node overlay repo and non-Java consumers. Domain subscription is already first-class (`config.domains` + `domainName()` from `sourceFile`).
- **`domain/java-spring/` not project:** Project scope is "this git repo only." Starter pack is product content for **consumer** Java services. Domain is the reusable unit.
- **`examples/` outside `aidlc-rules/`:** `findRuleFiles` indexes every `*.md` except under `details/`. Putting `.java` under rules is safe from index, but `.md` READMEs would become rules. Top-level `examples/` needs zero loader change and cannot pollute `rule-index.json`. **Do not** put examples under `details/` — details are rule prose loaded by id, not starter trees.
- **Binding coverage rule + real adapter:** Markdown "coverage >70%" alone = governance theater (PITFALLS). Binding frontmatter `enforcement: coverage:min-70` + adapter that parses real reports is the only credible path. Adapter runs in **consumer** verify CI (report path config), not against this repo's node:test suite.

---

## Architectural Patterns

### Pattern 1: Domain pack as the coding-convention unit

**What:** One domain directory = one opt-in convention stack. Frontmatter uses existing fields only — no schema expansion required for v4.0 content.
**When:** Any language/stack pack (java-spring now; future packs same shape).
**Trade-offs:** Consumers must pass `--domains java-spring` (or config). Forgotten subscription = silent under-injection for that pack — mitigate with onboarding docs + eval case that expects domain rules when subscribed.

**Example frontmatter (service classification):**
```yaml
---
id: service-classification
scope: domain
triggers:
  keywords:
    - service
    - microservice
    - jdbc
    - outbound
    - wso2
    - internet-facing
    - internal-service
  paths:
    - "**/application/**"
    - "**/adapter/**"
    - "**/infrastructure/**"
phases:
  - inception
  - construction
severity: high
summary: >-
  Classify service as internal (JDBC/ORM OK) or internet-facing
  (outbound only via WSO2). Inbound REST or Kafka.
classification: advisory
detailPath: ./details/service-classification-detail.md
---
```

**Example frontmatter (binding coverage):**
```yaml
---
id: unit-test-coverage-70
scope: domain
triggers:
  taskType:
    - test
    - feature
    - bugfix
  keywords:
    - coverage
    - jacoco
    - unit-test
  paths:
    - "**/src/test/**"
    - "**/pom.xml"
    - "**/build.gradle*"
phases:
  - construction
  - common
severity: high
summary: Unit-test line coverage must exceed 70% (enforced by coverage report adapter).
classification: binding
enforcement: coverage:min-70
detailPath: ./details/unit-test-coverage-70-detail.md
---
```

### Pattern 2: Examples as non-indexed assets

**What:** Starter layout + snippets live under `examples/java-spring/`. Rules mention example relative paths only inside **detail** bodies (lazy). Injection never lists example file contents.
**When:** Always for starter material. LLM fetches examples via normal repo read when implementing, not via `select()`.
**Trade-offs:** Slightly more friction than dumping examples into context; preserves core value. Optional later: `governance example <id>` CLI — not required for MVP.

```
select()  →  summaries of rules only
rule-detail service-classification  →  prose + "see examples/java-spring/layout/..."
LLM / user  →  open example files on demand (outside governance inject path)
```

### Pattern 3: Coverage adapter as first real GateAdapter

**What:** Implement `GateAdapter` with `name: "coverage"`. `evaluate(request)`:
1. Resolve report path from env/config (`COVERAGE_REPORT` or `governance.coverage.reportPath`).
2. Detect format (JaCoCo XML vs LCOV).
3. Parse line coverage % (pure functions).
4. Compare to threshold (default 70; config override).
5. Return `GateResult` `{ status: pass|fail, findings: [...], evaluatedBy: "coverage", ... }`.
6. Always exit through `runAdapter` → Ajv validate.

**When:** verify gate when binding rule `unit-test-coverage-70` is in `selected[]`, or when consumer CI always runs coverage adapter.
**Trade-offs:** Report-format surface area (JaCoCo XML + LCOV enough for Java/Spring). No Maven/Gradle execution inside adapter — **parse only**. Consumer CI produces report; adapter adjudicates. Keeps tool-agnostic contract (any producer of JaCoCo/LCOV works).

```typescript
// Shape only — pure parse + threshold; I/O at adapter edge
export function coverageFromJacocoXml(xml: string): { lineRate: number };
export function coverageFromLcov(lcov: string): { lineRate: number };

export function coverageAdapter(opts: { reportPath: string; minLineRate: number }): GateAdapter {
  return {
    name: "coverage",
    async evaluate(request) {
      // read reportPath → parse → status pass/fail → findings id tied to rule ids
      // gateId must echo request.gateId ("verify")
    },
  };
}
```

**Wire into verify:** Today `verifyGateHook` picks one `adapterName` (default `generic-exit-ci`). v4.0 options (prefer A for YAGNI):

| Option | Approach | Choose when |
|--------|----------|-------------|
| **A (recommended)** | Consumer/CI calls `runAdapter(coverageAdapter, request)` and/or `verifyGateHook({ adapterName: "coverage" })` when coverage is the binding check for that run | Single binding concern per verify invocation |
| B | `verifyGateHook` loops adapters listed in config | Multiple real adapters must all pass in one hook |

Ship A first. Multi-adapter composition = later phase if needed.

### Pattern 4: Trigger design for classification + WSO2 (recall-first for high)

**What:** Use **broad keywords + path globs**; severity `high`/`critical` for boundary rules so under-injection is less likely. Prefer over-injection of a short summary over missing WSO2 boundary.
**When:** Service classification, outbound WSO2, hexagonal layering.

| Rule theme | Primary triggers | Phases | Notes |
|------------|------------------|--------|-------|
| Service classification | keywords: `internal`, `internet-facing`, `jdbc`, `wso2`, `outbound`; paths: `**/adapter/**`, `**/infrastructure/**` | inception + construction | Advisory; guides design early |
| Outbound WSO2 only | keywords: `wso2`, `resttemplate`, `webclient`, `feign`, `http-client`, `outbound`; paths: `**/*Client*.java`, `**/outbound/**` | construction | High; detail lists forbidden direct internet clients |
| Inbound REST | keywords: `controller`, `restcontroller`, `openapi`, `api`; paths: `**/adapter/in/**`, `**/web/**` | construction | |
| Inbound Kafka | keywords: `kafka`, `consumer`, `listener`; paths: `**/messaging/**`, `**/kafka/**` | construction | |
| Hexagonal / CQRS / DDD | keywords: `hexagonal`, `port`, `adapter`, `aggregate`, `cqrs`, `command`, `query`; paths: `**/domain/**`, `**/application/**`, `**/ports/**` | construction (+ inception for structure) | |
| Coverage | taskType: `test`\|`feature`\|`bugfix` + paths to build files / tests | construction + common | **Binding** → coverage adapter |
| Logging / API / saga | respective keywords | construction | Advisory unless org marks binding later |

Empty `triggers: {}` only for true always-on domain baselines — use sparingly (token budget). Prefer keyword+path.

**Exclude axis:** Use `exclude.paths: ["**/src/test/**"]` on production-boundary rules so test fakes do not force WSO2 summaries every unit-test edit — optional precision knob after eval measures noise.

---

## Data Flow

### A. Coding-rule selection (consumer Java task)

```
Consumer enables governance + domains: ["java-spring"]
    ↓
discuss/plan: TaskSignal from CONTEXT (keywords, paths to *.java, taskType)
    ↓
select(index, signal, { phase, domains: ["java-spring"] })
    ↓  domain gate: only domain/java-spring/* + enterprise + project
    ↓  trigger gate: keywords/paths/taskType
selected[] summaries → inject <governance> fragment (no bodies, no examples)
    ↓
execute: model follows summaries; may `governance rule-detail <id>`
    ↓ detail prose points to examples/java-spring/... (user/LLM opens files)
```

### B. Coverage enforcement (consumer CI / verify)

```
Consumer CI runs tests → writes jacoco.xml or lcov.info
    ↓
verifyGateHook({ adapterName: "coverage", ... })
  or explicit runAdapter(coverageAdapter, gateRequest)
    ↓
coverage adapter reads report file (path from config/env)
    ↓
parse line rate → GateResult status pass/fail + findings
    ↓
runAdapter Ajv-validates → write gates/{NN}-verify.json
    ↓
shipGateHook: missing/fail verify evidence → block
audit: machine-derived tests/coverage status, not model narration
```

### C. What must NOT flow

```
examples/**           ✗ never → rule-index.json
rule Markdown bodies  ✗ never → inject fragment
full starter trees    ✗ never → select() output
coverage report XML   ✗ never → LLM context (adapter-only)
```

---

## New vs Modified Components

### New

| Artifact | Kind | Depends on |
|----------|------|------------|
| `aidlc-rules/domain/java-spring/*.md` + `details/` | content | existing frontmatter schema |
| `examples/java-spring/**` | content | nothing in select path |
| `src/enforcement/coverage-parse.ts` | code | pure string → metrics |
| `src/enforcement/coverage-adapter.ts` | code | GateAdapter, parse, fs read |
| Eval fixtures for java-spring signals | test content | eval harness (Phase 10) |
| Docs: pack install + domain subscribe + coverage CI | docs | onboarding/rule-authoring patterns |

### Modified

| Artifact | Change | Risk |
|----------|--------|------|
| `src/enforcement/adapters.ts` | Register `coverage` in map (real adapter, not noop); extend `STUB_NAMES` or split REAL vs STUB | Low if coverage only used when configured |
| `src/governance/verify-gate-hook.ts` | Document/support `adapterName: "coverage"`; optional default selection when binding coverage rule present | Medium — keep single-adapter call first |
| `src/governance/ship-gate-hook.ts` | Ensure fail-closed already covers coverage verify fails (likely **no code** if evidence status=fail) | Low |
| capability config / docs | `governance.domains`, coverage report path + min | Low |
| `docs/rule-authoring.md` / onboarding | Domain pack + examples placement + coverage adapter | Low |
| Optional `load.ts` | Skip directory name `examples` if ever nested under rules | Low; avoid need by layout |

### Unchanged (do not rebuild)

- Frontmatter schema (unless new field forced — **not required**)
- `select()` pure core, scope precedence, token budget
- `renderInjection` body-free guarantee
- `runAdapter` validation boundary
- Approval store, audit writer v2 shape, eval harness engine

---

## Build Order (phases 13+)

Continue numbering after v3.0 phases 11–12. Order is dependency-driven.

### Phase 13 — Domain pack skeleton + service boundary rules
**Ship:** `aidlc-rules/domain/java-spring/` with service-classification, outbound-wso2-only, inbound-rest, inbound-kafka (+ details). Rebuild index. Eval cases for subscribe/unsubscribed domain + WSO2 keywords.
**Why first:** Content-only; proves domain subscription path with real corpus. No adapter risk.
**Avoids:** Putting Java rules in enterprise; empty triggers spam.

### Phase 14 — Architecture style rules (Hexagonal + CQRS + DDD)
**Ship:** layering, ports/adapters, CQRS, DDD aggregate/naming rules + details. Path globs for `domain/application/adapter`.
**Depends on:** 13 pack root exists.
**Avoids:** Giant always-in-phase rules; keep path+keyword triggers.

### Phase 15 — Cross-cutting conventions (logging, API, saga/events)
**Ship:** logging-audit, api-contract-openapi, saga-outbox-events rules.
**Depends on:** 13–14 patterns for id/prefix consistency.
**Note:** All advisory unless product later marks binding + contract.

### Phase 16 — Starter examples tree (non-indexed)
**Ship:** `examples/java-spring/layout` + thin snippets; README usage. Detail files from 13–15 link to example paths. Property/regression: `build-index` rule count unchanged by examples; no example path in `rule-index.json`.
**Depends on:** rules that point at examples (13–15).
**Avoids:** examples under `aidlc-rules/**` markdown walk.

### Phase 17 — Coverage parser + GateAdapter
**Ship:** `coverage-parse.ts` (JaCoCo XML + LCOV), `coverage-adapter.ts`, register in adapter map, unit tests with fixture reports, threshold config (default 0.70). Binding rule `unit-test-coverage-70`.
**Depends on:** GateAdapter + runAdapter (done Phase 7); binding rule content can land here or end of 13.
**Avoids:** Shelling out to Maven; parsing only. Avoid treating this repo's node coverage as the consumer check.

### Phase 18 — Verify/ship wiring + consumer CI docs
**Ship:** verify path runs coverage adapter when configured; ship fail-closed evidence path verified; onboarding section "Java consumer: domains + coverage report path"; optional capability config keys.
**Depends on:** 17 adapter + 13 binding rule.
**Avoids:** Multi-adapter orchestration complexity unless proven necessary.

### Phase 19 — Selection-quality eval expansion + token budget check
**Ship:** Full labeled eval set for java-spring (critical/high recall floor), precision report for noisy keywords, budget regression with full pack enabled.
**Depends on:** complete rule corpus (13–15) + examples not in index (16).
**Why last content-quality gate:** Need final corpus before locking recall.

**Optional later (not v4.0 must):** multi-adapter verify loop; `governance example` CLI; BA/PM packs; frontend packs.

### Phase ordering rationale

```
13 pack + boundary rules     → unblocks domain subscription proof
14 architecture rules        → needs pack root
15 cross-cutting rules       → parallelizable with 14 after 13, but serial keeps review simple
16 examples                  → after rules that reference them; proves non-index
17 coverage adapter          → independent of 14–16 content-wise, but binding rule + docs clearer after pack exists; can spike parse early
18 gate wire + consumer docs → needs 17
19 eval + budget             → needs full corpus
```

Critical path: **13 → 14 → 15 → 16** (content) parallel-capable with **17** after 13's binding rule id frozen → **18** → **19**.

---

## Scaling Considerations

| Concern | This overlay repo | 1 consumer Java service | Many services / multi-domain |
|---------|-------------------|-------------------------|------------------------------|
| Rule corpus size | Small domain pack | One domain subscribed | Multiple domains; budget pressure |
| Selection | Existing engine | Same; domains filter | Watch token budget; split domains |
| Coverage adapter | Fixture-tested only | One report path in CI | Per-service report path config |
| Examples | Shipped in package | Copied/mirrored by LLM | Version with pack; don't inject |

**First bottleneck:** Token budget when java-spring + enterprise + loose keywords over-inject. Mitigate with eval precision + exclude paths, not by dropping critical boundary rules.

**Second bottleneck:** Coverage format drift (JaCoCo versions). Keep parser tolerant; test fixtures from real JaCoCo XML samples.

---

## Anti-Patterns

### Anti-Pattern 1: Enterprise dump of all Java rules

**What people do:** Put coding conventions under `aidlc-rules/enterprise/`.
**Why wrong:** Forces Java governance onto non-Java work; blows budget; wrong scope semantics.
**Instead:** `domain/java-spring/` + explicit subscribe.

### Anti-Pattern 2: Examples as rules or under indexed markdown

**What people do:** `aidlc-rules/domain/java-spring/examples/*.md` with frontmatter, or huge snippet bodies in rule files.
**Why wrong:** Index/select may inject or at least bloat authoring; violates summary-only premise if bodies grow.
**Instead:** Top-level `examples/`; rule **details** point to paths; inject summaries only.

### Anti-Pattern 3: Coverage as advisory markdown only

**What people do:** Rule says ">70%" with Verification for the model to self-check.
**Why wrong:** Governance theater; no machine evidence; ship lies.
**Instead:** `classification: binding` + `enforcement: coverage:min-70` + real parser adapter + gate evidence.

### Anti-Pattern 4: Adapter runs Maven/Gradle inside Node overlay

**What people do:** `spawn mvn test` from adapter.
**Why wrong:** Wrong runtime, non-portable, slow, security surface; this repo is not the consumer build.
**Instead:** Parse CI-produced reports only.

### Anti-Pattern 5: Schema expansion for "examplePath" without need

**What people do:** Add frontmatter fields for examples, service-tier enums, etc.
**Why wrong:** `additionalProperties: false` — schema change ripples validators/tests; YAGNI if detail prose + keywords suffice.
**Instead:** Existing triggers + detail pointers; revisit schema only if select must key on new axis.

### Anti-Pattern 6: Empty triggers for entire coding pack

**What people do:** All java-spring rules `triggers: {}` so they always fire when domain subscribed.
**Why wrong:** Over-injection when domain enabled for any task; budget death.
**Instead:** Phase + keyword/path triggers; reserve always-in-phase for 1–2 true baselines max.

---

## Integration Points

### Existing seams (reuse)

| Seam | How v4.0 uses it |
|------|------------------|
| `aidlc-rules/domain/<name>/` | Pack name `java-spring` |
| `SelectionConfig.domains` | `["java-spring"]` |
| `select()` domainName from sourceFile | No change |
| `details/` skip in loadRules | Rule details only |
| Frontmatter binding + enforcement string | `coverage:min-70` |
| `GateAdapter` + `runAdapter` | coverage implementation |
| `verifyGateHook` / `shipGateHook` | Evidence + fail-closed |
| `.planning/governance/gates/` | Durable verify results |
| Eval harness + ship critical-recall | Expand corpus, don't rewrite engine |
| capability.json consent hooks | Config keys additive |

### Internal boundaries (v4.0)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Domain pack ↔ select | Index records only | Bodies never in index |
| Rules ↔ examples | Prose paths in detail files | No API coupling |
| Coverage adapter ↔ verify | `runAdapter` only | Never bypass Ajv |
| Coverage adapter ↔ consumer CI | Report file path | Overlay does not build Java |
| Inject ↔ examples | **None** | Hard boundary |

### External (consumer)

| Consumer concern | Integration |
|------------------|-------------|
| Enable pack | `governance select --domains java-spring` / config |
| Produce coverage | JaCoCo or LCOV in CI |
| Point adapter | `governance.coverage.reportPath` or env |
| Threshold | default 70%; config override |
| WSO2 / classification | Follow selected summaries + detail; SAST optional later stub |

---

## Suggested Roadmap Phase Map (13–19)

| Phase | Name | New / Mod | Core value impact |
|-------|------|-----------|-------------------|
| 13 | Java-spring domain pack: classification + integrations | NEW content | Select must fire on WSO2/service signals |
| 14 | Hexagonal + CQRS + DDD rules | NEW content | Path/keyword selection |
| 15 | Logging, API, saga rules | NEW content | Advisory corpus complete |
| 16 | Starter examples (non-indexed) | NEW assets + guard test | **Must not** enter inject path |
| 17 | Coverage parse + GateAdapter | NEW code + binding rule | First real binding enforcement for consumers |
| 18 | Verify/ship wire + consumer docs | MOD hooks/docs | Evidence fail-closed |
| 19 | Eval corpus + budget with full pack | MOD eval fixtures | Recall/precision/budget lock |

Research flags:
- Phase 17: deeper research on JaCoCo XML schema variants if fixtures fail real reports
- Phase 18: only if multi-adapter orchestration demanded — else standard pattern
- Phases 13–16: standard pack authoring; unlikely need new engine research

---

## Sources

- Live code: `src/rules/load.ts` (details/ skip, body quarantine), `src/rules/scope.ts` (domain tier), `src/select/select.ts` (`domainName`, `inScope`, trigger axes), `src/types.ts` (Frontmatter/TaskSignal), `src/enforcement/adapters.ts` + `run-adapter.ts` + `types.ts`, `src/governance/verify-gate-hook.ts`, `ship-gate-hook.ts`, `paths.ts`, `capture-test-evidence.ts` (Node TAP — not consumer Java coverage)
- `docs/rule-authoring.md` — frontmatter, scopes, triggers, verify-fire loop
- `.planning/PROJECT.md` — v4.0 goals, constraints, deferred BA/frontend
- Prior `.planning/research/ARCHITECTURE.md` (2026-07-05) — capability overlay baseline (still valid; this doc is the v4.0 integration delta)
- Confidence: **HIGH** for integration shape; **MEDIUM** for exact JaCoCo XML field names until Phase 17 fixtures land against real reports

---

*Architecture research for: v4.0 Developer Coding Conventions on GSD governance overlay*
*Researched: 2026-07-09*
