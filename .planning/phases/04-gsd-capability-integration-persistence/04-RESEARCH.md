# Phase 4: GSD Capability Integration & Persistence — Research

**Researched:** 2026-07-06
**Phase goal:** The overlay registers as a declarative GSD capability firing governance at the discuss and execute gates, injects selected summaries into otherwise-empty subagent contexts, and persists governance state to disk so it survives compaction and subagent boundaries.
**Requirements:** GATE-01 (discuss gate), GATE-02 (execute gate), ENF-01 (persisted governance state).

> **Authoring note:** written by the orchestrator after investigating the installed GSD runtime directly (the frozen first-party registry at `~/.claude/gsd-core/bin/lib/capability-registry.cjs`, the loader at `capability-loader.cjs`, and `loop-resolver.cjs`). The manifest schema + loop contract are load-bearing unknowns the STATE.md note flagged; this grounds them in the actual installed code rather than assumption. Direct-authoring avoids the research-subagent truncation failures seen in earlier phases.

---

## 1. The Capability Manifest — Exact Schema (verified against `code-review`)

A project-scope overlay is a directory `<projectRoot>/.gsd/capabilities/<id>/capability.json` discovered and validated by `capability-loader.cjs`. The frozen first-party registry (`capability-registry.cjs`) defines capabilities like `code-review` with this exact shape — `aidlc-governance` mirrors it:

```jsonc
{
  "id": "aidlc-governance",
  "role": "feature",            // "feature" | "runtime" | "security" | ...
  "version": "0.1.0",
  "title": "AI-DLC Governance Overlay",
  "description": "Injects selected governance rule summaries at the discuss/execute gates; persists selection state.",
  "tier": "full",               // "core" | "full"
  "requires": [],               // capability ids this depends on
  "engines": { "gsd": ">=1.6.0" },
  "runtimeCompat": { "supported": ["*"], "unsupported": [] },
  "skills": ["aidlc-governance-discuss", "aidlc-governance-execute"],  // SKILL.md files the hooks invoke
  "agents": [],                 // none — the hooks call pure cores, no dedicated agent
  "hooks": [],                  // (legacy field; the loader also reads `steps`/`contributions`/`gates`)
  "config": {
    "governance.token_budget": { "type": "number", "default": 2000, "description": "..." },
    "governance.enabled":      { "type": "boolean", "default": true, "description": "..." }
  },
  "steps": [
    {
      "point": "discuss:pre",
      "ref": { "skill": "aidlc-governance-discuss" },
      "produces": ["CONTEXT.md"],          // attaches the governance fragment to discuss context
      "consumes": ["STATE.md", "rule-index.json"],
      "when": "governance.enabled",
      "onError": "skip"
    },
    {
      "point": "execute:pre",
      "ref": { "skill": "aidlc-governance-execute" },
      "produces": ["executor-context"],
      "consumes": [".planning/governance/selection-state.json"],
      "when": "governance.enabled",
      "onError": "skip"
    }
  ],
  "contributions": [],
  "gates": []
}
```

### Fields the loader actually destructures (verified)
`cap.id`, `cap.gates`, `cap.steps`, `cap.contributions`, `cap.skills`, `cap.agents`, `cap.commands`, `cap.config`, `cap.engines`, plus the entry-point fields `root.cjs` / `root.dir`. A step hook object: `{ point, ref:{skill|script|agent}, produces?, consumes?, when?, onError?, fragment? }`.

### `when` is a config-key reference, evaluated by the registry
`when: "workflow.code_review"` means "active when that config key is truthy." For `aidlc-governance` use `when: "governance.enabled"` (default true) so the overlay is on by default but switchable. **The `when` condition is evaluated by the capability registry/loader, not by the hook itself** — the hook runs only when the registry resolves the step as active.

### `fragment.inline` vs `ref.skill` (loop-resolver)
`loop-resolver.cjs` shows a step can carry either:
- **`ref.skill`** → the loop invokes the named GSD skill (a SKILL.md the overlay ships); the skill does the work and writes output, OR
- **`fragment.inline`** (a literal string template) / **`fragment.path`** (a file) → static prompt fragment injected directly, no skill invocation.

For governance, the work is dynamic (read STATE, classify risk, select, render) so **`ref.skill` is the right choice** — a thin skill that calls the pure cores. `fragment.inline` would only suit static guidance.

---

## 2. Project-Scope Consent (CB-3) — Critical Constraint

`capability-loader.cjs` is **paranoid** about project-scope overlays (lines 78, 128-185):
- A `.gsd/capabilities/<id>/capability.json` is **untrusted, repo-plantable content**. It is discovered but **INACTIVE until consent is recorded** (the CB-3 gate). The loader explicitly guards against aliasing tricks (a symlinked GSD_HOME, a `path.resolve` race) that would upgrade a project bundle to trusted-global and bypass consent (#1459).
- **Implication for the plan:** the overlay's first activation must record consent. Verify the **consent record shape/location** at planning via `gsd-tools capability` (the `trust`/`enable`/`state` subcommands seen earlier). The acceptance test for criterion 1 (`gsd-tools loop render-hooks` shows governance hooks active) will only pass *after* consent — so the plan must include a consent-recording step (or document that the test runs post-consent).
- **Do NOT invent a parallel consent mechanism.** Use the loader's built-in one (`gsd-tools capability trust aidlc-governance` or equivalent — verify exact verb).

---

## 3. The Loop-Host Contract — What a Hook Receives / Writes

This is the second load-bearing unknown. The GSD loop invokes a `ref.skill` step by **running the skill** with loop context available. From the workflow files I've read this session (`execute-phase.md`, `plan-phase.md`), the loop-host contract is:
- The skill runs as a normal GSD skill (SKILL.md + scripts).
- Loop context (current phase, task signal, artifacts) is available via `gsd-tools query` verbs (`init.phase-op`, `roadmap.get-phase`, reading `.planning/STATE.md`) — NOT passed as args.
- A step hook's **`produces`** declares artifacts it writes; the loop expects those artifacts on disk after the skill runs.

**For governance:** the discuss skill reads STATE + the task signal → calls `select` → writes the `<governance>` fragment to a known artifact path the loop picks up (or appends to CONTEXT.md). The execute skill reads the persisted selection → writes the fragment where the executor/subagent context is assembled. **Verify the exact "where does a discuss:pre fragment go" and "where does execute:pre inject into subagent context" against the loop-host contract docs at research** — `$HOME/.claude/gsd-core/` has a `loop-host` reference; check it. The honest answer may be: GSD's loop assembles context from declared `produces` artifacts + the skill's stdout, and the overlay writes its fragment to a `produces` path.

---

## 4. Risk → Domain-Subscription Heuristic

Deterministic, no ML. Inputs available at discuss: `.planning/STATE.md` (current phase), the task signal (title/description/impacted paths). Heuristic:
- **keyword scan** for security/payment signals: `auth`, `mfa`, `secret`, `credential`, `token`, `password`, `eval`, `payment`, `pci`, `card`, `gdpr`, `pii`, `crypto`, `injection`.
- **path scan** for sensitive areas: `auth/`, `payment/`, `security/`, `crypto/`, secrets files.
- **Risk tiers:** `critical` (any security/payment keyword OR sensitive path), `elevated` (phase=construction + broad changes), `baseline` (default).
- **Tier → domains:** `critical` subscribes `["security", "payments"]` (whichever exist in the index); `elevated` subscribes `["security"]`; `baseline` subscribes none. These stack on top of the user's configured base subscription.

The risk tier is recorded in the persisted state alongside the selection.

---

## 5. Persistence Shape & Reload-After-Boundary Test

- **Location:** `.planning/governance/selection-state.json` + per-phase dirs `.planning/governance/phase-<NN>/`.
- **Record shape:** `{ phase, taskSignal, selectionConfig, selectionResult, riskTier, timestamp }`. The `selectionResult` is the full Phase 2 `SelectionResult` (selected + skipped + reasons + budget) — deterministic, no clock. `timestamp` is metadata.
- **Atomic write:** `writeFileSync` to a `.tmp` then `renameSync` (atomic on POSIX, near-atomic on Windows) — survive a mid-write crash. Reuse this pattern for both discuss-write and execute-update.
- **Reload-after-boundary test:** write a record, drop all in-memory state, reload from disk in a fresh call, assert `JSON.stringify(reloaded.selectionResult) === JSON.stringify(original.selectionResult)`. Simulate the subagent boundary by calling the reload function in a new process (or just a fresh function call with no cached state — the point is the disk record is self-sufficient).

### Determinism note (carried from Phase 2)
The persisted `selectionResult` has no clock. The `timestamp` is in the wrapper record, not in the selection. So two reloads yield byte-identical selection output. Do NOT add a "recomputed at load" path that could diverge.

---

## 6. Hook Adapter Architecture (keep thin)

The skills (`aidlc-governance-discuss`, `aidlc-governance-execute`) are **thin** — they marshal loop context into the pure-core calls and write artifacts. Suggested module layout (planner finalizes):
- `src/governance/discuss-hook.ts` — reads STATE + task signal → builds `TaskSignal` + risk-adjusted `SelectionConfig` → `validateSignal` → `select` → `renderInjection` → write fragment + persist state.
- `src/governance/execute-hook.ts` — reads persisted state → `renderInjection` → re-check `budgetExceeded` → write fragment for subagent context.
- `src/governance/state-store.ts` — atomic read/write of `.planning/governance/` records.
- `src/governance/risk.ts` — the deterministic risk heuristic (§4).
- `.claude/skills/aidlc-governance-discuss/SKILL.md` + `...-execute/SKILL.md` — the GSD skill entry points the manifest's `ref.skill` invokes; each SKILL.md runs the corresponding hook script.

**The pure cores (`select`, `validateSignal`, `renderInjection`) are the ONLY place governance logic lives.** The hooks marshal and persist; they do not re-implement matching, rendering, or budget.

---

## Validation Architecture

| Dimension | What it proves | How it's tested |
|-----------|----------------|-----------------|
| **Capability discovery (criterion 1)** | `gsd-tools loop render-hooks discuss:pre/execute:pre` shows the governance hooks active (post-consent) | integration test: install capability, record consent, render-hooks asserts `aidlc-governance` step present at both points |
| **Manifest validity** | the loader accepts the manifest (no validation skip) | `gsd-tools capability list` includes `aidlc-governance` status active (post-consent) |
| **Discuss gate (criterion 2, GATE-01)** | task type + risk classified; `<governance>` fragment attached | unit test on discuss-hook: given a STATE + signal, produces a fragment with selected summaries + a recorded risk tier |
| **Risk → subscription** | critical auth task subscribes security domain | unit test: auth-keyword signal → selectionResult includes security-domain rules that a baseline subscription would omit |
| **Execute gate (criterion 3, GATE-02)** | fragment injected into subagent context; reloaded from disk not re-derived | unit test on execute-hook: given persisted state (no signal), produces the identical fragment |
| **Persistence (criterion 4, ENF-01)** | state survives a boundary | reload-after-boundary test: write → fresh reload → byte-identical selection |
| **Budget continuity** | over-budget selection warns + non-zero at execute reload | unit test: persisted `budgetExceeded:true` → execute-hook surfaces it |
| **Determinism** | no clock in persisted selection; reload is byte-identical | the reload test asserts exact equality |
| **Consent (CB-3)** | overlay inactive until consent recorded | integration test: pre-consent `render-hooks` does NOT show governance; post-consent it does |
| **Purity of cores preserved** | hooks don't duplicate governance logic | code review: select/renderInjection are the only governance-logic call sites |

---

## Pitfalls Summary (planner must guard each)

1. **Manifest schema drift** — use the exact field names from `code-review` (`point`, `ref.skill`, `produces`, `consumes`, `when`, `onError`); the loader is strict.
2. **Bypassing consent (CB-3)** — never alias or force-trust; use the loader's consent verb. A pre-consent `render-hooks` showing governance active would mean a bypass.
3. **Duplicating governance logic in hooks** — hooks marshal + persist only; `select`/`renderInjection` stay the sole logic source.
4. **Clock in persisted selection** — would break byte-identical reload; `timestamp` stays in the wrapper, not the `selectionResult`.
5. **Non-atomic state write** — a mid-write crash corrupts the ledger; use temp-then-rename.
6. **Re-deriving the signal at execute** — would yield a different selection; reload the persisted one.
7. **Silent no-governance fragment** — a malformed context or missing index must fail loud at the gate (under-injection risk), never silently emit empty.
8. **`when` evaluated by registry, not hook** — the hook runs only when the registry resolves the step active; don't re-check `when` inside the hook.
9. **Verify loop-host output path** — confirm WHERE a `discuss:pre`/`execute:pre` `produces` artifact is read by the loop; the overlay must write to that path. (Research the loop-host reference at `$HOME/.claude/gsd-core/`.)

## RESEARCH COMPLETE
