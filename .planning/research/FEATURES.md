# Feature Research

**Domain:** Enterprise SDLC governance overlay on an AI-development runtime (GSD Core runtime + AI-DLC governance semantics, delivered as indexed, on-demand rule packs with gate checkpoints and audit artifacts)
**Researched:** 2026-07-05
**Confidence:** MEDIUM-HIGH (both source repos inspected directly via WebFetch; broader domain grounded in SLSA and OPA primary docs; some categorization inferred from how the two systems compose)

## Grounding Observations

Before categorizing, what the two real source systems actually provide (observed):

**AI-DLC Workflows (github.com/awslabs/aidlc-workflows)** — observed:
- Three SDLC phases: INCEPTION (what/why), CONSTRUCTION (how), OPERATIONS (deploy/monitor, future).
- Rule content lives as markdown under `aidlc-rules/aws-aidlc-rules/core-workflow.md` plus `aws-aidlc-rule-details/{common,inception,construction,extensions,operations}/`.
- **Extension system** = the governance/compliance overlay. Each extension is two files: a rules file (e.g. `security-baseline.md`) holding blocking constraints, and an optional `*.opt-in.md` file that prompts the user to enable it. "Extensions without a matching `*.opt-in.md` file are always enforced."
- **Rule format (observed, verbatim intent):** headings `## Rule <PREFIX-NN>: <Title>` (e.g. `COMPLIANCE-01`), each with a **Rule** section (the requirement) and a **Verification** section (concrete checks). Rule IDs "referenced in audit logs and compliance summaries, so they must be unique across all loaded extensions."
- **Enforcement model (observed):** "Once enabled, extension rules are blocking constraints — at each stage, the model verifies compliance before allowing the stage to proceed." This is model-mediated, prompt-level enforcement, NOT external gate enforcement.
- **Human-in-the-loop (observed tenet):** "Critical decisions require explicit user confirmation." Approval checkpoints: review the execution plan, approve each stage, artifacts land in `aidlc-docs/`.
- **Adaptive intelligence (observed):** "Only executes stages that add value" — risk/complexity gates thoroughness.
- **Delivery mechanism (observed):** the FULL rule detail corpus is copied into platform-specific landing zones (`.kiro/`, `.amazonq/`, `.aidlc-rule-details/`, `CLAUDE.md`, etc.). This is exactly the full-corpus-into-context pattern PROJECT.md exists to eliminate.
- Supporting tooling: AIDLC Evaluator (golden tests, token-usage/cross-model consistency) and Design Reviewer (multi-agent critique). Confirms token cost is a known concern in the source.

**GSD Core (github.com/open-gsd/gsd-core)** — observed:
- Five-gate phase loop already exists: **discuss → plan → execute → verify → ship** (verbatim descriptions: discuss "capture implementation decisions before anything is planned"; plan "verify the plan fits a fresh context window"; execute "parallel waves; each executor starts with a clean 200k-token context"; verify "diagnose and fix before declaring done"; ship "create the PR, archive the phase").
- Core problem it solves: "context rot." Three pillars — heavy work in fresh-context subagents; structured artifacts (`STATE.md`, `CONTEXT.md`) survive session boundaries; verify step generates fix plans.
- Persistence primitives already exist: `STATE.md`, `CONTEXT.md`, `.plans/`, `.planning/`, `.out-of-scope/`, `.changeset/`.
- Existing quality infrastructure: `eslint-rules/` (custom lint), `stryker.config.mjs` (mutation testing), `TESTING-STANDARDS.md`, `.coderabbit.yaml`, `.github/` CI, `.githooks/`.
- **What GSD does NOT provide (the gaps this overlay fills):** no rule-pack/steering scoping model, no rule-selection engine, no severity/trigger metadata, no compliance audit artifact (requirements-covered / rules-applied / rules-skipped), no tool-agnostic policy/SAST contract layer, no formal approval-gate schema. Verify exists but is code-walkthrough oriented, not policy/compliance-check oriented.

**Broader domain (grounded):**
- **SLSA** (slsa.dev) — provenance is "the auditable record linking artifact → source → build process." Levels progress from "provenance exists" (L1) to signed provenance (L2) to hardened isolated builds (L3). Consumers verify actual provenance against an expected baseline. This is the industry template for what a credible audit artifact contains.
- **OPA / policy-as-code** (openpolicyagent.org) — "decouples policy decision-making from policy enforcement." Same Rego rules serve both **advisory** (query `violation` set, report) and **blocking** (`allow := false` default, non-zero exit) postures — the caller decides. Confirms the advisory-vs-enforcement split PROJECT.md draws is standard, not novel. Structured decisions ("not limited to yes/no") enable rich audit output.

## Feature Landscape

### Table Stakes (Enterprises Expect These)

Missing any of these and the governance layer isn't credible to an enterprise buyer.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Rule-pack format with metadata (id/index, trigger, phase, severity) | Every governance system (AI-DLC extensions, OPA bundles, SLSA tracks) keys off structured, uniquely-identified rules. Unique IDs are required for audit cross-referencing — AI-DLC already mandates this. | MEDIUM | Maps PROJECT.md req #1. Mirror AI-DLC's `PREFIX-NN` id + Rule/Verification sections; add machine-readable frontmatter (trigger, phase[], severity, scope) so selection can be programmatic rather than model-guessed. |
| Rule scoping: enterprise / domain / project layers | Enterprises need org-wide baselines plus team/repo overrides. Standard precedence model across policy tooling. | MEDIUM | Maps req #1. Define precedence (enterprise wins on conflict, or explicit override semantics). Scope is also a selection filter. |
| Governance gate hooks at discuss/plan/execute/verify/ship | GSD already has these five gates; AI-DLC already gates stages ("verifies compliance before allowing the stage to proceed"). An overlay that doesn't hook them isn't governing anything. | MEDIUM | Maps req #4. GSD gates exist (observed) — the work is hooking them cleanly as an overlay, not building the loop. Each gate has distinct concerns (discuss=task type+risk; plan=requirements/risks/acceptance/modules; execute=inject rules to subagent; verify=tests/lint/security/policy; ship=audit/approvals/rollback/evidence). |
| Audit artifact per governed task | SLSA provenance, SOC2/ISO evidence, and AI-DLC "compliance summaries" all require a review-ready record. Non-negotiable for any regulated buyer. | MEDIUM-HIGH | Maps req #6. Must persist to disk (survive context compaction — explicit PROJECT.md constraint), not live in context. Records: requirements covered, rules applied, rules skipped + reasons, tests executed, remaining risks, approvals required. |
| Human approval checkpoints | AI-DLC core tenet: "Critical decisions require explicit user confirmation." No enterprise ships AI-generated changes without a human gate. | LOW-MEDIUM | Part of req #4 (ship) and #7. GSD ship gate + AI-DLC "approve each stage" already establish the pattern. Approval must be recorded in the audit artifact. |
| Advisory-vs-enforcement separation | OPA proves this is the standard model (same rules, advisory or blocking posture). Enterprises distrust "the LLM promised it complied." Real enforcement must route to CI/SAST/tests/policy engines. | MEDIUM | Maps req #7. This is table stakes for *credibility* even though PROJECT.md treats it as a core principle — enterprises will not accept prompt-level "enforcement" as binding. |
| Tool-agnostic gate contracts + audit schema | Enterprises already own CI/SAST/policy stacks (OPA, Snyk, SonarQube, GH Actions). A layer that demands a specific vendor won't adopt. | MEDIUM-HIGH | Maps req #5. Contracts + adapter stubs only (no concrete integrations shipped — explicitly out of scope in PROJECT.md). Schema neutrality is what makes it enterprise-portable. |
| Rules skipped + reasons tracking | Auditors care more about what was NOT checked and why than what passed. This is the defensibility record. | MEDIUM | Sub-part of req #6, but call it out — it's the difference between a checklist and an audit trail. Depends on the selection engine emitting skip decisions. |

### Differentiators (Competitive Advantage)

Where this project actually competes. The stated Core Value sits here.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rule selection engine (task + phase → matching rules only) | **THE core value (PROJECT.md).** AI-DLC's own delivery copies the full corpus into context; nobody in the source ecosystem does trigger-based selection. This is the differentiator. | HIGH | Maps req #2. Riskiest component (PROJECT.md key decision). If selection is wrong — misses a critical rule or floods context — the whole premise collapses. Needs a trigger-matching model over rule metadata. Correctness is measurable (did the right rules fire?). |
| Summary-only injection | Directly attacks context bloat — the problem GSD ("context rot") and AI-DLC (token-usage evals) both acknowledge but neither solves for governance rules. | MEDIUM | Maps req #2. Requires each rule to carry a curated short summary distinct from its full body. Injection budget is "the defining constraint" per PROJECT.md. |
| On-demand / lazy detail loading | Full rule text fetched only when a summary is insufficient for the decision at hand. Keeps the long-running loop lean while preserving access to full governance detail. | MEDIUM | Maps req #3. Depends on rule-pack format separating summary from body, and on the runtime being able to fetch by rule id mid-task. Pairs with GSD's fresh-context subagent model. |
| Governance state that survives compaction | PROJECT.md constraint: audit + selection state must persist, not live only in context. GSD's `STATE.md`/`CONTEXT.md` pattern is the natural host. | MEDIUM | Differentiator because most AI-governance tooling is stateless per request. Reuse GSD persistence primitives rather than inventing new ones. |
| Selection observability (why this rule fired / was skipped) | Turns the selection engine from a black box into an auditable decision. Feeds the audit artifact directly and builds trust in the anti-bloat mechanism. | MEDIUM | Enhances both the selection engine and the audit artifact. This is what makes "rules skipped + reasons" trustworthy rather than asserted. |
| Overlay (non-fork) architecture | Keeps upstream GSD upgradable while adding governance. Clean separation is itself a selling point to teams already on GSD. | MEDIUM-HIGH | PROJECT.md constraint. Hooking cleanly without forking is non-trivial and is a genuine engineering differentiator vs. a bolted-on rewrite. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Markdown steering as hard enforcement | AI-DLC literally does this ("blocking constraints... model verifies compliance before allowing the stage to proceed") — it looks like enforcement and is easy to ship. | LLM-mediated "enforcement" is non-deterministic and bypassable; an auditor cannot rely on "the model said it checked." Directly rejected in PROJECT.md. | Advisory markdown for guidance; binding enforcement delegated to CI/SAST/tests/policy-as-code/human approval via contracts (OPA's decouple model). |
| Copying the full rule corpus into every request | It's what AI-DLC's landing-zone install actually does, and it's the simplest possible "delivery." | The exact context-bloat anti-pattern this project exists to eliminate; degrades the long-running loop (GSD "context rot"). | Index + trigger-based selection + summary injection + lazy detail loading. |
| Shipping concrete enforcement integrations (OPA/Rego, specific SAST, GH Actions) as first-class | Buyers want turnkey; "works out of the box with X" demos well. | Creates vendor lock-in, expands maintenance surface, and contradicts the tool-agnostic promise. PROJECT.md out-of-scope. | Tool-agnostic contracts + adapter *stubs*; let each org wire their own engine. |
| Forking / rewriting GSD Core internals | Tempting for tighter integration or to "just make it work." | Breaks upstream upgradability; you inherit maintenance of the whole runtime. PROJECT.md out-of-scope. | Overlay that hooks the existing discuss/plan/execute/verify/ship loop. |
| Auto-approving low-risk changes to reduce friction | Human gates feel slow; adaptive intelligence (AI-DLC) already skips low-value stages. | Erodes the human-in-the-loop tenet that makes the layer credible; auditors want a human on record for governed changes. | Risk-tier the *depth* of checks, but keep an explicit (even if lightweight) human approval record at ship. |
| Rule authoring UI / rule marketplace | Feels like a natural platform play. | Massive scope expansion orthogonal to the core value (selection). Distracts from proving the anti-bloat premise. | Author rules as files (AI-DLC already does markdown); defer any UI until core is validated. |
| One global "compliance score" | Executives love a single number. | Collapses distinct rules/severities into a misleading metric; hides skipped rules. | Structured audit artifact with per-rule status; let consumers aggregate if they must. |

## Feature Dependencies

```
Rule-pack format + metadata (req #1)
    └──requires──> nothing (foundation)

Rule selection engine (req #2)
    └──requires──> Rule-pack format + metadata (needs trigger/phase/severity/scope to match on)

Summary-only injection (req #2)
    └──requires──> Rule-pack format (summary field distinct from body)
    └──requires──> Rule selection engine (selects what to summarize)

On-demand detail loading (req #3)
    └──requires──> Rule-pack format (body fetchable by id)
    └──requires──> Summary-only injection (loads detail when summary insufficient)

GSD gate hooks (req #4)
    └──requires──> GSD Core loop (already exists — observed)
    └──enhanced-by──> Rule selection engine (execute gate injects selected rules)

Tool-agnostic contracts + adapter stubs (req #5)
    └──requires──> GSD gate hooks (contracts are invoked at verify/ship)

Audit artifact generation (req #6)
    └──requires──> Rule selection engine (needs rules-applied AND rules-skipped+reasons)
    └──requires──> GSD gate hooks (collects tests-executed, approvals from verify/ship)
    └──requires──> Governance state persistence (must survive compaction)

Enforcement boundary (req #7)
    └──requires──> Tool-agnostic contracts (enforcement routes through them)
    └──conflicts──> "markdown as hard enforcement" anti-feature (mutually exclusive by design)
```

### Dependency Notes

- **Selection engine requires rule-pack format:** the engine matches on trigger/phase/severity/scope metadata — the format must exist and be machine-readable first. This forces format design before engine build.
- **Audit artifact requires the selection engine:** "rules applied" and especially "rules skipped + reasons" are byproducts of selection decisions. You cannot honestly record what was skipped unless the selector emits skip reasons. This is the tightest coupling in the system.
- **Audit artifact requires gate hooks:** tests-executed, approvals-required, and remaining-risks are captured at verify/ship — the audit generator aggregates gate outputs.
- **Contracts require gate hooks:** contracts are the interface the verify/ship gates call out to; no gates, nothing to call.
- **Enforcement boundary conflicts with markdown-as-enforcement:** these are mutually exclusive design stances. Choosing the contract-based boundary (req #7) is what makes the markdown-enforcement anti-feature off-limits.
- **Everything ultimately hangs off the rule-pack format** — it is the true foundation, even though the selection engine is the riskiest/highest-value piece.

## MVP Definition

### Launch With (v1)

Minimum to validate the Core Value (correct, lean rule selection).

- [ ] Rule-pack format with metadata (id, trigger, phase[], severity, scope, summary, body) — foundation everything depends on
- [ ] Rule selection engine (task + phase → matching rules) — the riskiest core; PROJECT.md says build first
- [ ] Summary-only injection — proves the anti-bloat premise
- [ ] On-demand detail loading — completes the lean-context mechanism
- [ ] Gate hooks at discuss + execute (minimum to inject rules where it matters) — validates the overlay hooks GSD cleanly
- [ ] Basic audit artifact (rules applied, rules skipped + reasons) — the minimum credibility record, and it validates selection observability

### Add After Validation (v1.x)

Once selection is proven correct and lean.

- [ ] Full five-gate hooks (add plan, verify, ship) — trigger: core selection validated on discuss/execute
- [ ] Complete audit artifact (requirements covered, tests executed, remaining risks, approvals) — trigger: gates emit the needed signals
- [ ] Tool-agnostic gate contracts + adapter stubs — trigger: verify/ship gates exist to invoke them
- [ ] Human approval checkpoint schema — trigger: ship gate hooked
- [ ] Governance state persistence across compaction — trigger: long-running sessions expose the need

### Future Consideration (v2+)

- [ ] Selection quality evaluation harness (à la AIDLC Evaluator: token usage, did-right-rules-fire) — defer until there's a corpus to evaluate against
- [ ] Rule conflict resolution across scopes (enterprise vs project overrides) — defer until multi-scope usage is real
- [ ] Concrete adapter reference implementations (one OPA, one SAST) as *examples* not first-class — defer; PROJECT.md keeps these out of scope

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Rule-pack format + metadata | HIGH | MEDIUM | P1 |
| Rule selection engine | HIGH | HIGH | P1 |
| Summary-only injection | HIGH | MEDIUM | P1 |
| On-demand detail loading | HIGH | MEDIUM | P1 |
| Gate hooks (discuss + execute) | HIGH | MEDIUM | P1 |
| Basic audit artifact (applied + skipped) | HIGH | MEDIUM | P1 |
| Full five-gate hooks | MEDIUM | MEDIUM | P2 |
| Complete audit artifact | HIGH | MEDIUM | P2 |
| Tool-agnostic contracts + stubs | MEDIUM | MEDIUM-HIGH | P2 |
| Human approval schema | MEDIUM | LOW-MEDIUM | P2 |
| Governance state persistence | MEDIUM | MEDIUM | P2 |
| Selection eval harness | MEDIUM | MEDIUM | P3 |
| Cross-scope conflict resolution | LOW-MEDIUM | MEDIUM | P3 |

**Priority key:** P1 = must have for launch; P2 = should have, add when possible; P3 = nice to have, future.

## Competitor / Source Feature Analysis

| Feature | AI-DLC Workflows | GSD Core | Our Approach |
|---------|------------------|----------|--------------|
| SDLC phases | 3 phases (inception/construction/operations), stage gating | 5-gate loop (discuss/plan/execute/verify/ship) | Hook GSD's 5 gates; map AI-DLC rule semantics onto them |
| Rule expression | Markdown `PREFIX-NN` + Rule/Verification sections | none | Same id+verification model, plus machine-readable trigger/phase/severity/scope frontmatter |
| Rule delivery | Full corpus copied into landing zones (bloat) | n/a | Indexed trigger-based selection + summary injection + lazy load (the differentiator) |
| Enforcement | Model-mediated "blocking constraints" at each stage | ESLint/Stryker/CI (code quality, not governance) | Advisory markdown + real enforcement via tool-agnostic contracts (OPA-style decouple) |
| Human-in-the-loop | Core tenet; approve each stage | Ship gate / PR review | Explicit approval checkpoints recorded in audit artifact |
| Audit | "compliance summaries," rule IDs in audit logs, `aidlc-docs/` | none (has STATE.md/CONTEXT.md persistence) | Structured audit artifact (SLSA-provenance-inspired) persisted via GSD state primitives |
| Context management | token-usage evals acknowledge cost | "context rot" is its whole reason for being | Selection engine is the bridge: governance without the bloat |

## Sources

- AI-DLC Workflows repo (observed via WebFetch): https://github.com/awslabs/aidlc-workflows — phases, extension/rule format, enforcement model, human-in-the-loop tenet, landing-zone delivery. Confidence: HIGH (primary source, directly inspected).
- GSD Core repo (observed via WebFetch): https://github.com/open-gsd/gsd-core — five-gate loop, context-rot problem, STATE.md/CONTEXT.md persistence, existing quality tooling, absence of governance/rule-selection features. Confidence: HIGH (primary source, directly inspected).
- SLSA v1.0 levels (primary): https://slsa.dev/spec/v1.0/levels — provenance/attestation as the audit-artifact template. Confidence: HIGH.
- Open Policy Agent docs (primary): https://www.openpolicyagent.org/docs/latest/ — policy-as-code, advisory-vs-blocking decoupling, structured decisions. Confidence: HIGH.
- Categorization of table-stakes vs differentiators vs anti-features, and MVP/dependency analysis: inferred from composing the above sources against PROJECT.md requirements. Confidence: MEDIUM.

---
*Feature research for: Enterprise SDLC governance overlay on an AI-development runtime*
*Researched: 2026-07-05*
