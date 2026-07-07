# Phase 2: Selection Engine - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the **selection engine** — the project's core value. Given a task's signals plus the current phase and scope config, it deterministically returns exactly the matching rules from `rule-index.json`, each with a reason, and records why every non-selected candidate was skipped. It proves correctness against a labeled eval set (gating `critical` recall) and enforces a per-request governance token budget with a loud overflow signal.

Covers requirements **SEL-01** (deterministic trigger + scope-glob + phase matching with per-rule reasons), **SEL-04** (selection observability — why each candidate was selected or skipped), and **SEL-05** (per-request token budget with loud overflow signal).

**In scope:** the pure `select()` function (trigger/scope/phase matching over the index, reusing Phase 1's locked D-01..D-04 semantics); the `governance select` CLI subcommand; the selected/skipped output contract with per-rule reasons; the labeled `(task, phase) → expected-rules` eval set + recall/precision measurement; the token-budget estimator and overflow signal; fast-check invariants.

**Out of scope (belongs to later phases):** actually injecting summaries into a working/subagent context (Phase 3 — SEL-02/GATE-02); the `rule-detail <id>` lazy loader (Phase 3 — SEL-03); deriving the current phase/signal from live GSD STATE.md (Phase 4 — capability wiring); persisting selection decisions to `.planning/governance/` (Phase 4 — ENF-01); the audit-artifact writer that consumes this selector output (Phase 5 — AUDIT-01/02); the standing selection-quality harness over time (v2 — SEL-06; only the labeled eval *set* lands here as SEL-01's acceptance evidence).

</domain>

<decisions>
## Implementation Decisions

### Input contract (task signal + phase + scope config)
- **Input delivery:** Task signals are supplied as **JSON via stdin or `--input <file>`**. The core is a **pure `select(index, signal, config)` function** the CLI wraps — the eval harness feeds many signals programmatically without shelling out. (Chosen over CLI-flags-primary: the eval set in criterion 3 needs to drive the engine programmatically over many cases.)
- **TaskSignal shape:** `{ taskType: TaskType, keywords: string[], paths: string[] }` — mirrors the three positive trigger axes locked in Phase 1 (D-01) exactly. No free-form `text` field; callers pre-tokenize into `keywords`.
- **Phase supplied explicitly:** `--phase <inception | construction | operations | common>` (matches Phase 1's `Phase` enum). Deriving the phase from live GSD state is deferred to Phase 4.
- **Scope config = active-domain subscription:** `{ domains: string[] }` naming the active domains. Candidate set = **enterprise + active `domain/<name>` + project**; rules in a non-active domain are emitted as **skipped `out-of-scope`**. (Chosen over "all scopes always candidate": domain subscription is what makes selection minimal per team; scope still drives precedence exactly as Phase 1's D-11 resolved it.)

### Output & skip observability (SEL-01 + SEL-04)
- **Output format:** **JSON to stdout** — the deterministic contract Phase 3 (inject) and Phase 5 (audit) both consume. Optional `--format text` for human reading; JSON is canonical.
- **Selected record shape:** `{ id, severity, summary, matchedAxis, matchedValue }` — carries the summary (what Phase 3 injects) plus the axis + concrete value that fired, so the audit can name *why*.
- **Every candidate emitted:** The output lists **all index rules as either selected or skipped** (satisfies criterion 2 / SEL-04). Skip reasons use a machine-checkable enum **aligned with AUDIT-02**: `out-of-phase | out-of-scope | out-of-scope-by-trigger | superseded`. (`out-of-scope` = non-active domain; `out-of-scope-by-trigger` = in scope + phase but no trigger axis matched or an `exclude` fired; `superseded` = lost a Phase-1 precedence collision.)
- **"Why selected" granularity:** Name the **axis + value** that matched (e.g. `matchedAxis: "keywords", matchedValue: "auth"`). An empty-triggers rule (D-03) reports `matchedAxis: "always-in-phase"`.

### Token budget (SEL-05)
- **Token estimator:** Deterministic **char-based heuristic `ceil(chars / 4)`**, zero-dependency, documented as an estimate. (Chosen over a real tokenizer dep like tiktoken: determinism + auditability + zero-dep matter more than exact counts here; the budget is a guard-rail, not a billing meter.)
- **What counts:** Sum of the **selected** rules' `summary` fields + a small fixed per-rule overhead (summaries are exactly what Phase 3 injects).
- **Default + config:** Default budget **2000 tokens**, configurable via `config.json` `governance.token_budget`, overridable per-run with `--budget <n>`.
- **Overflow = loud signal, never silent truncation:** When selected summaries exceed the budget, the result flags **`budgetExceeded: true`** and lists the offending rule ids; the CLI **exits non-zero** with a message to stderr. The engine **never silently truncates** — dropping a rule to fit could drop a `critical` rule, the top project risk. (Truncate-lowest-severity was explicitly rejected.)

### Eval set & recall gating (criterion 3 — the load-bearing acceptance evidence)
- **Format + location:** Labeled **JSON fixtures under `test/fixtures/eval/`**, each `{ name, signal, phase, scopeConfig, expectedRuleIds }`, run against a **controlled `eval-rules/` corpus** (a dedicated fixture rule store, not the live `aidlc-rules/`, so ground truth is stable).
- **Coverage (starter set):** At least one case per severity; each trigger axis (taskType, keywords, paths); an `exclude` carve-out; empty-triggers/always-in-phase; out-of-phase skip; domain gating (out-of-scope); and a precedence/superseded collision.
- **Recall is build-gated:** A test asserts **100% recall on `critical`** rules plus a stated **`high` threshold (≥90%)**, and **fails the build** otherwise. This is the concrete guard on the core value (under-injection is the #1 risk).
- **Precision reported, only recall gated:** The harness reports precision + per-severity recall for observability, but **only recall is gated** — over-injection (noise) is the acceptable failure mode, under-injection is not. (Gating both was rejected as it would pressure the engine toward under-injection.)

### Claude's Discretion
Left to research/planning within the decisions above:
- Exact `matchedAxis` value vocabulary and precedence when multiple axes match one rule (e.g. report first-matching by a fixed axis order, or all matches) — pick a deterministic, documented rule.
- The per-rule token overhead constant and whether the budget estimate includes the `id`/severity framing Phase 3 will add around each summary — align with Phase 3's planned injection shape.
- The exact `high`-recall threshold number (≥90% suggested) and how ties/empty-expected cases are scored in the precision/recall math.
- Internal module layout (single `select.ts` vs. split matcher/observability/budget modules) and how the eval harness is invoked (dedicated `node:test` file vs. a `governance eval` subcommand) — planner picks; keep the core a pure function regardless.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/types.ts`** — the format contract is already defined and inherited verbatim: `Triggers` (multi-axis, optional `exclude`), `TriggerExclude`, `TaskType`, `Severity`, `Phase`, `Scope`, `RuleIndexRecord`, `RuleIndex`, `SupersededRecord`. Phase 2 adds `TaskSignal`, `SelectionResult`, and skip-reason types alongside these — it does not redefine the rule shapes.
- **`src/index/build.ts` + `src/rules/load.ts` + `src/rules/scope.ts`** — the index builder, loader, and scope/precedence resolver. `rule-index.json` (with `superseded` records already populated by D-11) is the artifact the selector reads. Precedence is already resolved at build time, so the selector consumes winners directly and treats losers as `superseded` skips.
- **`src/cli/index.ts` + `src/cli/commands/build-index.ts`** — the CLI dispatch pattern (`governance <subcommand>`). `governance select` is a new sibling command following the same structure; unknown-subcommand exit-2 handling is established.
- **`src/schema/validate.ts`** — Ajv (draft 2020-12) validation harness pattern, reusable if the selector validates its JSON input against a `TaskSignal` schema.

### Established Patterns
- **CommonJS + `tsc`-only build**, Node ≥22, dual `tsconfig.json`/`tsconfig.build.json` (src compiled to `dist/`, tests to `dist-test/`), `node --test` runner. `governance` CLI runs via `bin/governance.cjs`.
- **Deterministic, explainable matching** — no embeddings, no `Math.random`, no time-based behavior in core logic. Every selection/skip decision must be reconstructable for audit (this is why `select()` is a pure function).
- **Fail-loud** — the token-budget overflow follows the Phase 1 fail-loud stance (loud signal + non-zero exit, not silent degradation). CR-01's lesson (narrow error swallowing) applies: don't mask a real failure as an empty/clean result.
- **TDD + MVP mode** — this phase is `mode: mvp` with TDD enabled; behavior-adding tasks follow RED→GREEN with a `test(02-...)` commit before the implementation commit. The eval set and invariants are explicitly test-first.

### Integration Points
- **Reads:** `rule-index.json` (Phase 1 output) — the sole rule source. The selector must tolerate the real index shape including `superseded` arrays.
- **Feeds:** Phase 3 injection (SEL-02/SEL-03) consumes the *selected* records' summaries; Phase 5 audit (AUDIT-01/02) consumes the full selected+skipped output with reasons. The output JSON contract is the integration surface for both — design it as the stable artifact those phases read.
- **CLI seam:** `governance select` extends the existing subcommand dispatch; Phase 4 later invokes selection from the GSD capability at the discuss/execute gates.

</code_context>

<specifics>
## Specific Ideas

- **Recall over precision is the through-line** (inherited from Phase 1's specifics): every tie-breaker favors firing a rule over staying quiet. The build-gated 100% `critical` recall test is the concrete enforcement of this — it is the single most important test in the milestone.
- **The eval set IS the acceptance evidence** for the core value. SEL-06 (the standing harness over time) is v2; what lands here is the labeled *set* + a one-shot recall/precision measurement that gates the build. Keep the corpus controlled and stable so ground truth doesn't drift.
- **Skip reasons are not throwaway** — they are the seed of Phase 5's AUDIT-02 skip enum. Align the four reasons now (`out-of-phase | out-of-scope | out-of-scope-by-trigger | superseded`) so Phase 5 inherits them rather than re-deriving.
- Stay recognizably close to the AI-DLC corpus model established in Phase 1 (scope tiers, domain subdivision, summary/detail split).

</specifics>

<deferred>
## Deferred Ideas

- **Summary length cap** — raised in Phase 1 as a possible format constraint to keep injected summaries within budget. Still not adopted as a hard schema rule; the token budget (SEL-05) handles overflow at selection time instead. Revisit only if authors routinely trip the budget.
- **Live GSD-state phase/signal derivation** — auto-deriving `--phase` and the task signal from STATE.md / the current task rather than passing them explicitly. Owned by Phase 4 (capability wiring at the discuss/execute gates); Phase 2 stays explicit-input.
- **Standing selection-quality harness (SEL-06)** — trend recall/precision over time against a growing corpus. Explicitly v2; do not build the standing harness here, only the one-shot gated eval.
- **Weighted / ranked selection** — ordering selected rules by severity or match strength beyond the stable-ordering invariant. Not required by any v1 criterion; keep ordering deterministic and simple (stable sort by a fixed key).

</deferred>

---

*Phase: 2-Selection Engine*
*Context gathered: 2026-07-05*
