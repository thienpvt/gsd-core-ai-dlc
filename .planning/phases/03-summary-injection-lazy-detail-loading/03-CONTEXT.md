# Phase 3: Summary Injection & Lazy Detail Loading - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase **completes the anti-bloat mechanism** — the project's core value. It has two halves: (1) a **summary injector** that renders only the selected rules' summaries into a `<governance>` context fragment for a governed task (never full bodies), and (2) a **lazy detail loader** — `governance rule-detail <id>` — that fetches exactly one full rule body on demand by id. Together with Phase 2's selector, this is the end-to-end "index → select → inject summaries → load one body when needed" loop that proves the premise: enough governance in-context to be safe, little enough to avoid bloat.

Covers requirements **SEL-02** (inject only summaries, never full bodies, into the working context) and **SEL-03** (load a single full rule body on demand by id when a summary is insufficient). This is also where Phase 1's **deferred `detailPath` decisions D-06/D-07/D-08** finally land, and where the Phase 1 code-review Info finding **IN-05** (detailPath needs an absolute-path/`..`-traversal guard) is resolved — Phase 3 is the first phase that actually resolves and opens a `detailPath`.

**In scope:** the pure `renderInjection(result)` function + `governance inject` CLI wrapper; the `<governance>` markdown fragment format; `governance rule-detail <id>` and its detailPath resolver (relative-to-rule-file, build-time validation, traversal guard); the fast-check no-body-leak property over the rendered fragment; the injector's handling of Phase 2's `budgetExceeded` signal.

**Out of scope (belongs to later phases):** wiring injection into GSD's actual discuss/execute gates and injecting into otherwise-empty subagent contexts (Phase 4 — GATE-01/GATE-02); persisting governance/selection state to `.planning/governance/` (Phase 4 — ENF-01); the audit-artifact writer (Phase 5 — AUDIT-01/02); any enforcement-contract resolution (v2 — ENF-02/03/04). Phase 3 produces the fragment and the on-demand body; *who calls it and where the output goes* is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Summary injection — fragment shape & source (SEL-02)
- **Consumes the Phase 2 `SelectionResult` directly.** The injector takes the `SelectionResult` (whose `selected[]` already carries each rule's `summary`) and renders it. It has **NO body-read code path at all** — it never opens a rule file or a detail file — so summary-only injection is structural/by-construction, not merely tested. (Chosen over "re-read the index by selected ids": adding any file-read path to the injector would reintroduce a body-leak surface the whole design avoids.)
- **Fragment format:** a single tagged **`<governance>` markdown block**, one entry per selected rule. (Chosen over a plain bullet list or JSON: a tagged block is greppable, unambiguous to strip/replace when re-injected, and reads naturally in an LLM working context.)
- **Per-rule fields in the fragment:** `id` + `severity` + `summary` + a **`governance rule-detail <id>` hint** (so the reader knows how to pull the full body on demand). **Skip reasons are excluded** from the injection fragment — they are audit-trail data (Phase 5 AUDIT-02), not working-context guidance; including them would add bloat with no in-task value.
- **CLI surface:** a pure **`renderInjection(result: SelectionResult): string`** function plus a **`governance inject`** CLI wrapper that reads the select output via stdin or `--input <file>` and writes the fragment to stdout — mirroring the `governance select` structure (pure core + thin CLI). (Chosen over folding into `select --format inject`: keeping `inject` separate preserves the pure-function/CLI split and lets Phase 4 call `renderInjection` programmatically without re-running selection.)

### Lazy detail loader `rule-detail <id>` (SEL-03 + D-06/D-07/D-08 + IN-05)
- **D-06 — summary-only rule (no `detailPath`):** `governance rule-detail <id>` returns the rule's **`summary` plus a clear "no separate detail file" signal**. A rule whose summary fully expresses it needs no detail file; this is not an error. (Matches AI-DLC, where details are conditionally referenced.)
- **D-08 — resolution base:** a `detailPath` resolves **relative to the declaring rule file's directory** (e.g. rule at `enterprise/security/auth.md` with `detailPath: details/auth.md` → `enterprise/security/details/auth.md`). Survives relocating a whole pack subtree.
- **D-07 — missing/unresolvable target = loud failure at build/index time.** When a rule names a `detailPath`, the target's existence is validated at **index-build time** (extending Phase 1's `buildIndex`), failing loudly with the rule id + bad path — consistent with Phase 1's fail-loud stance (catches typos/moved files at author time, not at executor-request time). `rule-detail` at fetch time also fails loudly if the target is somehow missing, but the build-time check is the primary guard.
- **SEL-03 — genuine lazy load:** `rule-detail <id>` reads **only the one requested id's** detail file (or returns its summary for a D-06 rule); it **never pre-fetches any other rule's body**. Verifiable by a test asserting only the requested file is opened.
- **IN-05 — traversal guard (security):** the detailPath resolver **rejects an absolute path and any `..` segment that escapes the rule-pack root**, failing loudly. A `detailPath` is author-controlled but must never be able to point outside the pack (e.g. `../../etc/passwd`). Enforced both at build-time validation and at fetch time.

### Anti-leak proof, token budget & output
- **Success-criterion-3 property test:** a **fast-check property over arbitrary generated corpora + selection inputs** asserts the rendered `<governance>` fragment **never contains a rule body canary**, regardless of selection input. Mirrors Phase 1's `no-body.property.test.ts` pattern (`import * as fc`, `fc.stringMatching`, `fc.assert numRuns:30`, real temp `.md` files with per-rule body canaries).
- **Budget interaction (SEL-05):** the injector **honors the `budgetExceeded` flag from the Phase 2 `SelectionResult`** — if selection was over budget, `governance inject` warns and **exits non-zero**, and **never silently emits an over-budget fragment**. The injector does NOT re-compute the budget (that is `select()`'s job); it surfaces the already-computed signal so an over-budget selection cannot silently reach the working context.
- **Output & determinism:** the fragment goes to **stdout**; the `rule-detail` body goes to **stdout**; both are plain, with **no clock / `Math.random` / nondeterminism** (same purity discipline as Phase 2's `select()`).
- **Fragment ordering:** entries are sorted **severity-descending (critical → high → medium → low), then id ascending** within a severity — so the most important rules are most prominent in the working context. (Chosen over keeping `select()`'s id-sorted order: in-context prominence should track severity; deterministic tie-break by id preserves reproducibility.)

### Claude's Discretion
Left to research/planning within the decisions above:
- Exact `<governance>` fragment micro-format (how each entry is laid out — heading vs. bullet, how the `rule-detail` hint is phrased) — pick a clean, greppable, deterministic layout.
- Whether `renderInjection` emits a distinct minimal fragment (e.g. an empty `<governance>` block or a one-line "no rules apply") when `selected[]` is empty — choose a form that is unambiguous and still strippable.
- The precise "no separate detail file" signal wording/format for D-06, and whether `rule-detail` output is plain body text vs. a tiny framed header + body — keep it plain and pipe-friendly.
- Internal module layout (single `inject.ts` vs. split render/detail modules) and where the detailPath resolver lives (shared between build-time validation and fetch-time) — planner picks; keep the injector body-read-free and the resolver single-sourced.
- Whether the severity ordinal is imported from Phase 1's `scope.ts` `ORDINAL`-style constant or re-declared — reuse the existing single source if one exists.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/select/select.ts` + the `SelectionResult` type (`src/types.ts`)** — Phase 2's output is the injector's sole input. `SelectionResult.selected[]` entries carry `{ id, severity, summary, matchedAxis, matchedValue }`; `budget` carries `{ used, limit, offenders }` + the `budgetExceeded` flag. The injector reads these fields only — no file access.
- **`src/rules/load.ts`** — `loadRuleFile(absPath)` parses a rule file and **quarantines the body** (gray-matter `content` is read but never placed on `ParsedRule`). `rule-detail` needs the body, so it will read the file directly (or via a small helper) — this is the ONE place in the codebase that legitimately surfaces a body, and it must stay isolated to `rule-detail`. `findRuleFiles` already skips the `details/` subtree so detail files are never indexed.
- **`src/index/build.ts` `buildIndex`** — extend here for D-07 build-time detailPath validation (validate each rule's `detailPath` resolves to an existing in-pack file before emitting the index). The `toRecord` whitelist already carries `detailPath` into the index record.
- **`src/cli/index.ts`** — dispatch has `rule-detail` stubbed as a comment (`// Phase 3: case "rule-detail" → ./commands/rule-detail.js`). Add `case "inject"` and `case "rule-detail"`, mirroring the lazy-import pattern `select`/`build-index` use. Unknown-subcommand exit-2 handling is established.
- **`src/cli/commands/select.ts`** — the pure-core + `parseArgs` + stdin/`--input` + fail-loud pattern to mirror for `inject` and `rule-detail`.
- **`src/index/no-body.property.test.ts`** — the exact fast-check pattern for the criterion-3 no-leak property (real temp `.md` files, per-rule body canaries, `import * as fc`, `fc.stringMatching`, `numRuns:30`).
- **`src/schema/validate.ts`** — Ajv draft-2020-12 harness, reusable if `inject` validates its `SelectionResult` input.

### Established Patterns
- **CommonJS + `tsc`-only build**, Node ≥22, dual `tsconfig`, `dist-test/` test layout, `node --test` runner, `governance` CLI via `bin/governance.cjs`.
- **Body quarantine (D-05 / PACK-04)** is the load-bearing invariant this phase must not break: the index and now the injection fragment carry summaries + pointers only. The injector achieves this structurally (no read path); `rule-detail` is the sole sanctioned body surface.
- **Deterministic, pure cores** (no clock/random), thin CLI wrappers, **fail-loud** validation. CR-01's lesson (don't swallow real errors as empty/clean) and CR-02's lesson (use `process.exitCode`, not `process.exit()`, so piped stdout isn't truncated) both apply to the new CLI commands.
- **TDD + MVP mode** enabled: behavior-adding tasks follow RED→GREEN with a `test(03-...)` commit before the implementation commit. The no-leak property and the lazy-load assertion are explicitly test-first.

### Integration Points
- **Reads:** the Phase 2 `SelectionResult` (for `inject`) and a single rule file's body (for `rule-detail`). The index's `detailPath` pointer connects a rule id to its detail file.
- **Feeds:** Phase 4 wires `renderInjection` into the discuss/execute gates (GATE-01/02) and injects the fragment into subagent contexts; Phase 5's audit reads selection output (not this fragment). Keep `renderInjection` a pure function callable programmatically by Phase 4.
- **CLI seam:** `governance inject` and `governance rule-detail <id>` extend the existing dispatch; Phase 4 invokes them (or their pure cores) from the GSD capability.

</code_context>

<specifics>
## Specific Ideas

- **The injector having no body-read path is the point** — summary-only injection (SEL-02) should be true by construction, not just by test. The fast-check property is a belt-and-suspenders proof on top of that structural guarantee, mirroring how Phase 1 proved PACK-04 both by whitelist-construction and by property.
- **`rule-detail` is the single sanctioned place a body surfaces.** Everything else in the system (index, selection, injection) is body-free. Keeping that surface isolated to one command with a guarded resolver is what preserves the anti-bloat + no-leak guarantees end-to-end.
- **Recall-over-precision / fail-loud through-line continues:** a missing detailPath target or a traversal-escaping path fails loudly rather than silently degrading; an over-budget selection cannot silently reach the context. Silence in the dangerous direction is the recurring risk this project guards against.
- Stay recognizably close to the AI-DLC corpus model: the summary/detail split (summary in frontmatter, body/detail loaded on demand) is exactly AI-DLC's `aws-aidlc-rules/` vs `aws-aidlc-rule-details/` separation.

</specifics>

<deferred>
## Deferred Ideas

- **Gate wiring / subagent-context injection (GATE-01/GATE-02)** — where the rendered fragment actually gets injected in GSD's discuss/execute loop and into empty subagent contexts. Owned by Phase 4; Phase 3 only produces the fragment.
- **Governance-state persistence (ENF-01)** — persisting selection/injection decisions to `.planning/governance/`. Phase 4.
- **Body/detail checksum in the index** — storing a hash of the detail file so a stale/edited detail is detectable (raised in Phase 1). Still out of scope; the build-time existence check (D-07) is the v1 guard, not content integrity.
- **detailPath content validation beyond existence** — e.g. requiring the detail file itself be well-formed Markdown or carry a matching heading. Out of scope; v1 validates existence + in-pack containment only.
- **Multi-body / batch detail fetch** — `rule-detail` deliberately loads exactly one id (SEL-03 lazy guarantee). A batch fetch would reintroduce bloat and is explicitly not built.

</deferred>

---

*Phase: 3-Summary Injection & Lazy Detail Loading*
*Context gathered: 2026-07-05*
