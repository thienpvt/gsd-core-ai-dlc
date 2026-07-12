# Phase 13: Domain Pack + Service Classification + Integrations - Pattern Map

**Mapped:** 2026-07-09
**Files analyzed:** 11 (10 create + 1 rebuild; optional fixture store noted)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `aidlc-rules/domain/java-spring/java-spring-svc-internal-outbound.md` | config (rule content) | transform | `test/fixtures/eval/eval-rules/domain/security/threat-model.md` + exclude from `logging-standard.md` | role-match |
| `aidlc-rules/domain/java-spring/java-spring-svc-internet-outbound.md` | config (rule content) | transform | same domain + exclude pattern as above | role-match |
| `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md` | config (rule content) | transform | `test/fixtures/eval/eval-rules/domain/payments/pci-scope.md` + paths axis from `select.test.ts` | role-match |
| `aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md` | config (rule content) | transform | same as REST inbound | role-match |
| `aidlc-rules/domain/java-spring/details/java-spring-svc-internal-outbound-detail.md` | config (detail body) | file-I/O | `test/fixtures/detailpath-store/enterprise/details/with-detail.md` | exact |
| `aidlc-rules/domain/java-spring/details/java-spring-svc-internet-outbound-detail.md` | config (detail body) | file-I/O | same detail fixture | exact |
| `aidlc-rules/domain/java-spring/details/java-spring-inbound-rest-detail.md` | config (detail body) | file-I/O | same detail fixture | exact |
| `aidlc-rules/domain/java-spring/details/java-spring-inbound-kafka-detail.md` | config (detail body) | file-I/O | same detail fixture | exact |
| `src/select/java-spring-pack.test.ts` | test | request-response | `src/select/select.test.ts` + `src/select/skip-reasons.test.ts` | exact |
| `rule-index.json` | config (generated index) | batch | rebuild via existing `governance build-index` / `buildIndex` path | exact |
| `test/fixtures/java-spring-store/**` (optional) | config (fixture store) | transform | `test/fixtures/eval/eval-rules/domain/**` + `detailpath-store` | role-match |

**Not in scope (no production `src/` engine edits):** `src/select/select.ts`, `src/types.ts`, adapters, pack README.

## Pattern Assignments

### Shared rule frontmatter shell (all four production rules)

**Analogs:**
- Production baseline: `aidlc-rules/enterprise/require-mfa.md`
- Domain layout: `test/fixtures/eval/eval-rules/domain/security/threat-model.md`
- Domain layout (payments): `test/fixtures/eval/eval-rules/domain/payments/pci-scope.md`
- detailPath pointer: `test/fixtures/detailpath-store/enterprise/with-detail.md`
- Authoring docs Example B: `docs/rule-authoring.md` (lines 143–183)

**Copy frontmatter conventions from domain fixture** (`threat-model.md` lines 1–15) — **not** empty `triggers: {}` from `require-mfa.md`:

```markdown
---
id: threat-model
scope: domain
triggers:
  taskType:
    - security
  keywords:
    - threat
    - auth
phases:
  - construction
severity: high
summary: Security-sensitive features require a documented threat model before build.
classification: advisory
---
```

**Copy body structure + Verification from production rule** (`require-mfa.md` lines 12–21):

```markdown
## Rule ENT-01: Multi-Factor Authentication For Privileged Access

Every account holding elevated or administrative privilege must present a second
authentication factor before its session is granted. ...

### Verification

Confirm the identity provider enforces a second factor for every role mapped to a
privileged scope, and that any break-glass account is time-boxed and audited.
```

**Copy body-leak canary comment pattern** (`require-mfa.md` lines 23–26):

```markdown
<!--
Body-leak canary: none of these prose sentences may ever appear in rule-index.json.
The index carries only the frontmatter summary and pointers (D-05 / PACK-04).
-->
```

**Copy detailPath field pattern** (`with-detail.md` lines 1–11) — Phase 13 rules MUST set this (unlike `require-mfa`):

```markdown
---
id: with-detail
scope: enterprise
triggers: {}
phases:
  - construction
severity: medium
summary: Has a detail pointer.
classification: advisory
detailPath: details/with-detail.md
---
```

**Authoring notes for Phase 13 rules (locked):**
- `scope: domain` (directory must be `aidlc-rules/domain/java-spring/`)
- `classification: advisory` (no `enforcement`)
- `phases: [construction]` only (all four)
- `summary`: exactly one sentence, no `\n`, target ≤ ~160 chars
- `id`: kebab `java-spring-*`
- Body heading: `## Rule JS-SVC-01` / `JS-SVC-02` / `JS-IN-01` / `JS-IN-02`
- `detailPath: details/<id>-detail.md` (relative to rule file dir; no `./` required — fixture uses bare `details/...`)
- **Do not** copy `triggers: {}` from require-mfa (always-in-phase spam after subscribe)

---

### `aidlc-rules/domain/java-spring/java-spring-svc-internal-outbound.md` (config, transform)

**Analog:** domain pack + exclude-wins
- Domain: `test/fixtures/eval/eval-rules/domain/security/threat-model.md`
- Exclude axis: `test/fixtures/eval/eval-rules/enterprise/logging-standard.md` lines 1–15

**Exclude pattern** (`logging-standard.md`):

```markdown
---
id: logging-standard
scope: enterprise
triggers:
  keywords:
    - log
    - logging
  exclude:
    paths:
      - "**/*.test.*"
phases:
  - construction
severity: medium
summary: Application logging must use the structured logger and redact sensitive fields.
classification: advisory
---
```

**Apply as:** positive Internal class vocabulary/paths + `exclude` for internet-facing class vocabulary/paths (mutual exclusion). Prefer multi-token markers (`internal-service`, `internet-facing`) to avoid substring traps (RESEARCH keyword semantics).

**Recommended shell (from RESEARCH + analogs):**

```markdown
---
id: java-spring-svc-internal-outbound
scope: domain
triggers:
  keywords:
    - internal-service
    - internal-only
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
phases:
  - construction
severity: high
summary: Internal services may use JDBC/ORM or direct DB access outbound; do not force an API gateway on internal-only calls.
classification: advisory
detailPath: details/java-spring-svc-internal-outbound-detail.md
---

## Rule JS-SVC-01: Internal Service Outbound Access
...
### Verification
...
<!-- BODY_CANARY java-spring-svc-internal-outbound: must never appear in rule-index.json -->
```

---

### `aidlc-rules/domain/java-spring/java-spring-svc-internet-outbound.md` (config, transform)

**Analog:** same as internal outbound (symmetric exclude)

**Apply as:** positive internet-facing vocabulary/paths + exclude Internal vocabulary/paths. Vendor string `WSO2` only in **detail** Markdown (or optional short e.g. in detail only); never in `src/`. Summary prefers capability language (“approved API gateway”).

```markdown
---
id: java-spring-svc-internet-outbound
scope: domain
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
phases:
  - construction
severity: high
summary: Internet-facing services must send outbound calls through the approved API gateway; do not call external systems with raw WebClient, RestTemplate, or SDKs from domain code.
classification: advisory
detailPath: details/java-spring-svc-internet-outbound-detail.md
---

## Rule JS-SVC-02: Internet-Facing Outbound Via Gateway
```

---

### `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md` (config, transform)

**Analog:**
- Domain construction rule: `test/fixtures/eval/eval-rules/domain/payments/pci-scope.md` lines 1–25
- Paths axis proof: `src/select/select.test.ts` lines 77–89 (picomatch paths)
- Exclude docs/tests: `logging-standard.md` exclude + WR-01 exclude-only pattern in `select.test.ts` lines 141–199

**pci-scope domain shell** (lines 1–14):

```markdown
---
id: pci-scope
scope: domain
triggers:
  keywords:
    - payment
    - card
    - pci
phases:
  - construction
severity: critical
summary: Code touching cardholder data must stay within the documented PCI scope.
classification: advisory
---
```

**Path-primary triggers (locked seeds):**

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
```

**Body heading:** `## Rule JS-IN-01: Thin REST Controllers`  
**Summary:** one sentence on thin controllers → ports, validation at boundary.

---

### `aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md` (config, transform)

**Analog:** same as REST inbound (mirror structure)

**Path-primary triggers (locked seeds):**

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
```

**Body heading:** `## Rule JS-IN-02: Idempotent Kafka Consumers`  
**Summary:** one sentence on idempotency, retry/DLQ, Kafka types stay in adapters.

---

### Detail files under `aidlc-rules/domain/java-spring/details/*-detail.md` (config, file-I/O)

**Analog:** `test/fixtures/detailpath-store/enterprise/details/with-detail.md` (full file)

```markdown
## Rule ENT-WD Detail: Advisory Rule Full Body

This is the full detail body for the `with-detail` rule. It lives under
`details/`, which `findRuleFiles` skips, so it is NEVER parsed as an indexed rule
and needs no frontmatter.

`governance rule-detail with-detail` resolves the declaring rule's `detailPath`
(`details/with-detail.md`, relative to the rule file's directory per D-08) and
prints exactly this body — the ONE sanctioned place a rule body surfaces.

DETAIL_BODY_CANARY: the lazy loader fetched the full with-detail rule body.
```

**Also mirror docs Example B detail** (`docs/rule-authoring.md` lines 173–183): heading restatement + Verification section.

**Apply to each of four details:**
1. No frontmatter
2. Live only under `details/` (loader skips — `src/rules/load.ts`)
3. Outline: restatement → when-to-apply → Do/Don't → Verification checklist → optional Phase 14 forward pointer
4. Unique body canary string per file (assert absent from `JSON.stringify(index)` and from `renderInjection` output)
5. Internet-outbound detail may name **WSO2**; production `src/**/*.ts` must not

**One detail file per rule** (RESEARCH discretion recommendation) so D-07 existence checks stay 1:1 with `detailPath`.

---

### `src/select/java-spring-pack.test.ts` (test, request-response)

**Analogs:**
- Primary: `src/select/select.test.ts` (imports, `buildIndex`, `select`, domain subscription)
- Skip reasons: `src/select/skip-reasons.test.ts` (`out-of-scope` for unsubscribed domain)
- Inject body-leak: `src/inject/inject.test.ts` (summary in fragment, no skip/body leak)
- detailPath build: `src/index/build-guards.test.ts`
- Canary absence: `src/index/no-body.property.test.ts`

**Imports + fixture root pattern** (`select.test.ts` lines 16–37):

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import type { RuleIndex, TaskSignal, SelectionConfig } from "../types.js";

const EVAL_ROOT = path.resolve(
  process.cwd(),
  "test",
  "fixtures",
  "eval",
  "eval-rules",
);

function evalIndex(): RuleIndex {
  return buildIndex(EVAL_ROOT);
}
```

**Adapt for Phase 13:** point root at production pack (`aidlc-rules`) unless isolation fixture is chosen:

```typescript
const PACK_ROOT = path.resolve(process.cwd(), "aidlc-rules");
function packIndex() {
  return buildIndex(PACK_ROOT);
}
```

**Domain unsubscribed → out-of-scope** (`skip-reasons.test.ts` lines 66–74):

```typescript
test("out-of-scope: domain rule threat-model is skipped when 'security' is not subscribed", () => {
  const index = evalIndex();
  const signal: TaskSignal = { taskType: "security", keywords: ["threat"], paths: [] };
  const skips = skippedFor(index, signal, { phase: "construction", domains: [] }, "threat-model");
  assert.equal(skips.length, 1);
  assert.equal(skips[0].reason, "out-of-scope");
});
```

**Domain subscribed config** (`select.test.ts` lines 243–246, 284–287):

```typescript
const result = select(index, signal, {
  phase: "construction",
  domains: ["security"],
});
// multi-domain:
domains: ["security", "payments"],
```

**Paths axis** (`select.test.ts` lines 77–89) — use for REST `*Controller*` / Kafka `*Listener*`:

```typescript
const signal: TaskSignal = {
  taskType: "infra",
  keywords: [],
  paths: ["infra/main.tf"],
};
const result = select(index, signal, { phase: "construction", domains: [] });
const hit = result.selected.find((s) => s.id === "iac-review");
assert.ok(hit);
assert.equal(hit.matchedAxis, "paths");
```

**Exclude wins detail** (`skip-reasons.test.ts` lines 86–104) — use for dual-class → neither / docs exclude:

```typescript
assert.equal(skips[0].reason, "out-of-scope-by-trigger");
assert.equal(skips[0].detail, "matched-then-excluded");
```

**Inject summary-only** (`inject.test.ts` lines 40–59):

```typescript
const fragment = renderInjection(result);
assert.ok(fragment.includes(rule.summary));
assert.ok(fragment.includes(`governance rule-detail ${rule.id}`));
// Phase 13: also assert canary / "## Rule JS-" not in fragment
```

**Required test matrix (from RESEARCH):**

| Case | Config | Signal | Expect |
|------|--------|--------|--------|
| JAVA-PACK-01 | `domains: []` | any matching | all four pack ids `skipped` reason `out-of-scope` |
| JAVA-PACK-01 | `domains: ["java-spring"]` | matching | pack rules can enter `selected` |
| JAVA-PACK-02 | — | — | each summary no `\n`, ≤160; inject has summary not canary; detailPath present on index records |
| JAVA-SVC-01 | subscribed | `internal-service` | internal only |
| JAVA-SVC-01 | subscribed | `internet-facing` | internet only |
| JAVA-SVC-01 | subscribed | both markers | neither outbound |
| JAVA-SVC-01 | subscribed | neither class | neither outbound |
| JAVA-IN-01 | subscribed construction | path `*Controller*` | REST selected |
| JAVA-IN-01 | subscribed inception | same | out-of-phase |
| JAVA-IN-02 | subscribed construction | path `*Listener*` / kafka | Kafka selected |
| hygiene | — | — | `buildIndex("aidlc-rules")` succeeds; canaries ∉ index JSON; no WSO2 in production `src/` |

**RESEARCH fixture test skeleton** (copy structure into this file; already validated against select suite style):

```typescript
import { renderInjection } from "../inject/inject.js";

const PACK_IDS = [
  "java-spring-svc-internal-outbound",
  "java-spring-svc-internet-outbound",
  "java-spring-inbound-rest",
  "java-spring-inbound-kafka",
] as const;

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
```

**Test framework conventions:**
- `node:test` + `node:assert/strict` only
- Co-locate under `src/select/` so `npm test` / `dist-test/select/java-spring-pack.test.js` picks it up
- Prefer `buildIndex("aidlc-rules")` over a duplicated fixture (only `require-mfa` exists today — low noise)

---

### `rule-index.json` (config, batch rebuild)

**Analog:** existing production index (currently 1 rule: `require-mfa`) + build path `src/index/build.ts` / CLI `src/cli/commands/build-index.ts`

**Pattern:** do not hand-edit JSON. After authoring rules:

```bash
node bin/governance.cjs build-index --root aidlc-rules --out rule-index.json
```

**Expect after rebuild:**
- Existing `require-mfa` + 4 new domain ids (5 winners if no id collisions)
- Each pack record: `scope: "domain"`, `classification: "advisory"`, non-empty `detailPath`, one-line `summary`
- No body canary strings in serialized index (PACK-04 / D-05)

**detailPath carried verbatim** (`build-guards.test.ts` lines 91–100):

```typescript
const index = buildIndex(DETAILPATH_STORE);
const record = index.rules.find((r) => r.id === "with-detail");
assert.equal(record.detailPath, "details/with-detail.md");
```

---

### Optional `test/fixtures/java-spring-store/` (config, transform)

**Analogs:** `test/fixtures/eval/eval-rules/domain/{security,payments}/` + `test/fixtures/detailpath-store/`

**When to use:** only if tests must isolate from enterprise rules. **RESEARCH recommendation:** skip for Phase 13; primary suite against real `aidlc-rules`.

**If created, copy layout:**

```
test/fixtures/java-spring-store/
└── domain/
    └── java-spring/
        ├── java-spring-*.md
        └── details/
            └── *-detail.md
```

Mirror frontmatter of production pack (or slim copies). `buildIndex` enforces D-07: detail targets must exist when `detailPath` set.

## Shared Patterns

### Domain pack subscription gate
**Source:** `src/select/select.ts` (`inScope` / `domainName` from `sourceFile` path segment after `domain/`)  
**Proven by:** `src/select/skip-reasons.test.ts` lines 66–74; `src/select/select.test.ts` domains arrays  
**Apply to:** all four pack rules — folder `domain/java-spring/` yields subscription name `java-spring`; selection requires `domains: ["java-spring"]`

### Advisory + one-sentence summary injection
**Source:** `aidlc-rules/enterprise/require-mfa.md` (summary style); `src/inject/inject.ts` via `inject.test.ts`  
**Apply to:** all four rules — `classification: advisory`; inject summaries only; essays only under `detailPath`

### Exclude-wins mutual exclusion
**Source:** `test/fixtures/eval/eval-rules/enterprise/logging-standard.md` + `skip-reasons.test.ts` matched-then-excluded  
**Apply to:** outbound Internal XOR internet-facing rules; docs/test path excludes on inbound rules

### detailPath + details/ quarantine
**Source:** `test/fixtures/detailpath-store/**`; loader skip of `details/` (`src/rules/load.ts`); D-07 in `buildIndex`  
**Apply to:** every Phase 13 rule — sibling `details/<id>-detail.md`, no frontmatter on details

### Body / canary never in index
**Source:** `require-mfa.md` canary comment; `src/index/no-body.property.test.ts`  
**Apply to:** unique canary per rule + detail; assert on `buildIndex` JSON and `renderInjection`

### Vendor strings stay in Markdown
**Source:** PROJECT/CONTEXT locked decision  
**Apply to:** WSO2 only in rule detail (and optionally rule body Markdown); never `src/` production identifiers; optional test grep hygiene

### Zero engine / dep changes
**Source:** CONTEXT + RESEARCH  
**Apply to:** phase plans — content + tests + index rebuild only; no `SelectionConfig.serviceClass`, no new npm packages

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All deliverables have clear analogs; no net-new engine surface |

**Note:** There is no production `aidlc-rules/domain/**` pack yet (only eval fixtures). Closest production content analog remains `require-mfa.md`; closest **layout** analogs are eval domain fixtures under `test/fixtures/eval/eval-rules/domain/`.

## Anti-Patterns (do not copy)

| Anti-pattern | Bad analog | Why |
|--------------|------------|-----|
| Empty `triggers: {}` on pack style rules | `require-mfa.md` triggers | Always-in-phase spam after subscribe |
| Binding without enforcement | binding fixtures | Phase 17 owns binding |
| Pack `README.md` with accidental rule frontmatter | — | Loader indexes every `*.md` outside `details/` |
| Shared positive keywords without exclude | — | Dual outbound selection |
| Hand-authored `rule-index.json` | — | Use `build-index` |
| Vendor names in `src/` | — | Engine freeze / vendor-neutral |

## Metadata

**Analog search scope:** `aidlc-rules/`, `test/fixtures/`, `src/select/`, `src/inject/`, `src/index/`, `docs/rule-authoring.md`  
**Files scanned:** ~25 primary analogs + fixtures  
**Pattern extraction date:** 2026-07-09  
**Engine freeze:** no production `src/` edits expected; only `src/select/java-spring-pack.test.ts` (test) + content under `aidlc-rules/` + index rebuild
