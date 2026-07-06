# Phase 4: GSD Capability Integration & Persistence - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase is the **integration layer** — it wires the standalone CLI/pure-function core (Phases 1–3) into GSD's actual runtime as a declarative **capability**, fires governance at the two v1 gates (discuss, execute), injects selected summaries into otherwise-empty subagent contexts, and **persists governance state to disk** so it survives context compaction and subagent boundaries. After Phase 4, the overlay is live in the loop, not just callable from a CLI.

Covers requirements **GATE-01** (discuss gate: identify task type + risk, attach relevant summaries), **GATE-02** (execute gate: inject selected summaries into executor/subagent context), and **ENF-01** (governance state persists to `.planning/governance/`, survives compaction + subagent boundaries).

**In scope:** the `aidlc-governance` capability manifest under `.gsd/capabilities/`; `discuss:pre` (task type + risk classification → domain subscription → selection → attach fragment) and `execute:pre` (reload persisted selection → inject fragment into subagent context) hooks; the disk-backed governance ledger under `.planning/governance/` (`selection-state.json` + per-phase dirs); the reload-after-boundary test; first-run project-scope consent handling (ROADMAP 04-03).

**Out of scope (v2 — Govern milestone):** `plan:pre`, `verify:pre`, `ship:pre` gates (GATE-03/04/05); the full audit-artifact writer (Phase 5 — AUDIT-01/02); tool-agnostic enforcement contracts + adapter stubs (ENF-02/03/04); the human-approval checkpoint schema (APPR-01); the standing selection-quality harness (SEL-06). Phase 4 produces the two v1 gates and persistence only.

</domain>

<decisions>
## Implementation Decisions

### Capability manifest & discovery (criterion 1)
- **Manifest location:** `.gsd/capabilities/aidlc-governance/capability.json` — **project-scope**, matching the loader's `<projectRoot>/.gsd/capabilities/<id>/capability.json` scan path (capability-loader.cjs). Project-scope (not global `~/.gsd/`) so the overlay travels with the repo and consent is per-project.
- **Capability id:** `aidlc-governance`. Declares `discuss:pre` + `execute:pre` as `kind: "step"` hooks (the two v1 gates named in the goal) — NOT plan/verify/ship (those are v2 GATE-03/04/05, deferred).
- **Hook `ref` target:** each hook points (via `ref.skill` or `ref.script`, exact field per the loader schema) at a thin GSD skill/script that calls the **pure cores** already built: `validateSignal` → `select` → `renderInjection`. No governance logic is duplicated in the hooks; they marshal loop context into a `TaskSignal`, call the cores, and write the fragment back into the loop context. **Verify the exact manifest field names + ref shape against `capability-loader.cjs` and a first-party capability manifest at planning** (the STATE.md note flags this — the manifest schema is the load-bearing unknown).
- **Consent (CB-3 gate):** honor the loader's project-scope consent flow — first run, the overlay is discovered but INACTIVE until consent is recorded (do not bypass via aliasing — capability-loader.cjs #1459 explicitly guards this). Verify the consent-record shape/location at planning.

### Discuss gate — task type + risk classification (criterion 2, GATE-01)
- **TaskSignal derivation:** read the current phase from `.planning/STATE.md` and derive a `TaskSignal` from the task signal available at the discuss gate (task title/diff/impacted paths) — NOT requiring per-call explicit user input (the gate must be automatic). Exact signal-sourcing (what the loop exposes at `discuss:pre`) is a planning/research detail to verify against the GSD loop contract.
- **Risk classification:** a **deterministic heuristic** — phase + keyword scan (`auth`, `secret`, `payment`, `pci`, `eval`, etc.) + impacted paths. No separate risk model (scope creep). The risk tier is recorded alongside the selection.
- **What attaches to discuss context:** the Phase 3 `<governance>` fragment from `renderInjection` — **summaries only**, never bodies (the anti-bloat invariant holds at the gate too).
- **Risk → selection interaction:** risk **adjusts domain subscription** — a `critical`/high-risk task auto-subscribes the `security` and `payments` domains (so the relevant high-authority rules become candidates). A low-risk task stays on the base subscription. This makes risk load-bearing for selection, not merely advisory. (Chosen over "risk advisory only": a critical auth task that doesn't auto-subscribe the security domain is an under-injection footgun.)

### Execute gate — subagent context injection (criterion 3, GATE-02)
- **What gets injected:** the same `<governance>` fragment (summaries) into the executor/subagent context, which otherwise inherits nothing — the whole reason the gate exists.
- **Subagent boundary handling:** a fresh subagent **re-loads the persisted selection** from `.planning/governance/` rather than re-deriving the signal — so every subagent in the same governed task sees the identical selection. (Chosen over "re-run select at execute": duplicated work AND the signal could differ between gates, yielding inconsistent governance.)
- **Selection timing:** computed **once at discuss**, persisted, reloaded at execute. One selection per governed task.
- **Budget at execute:** **re-check `budgetExceeded`** on reload and warn + non-zero if over (SEL-05 continuity). Do not silently trust the discuss-time budget — an over-budget selection must not silently reach the executor context.

### Persistence — `.planning/governance/` (criterion 4, ENF-01)
- **State location/shape:** `.planning/governance/selection-state.json` + **per-phase dirs**, each record `{ taskSignal, selectionResult, phase, timestamp }`. (Chosen over a single flat file: per-phase scoping is cleaner to enumerate/clean and prevents cross-task bleed.)
- **Persisted content:** the **full deterministic `SelectionResult`** (selected + skipped + reasons + budget), so a reload reproduces the exact selection without re-derivation. The `timestamp` is **metadata** (when this selection was made), NOT part of the selection — the persisted selection itself has no clock, so byte-identical reload is achievable.
- **Reload-after-boundary test:** a test writes state, simulates a compaction/subagent boundary (a fresh process / cold reload), reads it back, and asserts the **reloaded selection is identical** to what was written. This is the core acceptance evidence for ENF-01.
- **Write timing:** atomic write at discuss (after selection), update at execute (after injection). Both atomic (`writeFileSync` to a temp then rename, or the existing `writeIndex`-style atomic pattern). (Chosen over "write only at end": a mid-task crash would lose selection state.)

### First-run project-scope consent (ROADMAP 04-03)
- The overlay's first activation in a project must record explicit consent (CB-3). Verify the exact consent record shape/location against `capability-loader.cjs` at planning; do not invent a parallel consent mechanism. If consent is not yet recorded, the overlay stays discovered-but-inactive (the loader's default-resilient behavior) — never silently active.

### Claude's Discretion
Left to research/planning within the decisions above:
- The exact manifest field names + `ref` shape (`ref.skill` vs `ref.script` vs `ref.agent`) — **must be verified against `capability-loader.cjs` and a real first-party capability manifest** before authoring; this is the single biggest unknown.
- What the GSD loop exposes at `discuss:pre` / `execute:pre` (how the hook receives the task context + how it writes into the loop's context) — the GSD loop-host contract; verify at research.
- The risk-heuristic keyword list and the exact risk-tier → domain-subscription mapping (which domains each tier subscribes).
- Internal module layout for the hook adapters (one `discuss-hook.ts` / `execute-hook.ts` or a shared `governance-gate.ts`) — planner picks; keep the pure cores the sole source of governance logic.
- The atomic-write helper (reuse an existing pattern if present, else a small temp-then-rename).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/select/select.ts` + `validate-signal.ts`** — the pure selection core + signal validation. The hooks call these; they do NOT re-implement matching.
- **`src/inject/inject.ts`** — `renderInjection(result)` producing the `<governance>` fragment. Both gates render through this same function.
- **`src/types.ts`** — `TaskSignal`, `SelectionConfig` (`{ phase, domains }`), `SelectionResult`. The gate hooks construct a `TaskSignal` + `SelectionConfig` (with risk-adjusted `domains`) and consume a `SelectionResult`.
- **`src/rules/load.ts` / `src/index/build.ts`** — produce `rule-index.json`, which the gate reads (or the persisted selection already carries what to inject).
- **`bin/governance.cjs` + `src/cli/index.ts`** — the existing CLI dispatch; the gate hooks are a separate invocation path (loop-driven), not CLI subcommands, but the pure cores are shared.

### Established Patterns
- **Deterministic, pure cores + thin wrappers.** The gate hooks are thin wrappers over the pure cores — they marshal loop context, call `validateSignal`/`select`/`renderInjection`, and write the fragment back. No governance logic in the hooks.
- **Fail-loud (CR-01 lesson):** a malformed loop context or missing index fails loud at the gate, never silently emits an empty/no-governance fragment (which would be under-injection).
- **Atomic writes** for persistence (the project's other disk artifacts — `rule-index.json`, STATE.md — use straightforward `writeFileSync`; for governance state that must survive crashes, use temp-then-rename).
- **No clock in the selection** (SEL-01 determinism, reinforced in Phase 2) — the persisted `SelectionResult` has no timestamp field; only the wrapper record's `timestamp` metadata does.

### Integration Points
- **GSD capability loader** (`~/.claude/gsd-core/bin/lib/capability-loader.cjs`) — discovers `.gsd/capabilities/aidlc-governance/capability.json`, validates it, registers hooks. The manifest schema is THE integration contract; verify it at research.
- **GSD loop** (`gsd-tools loop render-hooks`) — the hook points (`discuss:pre`, `execute:pre`) and how a hook's output reaches the loop context. Verify the loop-host contract at research.
- **`.planning/governance/`** — new disk surface; Phase 5 (audit) later reads the persisted selection to derive audit artifacts, so the record shape is a forward contract.

</code_context>

<specifics>
## Specific Ideas

- **The hook adapters must stay thin** — all governance logic lives in the pure cores (select/inject). A hook that re-implements matching or rendering would duplicate the body-leak surface and the under-injection risk. Marshal → call core → write fragment, nothing else.
- **Persistence is what makes the overlay survive the long-running loop** — without it, a context compaction or a fresh subagent loses the selection and the next gate either re-derives a different signal or silently injects nothing. ENF-01 is the load-bearing requirement for "governance at scale over a long runtime."
- **Risk-widens-subscription is the recall lever at the gate** — a critical auth task MUST auto-subscribe the security domain, or the relevant critical rules never become candidates. This is the discuss-gate equivalent of Phase 2's recall-over-precision stance.
- **Verify against the installed loader, don't assume** — the STATE.md note flags the exact `capability.json` schema + consent flow as the thing to re-verify at planning. The loader is the integration contract; a manifest that validates against the loader is criterion 1's literal acceptance test (`gsd-tools loop render-hooks` must show the governance hooks active).

</specifics>

<deferred>
## Deferred Ideas

- **plan/verify/ship gates (GATE-03/04/05)** — the other three workflow gates. Explicitly v2 (Govern milestone); Phase 4 ships only discuss + execute.
- **Full audit-artifact writer (AUDIT-01/02)** — Phase 5. The persisted selection feeds it but the writer itself is not built here.
- **Tool-agnostic enforcement contracts + adapter stubs (ENF-02/03/04)** — binding rules getting real enforcement teeth via named contracts. v2.
- **Human-approval checkpoint schema (APPR-01)** — explicit sign-off recorded in the audit. v2.
- **Standing selection-quality harness over time (SEL-06)** — trend recall/precision across runs. v2.
- **Cross-project governance state** — sharing a selection across subprojects/workstreams. Not in scope; per-phase per-project state only.

</deferred>

---

*Phase: 4-GSD Capability Integration & Persistence*
*Context gathered: 2026-07-06*
