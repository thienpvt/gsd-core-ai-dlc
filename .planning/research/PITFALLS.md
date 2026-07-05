# Pitfalls Research

**Domain:** Governance overlay on an AI coding runtime (GSD Core runtime + AI-DLC governance overlay: on-demand rule packs, gates, audit artifacts)
**Researched:** 2026-07-05
**Confidence:** MEDIUM (source systems skimmed from READMEs; failure modes inferred from adjacent domains — policy-as-code, RAG selection, audit-trail integrity, LLM instruction-following)

## Critical Pitfalls

### Pitfall 1: Selection under-injection — a critical rule silently never fires

**What goes wrong:**
The selection engine fails to inject a rule that governs the current task (e.g. a security-baseline rule for an auth change, or a PII-handling rule for a data-export feature). The executor proceeds without ever seeing the constraint, produces non-compliant code, and — worse — the audit artifact shows no violation because the rule was never in scope. Silent governance gap. This is the single most dangerous failure because it is invisible: nothing errors, the loop completes green.

**Why it happens:**
Trigger conditions are authored too narrowly (keyword/path match that misses a synonym or a refactor that touches auth indirectly), or the phase mapping is wrong (rule tagged `construction` only, but the risk surfaces in `plan`). This is the recall side of the classic retrieval precision/recall tradeoff — the anti-bloat pressure of this project (Core Value: "little enough to avoid context bloat") biases every design decision toward injecting *less*, which structurally pushes recall down. Optimizing for the stated core value directly worsens this pitfall.

**How to avoid:**
- Treat rule selection as a recall-first problem for high-severity rules and precision-first only for low-severity ones. Severity (already in the rule-pack schema) should gate the tradeoff: `critical`/`high` rules use broad, fail-open triggers ("when in doubt, include the summary"); `low` rules can use tight triggers.
- Build a labeled evaluation set of (task, phase) → expected-rules *before* building the engine. Measure recall and precision against it on every change. Without a ground-truth set you cannot know you are under-injecting.
- Add a "catch-all" scope tier: a small set of always-on rules (mirrors AI-DLC's always-loaded `core-workflow.md`) that never depend on triggers — the enterprise non-negotiables. Never let trigger logic be the only path for a critical rule.
- Make "no rules selected" a loud event, not a silent pass. If a governed phase selects zero rules, log it and surface it for review rather than proceeding quietly.

**Warning signs:**
- Audit artifacts where high-risk tasks show few or no applied rules.
- Recall on the eval set drops when a trigger is "tightened" to save context.
- Reviewers report "the model did X unsafe thing and no rule caught it."

**Phase to address:**
Selection-engine phase (and the rule-pack-schema phase must land severity + scope tiers first, since the fail-open policy keys off them).

---

### Pitfall 2: Selection over-injection — context bloat returns through the back door

**What goes wrong:**
To be "safe," triggers are authored broadly, summaries grow long, or full rule bodies get pulled in "just in case." The per-request payload creeps back up until the overlay reintroduces exactly the context bloat it exists to eliminate — the anti-pattern PROJECT.md explicitly names ("Copying the full AI-DLC steering corpus into context per request"). GSD's whole design is architectural avoidance of "context rot"; a bloated overlay reintroduces the rot GSD spent its architecture avoiding.

**Why it happens:**
Over-injection is the natural overcorrection to Pitfall 1 — every near-miss produces pressure to widen a trigger, and widths only ever ratchet up. Summaries drift longer over time as authors add caveats. Nobody measures the cumulative token cost per request, so the erosion is invisible until the loop degrades.

**How to avoid:**
- Set a hard per-request governance token budget and measure against it on every request (e.g. total injected governance tokens must stay under N% of the window). Treat budget overage as a build-breaking regression, not a warning.
- Enforce a summary length cap at the schema level — a rule summary that cannot fit its budget is a smell that the rule is doing too much and should be split.
- Keep detail-loading genuinely lazy: inject summaries only, load full body only on explicit demand for a specific decision (AI-DLC's two-tier `rules/` + `rule-details/` split is the reference model). Never pre-fetch bodies "to be safe."
- Track precision on the eval set alongside recall; a precision collapse means triggers have gone too broad.

**Warning signs:**
- Per-request governance token count trending up release over release.
- Rule summaries longer than a few lines.
- Full rule bodies loaded on most requests rather than occasionally.
- Long-run quality degradation (context rot symptoms) reappearing.

**Phase to address:**
Selection-engine phase; enforced continuously via a token-budget check wired into the verify gate.

---

### Pitfall 3: Governance theater — treating markdown steering as enforcement

**What goes wrong:**
The overlay injects a rule ("all inputs must be validated"; "no secrets in logs") and treats the LLM having *read* it as the control being *enforced*. LLMs probabilistically ignore, forget, or partially apply instructions — especially deep in a long run or under competing objectives. The rule appears governed but is not. This is the exact failure PROJECT.md pre-emptively rejects ("Treating markdown steering as hard enforcement — deliberately rejected"), but it creeps back in subtly: a rule's "Verification" section describes checks that only the model performs, with no external gate behind it.

Note the specific porting hazard: AI-DLC states "Rules are blocking by default — if verification criteria are not met, the stage cannot proceed." In AI-DLC that blocking is itself adjudicated by the agent reading markdown. Porting that phrasing into GSD without a real gate behind it imports the theater wholesale while *looking* like hard enforcement.

**Why it happens:**
Markdown is cheap to write and feels authoritative. Distinguishing "advisory context that shapes behavior" from "binding control that blocks progress" requires wiring to external systems (CI/SAST/tests/policy-as-code/human approval), which is more work. Under deadline, the "Verification" prose gets written and the actual gate integration gets deferred — and never done.

**How to avoid:**
- Classify every rule at the schema level as `advisory` (steering, injected as context, may influence the model) or `binding` (must be adjudicated by a real external gate). Do not allow a `binding` rule to exist without a named enforcement contract it routes to.
- Make the enforcement boundary structural: the audit artifact must record *who* enforced each binding rule (which gate/adapter returned pass/fail), not just that the model "considered" it. A binding rule with no gate result is an incomplete audit, not a pass.
- Provide a lint over the rule packs: any rule marked `binding` whose enforcement contract is unimplemented (still a stub) must fail loudly at governed points — surfaced as "enforcement not wired," never silently treated as satisfied.
- Keep the language honest in the rule format: advisory rules say "guides"; binding rules say "verified by <contract>." Ban verification prose that implies enforcement without a contract.

**Warning signs:**
- Rules whose only "enforcement" is a Verification section the model self-attests to.
- Audit artifacts that say a rule was "applied" but cite no external check result.
- Binding rules pointing at adapter stubs that always return pass.
- A demo passes governance with no CI/SAST/test/policy engine actually invoked.

**Phase to address:**
Enforcement-adapter-contract phase (defines advisory/binding split and the contract every binding rule must name); reinforced in audit-artifact phase (must record enforcer identity).

---

### Pitfall 4: Audit artifacts that look complete but aren't trustworthy

**What goes wrong:**
The audit artifact lists "rules applied," "rules skipped + reasons," "tests executed," "remaining risks" — and every field is populated, so it passes review. But the fields are hollow: "rules applied" means "injected into context," not "enforced and passed"; "skipped-rule reasons" are generic LLM-generated filler ("not applicable to this task") that were never validated; "tests executed" lists tests that were named but not actually run. The artifact is a compliance narrative, not evidence. This is compliance audit-trail integrity failure — the record exists but does not correspond to reality.

**Why it happens:**
The audit generator is itself an LLM producing prose to fill a schema. If the schema asks "why was this rule skipped?", the model will always produce a plausible-sounding reason whether or not one is real — LLMs do not reliably distinguish "I have a genuine reason" from "I can generate text that reads like a reason." Populated fields are mistaken for verified fields.

**How to avoid:**
- Make audit fields derive from machine facts, not model narration wherever possible. "Rules applied" should be populated by the selection engine's actual output plus the gate adapters' actual pass/fail returns — not by the model summarizing what it thinks happened. "Tests executed" should come from the test runner's real output, not a claim.
- For "skipped-rule reasons," constrain to a validated enum of skip reasons (out-of-phase, out-of-scope-by-trigger, superseded-by-rule-X, explicitly-opted-out) each of which is machine-checkable against the selection state — reject free-text justifications the model invents.
- Include provenance in the artifact: for each claim, where did it come from (engine / adapter / test runner / human approval / model assertion)? Model-asserted claims must be visibly tagged as lower-trust.
- Make the artifact reproducible: given the same task and state, regenerating the audit should yield the same machine-derived facts. Divergence means fields are being narrated, not recorded.

**Warning signs:**
- Skip reasons that read fluent but generic across many different rules.
- "Applied" counts that never match the number of gate results.
- Audit fields populated even when the underlying gate/test never ran.
- No provenance/source tag on audit claims.

**Phase to address:**
Audit-artifact-generation phase; depends on selection-engine and enforcement-adapter phases exposing machine-readable results to draw from.

---

### Pitfall 5: Governance state lost across compaction and subagent boundaries

**What goes wrong:**
Rule-selection decisions, applied/skipped ledger, and partial gate results live only in the main session's context. Then GSD compacts the window (or spawns a fresh-context executor subagent, or resumes in a new session) and the governance state evaporates. The loop continues but the overlay has amnesia: rules re-selected differently, the audit ledger has a hole, a binding gate result from before the boundary is gone. Governance silently discontinues mid-loop.

**Why it happens:**
This is the highest-probability *integration* failure because it runs against GSD's core architecture. GSD's documented model is: **state = files on disk (STATE.md/CONTEXT.md); context = ephemeral**, and executors "start with a clean 200k-token context" in "parallel waves." The GSD README does not document a mid-run compaction-recovery flow — it relies on architectural avoidance (push work to fresh subagents). An overlay that holds governance state in context assumes a durability that GSD deliberately does not provide. Any governance state not written to disk will not survive.

**How to avoid:**
- Persist all governance state to disk artifacts alongside GSD's own (a governance ledger in `.planning/`, sibling to STATE.md/CONTEXT.md), and treat disk as the source of truth — context is a cache. This mirrors GSD's own persistence contract exactly rather than fighting it.
- Make the ledger append-only and keyed by task/phase so a fresh subagent or post-compaction session reconstructs governance state by reading it, not by remembering.
- When spawning executor subagents, inject the relevant selected-rule summaries *into the subagent's clean context explicitly* — do not assume the executor inherits the main session's governance context. The clean-200k design guarantees it does not.
- Test explicitly across a simulated compaction / session boundary: start a governed task, force a boundary, resume, and assert the audit ledger and selected-rule set are intact.

**Warning signs:**
- Governance state held in variables/memory rather than written to `.planning/`.
- Audit ledgers with gaps that correlate with long runs or subagent handoffs.
- Rules re-selected inconsistently for the same task after a resume.
- Executor subagents producing ungoverned output despite main-session selection.

**Phase to address:**
Persistence/state phase, co-designed with the GSD-gate-hook phase (hooks must read/write the on-disk ledger, not session memory).

---

### Pitfall 6: Tight coupling to GSD internals breaks on upstream upgrade

**What goes wrong:**
The overlay reaches into GSD's private structures — parsing the exact STATE.md layout, depending on undocumented `.planning/` file formats, monkeypatching the phase loop, or assuming internal function signatures. GSD ships an upgrade, the internals shift, and the overlay breaks or (worse) silently mis-reads state and governs against stale/misparsed data. This violates the project's foundational constraint: "Overlay on GSD Core, not a fork — must stay upgrade-safe."

**Why it happens:**
GSD exposes a clean five-point loop (discuss/plan/execute/verify/ship) but the README does not publish stable formats for STATE.md/CONTEXT.md/`.planning/` internals (those live in docs not skimmed, and may not be a committed contract at all). Under pressure to ship, the fastest path is to parse whatever GSD writes today — creating a hidden dependency on an unversioned internal format.

**How to avoid:**
- Bind only to GSD's documented extension surface: the five workflow hook points. Treat everything else (file formats, internal state layout) as private and off-limits.
- If the overlay must read GSD state, go through whatever public accessor GSD provides; if none exists, write the overlay's own ledger rather than parsing GSD's. Own your governance state; do not scrape GSD's.
- Pin the GSD version the overlay is verified against and add a compatibility check that fails fast on an unrecognized GSD version, rather than mis-parsing.
- Add an integration test that runs against the pinned GSD to catch breakage on upgrade before users do.

**Warning signs:**
- Code that parses STATE.md/CONTEXT.md structure directly.
- References to GSD functions/paths not named in its public docs.
- Overlay behavior changes after a GSD bump with no overlay change.

**Phase to address:**
GSD-gate-hook / integration phase (define the coupling boundary first, before building on it).

---

### Pitfall 7: Enforcement adapter contracts too abstract to satisfy — or secretly single-tool

**What goes wrong:**
Two opposite failure modes on the same interface. (a) The gate contract is so abstract/generic that no real engine can actually be wired to it without heavy glue, so it stays perpetually stubbed and enforcement never lands — abstraction as a form of governance theater (see Pitfall 3). (b) The contract is shaped around one tool's model (e.g. OPA/Rego's decision format, or a specific SAST's output schema) so that despite being labeled "tool-agnostic," only that one tool fits — silent vendor lock-in, violating "no engine lock-in."

**Why it happens:**
Designing a genuinely neutral interface requires validating it against at least two dissimilar engines; teams usually design against zero (too abstract) or one (accidental lock-in). PROJECT.md scopes concrete integrations *out* ("contracts + stubs only"), which is correct for avoiding lock-in but removes the very pressure-test that would reveal an unsatisfiable or single-tool contract.

**How to avoid:**
- Validate the contract against at least two structurally different reference adapters during design — e.g. a policy-as-code engine (pass/fail + reasons), a test runner (pass/fail + coverage), and ideally a human-approval gate (pending/approved/rejected). If the contract can express all three cleanly, it is neither too abstract nor tool-shaped. Two dissimilar adapters is the minimum honest test of neutrality.
- Keep contracts concrete about the *result* shape (verdict, evidence, rule-ID linkage, timestamp) while staying neutral about the *engine*. The audit artifact's needs (Pitfall 4) define the minimum result contract — design backward from what the audit must record.
- Ship at least one thin working adapter (even to a trivial engine) rather than stubs only, to prove the contract is satisfiable end to end. A contract never once satisfied is unverified.
- Review the contract for any field that only one tool's output naturally produces — that is a lock-in tell.

**Warning signs:**
- Every adapter is still a stub near the end of the phase.
- The contract's fields map 1:1 onto one specific tool's output.
- Wiring a second engine requires changing the contract, not just the adapter.

**Phase to address:**
Enforcement-adapter-contract phase; the contract's result shape must be co-designed with the audit-artifact phase.

---

### Pitfall 8: Opt-in/opt-out and severity semantics that let governance be waved through

**What goes wrong:**
Rules carry opt-in/opt-out toggles (AI-DLC uses `*.opt-in.md` prompts during requirements analysis) and severity. If opt-out is too easy, or the model can decide to opt out on the user's behalf, teams (or the model) silently disable the very controls that matter, and the audit shows the task as governed. Enforcement becomes optional in practice while looking mandatory on paper.

**Why it happens:**
Opt-out exists for legitimate reasons (a rule genuinely doesn't apply), but the boundary between "human explicitly waived this with justification" and "model decided to skip it" is easy to blur. Under the "adaptive workflow / only run stages that add value" framing, skipping is the path of least resistance.

**How to avoid:**
- Only a human can opt out of a `critical`/`high` binding rule, and the opt-out must be recorded in the audit ledger with the approver's identity and reason (ties to human-approval gate). The model may never self-waive a binding rule.
- Represent opt-out as an explicit, logged event with provenance — not an absence. A rule that is "not applied" must be distinguishable in the audit as skipped-by-trigger vs. explicitly-waived-by-human vs. never-selected (this feeds Pitfall 4's skip-reason enum).
- Default binding rules to on; require positive action to disable, never the reverse.

**Warning signs:**
- Audit artifacts showing critical rules opted out with no human approver recorded.
- Opt-out decisions made inside the model's reasoning rather than at a human gate.
- No distinction in the ledger between "skipped" and "waived."

**Phase to address:**
Rule-pack-schema phase (opt-in/severity semantics) + human-approval gate in the enforcement/gate-hook phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Ship binding rules with stub adapters that return pass | Fast green demo; unblocks the loop | Governance theater (Pitfall 3) — nothing is actually enforced; false audit trail | Never for `binding` rules. Fine for `advisory` rules, which have no gate by definition |
| Populate audit fields with LLM-generated prose | Complete-looking artifact quickly | Untrustworthy audit (Pitfall 4); fails real compliance review | Only for genuinely narrative fields (e.g. free-text risk notes), never for applied/skipped/tests-run facts |
| Hold governance state in session context | Simpler than a disk ledger | Amnesia across compaction/subagents (Pitfall 5) — GSD guarantees context is ephemeral | Never — GSD's architecture makes this a guaranteed data-loss bug |
| Parse GSD's STATE.md/`.planning/` internals directly | Quick access to state | Breaks on GSD upgrade (Pitfall 6); violates no-fork constraint | Only via a documented/public accessor; otherwise keep your own ledger |
| Widen a trigger to fix one missed rule | Stops the immediate under-injection | Ratchets toward context bloat (Pitfall 2); precision decays | When paired with the eval set showing precision held; otherwise split/re-scope the rule |
| One reference adapter (the one you know) | Proves "it works" | Hidden single-tool lock-in (Pitfall 7) | Never as the only validation — need a second dissimilar adapter |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GSD phase loop (discuss/plan/execute/verify/ship) | Monkeypatching the loop or assuming hooks share the main context | Bind only to the five documented hook points; inject governance explicitly into each hook's context |
| GSD executor subagents (clean 200k context) | Assuming the executor inherits selected rules from the main session | Explicitly inject the selected-rule summaries into the subagent prompt; executors start blank by design |
| GSD state persistence (STATE.md/CONTEXT.md) | Writing governance state into GSD's own files or parsing their format | Write a sibling governance ledger in `.planning/`; treat GSD's files as read-only-through-public-API |
| AI-DLC rule corpus | Porting the always-loaded `core-workflow.md` model as "load everything" | Keep only true non-negotiables always-on; everything else trigger-selected as summaries |
| CI / SAST / policy-as-code engines | Designing the contract against one engine's output shape | Validate the contract against 2+ dissimilar engines; keep result shape neutral |
| Human-approval gate | Treating approval as a model-narrated step | Approval is an external event recorded with approver identity in the audit ledger |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Linear scan of the whole rule corpus per request for selection | Selection latency and token cost grow with corpus size | Pre-index rules by trigger/phase/scope; select against the index, not the raw corpus | When the enterprise rule corpus grows to hundreds of rules |
| Summary drift — summaries lengthen over time | Per-request governance tokens creep up; context rot returns | Hard per-request token budget enforced in verify gate; schema-level summary cap | Gradually, across many rule-authoring cycles — invisible without measurement |
| Loading full rule bodies "to be safe" | Requests carry many full bodies, not summaries | Keep detail-loading lazy and per-decision; ban pre-fetch | As soon as more than a couple of rules match a typical task |
| Audit ledger growing unbounded in one file | Slow reads/writes; costly reconstruction after compaction | Partition ledger by phase/task; append-only with compaction of its own | On long-running milestones with many governed tasks |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Binding security rule (e.g. secrets-in-logs, authz check) enforced only by markdown steering | LLM ignores it under load; vulnerability ships with a "governed" audit stamp | Route all security-critical rules through real gates (SAST/policy/tests); never advisory-only |
| Rule packs themselves treated as trusted instructions when authored/edited by untrusted parties | Prompt-injection via a malicious rule body ("ignore prior rules") | Treat rule-pack content as data; validate/sign rule packs; constrain what injected rule text can instruct |
| Audit ledger writable/editable without integrity control | Tampered compliance record; non-repudiation lost | Append-only ledger with integrity checks; record provenance; ideally hash-chain entries |
| Opt-out of security rules by the model without human sign-off | Silent disabling of the exact controls that matter (Pitfall 8) | Critical/high binding rules require human-approver-recorded opt-out only |
| Secrets surfaced when loading rule detail or generating audit evidence | Credential leakage into context or audit files | Reference secret-bearing checks by result, not content; keep evidence free of raw secret values |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Governance is invisible until it blocks at ship | User surprised late; rework is expensive | Surface which rules are in scope early (discuss/plan gates), not just at verify/ship |
| Skipped-rule reasons are opaque generic filler | Reviewer cannot trust the audit; loses confidence | Constrained skip-reason enum with machine-checkable justification |
| Every rule injected as a wall of text | Cognitive overload; user tunes out governance entirely | Summaries-only by default; detail on demand — the same discipline that saves tokens saves attention |
| No feedback when a critical rule was near-miss-excluded | User never learns a trigger is too narrow | Log near-misses / zero-rule-selected events for review |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Rule selection:** Often missing a labeled eval set — verify recall/precision are measured against ground truth, not eyeballed
- [ ] **Binding rules:** Often missing a real gate behind them — verify each `binding` rule names a satisfiable enforcement contract, not a pass-stub
- [ ] **Audit artifact:** Often looks complete but fields are model-narrated — verify applied/skipped/tests-run derive from machine facts with provenance tags
- [ ] **Skip reasons:** Often free-text filler — verify they come from a validated enum checkable against selection state
- [ ] **Compaction survival:** Often untested — verify governance ledger and selected-rule set survive a forced session/subagent boundary
- [ ] **Subagent governance:** Often assumed inherited — verify executor subagents actually receive injected rule summaries in their clean context
- [ ] **GSD coupling:** Often reaches into internals — verify the overlay binds only to documented hook points and its own ledger
- [ ] **Adapter contract:** Often validated against one tool — verify at least two dissimilar reference adapters satisfy it, plus one thin working adapter exists
- [ ] **Token budget:** Often unmeasured — verify a per-request governance token budget is enforced in the verify gate

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Under-injection (missed critical rule) | HIGH | Audit the eval set for the gap; add rule to always-on scope or broaden trigger with precision re-measured; re-run affected governed tasks; assess shipped non-compliant output |
| Over-injection (bloat returned) | MEDIUM | Measure per-request tokens; tighten widest triggers against eval-set precision; enforce summary caps; restore lazy detail-loading |
| Governance theater | HIGH | Reclassify rules advisory/binding; wire real gates for binding; treat prior "governed" audits as suspect and re-verify |
| Untrustworthy audit | HIGH | Rebuild audit generator to derive facts from engine/adapter/runner outputs; add provenance; re-audit critical shipped work |
| Lost governance state | MEDIUM | Move state to on-disk append-only ledger; reconstruct from GSD artifacts where possible; add boundary-crossing tests |
| GSD coupling breakage | MEDIUM | Remove internal parsing; move to documented hooks + own ledger; pin GSD version with compatibility check |
| Unsatisfiable / locked-in contract | MEDIUM | Redesign result shape backward from audit needs; validate against 2+ dissimilar adapters; ship one thin working adapter |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Under-injection | Rule-pack schema (severity/scope) → Selection engine | Recall on labeled eval set meets threshold for critical rules; zero-rule events logged |
| 2. Over-injection | Selection engine | Per-request governance token budget enforced in verify gate; precision on eval set held |
| 3. Governance theater | Enforcement-adapter contracts | Every `binding` rule maps to a real gate; audit records enforcer identity; stub-detection lint fails build |
| 4. Untrustworthy audit | Audit-artifact generation | Applied/skipped/tests-run fields are machine-derived with provenance; audit is reproducible |
| 5. Lost governance state | Persistence/state (with gate-hook phase) | Forced compaction/subagent-boundary test preserves ledger and selection |
| 6. GSD coupling | GSD gate-hook / integration | Overlay binds only to documented hooks; integration test against pinned GSD passes |
| 7. Unsatisfiable/locked-in contract | Enforcement-adapter contracts | Contract satisfied by 2+ dissimilar reference adapters + 1 thin working adapter |
| 8. Waved-through governance | Rule-pack schema + human-approval gate | Critical opt-outs require recorded human approver; skip vs. waive distinguished in ledger |

## Sources

- GSD Core README (https://github.com/open-gsd/gsd-core) — context management model, STATE.md/CONTEXT.md on-disk persistence, clean-200k subagent isolation, five-phase loop, "context rot" framing, architectural-avoidance (no documented compaction-recovery flow). OBSERVED from README; internal file formats NOT verified (live in linked docs).
- AI-DLC Workflows README (https://github.com/awslabs/aidlc-workflows) — two-tier rule delivery (always-loaded core + lazy detail), `## Rule PREFIX-NN` IDs with Rule + Verification sections, "blocking by default" semantics, `*.opt-in.md` toggles, `aidlc-docs/` audit outputs, agent-agnostic mount points. OBSERVED from README.
- PROJECT.md Out-of-Scope and Constraints sections — anti-patterns explicitly named by the project (no fork, summaries-only, markdown-not-enforcement, no vendor lock-in, audit completeness). OBSERVED.
- Adjacent-domain failure modes (INFERRED, applied to this domain): RAG/retrieval precision-recall tradeoff → under/over-injection; policy-as-code rollout patterns → advisory/binding split, opt-out governance; compliance audit-trail integrity → provenance, append-only, reproducibility; LLM instruction-following reliability → governance theater, model-narrated audit fields.

---
*Pitfalls research for: governance overlay on an AI coding runtime (GSD Core + AI-DLC overlay)*
*Researched: 2026-07-05*
