# Architecture Research

**Domain:** Governance overlay on an AI-development-workflow runtime (GSD Core + AI-DLC governance)
**Researched:** 2026-07-05
**Confidence:** HIGH (integration seam read directly from installed GSD Core source at `C:\Users\thien\.claude\gsd-core`)

## Headline Finding

GSD Core already exposes a **formal, first-class plugin API** — the **Capability Registry** (ADR-894 "Loop Host Contract" + ADR-1244 "role-partitioned Capability Registry"). We do **not** need to fork GSD, monkey-patch workflows, or invent a hook API. A governance overlay ships as a **third-party capability**: a directory `<project>/.gsd/capabilities/aidlc-governance/capability.json` plus artifact files. GSD's `capability-loader.cjs` discovers it at runtime, validates it, and merges it into the same registry the first-party features use. Governance gates then fire at the exact same 12 lifecycle points as built-in features like `security`, `tdd`, `ui`, and `drift`.

This is the single most important architectural decision: **the overlay is a data-declared capability, not a code fork.** Everything else follows from it.

### Evidence (cited, from installed source)

- `bin/lib/loop-host-contract.cjs` — the 12 canonical extension points, generated from workflow markers: `discuss:pre/post`, `plan:pre/post`, `execute:pre/wave:pre/wave:post/post`, `verify:pre/post`, `ship:pre/post`. Each step declares `agentRoles` and `coreArtifacts` (produces/consumes).
- `bin/lib/capability-registry.cjs` — the generated registry. Each capability declares `steps`, `contributions`, and `gates`, each bound to a `point`, an activation `when` (a config key), a `blocking` flag, and an `onError` policy (`skip` | `halt`). The built-in `security`, `tdd`, `ui`, `drift`, `schema-gate`, `gap-analysis`, and `mempalace` capabilities are working templates for exactly what we need.
- `bin/lib/capability-loader.cjs` — `loadRegistry({ includeInstalled })` composes the frozen first-party registry with a **validated installed overlay** read from `$GSD_HOME/.gsd/capabilities/<id>/capability.json` (global) and `<projectRoot>/.gsd/capabilities/<id>/capability.json` (project). First-party always wins; overlays that collide or fail validation are skipped. **A skipped capability that declares a gate is recorded so the loop fails CLOSED for that gate** — governance-friendly by design.
- `bin/lib/loop-resolver.cjs` — `resolveLoopHooks({ point, registry, config })` filters the registry by config activation and returns active hooks (steps, then contributions, then gates) with a rendered-markdown envelope. Command surface: `gsd-tools loop render-hooks <point>`.
- `bin/lib/capability-source.cjs` — the installer/resolver (`resolveCapabilitySource`) that stages a capability from local path / git / npm / tarball with full validation. Install **never executes capability code** (copy-only); declarations only.

The overlay's job is therefore: (1) ship a `capability.json` that registers governance steps/contributions/gates at the right points, and (2) provide the rule-pack store + selection engine + audit writer that those hooks call into. The seam is real and stable; the novel engineering is the selection engine.

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         GSD CORE RUNTIME (unmodified)                    │
│   .planning/ loop:  discuss → plan → execute → verify → ship            │
│   capability-loader.cjs → loop-resolver.cjs → gsd-tools loop render-hooks│
│                                                                          │
│   12 loop points: discuss:pre/post plan:pre/post execute:pre/wave:*/post │
│                   verify:pre/post ship:pre/post                          │
└───────────────┬──────────────────────────────────────────────────────┬─┘
                │  registers steps/contributions/gates via capability.json│
                │  (project-scope .gsd/capabilities/aidlc-governance/)     │
┌───────────────▼──────────────────────────────────────────────────────▼─┐
│                    AI-DLC GOVERNANCE OVERLAY (this project)               │
│                                                                          │
│  ┌────────────────┐   ┌──────────┐   ┌───────────────────────────────┐  │
│  │  Gate Hooks     │   │  Selection│  │        Rule-Pack Store         │  │
│  │ (capability.json│──▶│  Engine   │◀─│  enterprise / domain / project  │  │
│  │  step/gate refs)│   │ task+phase│  │  scoped rule files + frontmatter│  │
│  └───────┬─────────┘   │ → rules   │  └────────────────┬──────────────┘  │
│          │             └────┬──────┘                    │                 │
│          │                  │  reads                     │ built by        │
│          │                  ▼                            ▼                 │
│          │           ┌────────────┐            ┌──────────────────┐       │
│          │           │ Rule Index  │◀───────────│  Index Builder    │      │
│          │           │(id,trigger, │            │ (scan → manifest) │      │
│          │           │ phase,sev,  │            └──────────────────┘       │
│          │           │ summary,path)│                                      │
│          │           └────┬────────┘                                       │
│          ▼                │ selected summaries only                        │
│  ┌────────────────┐       ▼                                                │
│  │Summary Injector │──▶ [markdown fragment into GSD prompt at point]       │
│  └────────────────┘                                                        │
│  ┌──────────────────────┐   on-demand full body                           │
│  │ Detail Loader (lazy)  │──▶ [full rule text when summary insufficient]   │
│  └──────────────────────┘                                                  │
│  ┌────────────────┐   ┌────────────────────────────────────────────────┐  │
│  │ Audit Writer    │──▶│ Enforcement Adapters (tool-agnostic contracts)  │  │
│  │(GOVERNANCE.md,  │   │  CI / SAST / tests / policy-as-code / human      │  │
│  │ audit-state)    │   │  approval — stubs, no vendor lock-in             │  │
│  └───────┬─────────┘   └────────────────────────────────────────────────┘  │
│          │ persists                                                         │
└──────────┼─────────────────────────────────────────────────────────────────┘
           ▼
   .planning/governance/   (survives context compaction — see Persistence)
   ├── rule-index.json           (built manifest: summaries + pointers)
   ├── selection-state.json      (per-phase selected rule ids + reasons)
   └── <phase>/GOVERNANCE.md     (per-phase audit artifact, frontmatter-gated)
```

### Component Responsibilities

| Component | Responsibility | How it's built |
|-----------|----------------|----------------|
| **Rule-Pack Store** | Holds rule definitions in three scopes (enterprise/domain/project). Each rule = frontmatter (id, trigger, phases, severity, summary) + body. | Markdown-with-frontmatter files under `governance/rules/{enterprise,domain,project}/`. Mirrors AI-DLC's `## Rule <PREFIX-NN>` + Rule/Verification structure. |
| **Index Builder** | Scans the store, extracts frontmatter + summary, emits a compact manifest. Run once per store change, not per request. | Node CJS module + `gsd-tools`-style CLI subcommand. Writes `rule-index.json`. |
| **Rule Index** | Fast in-memory lookup: id → {trigger, phases, severity, summary, bodyPath}. The searchable projection the selector reads. | JSON manifest loaded at gate time; never loads bodies. |
| **Selection Engine** | Core value. Given (task signals, phase, scope config), returns the minimal set of relevant rule ids + why. | Pure function: trigger-matching + phase-filter + scope-precedence + severity ranking. Testable without I/O. |
| **Summary Injector** | Renders selected rules' **summaries only** into a markdown fragment for the GSD prompt at the active point. | Emits a capability `contribution` fragment (GSD renders it via loop-resolver). |
| **Detail Loader** | On demand, loads a single rule's full body by id when a summary is insufficient. | `gsd-tools`-style query subcommand: `governance rule-detail <id>`. |
| **Gate Hooks** | The `capability.json` step/gate/contribution entries that bind the above to the 12 points. | Declarative JSON — the actual GSD seam. |
| **Audit Writer** | Records requirements covered, rules applied, rules skipped + reasons, tests run, remaining risks, approvals. | Writes `<phase>/GOVERNANCE.md` with gate-checkable frontmatter + `selection-state.json`. |
| **Enforcement Adapters** | Tool-agnostic contracts + stubs so binding enforcement routes to CI/SAST/tests/policy/human, not markdown. | Interface + no-op/stub adapters; a gate `check` reads adapter results. |

## Recommended Project Structure

```
.gsd/capabilities/aidlc-governance/     # THE SEAM — installed capability (project scope)
├── capability.json                     # registers steps/contributions/gates at loop points
└── fragments/                          # path-based hook fragments (injected markdown)
    ├── discuss-pre.md                  # "classify task type + risk" contribution
    ├── plan-pre.md                     # inject selected rule summaries for planning
    ├── execute-pre.md                  # inject rules for executor/subagent
    └── verify-post.md                  # audit-artifact + enforcement-check guidance

src/                                    # the overlay implementation (Node CJS, matches GSD)
├── index/
│   ├── build-index.js                  # Index Builder (scan store → rule-index.json)
│   └── rule-index.js                   # Rule Index loader/projection
├── selection/
│   └── select.js                       # Selection Engine (pure: task+phase → rule ids)
├── inject/
│   ├── summary-injector.js             # render selected summaries → fragment
│   └── detail-loader.js                # lazy full-body loader by id
├── audit/
│   └── audit-writer.js                 # GOVERNANCE.md + selection-state.json
├── adapters/
│   ├── contract.js                     # tool-agnostic enforcement interface
│   └── stubs/                          # ci.js sast.js tests.js policy.js human.js
└── cli.js                              # subcommands the hooks call (mirror gsd-tools shape)

governance/
├── rules/
│   ├── enterprise/                     # broadest scope, lowest precedence to override
│   ├── domain/                         # e.g. fintech, healthcare rule packs
│   └── project/                        # project-specific, highest precedence
└── schema/
    └── rule.frontmatter.json           # rule frontmatter contract

.planning/governance/                   # RUNTIME STATE (survives compaction) — see Persistence
├── rule-index.json
├── selection-state.json
└── <phase-dir>/GOVERNANCE.md
```

### Structure Rationale

- **`.gsd/capabilities/aidlc-governance/`:** This exact path is what `capability-loader.cjs` scans (`overlayRoots()` → `<projectRoot>/.gsd/capabilities`). Placing the capability here — and nowhere in GSD's own tree — is what makes the overlay upgrade-safe. GSD upgrades replace `gsd-core/`; they never touch `.gsd/capabilities/`.
- **`fragments/`:** `capability-validator.materializeHookFragments` resolves `fragment.path` entries relative to the capability dir. Path-based fragments keep large rule-injection text out of the JSON manifest.
- **`src/` in CJS:** GSD Core is authored in `.cts` → compiled to `.cjs`. Matching the module system means the overlay's CLI and the gate `check` queries can be invoked with `node` exactly like `gsd-tools.cjs`.
- **`governance/rules/{enterprise,domain,project}/`:** Directory = scope. Scope precedence (project > domain > enterprise) is resolved in the selection engine, mirroring AI-DLC's two-tier `aws-aidlc-rules` / `aws-aidlc-rule-details` split and its `extensions/` opt-in model.
- **`.planning/governance/`:** Runtime state lives under `.planning/` (GSD's state home) so it is co-located with STATE.md/ROADMAP.md and survives the long-running loop and compaction. It is a **new subdirectory**, not a root file, so it does not collide with GSD's canonical `.planning/` root artifacts (see `bin/lib/artifacts.cjs` `CANONICAL_EXACT`).

## Architectural Patterns

### Pattern 1: Capability-as-Overlay (the seam)

**What:** Ship governance as a declarative `capability.json` with `role: "feature"`, registered via `steps`/`contributions`/`gates` at loop points. GSD's loader merges it into the live registry.
**When to use:** Always, for this project. It is the only integration path that is upgrade-safe and uses GSD's own activation/gating machinery.
**Trade-offs:** Bound to GSD's registry schema and its 12 points (a real constraint, but the points map cleanly onto discuss/plan/execute/verify/ship). Third-party project-scope capabilities require a **user consent record** in the user-owned consent store before activating (see `capability-loader.cjs` §5, `#1459`), so first-run setup must record consent.

**Example (capability.json skeleton — shapes verified against the built-in `security` capability):**
```json
{
  "id": "aidlc-governance",
  "role": "feature",
  "version": "0.1.0",
  "title": "AI-DLC governance overlay",
  "engines": { "gsd": ">=1.6.0" },
  "config": {
    "governance.enabled": { "type": "boolean", "default": false,
      "description": "Master toggle for AI-DLC governance overlay." },
    "governance.block_on": { "type": "enum",
      "values": ["critical","high","medium","low","none"], "default": "high",
      "description": "Minimum rule severity that blocks ship." }
  },
  "contributions": [
    { "point": "discuss:pre", "into": "orchestrator",
      "fragment": { "path": "fragments/discuss-pre.md" },
      "when": "governance.enabled", "onError": "skip" },
    { "point": "plan:pre", "into": "planner",
      "fragment": { "path": "fragments/plan-pre.md" },
      "when": "governance.enabled", "onError": "skip" }
  ],
  "steps": [
    { "point": "verify:post", "ref": { "command": "governance audit" },
      "produces": ["GOVERNANCE.md"], "consumes": ["SUMMARY.md"],
      "when": "governance.enabled", "onError": "halt" }
  ],
  "gates": [
    { "point": "ship:pre",
      "check": { "predicate": { "kind": "artifact-frontmatter-equals",
        "artifact": "GOVERNANCE.md", "field": "rules_open", "equals": 0 } },
      "when": "governance.enabled", "blocking": true, "onError": "halt" }
  ]
}
```
The `security` capability uses this exact `artifact-frontmatter-equals` predicate at `ship:pre` (`SECURITY.md` / `threats_open == 0`) — confirmed in `capability-registry.cjs`. We mirror it with `GOVERNANCE.md` / `rules_open`.

### Pattern 2: Index-then-select (summaries-only injection)

**What:** Never inject rule bodies. Build a compact index once; at each gate the selection engine returns ids; the injector renders only summaries; bodies load lazily by id.
**When to use:** Every injection point. This is the anti-bloat premise of the whole project.
**Trade-offs:** Requires the index to stay fresh (rebuild on rule-store change). A stale index risks missing a new rule — mitigated by a cheap freshness check at gate time (like GSD's `drift` capability warns on stale STRUCTURE.md).

**Example (selection is a pure function — trivially testable):**
```javascript
// select(taskSignals, phase, scopesConfig, index) → { ids, reasons }
function select(task, phase, cfg, index) {
  const candidates = index.rules
    .filter(r => r.phases.includes(phase))          // phase filter
    .filter(r => triggerMatches(r.trigger, task))   // trigger match
    .filter(r => scopeEnabled(r.scope, cfg));        // scope/opt-in
  // project > domain > enterprise on id collision; then severity rank
  return rankByScopeThenSeverity(candidates);
}
```

### Pattern 3: Advisory-context / binding-enforcement split

**What:** Injected summaries are advisory context for the model. Binding enforcement is a **gate** whose `check` reads an enforcement adapter (CI/SAST/tests/policy/human), not the markdown.
**When to use:** Any rule with a severity that must actually block. Markdown never blocks; a `blocking: true` gate with `onError: "halt"` does.
**Trade-offs:** Requires the adapter contract + at least stub implementations up front so gates have something to read. GSD's fail-closed behavior for skipped gate-declaring capabilities (`capability-loader.cjs`) means a broken adapter blocks rather than silently passes — the safe default.

## Data Flow

### A task flowing through the loop

```
GSD reaches a loop point (e.g. plan:pre)
    ↓
gsd-tools loop render-hooks plan:pre
    ↓  (loop-resolver filters registry by `when` config activation)
governance contribution active? → invoke overlay
    ↓
Selection Engine: (task signals from CONTEXT.md, phase, scope cfg) → rule ids + reasons
    ↓  reads Rule Index (summaries only — never bodies)
Summary Injector → markdown fragment (selected summaries)
    ↓
fragment rendered into the GSD planner/orchestrator prompt
    ↓  (model may request more)
Detail Loader ← "governance rule-detail <id>"  (lazy, only when needed)
    ↓
... execution proceeds ...
    ↓
verify:post step → Audit Writer
    ↓
writes <phase>/GOVERNANCE.md  (rules applied, skipped+reasons, tests, risks, approvals,
                               frontmatter: rules_open: N)
    ↓
updates .planning/governance/selection-state.json
    ↓
ship:pre gate → predicate reads GOVERNANCE.md frontmatter (rules_open == 0?)
    ↓                       ↘ enforcement adapters consulted for binding checks
   PASS → ship            FAIL → halt (blocking gate)
```

### State management (persistence across compaction)

```
Rule store (git-committed, static)
    → Index Builder →  .planning/governance/rule-index.json     (rebuilt on change)

Per-phase run:
  selection →  .planning/governance/selection-state.json         (append per phase)
  audit     →  .planning/governance/<phase>/GOVERNANCE.md         (per phase)
```

### Key data flows

1. **Selection flow:** CONTEXT.md task signals + phase + scope config → selection engine → ids. The engine is the linchpin; everything upstream feeds it and everything downstream consumes its output.
2. **Injection flow:** ids → index lookup → summaries → fragment → GSD prompt. Bounded by design; body text never enters context here.
3. **Audit flow:** execution results + selection-state → GOVERNANCE.md (with gate-checkable frontmatter) → ship gate. This closes the loop from "which rules applied" to "did we satisfy them."

## Persistence Model (survives context compaction)

The defining constraint: audit state and selection state must **not** live only in context. They live on disk under `.planning/governance/`.

| File | Shape | Lifecycle | Why here |
|------|-------|-----------|----------|
| `.planning/governance/rule-index.json` | `{ built_at, rules: [{ id, scope, trigger, phases, severity, summary, body_path }] }` | Rebuilt when the rule store changes | Compact projection; the only thing loaded at gate time |
| `.planning/governance/selection-state.json` | `{ <phase>: { selected: [ids], reasons: {id: why}, skipped: {id: why} } }` | Appended per phase at selection time | Lets a resumed/compacted session recall what was selected without re-deriving |
| `.planning/governance/<phase-dir>/GOVERNANCE.md` | Frontmatter `{ rules_applied, rules_skipped, rules_open, tests, risks_open, approvals_required }` + body | Written at `verify:post`, read at `ship:pre` | Review-ready audit artifact; frontmatter is the gate predicate source |

Rationale grounded in GSD behavior:
- `.planning/` is GSD's canonical state home (`PROJECT.md`, `STATE.md`, `ROADMAP.md`, `config.json` all live there per `bin/lib/artifacts.cjs`). Placing governance state there means it is committed with the project (config `commit_docs: true`) and reloaded on session resume.
- Using a **subdirectory** `governance/` avoids GSD-health `W019` flagging (the `artifacts.cjs` canonical-file check only governs `.planning/` **root** files; subdirectories are out of its scope).
- Per-phase directory layout mirrors GSD's own per-phase artifact convention (RESEARCH.md, PLAN.md, SUMMARY.md, SECURITY.md live in phase dirs), so `artifact-frontmatter-equals` predicates resolve `GOVERNANCE.md` the same way `security` resolves `SECURITY.md`.
- Configuration attaches through the capability's declared `config` keys (`governance.*`), which GSD merges into its config schema (`config-schema.manifest.json` + capability `config` blocks). We do **not** edit GSD's `config.json` schema; the capability contributes its keys. The existing `.planning/config.json` (read: `workflow.*`, `security_enforcement`, etc.) is untouched; governance keys are additive.

## Build Order (dependencies)

Grounded in the flow above — the selection engine is the core-value linchpin, but it needs the index and store shape defined first.

1. **Rule frontmatter schema + Rule-Pack Store layout** — everything keys off the rule shape (id, trigger, phases, severity, summary, body). Define scopes and precedence. No dependencies. Mirror AI-DLC's `## Rule <PREFIX-NN>` + Rule/Verification structure and its opt-in model.
2. **Index Builder + Rule Index** — scan store → `rule-index.json`. Depends on (1). Cheap, and unblocks the selector with real data.
3. **Selection Engine** — pure function (task+phase+scope → ids+reasons). Depends on (2) for the index shape. **This is the riskiest, highest-value component; build it with a strong test suite before wiring any hooks.** If summary selection is wrong, the anti-bloat premise collapses.
4. **Summary Injector + Detail Loader** — render selected summaries; lazy body load. Depends on (3).
5. **capability.json + fragments (the seam)** — register contributions/steps/gates at the 12 points. Depends on (3)/(4) existing as callable CLI subcommands. Validate with `capability-validator` / `gsd-tools loop render-hooks`.
6. **Audit Writer** — GOVERNANCE.md + selection-state.json. Depends on (3) (needs selection output) and (5) (fires at verify:post).
7. **Enforcement Adapter contract + stubs** — tool-agnostic interface + no-op stubs. Depends on the gate `check` shape from (5)/(6). Ship stubs only (no vendor integrations).

Critical-path note: 1 → 2 → 3 is the value spine. Hooks (5) and audit (6) are integration; adapters (7) can be stubbed last. Do not build (5) before (3) works — a registered gate with a broken selector fails closed and blocks the whole loop.

## Anti-Patterns

### Anti-Pattern 1: Forking or patching GSD internals

**What people do:** Edit `gsd-core/workflows/*.md` or `bin/gsd-tools.cjs` to insert governance logic.
**Why it's wrong:** Every GSD upgrade overwrites `gsd-core/`, silently destroying the integration. It also opts out of GSD's validation, activation, and fail-closed gate machinery.
**Do this instead:** Ship a capability under `.gsd/capabilities/` — the loader merges it and it survives upgrades.

### Anti-Pattern 2: Injecting full rule bodies (or the whole corpus) per request

**What people do:** Concatenate all steering markdown into every prompt (AI-DLC's default "load rules file" behavior).
**Why it's wrong:** This is the exact context-bloat failure mode the project exists to eliminate; it degrades the long-running loop.
**Do this instead:** Inject summaries only via the index; load bodies lazily by id through the Detail Loader.

### Anti-Pattern 3: Treating markdown as enforcement

**What people do:** Assume the model will obey injected rules, and call that "enforcement."
**Why it's wrong:** Advisory context is not binding; critical rules can be silently ignored.
**Do this instead:** Route binding checks through a `blocking: true` gate whose `check` reads an enforcement adapter (CI/SAST/tests/policy/human), with `onError: "halt"`.

### Anti-Pattern 4: Holding audit/selection state only in context

**What people do:** Track "which rules applied" in the conversation.
**Why it's wrong:** Context compaction erases it; the audit trail is lost and selection can't be reconstructed on resume.
**Do this instead:** Persist to `.planning/governance/` (index, selection-state, GOVERNANCE.md).

## Integration Points

### GSD Core (the seam — grounded)

| Boundary | Mechanism | Notes |
|----------|-----------|-------|
| Discovery | `capability-loader.cjs` scans `<projectRoot>/.gsd/capabilities/<id>/capability.json` | Project scope requires a user consent record (`hasProjectConsent`) before activation; global scope (`$GSD_HOME/.gsd/capabilities`) is trusted |
| Extension points | `loop-host-contract.cjs` — 12 points across discuss/plan/execute/verify/ship | `steps` (run agent/skill/command), `contributions` (inject markdown into a role prompt), `gates` (blocking/non-blocking checks) |
| Activation | `when` = a config key resolved by `capability-activation.cjs`; keys declared in the capability's `config` block | `governance.enabled` master toggle mirrors `workflow.security_enforcement` |
| Rendering | `loop-resolver.cjs` → `gsd-tools loop render-hooks <point>` | Returns active hooks ordered steps → contributions → gates, with rendered markdown |
| Gate predicates | `check.predicate.kind` (e.g. `artifact-frontmatter-equals`) or `check.query` | `security` uses `artifact-frontmatter-equals` on `SECURITY.md`; we mirror on `GOVERNANCE.md` |
| Install | `capability-source.cjs` `resolveCapabilitySource` (local/git/npm/tarball) | Copy-only, never executes capability code; full validation before staging |

### AI-DLC (data model source — grounded)

| Boundary | What we mirror | Notes |
|----------|----------------|-------|
| Rule shape | `## Rule <PREFIX-NN>: <Title>` with **Rule** (requirement) + **Verification** (checks) sections; unique ids | From `awslabs/aidlc-workflows` `aws-aidlc-rules` / `aws-aidlc-rule-details` |
| Two-tier detail | Core rules (`core-workflow.md`) + conditional detail files | Maps to our summary (index) vs body (lazy) split |
| Opt-in / scope | `extensions/<cat>/<name>.opt-in.md` gates whether rules load; no opt-in = "always enforced" | Maps to our scope config (`governance.*`) + selection engine scope filter |
| Phases | Inception (WHAT/WHY) → Construction (HOW) → Operations | Map onto GSD discuss/plan → execute/verify → ship |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Gate hooks ↔ Selection engine | CLI subcommand invocation (`node src/cli.js governance select ...`) | Same invocation shape as `gsd-tools`; keeps the seam declarative |
| Selection engine ↔ Rule index | In-process function call (pure) | No I/O in the pure core; index loaded by caller |
| Audit writer ↔ Enforcement adapters | Interface contract (`adapters/contract.js`) | Stubs return structured pass/fail the gate predicate reads |

## Sources

- GSD Core installed source (read directly, HIGH confidence): `C:\Users\thien\.claude\gsd-core\bin\lib\loop-host-contract.cjs`, `capability-registry.cjs`, `capability-loader.cjs`, `capability-source.cjs`, `loop-resolver.cjs`, `artifacts.cjs`, `runtime-hooks-surface.cjs`, `bin/shared/config-schema.manifest.json`; ADR references ADR-894 (Loop Host Contract), ADR-1244 (Capability Registry overlay).
- GSD Core repo: https://github.com/open-gsd/gsd-core (same codebase as installed copy).
- AI-DLC Workflows: https://github.com/awslabs/aidlc-workflows — phases (Inception/Construction/Operations), `aws-aidlc-rules` / `aws-aidlc-rule-details` two-tier layout, `extensions/*.opt-in.md` opt-in model, `## Rule <PREFIX-NN>` rule structure (MEDIUM confidence — read via repo overview, not full file-by-file).
- Project constraints: `.planning/PROJECT.md`, `.planning/config.json`.

---
*Architecture research for: AI-DLC governance overlay on GSD Core*
*Researched: 2026-07-05*
