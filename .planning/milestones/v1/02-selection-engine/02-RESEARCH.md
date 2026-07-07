# Phase 2: Selection Engine — Research

**Researched:** 2026-07-05
**Phase goal:** Given a task's signals plus the current phase and scope config, the engine deterministically returns exactly the matching rules with a reason for each, proven against a labeled eval set and held within a per-request token budget.
**Requirements:** SEL-01 (deterministic trigger+scope+phase matching with reasons), SEL-04 (selection observability — why each candidate selected/skipped), SEL-05 (per-request token budget with loud overflow signal).

> **Authoring note:** written by the orchestrator after the researcher subagent confirmed the investigation (stack already installed from Phase 1, library behaviors verified by direct execution, Phase 1 codebase read) but was truncated before persisting. Content is grounded in the actual Phase 1 source (`src/types.ts`, `src/index/build.ts`, `src/rules/scope.ts`, `src/cli/index.ts`, `src/index/no-body.property.test.ts`) and the locked CONTEXT.md decisions.

---

## 1. Matching Algorithm Mechanics

The selector is a **pure function** `select(index: RuleIndex, signal: TaskSignal, config: SelectionConfig): SelectionResult`. It reads `rule-index.json` (Phase 1's `RuleIndex` — winners already resolved, losers carried as `superseded`) and classifies **every** record as selected or skipped.

### Per-rule decision pipeline (order matters — first failing gate wins the skip reason)

For each `RuleIndexRecord` in `index.rules`, evaluate gates in this fixed order so the skip reason is deterministic and matches AUDIT-02:

1. **Phase gate** → if `signal.phase` ∉ `record.phases` (and `record.phases` doesn't contain `common`) → skip `out-of-phase`.
2. **Scope gate** → if `record.scope` is `domain` and its domain is not in `config.domains` → skip `out-of-scope`. (`enterprise` and `project` are always in-candidate-set; only `domain/<name>` is subscription-gated per CONTEXT.md.)
3. **Trigger gate** → evaluate `record.triggers` against `signal` (rules below). If no positive axis matches, OR an `exclude` sub-rule fires → skip `out-of-scope-by-trigger`.
4. **Superseded** → a record carrying provenance it *lost* is never in `index.rules` (Phase 1 keeps only winners; losers live under the winner's `superseded[]`). Emit those `superseded` entries as skipped rules with reason `superseded` by iterating each winner's `superseded[]` array. (They are not re-matched — they lost precedence at build time; D-11.)
5. Otherwise → **selected**, recording the matched axis + value.

### Trigger matching semantics (inherited verbatim from Phase 1 D-01..D-04)

- **Multi-axis OR-combine (D-02):** a rule fires if ANY populated positive axis matches. `taskType` OR `keywords` OR `paths`.
- **Empty triggers = always-in-phase (D-03):** `triggers: {}` (no positive axis populated) matches every signal whose phase+scope already passed. Record `matchedAxis: "always-in-phase"`. **Critical rules use this as the never-miss escape hatch — do not treat empty as "never fires."**
- **`exclude` wins (D-02):** if `triggers.exclude` is present and any of its sub-axes matches the signal, the rule is excluded regardless of positive matches → skip `out-of-scope-by-trigger`. Evaluate exclude AFTER confirming a positive match (so the skip reason distinguishes "never matched" from "matched-then-excluded" — consider a distinct sub-note in the reason detail, but keep the enum value `out-of-scope-by-trigger`).
- **Per-axis match rules (D-04):**
  - `taskType`: **enum equality** — `signal.taskType === member` for any member of `record.triggers.taskType[]`.
  - `keywords`: **case-insensitive substring** — normalize both sides (lowercase, trim); a keyword matches if any `signal.keywords[]` entry contains the trigger keyword as a substring, or vice-versa per the locked rule ("substring on the normalized task signal"). Pin the direction explicitly in the plan: **trigger keyword is a substring of a normalized signal keyword** (the signal is the free text, the trigger is the needle).
  - `paths`: **picomatch globs** — `picomatch(triggerGlob)(signalPath)` for any `signal.paths[] × record.triggers.paths[]` pair. Use `picomatch` (locked, 4.0.5) exactly as Phase 1 uses it for scope globs.

### Determinism traps (SEL-01 criterion 1 — identical inputs → identical output)

These are the concrete ways a selector goes nondeterministic; the plan must forbid each:

- **No `new Date()` / timestamps in the selection output.** `build.ts:68` uses `new Date().toISOString()` for the index's `generatedAt` — that is fine for the index artifact but the **selection result must contain no clock value**. If a runId/timestamp is wanted for audit, it must be injected by the caller, never generated inside `select()`.
- **No `Math.random`, no `Set`/`Map` iteration reliance for output ordering.** Build arrays explicitly and sort by a stable key.
- **Stable ordering (criterion 5 invariant):** sort `selected` and `skipped` arrays by a deterministic key — recommend `(severityOrdinal, id)` or simply `id` ascending. Document the exact sort. `index.rules` order from Phase 1 is already deterministic (built from a sorted load + precedence map) but the selector should not *depend* on upstream order — sort its own output.
- **Object key order:** never serialize matched-axis detail by spreading an object whose key order is input-dependent; construct result records field-by-field (mirror `toRecord` in `build.ts:28`, the whitelist pattern).
- **picomatch determinism:** picomatch is pure/deterministic for a given pattern+string; safe. Compile matchers once per unique glob if optimizing, but correctness does not depend on it.

---

## 2. Labeled Eval Set + Recall/Precision Methodology (the load-bearing, flagged-novel piece)

This is where under-injection (the #1 project risk) is caught. STATE.md flagged the methodology + `critical`-recall threshold as novel and load-bearing.

### Corpus and fixtures

- **Controlled `eval-rules/` corpus** — a dedicated fixture rule store under `test/fixtures/eval/` (NOT the live `aidlc-rules/`), so ground truth is stable and won't drift when someone edits a real rule. Build its index once per test run via the existing `buildIndex(fixtureRoot)` (reuse — do not hand-write a `rule-index.json`).
- **Labeled cases** — JSON fixtures, each: `{ name, signal: {taskType, keywords, paths}, phase, scopeConfig: {domains}, expectedRuleIds: string[] }`. Store as a JSON array or one file per case under `test/fixtures/eval/cases/`.

### Recall/precision math (multi-label, per case then aggregated)

For each case, with `S` = set of selected rule ids, `E` = expected rule ids:

- **True positives** `TP = |S ∩ E|`, **False positives** `FP = |S \ E|`, **False negatives** `FN = |E \ S|`.
- **Recall** = `TP / (TP + FN)` = `|S ∩ E| / |E|` (undefined when `E` is empty — see ties/empty below).
- **Precision** = `TP / (TP + FP)` = `|S ∩ E| / |S|` (undefined when `S` is empty).

**Aggregation:** compute **micro-averaged** recall/precision across all cases (sum TP/FP/FN across cases, then divide) — micro handles the multi-label, variable-cardinality shape better than macro and won't let a single tiny-expected case dominate. Report macro too if cheap, but gate on micro.

**Severity-scoped recall (the gate):** partition expected rules by the winning rule's `severity`. Compute recall over only `critical` expected rules across all cases, and separately over `high`. The gate:
- **100% recall on `critical`** — a test asserts `criticalRecall === 1.0` and **fails the build** otherwise. This is the single most important test in the milestone.
- **`high` recall ≥ 0.9** (stated threshold from CONTEXT.md) — assert and fail below.
- **Precision is reported, never gated** — over-injection is the acceptable failure; gating precision would pressure the engine toward under-injection (explicitly rejected in CONTEXT.md).

### Ties / empty-expected scoring

- **Empty `expectedRuleIds`** (a signal that legitimately matches no rule): recall is vacuously satisfied (define `recall = 1` when `E` is empty so it doesn't drag the aggregate); precision penalizes any selection (`FP > 0` → precision < 1). Include at least one empty-expected case to prove the engine can stay silent.
- **Empty selection with non-empty expected** = the catastrophic under-injection case → recall < 1 → gate fails loudly. This is exactly what the gate exists to catch.
- Do the severity partition on **expected** rules (ground truth), not selected, so a missed critical rule counts against critical recall.

### Coverage the starter set needs to be credible

At minimum one case each for: every severity (`critical`/`high`/`medium`/`low`); every trigger axis (taskType-only, keywords-only, paths-only); a multi-axis OR case; an `exclude` carve-out (rule that would match but is excluded); empty-triggers/always-in-phase (a critical rule that must fire for an unrelated signal in-phase); out-of-phase skip; domain gating (out-of-scope, domain not subscribed); a precedence/superseded case (project overrides enterprise; loser reported `superseded`); and an empty-expected silent case. ~10–14 cases is credible v1 acceptance evidence. (SEL-06, the *standing* harness over time, is explicitly v2 — only the labeled set + one-shot gated measurement lands here.)

---

## 3. Token-Budget Estimation (SEL-05)

- **Estimator:** `estimateTokens(text) = Math.ceil(text.length / 4)` — deterministic, zero-dep, documented as an estimate (CONTEXT.md locked char/4 over a real tokenizer for determinism + auditability + zero-dep).
- **What counts:** sum over **selected** rules of `estimateTokens(summary) + PER_RULE_OVERHEAD`. `PER_RULE_OVERHEAD` is a small fixed constant (recommend ~4–8 tokens) approximating the `id`/severity framing Phase 3 will wrap each summary in. Leave the exact constant to the planner but single-source it as a named constant, and note in the plan that Phase 3's actual injection framing may refine it (Claude's-discretion item in CONTEXT.md).
- **Default budget:** `2000` tokens; read from `config.json` `governance.token_budget`; `--budget <n>` overrides per-run. Resolsolution order: CLI flag → config → default 2000.
- **Overflow = loud signal, never truncate:** when the selected sum exceeds budget, set `result.budgetExceeded = true`, populate `result.budget = { used, limit, offenders: string[] }` (offenders = selected rule ids, or the marginal ones), and the CLI **exits non-zero** with a stderr message. **Never drop/truncate a selected rule to fit** — that could drop a critical rule (the top risk). Truncation was explicitly rejected. The pure `select()` still returns the full result with the flag set; the *CLI wrapper* is what maps `budgetExceeded` → non-zero exit (keeps the core pure and testable).
- **Test that trips it (criterion 4):** a fixture whose selected summaries deterministically exceed a small `--budget` asserts `budgetExceeded === true` and a non-zero CLI exit.

---

## 4. fast-check Property Tests

Phase 1 established the working patterns in `src/index/no-body.property.test.ts` — follow them exactly:

- **Import form (the CJS/nodenext interop that Phase 1 proved green):** `import * as fc from "fast-check";` — NOT a default import. This is the resolution to the interop issue; `esModuleInterop`/`nodenext` makes the namespace import the reliable form.
- **No `fc.hexaString`** — it does not exist in fast-check 4.8.0. Use `fc.stringMatching(/^[a-z0-9]{4,12}$/)` for clean token generation (as `no-body.property.test.ts:76` does).
- **Generators:** `fc.record<T>({...})`, `fc.array(gen, { minLength, maxLength })`, `fc.constantFrom(...)` for enums (taskType/severity/phase), `fc.assert(fc.property(...), { numRuns: 30 })` to bound exploration.

### Properties to assert (criterion 5)

1. **`selected ⊆ triggered`** — every rule in `result.selected` must have passed phase+scope+trigger gates. Concretely: for any generated corpus+signal, no selected rule has a skip reason, and each selected rule genuinely satisfies its trigger axes (re-derive independently in the test and assert subset). This is the anti-over-selection invariant.
2. **Stable ordering** — running `select()` twice on the same (index, signal, config) yields byte-identical `JSON.stringify(result)` (determinism). And the output arrays are sorted by the documented key.
3. **Total accounting** — `|selected| + |skipped| === |index.rules| + Σ superseded` (every candidate is accounted for exactly once — SEL-04 observability invariant; guards against a rule silently vanishing).
4. **Exclude-wins** — a generated rule with a matching positive axis AND a matching exclude axis is always skipped `out-of-scope-by-trigger`.

Generate arbitrary corpora by writing temp `.md` rule files and running the real `buildIndex` (as `no-body.property.test.ts` does) so the property exercises the real load→index→select path, not synthetic records.

---

## 5. CLI + Pure-Function Structure

- **Extend the existing dispatch** (`src/cli/index.ts:16`): the `select` case is already stubbed as a comment (`// Phase 2: case "select" → ./commands/select.js`). Add `case "select": return (await import("./commands/select.js")).run(rest);` — lazy import matches the established pattern.
- **`src/cli/commands/select.ts`** — thin wrapper: parse flags with `node:util` `parseArgs` (mirror `build-index.ts`: `--index` path default `rule-index.json`, `--input` path for signal JSON, `--phase`, `--budget`, `--format json|text` default `json`, `--domains` comma-list). Read signal from `--input <file>` or stdin. Call the pure core. Serialize result to stdout. Map `budgetExceeded` → `process.exit(1)`. Unknown flag → fail loud (`allowPositionals: false`, as build-index does).
- **Pure core** in `src/select/select.ts` (new dir): `select(index, signal, config)` — no I/O, no clock, no randomness. The eval harness imports this directly and feeds fixtures programmatically (why JSON-in + pure fn was chosen over CLI-flags-primary).
- **New types** (add to `src/types.ts` alongside the Phase 1 set, do not redefine): `TaskSignal`, `SelectionConfig`, `SkipReason` (union of the 4 enum strings), `SelectedRule`, `SkippedRule`, `SelectionResult`.
- **Input validation:** consider an Ajv schema for `TaskSignal` (reuse `src/schema/validate.ts` draft-2020-12 harness) so a malformed `--input` fails loud rather than silently selecting nothing — a silent empty selection is an under-injection footgun. Recommend a `task-signal.schema.json`.

---

## Validation Architecture

Testable validation dimensions for this phase (feeds the Nyquist VALIDATION.md / plan `must_haves`):

| Dimension | What it proves | How it's tested |
|-----------|----------------|-----------------|
| **Determinism** | Identical (index, signal, config) → identical output | Repeated-run test asserts byte-identical `JSON.stringify`; property test #2 |
| **Recall (critical)** | No `critical` rule is ever under-injected | Eval-set test asserts `criticalRecall === 1.0`, fails build otherwise (the core-value gate) |
| **Recall (high)** | `high` rules meet stated threshold | Eval-set test asserts `highRecall >= 0.9` |
| **Precision reporting** | Over-injection is measured (not gated) | Eval harness reports micro precision; no assertion gate |
| **Observability** | Every candidate is selected or skipped with a reason | Total-accounting property #3; output-shape test asserts each record has a reason from the enum |
| **Skip-reason correctness** | Each skip carries the right enum value in gate order | Per-reason unit tests: out-of-phase, out-of-scope, out-of-scope-by-trigger, superseded |
| **Trigger semantics** | OR-combine, exclude-wins, empty=always, per-axis rules | Unit tests per D-04 axis + property #1 (selected⊆triggered) + #4 (exclude-wins) |
| **Token budget** | Loud signal on overflow, never truncates | Budget-trip test asserts `budgetExceeded` + non-zero CLI exit; a passing case asserts no false trip |
| **Scope subscription** | Non-subscribed domains skipped `out-of-scope`; enterprise/project always candidate | Domain-gating eval case + unit test |
| **Purity** | Core has no clock/random/IO | Code review + determinism test (a clock in output would break repeated-run equality) |

---

## Pitfalls Summary (planner must guard each)

1. **Clock in output** — `select()` must not call `new Date()`; only the caller may stamp time. (build.ts does it for the index; the selector must not.)
2. **Empty triggers misread as "never fires"** — it means always-in-phase (D-03); getting this wrong silently drops critical rules.
3. **Gating precision** — do not; gate recall only.
4. **`fc.hexaString`** — doesn't exist in 4.8.0; use `fc.stringMatching`.
5. **Default import of fast-check** — use `import * as fc`.
6. **Truncating to fit budget** — never; flag + non-zero exit only.
7. **Depending on upstream index order** — sort the selector's own output.
8. **Silent empty selection on malformed input** — validate the signal, fail loud.
9. **Superseded rules re-matched** — they lost at build time; emit them as `superseded` skips from each winner's `superseded[]`, don't re-run matching on them.

## RESEARCH COMPLETE
