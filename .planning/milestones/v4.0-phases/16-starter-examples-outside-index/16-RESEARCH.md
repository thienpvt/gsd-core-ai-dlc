# Phase 16: Starter Examples Outside Index - Research

**Researched:** 2026-07-12
**Domain:** Thin Java/Spring starter mirror tree (non-selectable examples) outside rule-index scan roots
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

No CONTEXT.md exists for Phase 16 yet. Locked decisions below are derived from ROADMAP.md success criteria, REQUIREMENTS.md verbatim text, STATE.md v4.0 roadmap decisions, and carry-forward conventions established by Phases 13–15 (all marked HIGH confidence via direct observation of those phases' CONTEXT/RESEARCH/SUMMARY artifacts).

- **Location:** `examples/java-spring/` at **repo root** — sibling to `aidlc-rules/`, NOT inside it [VERIFIED: ROADMAP SC1 "examples/java-spring/ ships folder layout... outside rule-index scan roots"; REQUIREMENTS JAVA-EX-01]
- **Content:** thin snippets for **ports, adapters, handlers, REST, Kafka** (hexagonal/DDD mirror) [VERIFIED: REQUIREMENTS JAVA-EX-01]
- **Selectable rule invariant:** `build-index` / load path NEVER treats starter markdown under `examples/` as selectable rules — "layout proof and/or explicit guard" [VERIFIED: REQUIREMENTS JAVA-EX-02; ROADMAP SC2]
- **Engine freeze carry-forward:** zero production `src/` edits outside the new proof test (same discipline as Phases 13–15) [VERIFIED: STATE.md decisions for phases 13/14/15]
- **Zero new npm deps** [VERIFIED: STATE.md v4.0 roadmap decision]
- **Vendor strings:** vendor names only in rule content, not production `src/` [VERIFIED: STATE.md]
- **Examples ship outside scan roots by layout, not by engine patch** — primary guard is the scan-root boundary, not a new `findRuleFiles` skip [VERIFIED: build.ts + build-index CLI default]

### Claude's Discretion

- Exact snippet set beyond the seed names (ports, adapters, handlers, REST, Kafka) — planner may add or trim
- Snippet depth — thin pointers vs. compilable stubs (recommend thin; this is a mirror, not a runnable app)
- Whether to add `examples` to `package.json` `files` for npm tarball shipping (recommend yes so consumers can mirror)
- Whether to add a README under `examples/java-spring/` explaining non-selectability
- Test suite name and exact assertions beyond the mandatory two (non-indexing + scope-rejection)

### Deferred Ideas (OUT OF SCOPE)

- Binding coverage ≥70% → Phase 17 [VERIFIED: ROADMAP]
- Consumer docs explaining subscription / coverage reporting → Phase 18 (JAVA-DOC-01)
- CQRS (JAVA-CQRS-01) — out of v4.0
- Full multi-module bank sample app — explicit Out of Scope (REQUIREMENTS.md)
- Java/Maven/JDK as overlay runtime deps — Out of Scope (overlay is Node/TS)
- Binding coverage gate / coverage parser — Phase 17
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JAVA-EX-01 | Starter tree under `examples/java-spring/` (folder layout + thin Java/Spring snippets for ports, adapters, handlers, REST, Kafka) ships outside rule-index scan roots | `build-index` CLI defaults `--root aidlc-rules` (VERIFIED src/cli/commands/build-index.ts); scan never reaches repo-root `examples/`; recommended layout in "Recommended Project Structure" |
| JAVA-EX-02 | Index/load path never treats starter markdown under `examples/` as selectable rules (guard or layout proof) | Layout is the primary guard; `deriveScope` throws D-10 for any path outside `enterprise/domain/project` (VERIFIED src/rules/scope.ts); sibling test `src/select/starter-examples.test.ts` asserts both non-indexing + scope-rejection |
</phase_requirements>

## Summary

Phase 16 is a **content + negative proof** phase. The goal is to ship a thin Java/Spring starter tree the LLM can mirror when scaffolding new consumer backend work, **without** that tree ever becoming selectable governance rules. Success is measured by absence: the rule index ignores the examples, and a new sibling test proves that absence durably.

The engine is **frozen** (carry-forward from Phases 13–15). No production `src/` edits are required or recommended. The primary isolation guard is **already enforced by existing code**:

1. `buildIndex(rootDir)` recurses only under `rootDir` (`src/rules/load.ts:findRuleFiles`) — VERIFIED
2. The `governance build-index` CLI defaults `--root aidlc-rules` (`src/cli/commands/build-index.ts`) — VERIFIED
3. `deriveScope` throws D-10 for any file whose first path segment is not `enterprise`, `domain`, or `project` (`src/rules/scope.ts`) — VERIFIED

Placing `examples/` at **repo root** (as a sibling of `aidlc-rules/`, not nested inside it) is sufficient. Even if someone later ran `governance build-index --root .` by mistake, `deriveScope` would reject every example file because `examples/` is not a recognized tier.

**Primary recommendation:** Author a thin `examples/java-spring/` tree at repo root (one README + 5–7 short Java snippets mirroring the hexagonal/DDE layout the Phase 13–15 rules prescribe). Add `examples` to `package.json` `files` so the tarball carries it. Lock isolation with a new sibling suite `src/select/starter-examples.test.ts` that asserts (a) `buildIndex(aidlc-rules)` output contains no `examples/` path, (b) `buildIndex('examples/java-spring')` throws a D-10 scope error for every file under it, and (c) the existing `precedence.test.ts` inventory stays at exactly **10 winners** (Phase 16 adds zero new rules). Leave the engine untouched.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Thin starter layout for LLM mirroring | Examples content store (`examples/java-spring/`) | — | Snippets are documentation, not runtime code; not selectable |
| Scan-root isolation | Rule loader (`src/rules/load.ts`) | CLI default (`src/cli/commands/build-index.ts`) | Scan recurses only under `--root`; default `aidlc-rules/` excludes repo-root siblings |
| Scope-tier rejection (backstop) | Scope derivation (`src/rules/scope.ts`) | — | `deriveScope` throws D-10 for any path outside `enterprise/domain/project`; second-layer guard |
| Rule-index inventory stability | Test layer (`src/index/precedence.test.ts`) | Real `aidlc-rules` via buildIndex | Inventory must stay 10 winners; Phase 16 adds zero rules |
| Non-selectable examples proof | Test layer (`src/select/starter-examples.test.ts`) | buildIndex + examples root | New sibling suite proves non-indexing durably |
| Consumer delivery | npm tarball (`package.json files`) | — | Add `examples` to files so tarball carries the starter tree |
| Pack rules | Content store (`aidlc-rules/domain/java-spring/`) | — | Unchanged this phase — 10 rules remain from Phases 13–15 |

## Project Constraints (from CLAUDE.md)

| Directive | Planning implication |
|-----------|----------------------|
| Overlay on GSD Core, not a fork | Examples live in this repo; no GSD core patches |
| Context budget: summaries only | Examples are NOT summaries — never injected; mirror-only |
| Markdown advisory; binding via real gates | Examples carry no frontmatter, no `id`, no `scope` — not rules |
| Vendor strings not hard-coded in `src/` | Snippets may mention framework types (Spring annotations) — vendor products (WSO2/SmartVista) stay out of snippets per existing pack convention |
| Zero new npm deps | Content + one test file only |
| Engine frozen (v1–v3, carry-forward v4) | Zero production `src/` edits outside new test file |
| GSD workflow enforcement | Plans/execution go through GSD phase commands |
| Auditability | Selection still explainable; starter snippets fail scope derivation loudly if ever mis-scanned |

## Current Pack + Engine State (verified)

**Scan root semantics — the critical isolation fact:** [VERIFIED: `src/rules/load.ts` lines 30–44; `src/cli/commands/build-index.ts` lines 13–24]

```typescript
// src/rules/load.ts — findRuleFiles recurses ONLY under the passed dir
function findRuleFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readDirSafe(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Detail files live under details/ and are NEVER indexed (D-05).
      if (entry.name === "details") continue;
      out.push(...findRuleFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}
```

```typescript
// src/cli/commands/build-index.ts — default scan root
options: {
  root: { type: "string", default: "aidlc-rules" },
  out: { type: "string", default: "rule-index.json" },
},
```

`buildIndex("aidlc-rules")` only ever reads paths under `aidlc-rules/`. A repo-root `examples/` directory is **never visited** by the default scan. This is the primary layout guard — no engine patch required.

**Scope derivation backstop:** [VERIFIED: `src/rules/scope.ts` lines 48–60]

```typescript
export function deriveScope(absPath: string, rootDir: string): Scope {
  const rel = path.relative(rootDir, absPath);
  const firstSegment = rel.split(/[\\/]/)[0];
  if ((TIERS as readonly string[]).includes(firstSegment)) {
    return firstSegment as Scope;
  }
  throw new Error(
    `${rel}: rule is outside the enterprise/domain/project tiers (D-10) — ` +
      `every rule must live under one of aidlc-rules/{enterprise,domain,project}/`,
  );
}
```

Even if someone ran `buildIndex('.')` or `buildIndex('examples/java-spring')`, every `.md` file there would throw D-10 because `examples/` is not in `TIERS = ["enterprise", "domain", "project"]`. This is the second-layer guard, also already shipped.

**File extension filter:** loader only indexes `*.md`. Java snippets (`.java`) are not even candidates. Only `examples/java-spring/README.md` would be a candidate — and it fails scope derivation.

**Current real-corpus inventory lock:** [VERIFIED: `src/index/precedence.test.ts` lines 122–134]
- 10 winners: `require-mfa` + 9 java-spring rules (svc-internal-outbound, svc-internet-outbound, inbound-rest, inbound-kafka, hex-layering, ddd-tactical, logging-audit, api-contract, saga-outbox)
- Phase 16 must NOT change this count.

**Existing pack layout (unchanged this phase):** [VERIFIED: filesystem]

```
aidlc-rules/
├── enterprise/
│   └── require-mfa.md
└── domain/
    └── java-spring/
        ├── java-spring-svc-internal-outbound.md      # Phase 13
        ├── java-spring-svc-internet-outbound.md      # Phase 13
        ├── java-spring-inbound-rest.md               # Phase 13
        ├── java-spring-inbound-kafka.md              # Phase 13
        ├── java-spring-hex-layering.md               # Phase 14
        ├── java-spring-ddd-tactical.md               # Phase 14
        ├── java-spring-logging-audit.md              # Phase 15
        ├── java-spring-api-contract.md               # Phase 15
        ├── java-spring-saga-outbox.md                # Phase 15
        └── details/                                  # loader skips
            └── ...-detail.md (9 files)
```

**`package.json files` field today:** `["dist", "bin", "aidlc-rules"]` — VERIFIED. `examples/` would NOT ship in the npm tarball unless added.

## Exact Files to Create / Touch

```
examples/                                          # NEW repo-root directory
└── java-spring/
    ├── README.md                                  # NEW — purpose + "not selectable rules"
    ├── domain/
    │   └── port/
    │       └── SamplePaymentPort.java             # NEW — port interface (inbound)
    ├── application/
    │   └── SamplePaymentHandler.java              # NEW — application service / use case
    └── adapter/
        ├── in/
        │   ├── web/
        │   │   └── SamplePaymentController.java   # NEW — @RestController stub
        │   └── messaging/
        │       └── SampleKafkaListener.java       # NEW — @KafkaListener stub
        └── out/
            └── persistence/
                └── SamplePaymentRepositoryAdapter.java  # NEW — outbound adapter

src/select/starter-examples.test.ts                # NEW — sibling suite (TDD RED→GREEN)
package.json                                       # TOUCH — add "examples" to files[]
```

**Do NOT create:**
- New rule files under `aidlc-rules/` (Phase 16 adds zero rules)
- New detail files under `aidlc-rules/domain/java-spring/details/`
- New `examples/` nested inside `aidlc-rules/` (would break isolation)
- Engine patch to `src/rules/load.ts` adding an `examples/` skip (unnecessary — scan never reaches it)
- Full multi-module Maven/Gradle build (Out of Scope)
- Real database, real Kafka client, real Spring runtime (Out of Scope; overlay is Node/TS)
- Coverage report parser (Phase 17)
- Consumer docs (Phase 18)

## Recommended Snippet Set (planner-ready)

### Design principles (locked)

- **Thin stubs only** — no runnable application; no build files (pom.xml, build.gradle, application.yml)
- **Mirror Phase 13–15 hexagonal/DDD rules** — dependency arrows point inward, ports at the application/domain boundary, adapters at the edges
- **No framework boilerplate that distracts** — annotations stay as pointers (`@RestController`, `@KafkaListener`, `@Service`), not full Spring configuration
- **One-line class javadoc per file** — points at the rule it mirrors (e.g., "Mirrors JS-IN-01 / java-spring-inbound-rest")
- **Vendor-free** — no WSO2/SmartVista/TIBCO references in snippet bodies (same convention as production src/)
- **No frontmatter, no `id:`, no `scope:`** — even on `README.md` — so nothing can accidentally parse as a rule if scan-root boundaries fail

### Recommended layout (mirror hexagonal rules)

```
examples/java-spring/
├── README.md                                    # Purpose + non-selectability note
├── domain/
│   └── port/
│       └── SamplePaymentPort.java               # Inbound port (use-case interface)
└── application/
│   └── SamplePaymentHandler.java                # Application service implementing the port
└── adapter/
    ├── in/
    │   ├── web/
    │   │   └── SamplePaymentController.java     # @RestController thin controller
    │   └── messaging/
    │       └── SampleKafkaListener.java         # @KafkaListener idempotent consumer
    └── out/
        └── persistence/
            └── SamplePaymentRepositoryAdapter.java  # Outbound port implementation
```

### Snippet skeletons (planner may refine prose; keep thin)

#### `examples/java-spring/README.md`

```markdown
# Java/Spring Starter — Mirror Layout (NOT governance rules)

This directory ships a **thin hexagonal/DDD starter layout** the LLM can mirror
when scaffolding new consumer backend work. The snippets are **documentation,
not runtime code** — there is no pom.xml, no build, no Spring Boot application
class, and no database driver.

## NOT selectable governance rules

These files live **outside** `aidlc-rules/` and are **never scanned** by
`governance build-index`. The default scan root is `aidlc-rules/`; this
`examples/` directory is a sibling, not a child. Additionally, `deriveScope`
in `src/rules/scope.ts` would reject any file here as D-10 (outside
enterprise/domain/project tiers) even if scan root changed.

The rule-index inventory stays exactly: `require-mfa` + 9 java-spring rules
(see `src/index/precedence.test.ts`). Adding files under `examples/` does not
grow that count.

## Mirror these rules

| Snippet | Mirrors rule | Pack file |
|---------|--------------|-----------|
| `adapter/in/web/SamplePaymentController.java` | JS-IN-01 thin REST controllers | aidlc-rules/domain/java-spring/java-spring-inbound-rest.md |
| `adapter/in/messaging/SampleKafkaListener.java` | JS-IN-02 idempotent Kafka consumers | aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md |
| `domain/port/SamplePaymentPort.java` + `application/SamplePaymentHandler.java` | JS-HEX-01 inward dependencies | aidlc-rules/domain/java-spring/java-spring-hex-layering.md |
| `adapter/out/persistence/SamplePaymentRepositoryAdapter.java` | JS-SVC-01 internal outbound + JS-HEX-01 | aidlc-rules/domain/java-spring/java-spring-svc-internal-outbound.md |

Consumer-side concerns (logging, OpenAPI, saga) are covered by the corresponding
advisory rules under `aidlc-rules/domain/java-spring/` and are intentionally not
duplicated as snippets here.
```

#### `examples/java-spring/domain/port/SamplePaymentPort.java`

```java
package com.example.hexagonal.domain.port;

/**
 * Inbound port: use-case interface the application layer exposes.
 * Mirrors JS-HEX-01 (java-spring-hex-layering): dependencies point inward.
 * No Spring/JPA/transport types here.
 */
public interface SamplePaymentPort {
    void handle(SamplePaymentCommand command);
}
```

#### `examples/java-spring/application/SamplePaymentHandler.java`

```java
package com.example.hexagonal.application;

import com.example.hexagonal.domain.port.SamplePaymentPort;

/**
 * Application service: implements the port, orchestrates domain logic,
 * and delegates to outbound ports (not to driver/SDK types directly).
 * Mirrors JS-HEX-01 and JS-DDD-01 (aggregate root / tactical DDD).
 */
public class SamplePaymentHandler implements SamplePaymentPort {
    @Override
    public void handle(SamplePaymentCommand command) {
        // delegate to outbound port; keep this layer free of framework types
    }
}
```

#### `examples/java-spring/adapter/in/web/SamplePaymentController.java`

```java
package com.example.hexagonal.adapter.in.web;

import com.example.hexagonal.application.SamplePaymentHandler;
import com.example.hexagonal.domain.port.SamplePaymentPort;

/**
 * Thin REST controller: validate at boundary, delegate to application port.
 * Mirrors JS-IN-01 (java-spring-inbound-rest): no business logic in controller.
 */
// @RestController annotation omitted from snippet to keep it framework-thin;
// consumer adds Spring annotations when wiring.
public class SamplePaymentController {
    private final SamplePaymentPort port;

    public SamplePaymentController(SamplePaymentPort port) {
        this.port = port;
    }

    public Object pay(SamplePaymentRequest request) {
        port.handle(request.toCommand());
        return java.util.Map.of("status", "accepted");
    }
}
```

#### `examples/java-spring/adapter/in/messaging/SampleKafkaListener.java`

```java
package com.example.hexagonal.adapter.in.messaging;

import com.example.hexagonal.domain.port.SamplePaymentPort;

/**
 * Kafka listener: keep idempotent, declare retry/DLQ policy, delegate to port.
 * Mirrors JS-IN-02 (java-spring-inbound-kafka): no Kafka client types in domain.
 */
public class SampleKafkaListener {
    private final SamplePaymentPort port;

    public SampleKafkaListener(SamplePaymentPort port) {
        this.port = port;
    }

    public void onMessage(String key, String payload) {
        // idempotent by key; map payload; delegate to port
    }
}
```

#### `examples/java-spring/adapter/out/persistence/SamplePaymentRepositoryAdapter.java`

```java
package com.example.hexagonal.adapter.out.persistence;

import com.example.hexagonal.application.SamplePaymentHandler;

/**
 * Outbound adapter: implements the outbound port, owns JPA/JDBC types.
 * Mirrors JS-HEX-01 (adapters at the edges) and JS-SVC-01 (internal outbound
 * may use JDBC/ORM directly; do not force gateway on internal-only calls).
 */
public class SamplePaymentRepositoryAdapter {
    // JPA repository / JDBC template field would go here in consumer code.
    public void save(Object aggregate) {
        // persist outbound — driver types stay in this adapter, never in domain
    }
}
```

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — content + tests only) | — | — | Phase 16 ships Markdown + Java snippets and one TypeScript test; zero new deps |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing toolchain | in-repo | `node:test`, `node:assert/strict`, `buildIndex` | Sibling suite reuses existing harness |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Repo-root `examples/` | `aidlc-rules/examples/` | Rejected — inside scan root; would require engine patch to skip; violates engine freeze |
| Repo-root `examples/` | `docs/examples/java-spring.md` (single file) | Loses folder-layout affordance — the LLM mirrors folder structure, not a flat doc |
| No `package.json` touch | Add `examples` to `files` | Required if examples should ship via npm tarball (consumer-mirror affordance) |
| Engine patch (`findRuleFiles` skip `examples/`) | Layout guard (scan-root default) | Rejected — engine freeze; layout already isolates; `deriveScope` is the second-layer guard |
| Full Maven build (`pom.xml`, `application.yml`) | Thin stubs only | Out of Scope per REQUIREMENTS.md; overlay stays Node/TS |

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
Repo root
   │
   ├── aidlc-rules/                          ← scan root (default --root)
   │   ├── enterprise/require-mfa.md         │
   │   └── domain/java-spring/*.md (9 rules) │
   │                                          ▼
   │                              buildIndex("aidlc-rules")
   │                                          │
   │                                          ▼
   │                              rule-index.json (10 winners, unchanged)
   │
   ├── examples/java-spring/                 ← NEVER scanned by default
   │   ├── README.md                         │
   │   ├── domain/port/*.java                │  layout proof: sibling of aidlc-rules/
   │   ├── application/*.java                │  deriveScope would throw D-10 if reached
   │   └── adapter/in|out/**                 │
   │                                          ▼
   │                              starter-examples.test.ts
   │                              (a) buildIndex(aidlc-rules) → no examples/ sourceFile
   │                              (b) buildIndex(examples/java-spring) → D-10 throws
   │                              (c) precedence.test.ts inventory stays at 10
   │
   └── src/
       ├── rules/load.ts        (unchanged — engine frozen)
       ├── rules/scope.ts       (unchanged — engine frozen)
       ├── index/precedence.test.ts  (unchanged — 10 winners lock)
       └── select/starter-examples.test.ts   ← NEW sibling suite
```

### Recommended Project Structure

```
examples/java-spring/             # NEW — repo-root sibling of aidlc-rules/
├── README.md                     # purpose + non-selectability note (no frontmatter)
├── domain/port/*.java            # inbound port (mirror JS-HEX-01)
├── application/*.java            # application service (mirror JS-HEX-01 / JS-DDD-01)
└── adapter/
    ├── in/web/*.java             # @RestController stub (mirror JS-IN-01)
    ├── in/messaging/*.java       # @KafkaListener stub (mirror JS-IN-02)
    └── out/persistence/*.java    # outbound adapter (mirror JS-SVC-01 + JS-HEX-01)

src/select/
└── starter-examples.test.ts      # NEW — non-indexing + scope-rejection proof

package.json                      # TOUCH — add "examples" to files[]
```

### Pattern 1: Layout-as-guard (do not patch the engine)
**What:** Place non-rule content under a directory the scan root does not include. Do NOT add a skip to `findRuleFiles`.  
**When:** Always for content that must never be selectable.

### Pattern 2: Sibling negative-proof suite per concern
**What:** One focused test file per cross-cutting guarantee, mirroring the Phase 13–15 sibling suite convention.  
**When:** Engine-frozen phases where production code cannot grow new branches.

### Pattern 3: README leads with non-selectability
**What:** The README under `examples/` opens with "NOT selectable governance rules" and cites the two isolation mechanisms (scan-root default + `deriveScope` D-10).  
**When:** Anytime non-rule content lands in a rule-centric repo.

### Anti-Patterns to Avoid
- **Nesting `examples/` inside `aidlc-rules/`** — breaks isolation, requires engine patch.
- **Patching `findRuleFiles` to skip `examples/`** — engine freeze violation; unnecessary.
- **Adding `id:` / `scope:` frontmatter to `examples/.../README.md`** — even inert frontmatter risks accidental rule parsing if scan-root boundaries drift.
- **Shipping a full Maven/Gradle build** — Out of Scope; overlay is Node/TS.
- **Editing `precedence.test.ts` inventory count** — Phase 16 adds zero rules; count stays 10.
- **Letting snippets import vendor product types** — WSO2/SmartVista/TIBCO stay out of snippet bodies, matching the vendor-string convention.
- **Treating Phase 16 as a Phase 13–15 content extension** — those grew the pack; this grows nothing selectable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scan-root isolation | Engine patch skipping `examples/` | Layout (repo-root sibling of `aidlc-rules/`) | Engine frozen; layout is sufficient and self-evident |
| Scope-tier backstop | Custom validator | `deriveScope` D-10 throw (already shipped) | Already enforced; second-layer guard for free |
| Inventory-stability proof | Re-derive expected ids | Existing `precedence.test.ts` 10-winner lock | Carry-forward; Phase 16 adds zero rules |
| Full runnable Spring app | pom.xml + config + driver deps | Thin annotated stubs | Out of Scope; overlay is not a Java runtime |
| Snippet→rule traceability table | New tooling | README Markdown table | Docs are prose; no engine support |
| Framework annotation noise | Full Spring configuration | Pointer annotations in comments | Consumer wires Spring; mirror is structural |

**Key insight:** Phase 16 fails only if (a) examples land inside `aidlc-rules/`, (b) the engine is patched to skip them, (c) inventory grows beyond 10, or (d) no durable test proves non-indexing. The correct plan does none of (a)/(b)/(c) and ships (d).

## Common Pitfalls

### Pitfall 1: Nesting examples under `aidlc-rules/`
**What goes wrong:** Examples become candidates for indexing; loader recurses into them.  
**Why it happens:** Authors copy the pack layout without thinking about scan roots.  
**How to avoid:** Place `examples/` at **repo root** as a sibling of `aidlc-rules/`, not a child.  
**Warning signs:** `buildIndex` output contains `examples/` in any `sourceFile`.

### Pitfall 2: Patching `findRuleFiles` to add an `examples/` skip
**What goes wrong:** Violates engine freeze; introduces a second magic directory name alongside `details/`; makes the loader harder to reason about.  
**Why it happens:** Defensive reflex ("add a guard just in case").  
**How to avoid:** Trust the scan-root boundary. The default `--root aidlc-rules` plus `deriveScope` D-10 are two-layer isolation. If a test is wanted, assert the layout property, not a skip.  
**Warning signs:** `src/rules/load.ts` edited to add `entry.name === "examples"`.

### Pitfall 3: Adding `id: examples-*` frontmatter to snippet READMEs
**What goes wrong:** If scan-root boundaries ever drift (e.g., someone runs `buildIndex('.')`), frontmatter would parse and the file might become a candidate rule (though `deriveScope` still rejects it).  
**Why it happens:** Copy-paste from a real rule file.  
**How to avoid:** No frontmatter on any file under `examples/`. Snippets are `.java` (extension-filtered already); README is plain Markdown with no `---` block.

### Pitfall 4: Editing `precedence.test.ts` inventory count
**What goes wrong:** Breaks the Phase 13–15 inventory lock; misrepresents Phase 16 as adding rules.  
**Why it happens:** Muscle memory from content phases.  
**How to avoid:** Phase 16 adds ZERO rules. `expectedIds` stays at the current 10-item list. The starter-examples suite should assert the count is unchanged (regression guard), not extend it.  
**Warning signs:** `precedence.test.ts` diff touches the `expectedIds` array.

### Pitfall 5: Shipping a full Maven / Gradle build
**What goes wrong:** Overlay becomes a Java runtime dependency; explodes maintenance; Out of Scope per REQUIREMENTS.md.  
**Why it happens:** "Make it runnable" instinct.  
**How to avoid:** Snippets are thin stubs with annotations-as-comments. No `pom.xml`, no `build.gradle`, no `application.yml`, no driver JARs.

### Pitfall 6: Letting vendor product names leak into snippet bodies
**What goes wrong:** Violates vendor-string convention; couples the overlay to a specific bank product.  
**Why it happens:** Copy-paste from real consumer code.  
**How to avoid:** Snippets use generic framework types (`@RestController`, `@KafkaListener`, JPA/JDBC). No WSO2/SmartVista/TIBCO references.

### Pitfall 7: Forgetting to add `examples` to `package.json files`
**What goes wrong:** Consumer tarball lacks the starter tree; mirror affordance lost for npm-install consumers.  
**Why it happens:** Repo-clone consumers see it; npm consumers don't, and the gap is silent.  
**How to avoid:** Add `"examples"` to the `files` array. Verify with `npm pack --dry-run` if uncertain.

### Pitfall 8: Writing the proof test against the wrong root
**What goes wrong:** Test calls `buildIndex("examples/java-spring")` expecting success — but `deriveScope` throws for every `.md` there (no tier dir).  
**Why it happens:** Misunderstanding scope derivation.  
**How to avoid:** Use `assert.throws(() => buildIndex(examplesRoot), /D-10|outside the enterprise\/domain\/project tiers/)` as the positive proof, and `buildIndex("aidlc-rules")` sourceFile scan for the non-inclusion proof.

### Pitfall 9: Letting snippets grow into essays
**What goes wrong:** LLM injection risk if snippets ever leak; mirror loses structural clarity.  
**Why it happens:** Documentation instinct.  
**How to avoid:** One-line class javadoc per file citing the mirrored rule id. Method bodies are one or two lines; delegate, don't implement.

### Pitfall 10: Editing production engine code "to add a guard"
**What goes wrong:** Engine freeze violation; upgrade-path risk; breaks the v4.0 content-phase discipline.  
**Why it happens:** "Belt and braces" reflex.  
**How to avoid:** No edits to `src/rules/**`, `src/index/**`, `src/select/**`, `src/inject/**`, `src/cli/**`, `src/schema/**`. Only `src/select/starter-examples.test.ts` is new; `package.json` is config, not engine.

## Code Examples

### Starter-examples sibling suite skeleton

```typescript
// Source: Phase 14 java-spring-hex-ddd.test.ts + Phase 15 java-spring-log-api-evt.test.ts
// sibling-suite pattern [VERIFIED]
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import { buildIndex } from "../index/build.js";

const REAL_RULES_ROOT = path.resolve(process.cwd(), "aidlc-rules");
const EXAMPLES_ROOT = path.resolve(process.cwd(), "examples", "java-spring");

// JAVA-EX-01: starter layout exists at repo root with expected file shape
test("JAVA-EX-01: examples/java-spring/ ships folder layout + thin snippets at repo root", () => {
  assert.ok(EXAMPLES_ROOT.startsWith(REAL_RULES_ROOT) === false,
    "examples/ must NOT be nested inside aidlc-rules/");
  assert.ok(existsSync(EXAMPLES_ROOT), "examples/java-spring/ must exist at repo root");

  const expectedSnippets = [
    "README.md",
    "domain/port/SamplePaymentPort.java",
    "application/SamplePaymentHandler.java",
    "adapter/in/web/SamplePaymentController.java",
    "adapter/in/messaging/SampleKafkaListener.java",
    "adapter/out/persistence/SamplePaymentRepositoryAdapter.java",
  ];
  for (const rel of expectedSnippets) {
    const full = path.join(EXAMPLES_ROOT, rel);
    assert.ok(existsSync(full), `expected snippet missing: ${rel}`);
  }
});

// JAVA-EX-02 (primary): buildIndex over real scan root never reaches examples/
test("JAVA-EX-02: buildIndex(aidlc-rules) emits no sourceFile under examples/", () => {
  const index = buildIndex(REAL_RULES_ROOT);
  for (const record of index.rules) {
    assert.ok(
      !record.sourceFile.includes("examples/"),
      `examples/ leaked into index via ${record.sourceFile}`,
    );
    assert.ok(
      !record.id.startsWith("example") && !record.id.startsWith("sample"),
      `possible example id leaked into index: ${record.id}`,
    );
  }
});

// JAVA-EX-02 (backstop): even if examples were scanned directly, D-10 rejects them
test("JAVA-EX-02 backstop: buildIndex(examples/java-spring) throws D-10 scope error", () => {
  assert.throws(
    () => buildIndex(EXAMPLES_ROOT),
    /outside the enterprise\/domain\/project tiers|D-10/,
    "examples/ files must fail scope derivation if ever scanned",
  );
});

// Regression: inventory stays at 10 (Phase 16 adds zero rules)
test("inventory regression: real-corpus winners stay at 10 after Phase 16", () => {
  const index = buildIndex(REAL_RULES_ROOT);
  assert.equal(index.rules.length, 10,
    "Phase 16 must not add rules; inventory stays at 10");
});

// README discipline: no YAML frontmatter on examples README (no accidental rule shape)
test("examples README carries no rule-shaped frontmatter", () => {
  const readme = path.join(EXAMPLES_ROOT, "README.md");
  if (!existsSync(readme)) return; // skip if planner chose different doc name
  const raw = readFileSync(readme, "utf8");
  assert.ok(!/^---\n[\s\S]*?\nid:/m.test(raw),
    "examples README must not start with rule-shaped frontmatter");
});
```

### Layout guard assertion (alternative — no scope-throws dependency)

If the planner prefers a pure layout proof without asserting `buildIndex` throws on the examples root, this trimmed version is sufficient for JAVA-EX-02:

```typescript
test("JAVA-EX-02 (layout-only): every real-corpus sourceFile starts with aidlc-rules/", () => {
  const index = buildIndex(REAL_RULES_ROOT);
  for (const record of index.rules) {
    assert.ok(
      record.sourceFile.startsWith("aidlc-rules/"),
      `non-pack sourceFile in index: ${record.sourceFile}`,
    );
  }
});
```

Either form satisfies ROADMAP SC2's "layout proof and/or explicit guard".

## Test Plan

### Recommendation (locked)

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Add to existing `java-spring-pack.test.ts` | Shared helpers | Mixes Phase 13 narrative with Phase 16 negative proof | Not preferred |
| Add to `precedence.test.ts` | Inventory regression is natural there | Cross-concern; Phase 16 is not a precedence change | Not preferred |
| **Sibling `src/select/starter-examples.test.ts`** | Isolates JAVA-EX-01/02 proof; matches Phase 13–15 sibling convention; clear regression home | Slight helper duplication | **Locked** |

### TDD wave shape

Phase 16 is naturally RED→GREEN in a single plan (small surface):

1. **RED wave:** Write `src/select/starter-examples.test.ts` asserting (a) examples dir exists with expected snippet paths, (b) `buildIndex(aidlc-rules)` has no `examples/` sourceFile, (c) `buildIndex(examples/java-spring)` throws D-10, (d) inventory stays at 10. (a) fails until examples land; (b)/(c)/(d) may pass immediately as guards — that's fine, they are regression locks.
2. **GREEN wave:** Author `examples/java-spring/` tree + README; add `examples` to `package.json` files[]; suite green; full `npm test` green.

A 2-plan split (RED then GREEN) is supported but optional given the small surface. The planner may collapse into a single plan if the executor is autonomous-mode.

### Required cases (map to ROADMAP success criteria)

| # | Case | Expect |
|---|------|--------|
| 1 | `examples/java-spring/` exists at repo root | truthy |
| 2 | `examples/java-spring/` is NOT nested under `aidlc-rules/` | `!EXAMPLES_ROOT.startsWith(REAL_RULES_ROOT)` |
| 3 | Expected snippet files exist (port, handler, controller, listener, repository adapter, README) | all truthy |
| 4 | `buildIndex(aidlc-rules)` sourceFiles contain no `examples/` substring | none match `/examples\//` |
| 5 | `buildIndex(aidlc-rules)` ids contain no `example*` / `sample*` prefix | none match `/^(example|sample)/` |
| 6 | `buildIndex(examples/java-spring)` throws D-10 scope error | `/D-10|outside the enterprise\/domain\/project tiers/` |
| 7 | Inventory regression: real-corpus count still 10 | `index.rules.length === 10` |
| 8 | Examples README has no rule-shaped frontmatter (no `id:` block) | regex negative |
| 9 | No file under `examples/` ends in `.md` with valid rule frontmatter (only README; README has no frontmatter) | optional scan |
| 10 | Full `npm test` green | exit 0 |

### Negative regression cases (mandatory)

| # | Condition | Must hold |
|---|-----------|-----------|
| N1 | `examples/java-spring/README.md` content | no `---\nid:` block |
| N2 | `precedence.test.ts` | unchanged (same 10-item `expectedIds`) |
| N3 | `src/rules/load.ts` diff | no production engine edits |
| N4 | `src/rules/scope.ts` diff | no production engine edits |
| N5 | `package.json` `dependencies` | no new entries |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline sample code in rule body | Snippets under separate non-scanned tree | v4.0 Phase 16 | Bodies stay lean; mirror affordance is structural |
| Hand-maintained skip-list in loader | Layout-based isolation + `deriveScope` D-10 backstop | Original design (v1.0) | No engine patch needed for new non-rule content |
| Runnable sample app | Thin stubs only | v4.0 scope decision | Overlay stays Node/TS; consumer owns Java toolchain |

**Deprecated/outdated for this phase:**
- Engine patches that hard-code content directory names (only `details/` is skipped today; that's the right ceiling).
- "Examples inside the pack" patterns from early research drafts.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Repo-root `examples/` is the intended location (ROADMAP SC1 says "outside rule-index scan roots"; REQUIREMENTS JAVA-EX-01 says "under examples/java-spring/") | Location / layout | Low — scan-root semantics verified; even if planner nests under `docs/examples/`, isolation still holds as long as it's not under `aidlc-rules/` |
| A2 | Adding `examples` to `package.json files` is desired so npm consumers can mirror | Package layout | If the team prefers repo-clone-only delivery, skip this touch — examples still ship via git |
| A3 | Snippets should be `.java` files (not Markdown pseudo-code) | Snippet design | If team prefers Markdown, `.java` extension filter no longer applies; README would be the only `.md` under `examples/`, and the D-10 throw still backstops |
| A4 | `precedence.test.ts` inventory count stays at 10 (Phase 16 adds zero rules) | Inventory regression | If a hidden pack rule was added outside this phase, count drift would surface here, not in Phase 16 |
| A5 | `deriveScope` D-10 throw message is stable enough to assert via regex | Test skeleton | Phase 1 established the message; assertion uses a permissive regex (`/D-10|outside the enterprise\/domain\/project tiers/`) to tolerate minor wording changes |

## Open Questions

1. **`package.json files` inclusion**
   - What we know: today `files` is `["dist", "bin", "aidlc-rules"]`; `examples/` would not ship in the npm tarball.
   - What's unclear: whether the team wants npm-install consumers to mirror (likely yes, but CONTEXT would confirm).
   - Recommendation: add `"examples"` to `files` — low-cost, high-affordance. The planner can skip if the team prefers git-only delivery.

2. **Snippet language: `.java` vs Markdown pseudo-code**
   - What we know: `.java` files are extension-filtered by the loader (never indexed); Markdown snippets would be candidates if scan-root drifted (but D-10 still rejects).
   - What's unclear: author preference.
   - Recommendation: `.java` for structural mirroring; one `README.md` per directory level if prose is needed.

3. **Plan count: 1 or 2**
   - What we know: small surface (6 snippets + 1 README + 1 test + 1 package.json touch).
   - What's unclear: whether the team wants a strict RED-then-GREEN split (2 plans) or a single plan.
   - Recommendation: single plan with TDD discipline inside (write test first, then snippets, then package.json touch). Matches Phase 11 single-plan cadence.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests / build | ✓ | v24.14.0 | — |
| npm | scripts / `files` verification | ✓ | 11.9.0 | — |
| `npm test` (node:test + dist-test) | suite proof | ✓ | package.json scripts | — |
| `bin/governance.cjs build-index` | rebuild rule-index.json (ship surface) | ✓ | in-repo after `npm run build` | not required for suite (uses live `buildIndex`) |
| New npm packages | — | n/a | — | not required |
| Java / Spring runtime | — | n/a | — | content-only phase; snippets are not compiled |

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
| Quick run command | `npm test -- --test-name-pattern="JAVA-EX|starter-examples|examples|inventory regression"` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JAVA-EX-01 | `examples/java-spring/` exists at repo root with port/adapter/handler/REST/Kafka snippets | unit | `npm test -- --test-name-pattern="JAVA-EX-01"` | ❌ Wave 0 |
| JAVA-EX-02 (layout) | `buildIndex(aidlc-rules)` output contains no `examples/` path | unit | `npm test -- --test-name-pattern="JAVA-EX-02"` | ❌ Wave 0 |
| JAVA-EX-02 (backstop) | `buildIndex(examples/java-spring)` throws D-10 scope error | unit | `npm test -- --test-name-pattern="D-10"` | ❌ Wave 0 |
| Inventory regression | Real-corpus winners stay at 10 | unit | `npm test -- --test-name-pattern="inventory regression"` (also covered by `precedence.test.ts`) | ✅ exists (unchanged) |

### Sampling Rate

- **Per task commit:** focused pattern run for the new sibling suite + `precedence.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/select/starter-examples.test.ts` — covers JAVA-EX-01 layout + JAVA-EX-02 non-indexing + D-10 backstop + inventory regression
- [ ] `examples/java-spring/README.md` + 5 thin `.java` snippets (port, handler, controller, listener, repository adapter)
- [ ] `package.json` — add `"examples"` to `files[]` if npm-tarball shipping is desired (A2)
- [ ] Framework install: none — existing `npm test` sufficient

## Security Domain

> `security_enforcement` enabled; phase is content + unit tests (no new network/auth surface). Starter snippets are illustrative Java code, not runtime; they never execute.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | Layout isolation keeps examples out of governance enforcement path |
| V5 Input Validation | yes (existing) | No new parsers; loader already validates rule frontmatter — examples bypass entirely (not scanned) |
| V6 Cryptography | no | — |
| Logging / sensitive data | yes (advisory) | Snippets contain no real PAN / secrets / credentials; README reinforces "do not log PII" by cross-reference to JS-LOG-01 |

### Known Threat Patterns for non-rule content in a rule repo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Example accidentally selected as governance rule | Elevation of privilege (process) | Two-layer isolation: scan-root default + deriveScope D-10 |
| Frontmatter-shaped README parses as rule if scan root drifts | Tampering (governance integrity) | No `---` frontmatter on any `examples/` file; sibling suite asserts |
| Vendor product strings leak into starter snippets | Information disclosure | Vendor-string convention carried from v4.0 STATE decisions; snippet skeletons use generic framework types only |
| Inventory drift masks dropped rules | Repudiation (audit integrity) | `precedence.test.ts` 10-winner lock stays unchanged; starter suite adds count regression |
| Engine patch introduces skip-list bypass | Tampering (governance integrity) | No engine patch; layout is the guard |

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` — Phase 16 success criteria (SC1, SC2)
- `.planning/REQUIREMENTS.md` — JAVA-EX-01, JAVA-EX-02 (verbatim)
- `.planning/STATE.md` — v4.0 roadmap decisions (examples outside aidlc-rules/; zero new deps; vendor names only in content not src/; engine freeze carry-forward)
- `src/rules/load.ts` — `findRuleFiles` recurses only under `rootDir`; only `details/` skipped; `.md` extension filter
- `src/rules/scope.ts` — `deriveScope` throws D-10 for any first-segment not in `["enterprise","domain","project"]`
- `src/index/build.ts` — `buildIndex(rootDir)` API; scope check before assembly
- `src/cli/commands/build-index.ts` — `--root` default `aidlc-rules`
- `src/index/precedence.test.ts` — current 10-winner inventory lock (carry-forward, unchanged)
- `package.json` — `files: ["dist","bin","aidlc-rules"]`; `scripts.test`; `engines`
- `.gitignore` — `rule-index.json` is gitignored; `examples/` is not
- Filesystem probe — `examples/` does NOT exist at repo root yet (2026-07-12)
- Phase 13–15 CONTEXT/RESEARCH/SUMMARY artifacts — sibling suite convention; zero-deps discipline; vendor-string rule; engine freeze
- `aidlc-rules/domain/java-spring/*.md` — rule bodies mirroring the hexagonal/DDD conventions the snippets reflect

### Secondary (MEDIUM confidence)
- `docs/rule-authoring.md` — rule authoring contract (used only as a contrast: examples deliberately violate it)
- `docs/governance-workflow.md` — build-index CLI usage
- `.planning/phases/15-logging-api-contract-saga-decision-rules/15-RESEARCH.md` — sibling suite pattern reused

### Tertiary (LOW confidence)
- None — all findings verified directly in this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; reuse existing node:test + buildIndex harness
- Architecture: HIGH — scan-root semantics + deriveScope D-10 + precedence inventory all verified in-repo
- Pitfalls: HIGH — direct observation of engine code; Phase 13–15 CR lessons carried forward
- Snippet content: MEDIUM — exact prose is planner discretion; structural rules are locked

**Research date:** 2026-07-12  
**Valid until:** 2026-08-11 (stable content + layout phase; revalidate if `src/rules/load.ts` scan-root semantics change, if `deriveScope` tier list grows, or if the npm `files` field policy shifts)
