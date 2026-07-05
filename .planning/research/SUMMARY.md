# Project Research Summary

**Project:** GSD Governance Overlay (AI-DLC × GSD Core)
**Domain:** Enterprise SDLC governance overlay on an AI-development runtime — indexed, on-demand rule packs with gate checkpoints and audit artifacts
**Researched:** 2026-07-05
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project builds a working GSD Core extension that layers AI-DLC-style enterprise governance (rule packs, compliance gates, audit artifacts) onto GSD's long-running development loop **without polluting the context window**. The way experts build this kind of layer is not by copying a steering corpus into every prompt (AI-DLC's own delivery model, and the exact anti-pattern this project exists to kill) but by indexing rules, selecting only those relevant to the current task and phase, injecting short summaries, and lazily loading full detail only when a decision needs it. The single most consequential research finding — verified by reading GSD Core's installed source, not inferred — is that **GSD already exposes a formal, first-class plugin API**: the Capability Registry / Loop Host Contract (ADR-894, ADR-1244). The overlay ships as a declarative `capability.json` under `.gsd/capabilities/aidlc-governance/`, discovered and merged into the same registry the built-in `security`, `tdd`, and `drift` features use. This is **not a fork, not a monkeypatch, and not a new hook API we invent** — it is data-declared extension against a stable seam, and everything else follows from it.

The recommended approach is to **stay native to GSD's runtime**: CommonJS/TypeScript, Node >=22, `tsc`-only build, `node:test` + `c8` + `fast-check`, reusing `gsd-tools.cjs` and GSD's existing pipeline rather than standing up a second Python/Go toolchain the installer can't manage. Rule packs keep AI-DLC's human-authored Markdown bodies but **add YAML frontmatter** (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`) that AI-DLC lacks, compiled into a generated `rule-index.json`. Selection is **deterministic** — trigger + scope (glob via picomatch) + phase matching over the index — explicitly **not embeddings**, because non-determinism breaks the auditability the whole layer exists to provide. The enforcement boundary is expressed as JSON Schema (draft 2020-12) contracts validated by Ajv, behind a single `GateAdapter` interface with no-op stubs, so no OPA/CI/SAST vendor is baked into core. The built-in `security` capability (a `plan:pre` contribution + a `verify:post` step producing `SECURITY.md` + a `ship:pre` blocking gate via `artifact-frontmatter-equals`) is a working template to mirror as `GOVERNANCE.md` / `rules_open`.

The dominant risk is **under-injection**: the anti-bloat core value structurally biases every design decision toward injecting *less*, which pushes recall down until a critical rule silently never fires — an invisible governance gap where nothing errors and the loop completes green. This is defended with a labeled evaluation set (recall/precision measured against ground truth), severity-gated fail-open for critical rules, and a per-request token budget enforced as a build-breaking regression. Three further risks compound it: **governance theater** (markdown "enforcement" adjudicated only by an LLM — require an advisory/binding split where every binding rule names a real gate), **lost governance state** (GSD's model is state=disk / context=ephemeral / clean subagent contexts, so governance state MUST persist as an append-only ledger in `.planning/` and rules MUST be explicitly injected into subagent contexts), and **audit trust** (applied/skipped/tests-run must be machine-derived from engine/adapter/runner output, with skip-reasons constrained to a machine-checkable enum, never model-narrated). All four risks are addressable by design and each maps cleanly to a specific phase.

## Key Findings

### Recommended Stack

Build a **native Node.js/CommonJS extension inside GSD Core's existing runtime** rather than a separate service. GSD Core is `@opengsd/gsd-core@1.7.0-rc.2`, CommonJS (no `"type":"module"`), Node >=22, `tsc`-only build, custom test runner — and staying in-runtime is the difference between a native extension the installer manages and a second toolchain that breaks `npx @opengsd/gsd-core` distribution. Rule packs are authored as Markdown-with-YAML-frontmatter (AI-DLC bodies + machine-readable metadata AI-DLC lacks), selected deterministically, and gated through engine-neutral JSON Schema contracts. See [STACK.md](STACK.md).

**Core technologies:**
- **Node.js >=22 + CommonJS**: runtime and module format — matches GSD Core's `engines` and CJS shims exactly, so `gsd-tools.cjs` can `require()` the overlay without ESM interop friction.
- **TypeScript ^6.0.3 (tsc-only, no bundler)**: implementation language — GSD is authored in TS and compiled with `tsc`; matching versions/conventions means zero new build tooling.
- **Markdown + YAML frontmatter**: rule-pack format — keeps AI-DLC's `## Rule <PREFIX-NN>` + Verification bodies, adds `id/scope/triggers/phases/severity/summary/detailPath` for programmatic selection.
- **JSON Schema (draft 2020-12) + Ajv 8.20.0**: the tool-agnostic gate/audit contract layer — engine-neutral so any CI/SAST/policy engine can be wrapped; Ajv validates every adapter's output so no adapter can corrupt the audit trail.
- **picomatch 4.0.5**: deterministic glob matching for `enterprise/domain/project` scope selectors — keeps selection explainable for audit.
- **gray-matter 4.0.3**: frontmatter parsing (or reuse GSD's existing `js-yaml` to avoid the dep).
- **node:test + c8 + fast-check ^4.8.0**: tests/coverage/property tests — all already in GSD's pipeline; fast-check is ideal for selection-engine invariants ("selected rules are always a subset of triggered rules"; "summary-only injection never emits a full body").

**Explicitly rejected:** embeddings/vector search (non-deterministic, breaks auditability), OPA/Rego or GitHub Actions as hard dependencies (vendor lock-in), any bundler (GSD ships none), ESM-only authoring, and forking GSD internals.

### Expected Features

The Core Value — a rule selection engine that injects only relevant rule summaries per task/phase — sits in the **differentiator** tier: nobody in the source ecosystem does trigger-based selection (AI-DLC copies the full corpus into context). See [FEATURES.md](FEATURES.md).

**Must have (table stakes — an enterprise won't find the layer credible without these):**
- Rule-pack format with metadata (id, trigger, phase[], severity, scope) — the foundation everything keys off.
- Rule scoping: enterprise / domain / project layers with defined precedence.
- Governance gate hooks at discuss/plan/execute/verify/ship — hooking GSD's existing five gates, not building a loop.
- Audit artifact per governed task (requirements covered, rules applied, rules skipped + reasons, tests, risks, approvals) — persisted to disk.
- Human approval checkpoints recorded in the audit artifact.
- Advisory-vs-enforcement separation (OPA proves this is the standard model).
- Tool-agnostic gate contracts + audit schema (enterprises already own their CI/SAST/policy stacks).

**Should have (differentiators — where the project actually competes):**
- Rule selection engine (task + phase → matching rules only) — THE core value, and the riskiest component.
- Summary-only injection + on-demand lazy detail loading — the anti-bloat mechanism.
- Governance state that survives compaction — most AI-governance tooling is stateless per request.
- Selection observability (why a rule fired / was skipped) — makes "rules skipped + reasons" trustworthy rather than asserted.

**Defer (v2+):**
- Selection quality evaluation *harness as a product* (the eval *set* itself is needed early — see gaps).
- Cross-scope conflict resolution (enterprise vs project overrides) — until multi-scope usage is real.
- Concrete adapter reference implementations (one OPA, one SAST) as examples — stubs only for now.
- Rule authoring UI / marketplace, global "compliance score" — scope traps, explicitly avoided.

### Architecture Approach

The overlay is a **data-declared capability, not a code fork** — this is the load-bearing architectural decision. GSD's `capability-loader.cjs` discovers `<projectRoot>/.gsd/capabilities/aidlc-governance/capability.json`, validates it, and merges it into the live registry; governance gates then fire at the same 12 loop points (`discuss:pre/post`, `plan:pre/post`, `execute:pre/wave:pre/wave:post/post`, `verify:pre/post`, `ship:pre/post`) as built-in features. **GSD fails CLOSED for a skipped capability that declares a gate** — governance-friendly by design. Runtime state lives under `.planning/governance/` (a new subdirectory, sibling to STATE.md/ROADMAP.md) so it survives compaction and doesn't collide with GSD's canonical root artifacts. See [ARCHITECTURE.md](ARCHITECTURE.md).

**Major components:**
1. **Rule-Pack Store** — rule definitions in three scopes (enterprise/domain/project), Markdown + frontmatter.
2. **Index Builder + Rule Index** — scans the store, emits a compact `rule-index.json` (summaries + pointers, never bodies); the searchable projection the selector reads.
3. **Selection Engine** — the core-value linchpin; a pure function (task signals + phase + scope config → rule ids + reasons), trigger + scope + phase matching, testable without I/O.
4. **Summary Injector + Detail Loader** — renders selected summaries into a capability `contribution` fragment; loads full bodies lazily by id.
5. **Gate Hooks (capability.json + fragments)** — the declarative seam binding the above to GSD's 12 points; mirrors the built-in `security` capability's shape.
6. **Audit Writer** — writes `<phase>/GOVERNANCE.md` (gate-checkable frontmatter) + `selection-state.json`, machine-derived.
7. **Enforcement Adapters** — a single tool-agnostic `GateAdapter` contract + no-op stubs (CI/SAST/tests/policy/human), so binding checks route to real gates, not markdown.

### Critical Pitfalls

Top risks, in priority order, each mapped to a defense. See [PITFALLS.md](PITFALLS.md).

1. **Under-injection — a critical rule silently never fires (THE top risk).** The anti-bloat core value structurally pushes recall down; a missed rule is invisible because nothing errors and the audit shows no violation. **Avoid:** treat selection as recall-first for `critical`/`high` severity (broad, fail-open triggers) and precision-first only for `low`; build a labeled (task, phase) → expected-rules eval set *before* the engine and measure recall/precision on every change; keep a small always-on "catch-all" tier for non-negotiables; make "zero rules selected in a governed phase" a loud event.
2. **Over-injection — context bloat returns through the back door.** The natural overcorrection to under-injection; widths only ratchet up and summaries drift longer. **Avoid:** a hard per-request governance token budget enforced in the verify gate as a build-breaking regression; schema-level summary length cap; genuinely lazy detail-loading (never pre-fetch bodies "to be safe").
3. **Governance theater — markdown steering treated as enforcement.** An LLM having *read* a rule is not the control being *enforced*; porting AI-DLC's "blocking by default" phrasing without a real gate imports theater wholesale. **Avoid:** classify every rule `advisory` or `binding` at the schema level; forbid a `binding` rule without a named enforcement contract; the audit must record *who* enforced each binding rule (which adapter returned pass/fail); lint that fails the build when a binding rule points at an unimplemented stub.
4. **Lost governance state across compaction/subagent boundaries (highest-probability integration failure).** GSD's model is state=disk / context=ephemeral / clean-200k subagents; state held in context evaporates. **Avoid:** persist all governance state to an append-only ledger in `.planning/governance/` keyed by task/phase; treat disk as source of truth; explicitly inject selected-rule summaries into subagent contexts (they inherit nothing); test across a forced compaction/subagent boundary.
5. **Audit artifacts that look complete but aren't trustworthy.** An LLM will always produce a plausible skip-reason whether or not one is real; populated fields get mistaken for verified fields. **Avoid:** derive applied/skipped/tests-run from machine facts (selector output, adapter returns, test-runner output); constrain skip-reasons to a validated enum (out-of-phase / out-of-scope-by-trigger / superseded / explicitly-waived); tag provenance on every claim; make the audit reproducible.
6. **(Design-time) Unsatisfiable or secretly single-tool enforcement contract.** Too abstract → perpetually stubbed (theater); tool-shaped → silent lock-in. **Avoid:** validate the contract against 2+ structurally dissimilar reference adapters (e.g. policy-as-code + test-runner + human-approval) plus ship 1 thin working adapter to prove it's satisfiable end to end.

## Implications for Roadmap

All four researchers converged on the same build order, and it is dependency-forced: the rule shape must exist before it can be indexed, the index before selection, and selection before audit (skip-reasons are a byproduct of the selector — you cannot honestly record what was skipped unless the selector emits it). The value spine is **Phase 1 → 2 → 3**; hooks, audit, and adapters are integration that hangs off it. A hard sequencing constraint: **do not wire the GSD gate (Phase 4) before the selection engine (Phase 2) works** — a registered gate with a broken selector fails closed and blocks the whole loop.

### Phase 1: Rule-Pack Format & Index

**Rationale:** Everything keys off the rule shape; it is the true foundation even though selection is the riskiest piece. Landing severity, scope tiers, and the advisory/binding flag here is what lets later phases gate the recall/precision tradeoff and forbid theater.
**Delivers:** Rule frontmatter schema (`id/scope/triggers/phases/severity/summary/detailPath` + advisory/binding); `enterprise/domain/project` store layout with precedence; Index Builder → `rule-index.json`.
**Addresses:** Rule-pack format + metadata, rule scoping (table stakes); mirrors AI-DLC's `## Rule <PREFIX-NN>` + Verification structure.
**Avoids:** Groundwork for under/over-injection (severity gates the tradeoff) and waved-through governance (opt-in/severity semantics, advisory/binding split defined at the schema level).

### Phase 2: Selection Engine

**Rationale:** The riskiest, highest-value component and the Core Value itself. If summary selection is wrong, the anti-bloat premise collapses. Gets its own phase and a strong test suite *before* any hooks are wired.
**Delivers:** A pure function (task signals + phase + scope config → rule ids + reasons) doing deterministic trigger + scope (picomatch) + phase matching over `rule-index.json`; a labeled eval set with recall/precision measurement; fast-check invariants; zero-rule-selected logging.
**Uses:** picomatch, node:test + fast-check (from STACK.md).
**Implements:** Selection Engine (architecture component 3).
**Avoids:** Under-injection (recall-first for critical rules, eval set) and over-injection (precision measured, token budget).

### Phase 3: Summary Injection & Lazy Detail Loading

**Rationale:** Completes the lean-context mechanism the whole project exists to prove. Depends on selection output.
**Delivers:** Summary Injector rendering selected summaries into a markdown fragment (summaries only, never bodies); Detail Loader fetching a single rule body lazily by id (`governance rule-detail <id>`); per-request token budget check.
**Implements:** Summary Injector + Detail Loader (architecture component 4).
**Avoids:** Over-injection (summaries-only, lazy load, budget enforced).

### Phase 4: GSD Capability Integration & Persistence

**Rationale:** The declarative seam. Requires the selector/injector to exist as callable CLI subcommands first. This is also where governance state must be made durable against GSD's ephemeral-context model.
**Delivers:** `capability.json` registering contributions/steps/gates at the 12 loop points (mirroring the built-in `security` capability); `fragments/` for discuss/plan/execute/verify injection; append-only ledger under `.planning/governance/` (`selection-state.json`, per-phase dirs); explicit rule injection into subagent contexts; first-run consent handling for project-scope capabilities.
**Uses:** GSD's `capability-loader.cjs` / `loop-resolver.cjs` seam, `artifact-frontmatter-equals` predicate.
**Implements:** Gate Hooks (architecture component 5) + persistence model.
**Avoids:** Lost governance state (disk-backed ledger, subagent injection) and GSD-coupling breakage (binds only to the documented capability surface, never parses GSD internals).

### Phase 5: Audit-Artifact Writer

**Rationale:** Cannot precede selection — skip-reasons are a byproduct of the selector, and applied/skipped counts derive from selector + adapter output. Fires at `verify:post`, read at `ship:pre`.
**Delivers:** Audit Writer producing `<phase>/GOVERNANCE.md` with gate-checkable frontmatter (`rules_applied`, `rules_skipped`, `rules_open`, tests, risks, approvals); machine-derived fields; skip-reason enum; provenance tags; reproducibility.
**Implements:** Audit Writer (architecture component 6).
**Avoids:** Untrustworthy audit (machine-derived facts, enum skip-reasons, provenance) and records enforcer identity for binding rules (feeds anti-theater).

### Phase 6: Enforcement Contracts & Adapter Stubs

**Rationale:** Can be stubbed last, but the contract's result shape must be co-designed backward from what the audit (Phase 5) must record. This is where the advisory/binding split gets teeth.
**Delivers:** JSON Schema (draft 2020-12) gate-request / gate-result / audit contracts validated by Ajv; a single `GateAdapter` interface; no-op stubs named after AI-DLC's implied tools (semgrep/bandit/checkov/grype/gitleaks/CI/human); validation against 2+ dissimilar adapters + 1 thin working adapter; stub-detection lint.
**Uses:** JSON Schema + Ajv + ajv-formats (from STACK.md).
**Implements:** Enforcement Adapters (architecture component 7).
**Avoids:** Governance theater (real gate behind every binding rule) and unsatisfiable/locked-in contract (2+ dissimilar adapters + 1 working).

### Phase Ordering Rationale

- **Dependency-forced spine (1→2→3):** rule shape → index → selection → injection. The selection engine cannot be built without the index shape; injection cannot be built without selection output. This ordering is not a preference, it is a hard dependency chain all four researchers independently confirmed.
- **Integration hangs off the spine (4):** the capability seam requires the selector/injector to exist as callable subcommands, and a gate wired before selection works fails closed and blocks the whole loop — so integration must follow, not lead.
- **Audit cannot precede selection (5 after 2):** "rules skipped + reasons" is the tightest coupling in the system; the selector must emit skip decisions for the audit to record them honestly.
- **Adapters last but co-designed with audit (6):** the contract's result shape is defined backward from the audit's minimum record, so the audit-artifact design (5) must precede finalizing the contract even though stubs land last.
- **Avoids pitfalls in sequence:** severity/advisory-binding schema (1) enables the recall/precision defense (2) and anti-theater (6); persistence (4) defends the highest-probability integration failure; machine-derived audit (5) defends audit trust.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-plan-phase --research-phase <N>`):
- **Phase 2 (Selection Engine):** The matching mechanism is well-specified, but the **labeled eval-set construction methodology and recall/precision thresholds** are novel to this project and load-bearing (they gate the top risk). Needs research on how to build ground truth and what threshold `critical` rules must clear. Also: how task signals are extracted from GSD's `CONTEXT.md` as selector input.
- **Phase 4 (GSD Capability Integration):** Confidence in the seam is HIGH (read from installed source), but the exact `capability.json` schema, the project-scope **consent-record flow** (`hasProjectConsent`), and gate-predicate wiring should be re-verified against the installed `capability-registry.cjs` / `capability-loader.cjs` and the `security` capability template at planning time, since these are the concrete integration contract.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Rule-Pack Format):** gray-matter + YAML frontmatter over AI-DLC's documented rule structure — well-established, template already exists in the source corpus.
- **Phase 3 (Summary Injection):** straightforward rendering + lazy id-based fetch; no novel research.
- **Phase 5 (Audit Writer):** JSON Schema + Ajv with machine-derived facts — standard once the contract shape is set in Phase 6 co-design.
- **Phase 6 (Enforcement Contracts):** JSON Schema (draft 2020-12) + Ajv is well-documented; the neutrality-validation discipline (2+ adapters) is a design practice, not a research gap.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Both source repos inspected directly (GitHub + `package.json`); npm registry queried for every version on 2026-07-05; GSD's CJS/Node>=22/tsc-only pipeline verified. |
| Features | MEDIUM-HIGH | Both repos inspected via WebFetch; SLSA + OPA primary docs ground the domain; table-stakes/differentiator categorization is inferred from composing the sources. |
| Architecture | HIGH | The integration seam was read directly from installed GSD Core source (`loop-host-contract.cjs`, `capability-registry.cjs`, `capability-loader.cjs`, `loop-resolver.cjs`, `artifacts.cjs`); the `security` capability is a concrete working template. Strongest area. |
| Pitfalls | MEDIUM | GSD/AI-DLC READMEs skimmed; failure modes are well-reasoned but inferred by analogy from adjacent domains (RAG precision/recall, policy-as-code, audit-trail integrity, LLM instruction-following) rather than observed in this exact composition. |

**Overall confidence:** MEDIUM-HIGH. The load-bearing architectural claim (the capability seam) is HIGH and grounded in installed source, which de-risks the integration substantially. The pitfalls are MEDIUM (inferred), which is appropriate — they are hypotheses to defend against, and the roadmap builds those defenses in (eval set, token budget, advisory/binding split, disk ledger, machine-derived audit).

### Gaps to Address

- **Labeled eval set does not yet exist.** This is THE gap: without ground-truth (task, phase) → expected-rules pairs you cannot know you are under-injecting, and under-injection is the top risk. Construct it *before or at the start of* Phase 2, not after. Handle during Phase 2 planning.
- **Task-signal extraction from GSD state is unspecified.** The selector needs task type / changed paths / risk tags as input; how those are read from `CONTEXT.md` without parsing GSD internals (Pitfall 6) needs a decision. Handle during Phase 4 planning (the read-boundary) feeding Phase 2's input contract.
- **Per-request token budget threshold is uncalibrated.** The "N% of window" figure is a placeholder; it must be set against real injected-summary sizes. Handle during Phase 3.
- **AI-DLC rule corpus was read at repo-overview level, not file-by-file.** Exact body conventions and the full opt-in extension mechanics should be confirmed when authoring the Phase 1 schema.
- **Project-scope consent flow needs first-run design.** GSD requires a user consent record before a project-scope capability activates; the first-run setup UX is undesigned. Handle during Phase 4.

## Sources

### Primary (HIGH confidence)
- **GSD Core installed source** (`C:\Users\thien\.claude\gsd-core\bin\lib\`) — `loop-host-contract.cjs`, `capability-registry.cjs`, `capability-loader.cjs`, `capability-source.cjs`, `loop-resolver.cjs`, `artifacts.cjs`; ADR-894 (Loop Host Contract), ADR-1244 (Capability Registry overlay). The integration seam, 12 loop points, fail-closed behavior, `artifact-frontmatter-equals` predicate.
- **GSD Core repo + package.json** (github.com/open-gsd/gsd-core, branch `next`) — `@opengsd/gsd-core@1.7.0-rc.2`, Node >=22, CJS, tsc-only, custom test runner, deps (`js-yaml`, `fast-check`, `c8`), five-gate loop, STATE.md/CONTEXT.md persistence.
- **AI-DLC Workflows repo** (github.com/awslabs/aidlc-workflows, v2.0 preview) — `aws-aidlc-rules` / `aws-aidlc-rule-details` two-tier split, `## Rule <PREFIX-NN>` + Verification format (no frontmatter), Inception/Construction/Operations phases, `*.opt-in.md` model, in-repo SAST config (bandit/checkov/semgrep/grype/gitleaks).
- **npm registry** (queried 2026-07-05) — ajv 8.20.0, ajv-formats 3.0.1, gray-matter 4.0.3, js-yaml 5.2.1, picomatch 4.0.5, minimatch 10.2.5, fuse.js 7.4.2.
- **SLSA v1.0** (slsa.dev) — provenance as the audit-artifact template.
- **Open Policy Agent docs** (openpolicyagent.org) — advisory-vs-blocking decoupling as the standard enforcement model.

### Secondary (MEDIUM confidence)
- Feature categorization (table-stakes vs differentiator vs anti-feature) and MVP/dependency analysis — inferred from composing the sources against PROJECT.md requirements.
- Pitfall failure modes — inferred by analogy from adjacent domains (RAG precision/recall, policy-as-code rollout, compliance audit-trail integrity, LLM instruction-following reliability).

### Tertiary (LOW confidence)
- GSD internal file formats (STATE.md/CONTEXT.md layout, `.planning/` internals) — NOT verified as a committed contract; the overlay deliberately does not depend on them (binds only to the documented capability surface).

---
*Research completed: 2026-07-05*
*Ready for roadmap: yes*
