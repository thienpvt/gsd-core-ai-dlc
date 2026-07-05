# Phase 3: Summary Injection & Lazy Detail Loading — Research

**Researched:** 2026-07-05
**Phase goal:** The system injects only selected rule summaries into the working context for a governed task and loads a single full rule body on demand by id, completing the anti-bloat mechanism.
**Requirements:** SEL-02 (inject only summaries, never full bodies), SEL-03 (load a single full rule body on demand by id).

> **Authoring note:** written by the orchestrator, grounded in the actual Phase 1/2 source (`src/types.ts` SelectionResult/SelectedRule, `src/cli/commands/select.ts` CLI pattern, `src/rules/load.ts` body-quarantine, `src/index/build.ts` buildIndex, `src/index/no-body.property.test.ts` fast-check pattern) and the locked 03-CONTEXT.md decisions. Direct-authoring avoids the research-subagent truncation failures seen in Phase 2.

---

## 1. Summary Injection Mechanics (SEL-02)

The injector is a **pure function** `renderInjection(result: SelectionResult): string` with a `governance inject` CLI wrapper. Its defining property: **it has no file-read path at all** — it reads only fields already present on the `SelectionResult`, so summary-only injection is true by construction, not merely by test.

### Input shape (already in `src/types.ts`, no new types needed for the core)
`SelectionResult.selected[]` entries are `SelectedRule`: `{ id, severity, summary, matchedAxis, matchedValue }`. The `summary` is exactly the frontmatter summary — the body was never loaded (quarantined in `load.ts`, absent from the index per PACK-04). So the injector renders `selected[].summary` and cannot emit a body: there is no body in its input.

### Fragment format (03-CONTEXT locked)
A single tagged `<governance>` markdown block, one entry per selected rule. Per-rule fields: `id` + `severity` + `summary` + a `governance rule-detail <id>` hint. **Skip reasons are excluded** (audit-only, Phase 5). Recommended micro-format (Claude's discretion — keep greppable + deterministic):

```
<governance>
Selected governance rules for this task (summaries only — run `governance rule-detail <id>` for the full rule):

- [critical] require-mfa — All privileged access requires multi-factor authentication.
- [high] input-validation — Validate and sanitize all external input at the trust boundary.
</governance>
```

### Ordering (03-CONTEXT locked)
Sort entries **severity-descending (critical → high → medium → low), then id ascending**. Reuse a severity ordinal — Phase 1 declared `ORDINAL` in `src/rules/scope.ts` for precedence (project/domain/enterprise); severity needs its OWN ordinal (`critical=0, high=1, medium=2, low=3`). Check whether `scope.ts` or `types.ts` already exposes a severity ordinal; if not, declare one single-sourced (recommend co-locating with the `Severity` type or in the injector module) and reuse it in tests. Do NOT reuse the scope ORDINAL — different axis.

### Empty selection
When `selected[]` is empty, emit an unambiguous, still-strippable minimal fragment (Claude's discretion): recommend a `<governance>` block with a one-line "No governance rules apply to this task." so the tag is always present and Phase 4's inject/strip logic is uniform. Decide once and test it.

---

## 2. Lazy Detail Loader `rule-detail <id>` (SEL-03 + D-06/D-07/D-08 + IN-05)

`governance rule-detail <id>` is the ONE sanctioned place a rule body surfaces. Everything else (index, select, inject) is body-free.

### Resolution pipeline
1. Read `rule-index.json` (reuse `readIndex` pattern from `select.ts` — `validateIndex` then find the record by `id`). If no record has that id → loud error (`unknown rule id: <id>`), non-zero exit.
2. **D-06 — no `detailPath`:** return the record's `summary` plus a clear "no separate detail file for <id>" signal. Not an error.
3. **D-08 — resolution base:** the record carries `sourceFile` (repo-relative POSIX path to the declaring rule file). Resolve `detailPath` **relative to the declaring rule file's directory**: `path.resolve(path.dirname(sourceFileAbs), detailPath)`.
4. **IN-05 — traversal guard (BEFORE opening):** reject if `detailPath` is absolute (`path.isAbsolute`) OR the resolved target escapes the rule-pack root. Compute the pack root and assert the resolved path is contained: `const rel = path.relative(packRoot, resolved); if (rel.startsWith("..") || path.isAbsolute(rel)) throw`. This mirrors the check the Phase 1 review (IN-05) called for. Loud failure, non-zero exit — never open an out-of-pack path.
5. Read ONLY that one file's body via gray-matter (`matter(raw).content`) and write it to stdout. **SEL-03 lazy guarantee:** never iterate other records, never open any other file.

### D-07 — build-time validation (extend `buildIndex`)
When a rule names a `detailPath`, validate at **index-build time** that the target exists AND passes the same traversal guard, failing loudly with rule id + bad path. This is the primary guard (catches typos at author time); the fetch-time guard is the backstop. Add this to `buildIndex` in `src/index/build.ts` — after the existing scope/precedence validation, before emitting the index. Note: Phase 1's `require-mfa.md` and the eval corpus have NO `detailPath`, so this validation is a no-op on existing rules (backward compatible); add a fixture rule WITH a valid detailPath + detail file to exercise it, and negative fixtures (missing target, absolute path, `..` escape) for the failure tests.

### Determinism trap
`rule-detail` reads a file (its whole purpose) but must stay deterministic in output: no clock, no other-file reads. The lazy-load test asserts exactly one file open for the requested id — consider a test that points at a pack where OTHER rules' detail files don't exist, proving they're never touched (if they were pre-fetched, the run would throw).

---

## 3. Anti-Leak Proof (SEL-02 success criterion 3)

A **fast-check property over arbitrary generated corpora** asserting the rendered `<governance>` fragment never contains a rule body canary, regardless of selection input. Follow `src/index/no-body.property.test.ts` exactly:
- `import * as fc from "fast-check"` (the CJS/nodenext form proven green in Phase 1; NOT a default import).
- No `fc.hexaString` (absent in fast-check 4.8.0) — use `fc.stringMatching(/^[a-z0-9]{4,12}$/)` for tokens.
- Author real temp `.md` rule files with per-rule-unique body canaries (`__BODY_CANARY_i_token__`), run the real `buildIndex` → `select` → `renderInjection` chain, and assert NO canary appears in the rendered fragment. `fc.assert(property, { numRuns: 30 })`.
- Because the injector has no body-read path, this property holds by construction — the test is the belt-and-suspenders proof mirroring how Phase 1 proved PACK-04 both structurally and by property.

The chain to exercise: generate corpus → `buildIndex(tmp)` → `select(index, signal, config)` → `renderInjection(result)` → assert no canary. This also transitively re-proves the index/select stages stay body-free end-to-end.

---

## 4. Token-Budget Interaction (SEL-05 continuity)

The injector does NOT re-compute the budget — it **honors the `budgetExceeded` flag already on the `SelectionResult`** (Phase 2 computed it). In the `governance inject` CLI wrapper:
- If `result.budgetExceeded` is true: write a warning to stderr (naming `result.budget.offenders`), and set `process.exitCode = 1` (NOT `process.exit(1)` — CR-02's lesson: let stdout drain). **Never silently emit an over-budget fragment** — but per the CR-02 pattern, still emit the fragment to stdout so the observable output exists, then fire the non-zero exit. Decide: warn+exit-nonzero WITH fragment emitted (consistent with select.ts's "emit then exit nonzero") is the recommended shape — it surfaces the loud signal without hiding output. Confirm in the plan.
- The pure `renderInjection` core does not know about exit codes; it just renders. The budget→exit mapping lives in the CLI wrapper, mirroring how `select.ts` keeps the core pure and maps `budgetExceeded` to the exit code at the boundary.

---

## 5. CLI + Pure-Function Structure

- **Extend dispatch** (`src/cli/index.ts`): `rule-detail` is already stubbed as a comment. Add `case "inject": return (await import("./commands/inject.js")).run(rest);` and `case "rule-detail": return (await import("./commands/rule-detail.js")).run(rest);` — lazy imports, matching `select`/`build-index`.
- **`src/inject/inject.ts`** (or `src/select/inject.ts` — planner picks; keep body-read-free): the pure `renderInjection(result)` core + the severity ordinal.
- **`src/cli/commands/inject.ts`**: thin wrapper — `parseArgs` (`--input <file>` or stdin for the SelectionResult JSON; `allowPositionals:false`), parse+validate the result (consider an Ajv schema for `SelectionResult`, or a lightweight shape check — a malformed input should fail loud, not silently render nothing), call `renderInjection`, write to stdout, map `budgetExceeded`→`process.exitCode=1`.
- **`src/cli/commands/rule-detail.ts`**: `parseArgs` for `--index <f>` (default `rule-index.json`) + the `<id>` positional (rule-detail is the one command that legitimately takes a positional — allowPositionals:true here, validate exactly one). Reuse `readIndex` (validateIndex). Resolve detailPath (shared resolver), guard traversal, read one body, write to stdout.
- **Shared detailPath resolver**: single-source the resolve+guard logic (used by both build-time validation in `buildIndex` and fetch-time in `rule-detail`). Recommend `src/rules/detail-path.ts` exporting `resolveDetailPath(sourceFile, detailPath, packRoot)` that throws on absolute/escape/missing. Both callers use it.
- Reuse from `select.ts`: `readIndex` (validateIndex + directory→buildIndex fallback), the parseArgs/stdin/`--input` idiom, fail-loud on unknown flags, `process.exitCode` not `process.exit`.

---

## Validation Architecture

Testable validation dimensions for this phase (feeds the Nyquist VALIDATION.md / plan `must_haves`):

| Dimension | What it proves | How it's tested |
|-----------|----------------|-----------------|
| **Summary-only injection (SEL-02)** | Rendered fragment carries summaries, never bodies | fast-check no-body-canary property over arbitrary corpora (criterion 3) + structural: injector has no file-read import |
| **Fragment shape** | `<governance>` block, id+severity+summary+detail-hint per rule, no skip reasons | unit test asserts fragment structure + absence of skip-reason text |
| **Fragment ordering** | severity-desc then id, deterministic | unit test on a mixed-severity selection; repeated-run byte-identity |
| **Lazy load (SEL-03)** | `rule-detail <id>` returns exactly one body, pre-fetches nothing | unit test: only requested id's file opened; other rules' details absent → still succeeds |
| **D-06 summary-only rule** | no-detailPath rule returns summary + clear no-detail signal | unit test on a rule without detailPath |
| **D-08 resolution base** | detailPath resolves relative to declaring rule file | unit test with a rule in a subdir + relative detailPath |
| **D-07 build-time validation** | missing detailPath target fails the build loudly (id+path) | negative fixture: rule names a nonexistent detail file → buildIndex throws |
| **IN-05 traversal guard** | absolute path + `..`-escape rejected loudly | negative fixtures: `detailPath: /etc/passwd` and `../../escape.md` → throw |
| **Budget continuity (SEL-05)** | over-budget selection → inject warns + non-zero exit, never silent | test: a `budgetExceeded:true` result trips non-zero exit from `governance inject` |
| **Purity/determinism** | renderInjection has no clock/random/IO | code review + repeated-run byte-identity |

---

## Pitfalls Summary (planner must guard each)

1. **Adding any file-read path to the injector** — would reintroduce a body-leak surface; the injector must read only `SelectionResult` fields.
2. **`fc.hexaString` / default fast-check import** — use `fc.stringMatching` + `import * as fc` (Phase 1 lesson).
3. **`process.exit()` truncating piped stdout** — use `process.exitCode = 1` (CR-02 lesson) in both new CLI commands.
4. **Pre-fetching other bodies in `rule-detail`** — breaks the SEL-03 lazy guarantee; read only the one requested id.
5. **Skipping the traversal guard before opening detailPath** — an author-controlled absolute/`..` path could escape the pack (IN-05); guard BEFORE `readFileSync`.
6. **Reusing the scope ORDINAL for severity ordering** — wrong axis; declare a severity ordinal.
7. **Silent empty/over-budget fragment** — a malformed inject input or an over-budget selection must fail loud, not render nothing silently (CR-01 lesson: don't mask a real failure as clean/empty).
8. **Duplicating the detailPath resolver** — single-source it so build-time and fetch-time guards can't drift.

## RESEARCH COMPLETE
