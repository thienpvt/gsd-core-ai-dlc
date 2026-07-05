# Phase 1: Rule-Pack Format & Index - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two things: the **authoring format** for governance rules (Markdown + YAML frontmatter) and the **index compiler** that produces `rule-index.json`. It is the root of the dependency spine — the selection engine (Phase 2), summary/lazy injection (Phase 3), and audit writer (Phase 5) all inherit the shapes locked here.

Covers requirements PACK-01 (frontmatter format), PACK-02 (scopes + precedence), PACK-03 (advisory/binding classification), PACK-04 (compact index with summaries + pointers, never bodies).

**In scope:** the frontmatter schema and its validation; the on-disk rule store layout across enterprise/domain/project scopes; scope precedence + override resolution; the index-builder CLI that emits `rule-index.json`.

**Out of scope (belongs to later phases):** the selection algorithm itself (Phase 2), summary injection + `rule-detail` lazy loader (Phase 3), GSD capability wiring + disk-backed governance state (Phase 4), the audit artifact writer (Phase 5), and any real enforcement-contract resolution/registry (v2 — ENF-02/03/04).

</domain>

<decisions>
## Implementation Decisions

### Trigger model (feeds PACK-01 schema + Phase 2 selector)
- **D-01:** `triggers` is a **structured multi-axis object**: `triggers: { taskType: [...], keywords: [...], paths: [...] }`. Not a flat keyword list. This maximizes recall (a critical rule has multiple independent ways to fire) and makes the audit reason name which axis matched.
- **D-02:** Axes combine with **OR across populated axes** (taskType OR keywords OR paths; any member within an axis matches), plus an **optional `exclude` block**. Exclusion wins over any positive match — lets authors carve out known false-positives (e.g. exclude `**/*.test.*`) without sacrificing recall. AND-across-axes was rejected as it worsens the #1 under-injection risk.
- **D-03:** An **empty (no-axis-populated) `triggers` block means always-in-phase** — the rule fires for every task whose `phases` + scope match. This is the deliberate escape hatch: a `critical` rule writes empty triggers to guarantee it never misses within its phase/scope. Phase + scope still bound it, so it is not literally global. (Chosen over "empty = build error" and "empty = never fires"; the latter is a silent footgun feeding under-injection.)
- **D-04:** Per-axis match semantics: `taskType` = **enum equality**; `paths` = **picomatch globs** (matches the CLAUDE.md scope-selector choice); `keywords` = **case-insensitive substring** on the normalized (lowercased, trimmed) task signal. Substring chosen over whole-token/regex because over-injection is the cheaper failure than under-injection, and substring stays fully deterministic + auditable.

### Summary vs detail (sets the Phase 3 lazy-load boundary)
- **D-05:** Full detail lives in a **separate detail file** (mirrors AI-DLC's `aws-aidlc-rules/` vs `aws-aidlc-rule-details/` split). `summary` stays in frontmatter (already PACK-01); `detailPath` points to a separate `.md`. This keeps the index reading frontmatter only and never emitting bodies (PACK-04 holds).
- **D-06:** `detailPath` is **optional** — a rule whose `summary` fully expresses it needs no detail file. `rule-detail <id>` (Phase 3) on a summary-only rule returns the summary itself or a clear "no detail" signal. Matches AI-DLC, where details are *conditionally* referenced.
- **D-07:** When a rule **does** name a `detailPath`, a missing/unresolvable target is a **loud build failure** (reports rule id + bad path). Consistent with PACK-03's fail-loud-not-silent stance; catches typos/moved files at author time rather than at executor-request time.
- **D-08:** `detailPath` resolves **relative to the declaring rule file** (e.g. rule at `enterprise/security/auth.md` with `detailPath: details/auth.md` → `enterprise/security/details/auth.md`). Survives relocating a whole pack subtree; matches `$ref`/import conventions.

### Store & scope (feeds PACK-02 + index builder layout)
- **D-09:** **Directory location is the source of truth for scope.** A rule's scope comes from which top-level tier it sits in; the frontmatter `scope` field is validated against the directory and the build fails on mismatch. No drift, scope is greppable by path, precedence maps to directory. (Matches ESLint/Prettier positional-config convention.)
- **D-10:** Store lives at **`aidlc-rules/` at repo root** (mirrors the AI-DLC corpus name). Three scope tiers: `enterprise/`, `domain/<name>/` (subdivided by domain — e.g. `domain/security/`, `domain/payments/`), `project/`. Detail files under `<scope>/.../details/`. The `domain/<name>/` layout is what Phase 2's scope-glob matching (`project:payments-*`) globs against.
- **D-11:** Same-`id` collision across scopes resolves by **full replacement** — the higher-scope rule (project > domain > enterprise) wins whole, using its fields verbatim; no field-level merge. The loser is **recorded in the index as `superseded`** (not dropped), which feeds Phase 5's skip-reason enum. Cleanest audit story: one winner, one reason, loser still traceable. (Field-level merge rejected — produces composite rules no single file describes.)
- **D-12:** `id` is an **author-defined slug**, globally unique across the store (e.g. `require-mfa`, `no-plaintext-secrets`). A **duplicate id within the same scope fails the build**; the **same id across scopes is the intentional override signal**. Slug chosen over path-derived id (which would break the override model by giving each scope a different id) and over slug+namespace (mental-model tax for no gained capability).

### Severity & binding (feeds PACK-03 + Phase 2 recall threshold)
- **D-13:** `severity` enum is **`critical | high | medium | low`**. Matches the SAST/scan tools CLAUDE.md names (bandit/checkov/grype) and the roadmap's existing `critical`/`high` language. Phase 2 targets 100% recall on `critical`, with `high` a second stated threshold.
- **D-14:** `severity` and the **`advisory`/`binding` classification are independent axes** — separate required fields, freely combined. A `critical` rule can be `advisory` (strong guidance, no automated gate yet); a `low` rule can be `binding` (trivial but auto-enforceable). Matches how lint/scan ecosystems separate importance from enforcement. PACK-03's "binding needs a contract" check applies regardless of severity.
- **D-15:** A `binding` rule references an enforcement contract via a **free-form named contract id** — `enforcement: <contract-id>` (e.g. `semgrep:no-eval`, `ci:exit-code`, `human-approval`). The **v1 build rejects a `binding` rule that omits/empties this field** (satisfies PACK-03), but does **not** resolve the id against any registry — resolution is deferred to v2 (ENF-04). Clean v1/v2 seam: v1 enforces "you named a contract"; v2 enforces "the contract exists and ran." (Structured adapter-object and registry-validated options rejected — both pull v2 enforcement design forward into this phase.)

### Claude's Discretion
The following were not explicitly decided and are left to research/planning to resolve within the decisions above:
- The concrete `taskType` enum values (the discussion locked that `taskType` is an enum matched by equality, but not its members).
- What a task "signal" concretely contains at selection time and how `paths` are sourced per task — this is a Phase 2 concern; Phase 1 only defines the axis shape rules match against.
- Whether the frontmatter `phases` field reuses GSD phase identifiers or an AI-DLC Inception/Construction/Operations vocabulary — align with whatever the researcher finds is canonical.
- Exact JSON Schema structuring (single schema vs. per-scope), and whether to author frontmatter parsing via `gray-matter` or GSD's existing `js-yaml` (CLAUDE.md presents both as valid; planner picks).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project governance & requirements
- `.planning/PROJECT.md` — core value (anti-context-bloat), overlay-not-fork constraint, tool-agnostic enforcement boundary, key decisions table.
- `.planning/REQUIREMENTS.md` §"Rule Packs" — PACK-01..04 exact wording; §"v2 Requirements" for ENF-02/03/04 (the deferred enforcement contracts D-15 references).
- `.planning/ROADMAP.md` §"Phase 1: Rule-Pack Format & Index" — goal, the four success criteria this phase is measured against, and the three planned sub-plans (01-01 schema, 01-02 store layout, 01-03 index builder).

### Tech stack & format grounding (in CLAUDE.md project instructions)
- `.claude/CLAUDE.md` §"Recommended Stack" — locked stack: Ajv `8.20.0` + JSON Schema draft 2020-12 (`ajv/dist/2020`), `gray-matter 4.0.3` or GSD's `js-yaml`, `picomatch 4.0.5` for scope/path globs, TypeScript `^6.0.3` + CommonJS + Node `>=22`, `node:test` + `c8` + `fast-check` for tests. Also §"What NOT to Use" (no embeddings, no OPA/CI hard-dep, no forking GSD).
- `.claude/CLAUDE.md` §"Grounding: What Was Actually Observed" — the AI-DLC source corpus structure that D-05 and D-10 mirror: `aws-aidlc-rules/` (core/summary) vs `aws-aidlc-rule-details/` (conditionally-referenced detail); `## Rule <PREFIX-NN>:` + Verification authoring convention; Inception/Construction/Operations phase mapping; in-repo SAST config (`.bandit`, `.checkov.yaml`, `.semgrepignore`, `.grype.yaml`, gitleaks) informing enforcement-contract id naming (D-15).

### External source systems (reference only — not vendored)
- GSD Core — `github.com/open-gsd/gsd-core` — the host runtime this overlays; confirms CommonJS + `tsc`-only build + Node 22 engines the format tooling must match.
- AI-DLC Workflows — `github.com/awslabs/aidlc-workflows` — the rule corpus and semantics being adapted; the core-vs-detail split and Markdown rule format.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None yet — greenfield.** The repo currently contains only `.planning/` and `.claude/`. No `package.json`, `src/`, `tsconfig`, ESLint config, or vendored `aidlc-rules/` corpus exists. Phase 1 stands up the project's first source tree and build tooling.
- **GSD Core's own conventions** are the reuse target: match its `tsconfig.build.json` conventions, flat ESLint config, and `run-tests.cjs`/`node:test` runner model rather than introducing new build tooling (per CLAUDE.md "What NOT to Use").

### Established Patterns
- **CommonJS authoring** to match the host runtime (`gsd-tools.cjs` must be able to `require()` extension code without ESM interop).
- **Deterministic, explainable matching** — every selection/precedence decision must be reconstructable for audit; no non-determinism (no embeddings, no `Math.random`/time-based behavior in core logic).
- **Fail-loud validation** — invalid frontmatter, binding-without-contract, missing `detailPath` target, duplicate-id-in-scope, and scope/directory mismatch all fail the index build with a clear error rather than passing silently (D-07, D-09, D-12, D-15).

### Integration Points
- The index builder is expected to be a **CLI subcommand** (roadmap 01-03 says "index-builder CLI subcommand"; Phase 2 later invokes `governance select`, Phase 3 `governance rule-detail <id>`). Phase 1 should establish the CLI entry-point shape these later subcommands extend.
- `rule-index.json` is the **contract artifact** every later phase reads. Its shape (summaries + pointers + `superseded` records, never bodies) is the integration surface for Phase 2 selection and Phase 5 audit.

</code_context>

<specifics>
## Specific Ideas

- The format deliberately **mirrors the AI-DLC source corpus** the user is adapting: separate summary/detail files (D-05), the `aidlc-rules/` store name (D-10), and enforcement-contract ids named after the SAST tools AI-DLC already ships config for (D-15). Downstream work should stay recognizably close to that corpus rather than inventing an unrelated format.
- The recurring design tie-breaker throughout this discussion was **recall over precision** — under-injection (a `critical` rule silently never firing) is the top project risk, so wherever a choice traded breadth of firing against noise, the broader/safer option won (D-02 OR-combining, D-03 empty=always-in-phase, D-04 substring keywords).

</specifics>

<deferred>
## Deferred Ideas

- **Summary length cap for the token budget** — raised as a possible format constraint (bounding each `summary` so injected summaries stay within Phase 2's per-request governance token budget, SEL-05). Not decided; belongs with the Phase 2 token-budget work, not the Phase 1 format.
- **Body/detail checksum in the index** — storing a hash of the detail file so a stale/edited detail is detectable. Interesting integrity feature, out of scope for the v1 format.
- **Project-scope consent flow** — whether project-tier rules require explicit consent before they apply. This is already owned by Phase 4 (`04-03: first-run project-scope consent handling`); noted here so it is not re-litigated in Phase 1.

</deferred>

---

*Phase: 1-Rule-Pack Format & Index*
*Context gathered: 2026-07-05*
