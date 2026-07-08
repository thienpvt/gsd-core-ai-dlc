# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Core

**Shipped:** 2026-07-06
**Phases:** 5 | **Plans:** 14 | **Tasks:** 38 | **Sessions:** ~3
**Timeline:** 2 days (2026-07-04 → 2026-07-06)
**LOC:** 13,378 TypeScript (8,141 src + 5,237 test)

### What Was Built
- Rule-pack format (Markdown + YAML frontmatter) across enterprise/domain/project scopes, compiled into a schema-enforced body-free `rule-index.json`
- Deterministic selection engine (`select()`) with a fixed phase→scope→trigger→superseded gate pipeline, a labeled recall/precision eval set (criticalRecall=1.0 build-gated), and a per-request token budget with a loud overflow signal
- Summary-only injection (`renderInjection`) plus lazy single-body-on-demand detail loading via a single-sourced `resolveDetailPath`
- Consent-gated GSD capability integration: declarative `capability.json` firing at discuss/execute gates, byte-identical reload of persisted selection across a simulated compaction/subagent boundary, and a fails-closed consent gate that deactivates on bundle tamper
- Machine-derived reproducible audit artifact: `writeGovernanceAudit` building `GOVERNANCE.md` from persisted `selection-state.json` with `AUDIT_SKIP_REASONS` enum rejecting out-of-enum reasons, wired as a `verify:post` capability step

### What Worked
- **Dependency-forced phase spine** (rule shape → index → selection → injection → audit) eliminated rework — each phase consumed the exact contract the prior phase shipped. The integration checker confirmed 9/9 cross-phase contracts wired with 0 drift.
- **Test-first on every phase** — every plan shipped RED→GREEN→docs commits (TDD review-checkpoint passed with 0 violations). 23 test commits vs 18 feat commits kept quality front-loaded.
- **fast-check property tests** for the core invariants (no-body-in-index, deterministic selection, no-body-in-injection) gave confidence beyond unit tests — the hardening bugs the property tests caught would have slipped past example-based tests.
- **Persisted state as the audit source of truth** — deriving `GOVERNANCE.md` from `selection-state.json` rather than re-running the selector made reproducibility a structural property, not a test assertion.
- **Declarative capability hook (no GSD Core fork)** — registering at discuss/execute/verify:post via `capability.json` kept the overlay upgrade-safe; the live `render-hooks` verification proved the hooks fire without modifying GSD internals.

### What Was Inefficient
- **Code-review-after-execution found a critical the hardening pass missed** — CR-01 (missing `matchedAxis` enum validation) was the same class of defect the Phase 05 hardening already applied to severity/scope/phase/riskTier, but `matchedAxis` was overlooked. A code review *during* the hardening plan (not after) would have caught it before verification.
- **Phase 1 and Phase 5 Nyquist validation left PARTIAL** — `01-VALIDATION.md` is still `draft`/`nyquist_compliant: false` and Phase 5's VALIDATION uses a non-standard gap-table format. Closing these retroactively post-ship is cheaper than re-opening a phase.
- **9 advisory tech-debt items deferred** — WR-01..05 + IN-01..03 on the audit writer plus a config-namespacing item. None block v1, but they accumulate; v2 should either harden the audit writer or accept them as the baseline.
- **`.planning/config.json` shared across capabilities** with unrelated keys (`tavily_search`, etc.) emits a runtime warning on every `gsd-tools` invocation — cosmetic noise that namespacing would remove.

### Patterns Established
- **Closed-enum validation at the persistence boundary** — any field sourced from persisted state is validated against its machine-checkable enum before writing (phase, riskTier, severity, scope, matchedAxis, skipReason). This is now the contract for "corrupted state cannot corrupt the audit trail."
- **Pure cores + I/O shells** — `select()`, `renderInjection`, and the audit builder are pure (no clock, no random, no fs); persistence and CLI entry points are thin shells around them. Reproducibility and testability follow for free.
- **Single-sourced resolvers** — `resolveDetailPath` is the one function used at both build-time (D-07) and fetch-time (IN-05); no parallel implementation drift.
- **Capability manifest as the integration seam** — the overlay declares itself via `.gsd/capabilities/aidlc-governance/capability.json` and lives entirely behind GSD's hook points. This is the upgrade-safety pattern v2 must preserve.

### Key Lessons
1. **Run a code review *during* a hardening plan, not only after execution** — a hardening pass that adds enum validation to N fields will miss field N+1 unless the review checks the full closed-enum inventory. The CR-01 gap was structural, not a typo.
2. **Derive the audit from persisted state, never re-derive** — making `selection-state.json` the single source for both injection and audit made reproducibility and cross-boundary survival structural rather than asserted.
3. **Property tests catch what example tests normalize away** — the "no body in the index" promise was by-construction in v1's walking skeleton; the fast-check property turned it into an enforced invariant that survived later refactors.
4. **Declarative hooks beat forking** — registering through GSD's documented capability seam delivered discuss/execute/verify:post integration with zero upstream-divergence risk and a one-line `render-hooks` verification.
5. **Close Nyquist validation in-phase** — leaving VALIDATION.md in `draft` or non-standard format past phase completion creates a PARTIAL classification that's awkward to resolve at milestone audit time.

### Cost Observations
- Model mix: executor=opus, planner=opus, verifier=sonnet, integration-checker=sonnet — heavy lifting on opus, verification/deep-search on sonnet
- Sessions: ~3
- Notable: The deep code review (gsd-code-reviewer, opus, deep) and integration check (sonnet) together cost less than a single wasted verify-fix cycle would have — catching CR-01 before verification prevented a `gaps_found` round-trip.

---

## Milestone: v2.0 — Govern

**Shipped:** 2026-07-08
**Phases:** 5 | **Plans:** 19 | **Tasks:** 40 | **Sessions:** ~3 (continued)
**Timeline:** 2 days (2026-07-06 → 2026-07-08)
**Tests:** 417 (414 pass, 3 skip, 0 fail) — up from v1.0's 178

### What Was Built
- Tech-debt fold-in (Phase 6): shared `atomicWriteFile` with PID+UUID temp suffix (concurrent-write race fix), consent-gated verify:post onError:halt test, config namespacing
- Tool-agnostic enforcement contracts (Phase 7): draft 2020-12 JSON Schema gate-request/gate-result/audit-artifact + `GateAdapter` interface + 7 named no-op/echo stubs (semgrep, bandit, checkov, grype, gitleaks, generic-exit-ci, human-approval) + `runAdapter` hard-fail boundary + `x-binding` advisory/binding split
- Remaining gate hooks (Phase 8): plan/verify/ship hooks producing durable `.planning/governance/gates/{NN}-{plan,verify,ship}.json` with fail-closed prior-evidence checks (GATE-05)
- Complete audit record + approval (Phase 9): audit-artifact v2 (4 optional enrichment fields appended after existing 7, `schema_version` 1→2, v1 byte-stable) + approval checkpoint schema + durable approval store + `capture-test-evidence.ts` wiring real `node --test` TAP into `tests/{NN}.json` + ship-gate fail-closed on pending/rejected approvals
- Selection-quality harness (Phase 10): `governance eval` CLI wrapping pure `eval-harness.ts` (runCases/aggregate) + `eval-evidence.ts` durable store under `eval/{NN}.json` + `eval-report.schema.json` + ship-gate `readEvalOrFail`/`assertNoFailedEval` (forward-scoped phase ≥ 10) + verify:post eval step + critical-recall ===1.0 ship-blocking floor + corpus-hash determinism

### What Worked
- **Code review caught a goal-blocking dead-code gap (Phase 9 WR-01)** — the audit-enrichment helpers were written but never wired into `writeGovernanceAudit`; deep review flagged it before verification, and the gap-closure plan (09-05) fixed it in one TDD round. This validated v1's lesson "code review during, not after" — extended here to "review catches wiring gaps the plan-checker doesn't."
- **Gap-closure mode (`--gaps`)** turned a `gaps_found` verification into a single bounded plan (09-05) rather than a full replan — the 1-retry cap prevented infinite loops while fixing the real root cause (AUDIT-04 producer-side wiring).
- **Pure-function reuse** — Phase 10 wrapped v1's `eval-harness.ts` (runCases/aggregate) with zero re-derivation; the standing harness was a thin I/O + reporting + gating wrapper around math that already shipped. This is the v1 "pure cores + I/O shells" pattern paying off.
- **Nyquist backfill caught a real gap** — Phase 6's TD-05 (`isDirectRun` narrowing) had runtime-probe-only coverage (tests passed whether the narrowing used basename or `__filename`); the backfill auditor added a behavioral test that actually fails on the old behavior. Backfilling advisory phases wasn't wasted work.
- **Deterministic serialization as a contract** — audit-artifact v1 byte-stability (Phase 9) + eval-report determinism (Phase 10) both proved reproducibility with string-compare, not deep-equal. The "audit derives from persisted state" v1 lesson extended to "reproducible-by-construction across the whole governance pipeline."

### What Was Inefficient
- **D-01 "run-tests.cjs" imprecision in Phase 9 CONTEXT** referenced upstream GSD's runner, not this repo's `node --test`. The researcher caught it (Open Question 1), but the planner had to reconcile it mid-planning. A pre-discuss codebase scout of the test command would have caught it before CONTEXT was written.
- **Capability manifest `consumes` extension blocked by installed-runtime `bundleContentHash`** (Phase 9 deferral) — the audit hook reads files directly regardless, but the `consumes` metadata can't be updated without coordinating with gsd-core upstream. This is the first debt item that genuinely can't be fixed in-repo; it surfaced only at the consent-integration test boundary.
- **Phase 9 plan-checker said all D-01..D-16 covered but the deterministic decision-coverage gate flagged 4** — the agent checked substance, the tool checked citations. Reconciliation required editing CONTEXT (D-02 imprecision) + tagging non-action decisions `[informational]`. The two gates measure different things; the workflow should document that the deterministic gate is citation-shape, not coverage-substance.
- **Two researcher/pattern-mapper agents dropped connections mid-write** (Phase 10) — resume-via-SendMessage recovered both, but the pattern repeated. Windows stdio/MCP instability under long agent runs is a known issue; the resume path worked but cost a round-trip each time.

### Patterns Established
- **Durable state under `.planning/governance/{gates,tests,approvals,eval}/` as one JSON file per phase** — every governed step persists its evidence; the next step (ship gate, audit) reads it. This is the v2 extension of v1's "persisted state as audit source of truth" — now spanning the full discuss→ship loop.
- **Fail-closed prior-evidence composition at ship** — GATE-05 (prior gates) AND D-08 (approvals) AND SEL-06 (eval, forward-scoped) — three independent checks, none bypasses another. The ship gate is now the single blocking chokepoint for the whole governance pipeline.
- **`gap_closure: true` plan frontmatter** — a distinct plan class for post-verification fixes, executed via `--gaps-only`, bounded to 1 retry. Separates "the plan was wrong" from "the verification found a real gap."
- **Forward-scoping gates** — new evidence requirements (eval, approvals) apply only to phases at-or-after their introduction, so legacy phases aren't retroactively failed. The `phaseNumber >= "10"` guard is the pattern for adding ship-blocking checks without breaking history.

### Key Lessons
1. **Code review's job is wiring gaps, not just bugs** — the plan-checker verifies plan quality, but "the helpers exist" ≠ "the helpers are called from production." Deep review caught the dead-code gap the plan-checker couldn't. Review is a distinct gate from plan-check.
2. **Gap closure is a bounded mode, not a replan** — `--gaps` + `gap_closure: true` + 1-retry cap turned a verification failure into a single targeted plan. This is the right shape for post-verification fixes: scoped, bounded, no infinite loop.
3. **The deterministic decision-coverage gate measures citations, the plan-checker measures substance** — both passed their own bar, but they disagreed on 4 decisions. The workflow should name this: substance-coverage (agent) vs citation-shape (tool). Reconciling via CONTEXT edits + `[informational]` tags is the cleanup.
4. **Some debt is genuinely upstream-only** — the `consumes` constraint can't be fixed in-repo; documenting it as a coordination item (not a milestone debt) is the honest classification. Not every deferred item is actionable locally.
5. **Backfilling advisory Nyquist for shipped phases can find real gaps** — Phase 6 TD-05 had a coverage hole invisible to the green suite. "Already passed" doesn't mean "fully covered"; the auditor's behavioral-test lens catches what example tests normalize away.

### Cost Observations
- Model mix: executor=opus, planner=opus, researcher=opus, checker=sonnet, verifier=sonnet, reviewer=opus(deep), integration-checker=sonnet, nyquist-auditor=sonnet, code-fixer=opus
- Sessions: ~3 (continued from v1.0)
- Notable: The deep code review (Phase 9) caught a goal-blocking gap that would have caused a `gaps_found` verification + gap-closure round-trip anyway — paying for review upfront was cheaper than the round-trip it prevented. The Phase 10 pattern-mapper/researcher connection drops cost 2 resume round-trips but no lost work.

---

## Milestone: v3.0 — Adoption & Hygiene

**Shipped:** 2026-07-09
**Phases:** 2 | **Plans:** 3

### What Was Built
- Backfilled `requirements-completed` frontmatter on 6 archived v2.0 SUMMARYs (06-02/06-03/07-01/07-02/10-01/10-02) with verified REQ-IDs from each phase's VERIFICATION.md Source Plan column — 21/21 v2.0 REQ-IDs now discoverable from per-plan SUMMARY metadata.
- End-user onboarding doc (`docs/onboarding.md`): prerequisites, install+build, CB-3 `gsd-tools capability install` consent grant, `governance.enabled` toggle, first-run smoke check.
- Governance workflow usage doc (`docs/governance-workflow.md`): all 5 CLI commands (build-index/select/inject/rule-detail/eval) + audit/ship gate chain + one E2E worked example + TaskSignal format.
- Rule-authoring guide (`docs/rule-authoring.md`): 7 frontmatter fields + `classification`, 3 scope dirs, 3 trigger axes, runnable verify-the-rule-fires loop with a temp triggered rule (billing-review).
- Root README Documentation section linking all 3 docs; each doc cross-references install→operate→author.

### What Worked
- Smart-discuss infra-path skip for Phase 11 (pure docs hygiene, no grey areas) — zero ceremony, straight to plan.
- Codebase maps (STACK/STRUCTURE/CONVENTIONS/INTEGRATIONS) as the docs source-of-truth — kept all CLI signatures accurate; no invented flags.
- Plan-checker caught 7 real defects across 2 iterations (consent command wrong, smoke phase wrong, rule-detail output wrong, eval not dry-run, negative-test rule impossible, set -e exit-capture, whole-JSON grep on skipped[]) — all grounded in actual code reads.

### What Was Inefficient
- Plan-checker iteration: Phase 12 took 4 check rounds. Each round surfaced 1-2 code-grounded blockers the prior round missed. The fixes were all real, but a single deeper first pass could have caught the selector `common`-phase + skipped[] behavior together.
- My (orchestrator) first coverage scan used an LF-only frontmatter regex and false-failed on CRLF v2.0 SUMMARYs — wasted one verification pass before I added `\r\n` normalization. Lesson: CRLF is the default on Windows-authored archives.

### Patterns Established
- Docs verification = behavioral dry-run: every documented CLI command must run as-written against the built binary, not just be grepped in prose.
- Negative selection tests must `JSON.parse` and check `selected[].id` membership — selector emits non-matching rules in `skipped[]` with the same id, so whole-JSON grep false-fails.

### Key Lessons
1. **Docs are runtime contracts** — a command in a doc that doesn't run is a broken integration link, same as a missing import. The integration checker treating docs→runtime as wiring caught the RUN-01 blocker that pure doc review missed.
2. **Some blockers are accurate docs + broken upstream** — Phase 12's consent command is correct (matches consent.test.ts); the runtime failure is the deferred RUN-01 capability-manifest `consumes` constraint. Honest audit = document the gap, don't degrade the doc.
3. **CRLF normalization is mandatory on Windows** — frontmatter regexes that assume `\n` silently miss CRLF files. Always `.replace(/\r\n/g, '\n')` before matching.

### Cost Observations
- Model mix: planner opus, executors/verifiers/checker sonnet.
- Notable: 2 executor dispatches died on transient API "malformed response" errors — both recovered on first retry with zero lost work (clean spot-check confirmed no partial commits). Transient infra errors don't justify plan changes.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 5 | Established: dependency-forced spine, RED→GREEN→docs TDD on every plan, pure-core + IO-shell architecture, closed-enum validation at persistence boundary |
| v2.0 | ~3 | 5 | Extended: durable per-gate evidence + fail-closed ship composition, gap-closure bounded mode, forward-scoping gates, deep code review as wiring-gap gate, advisory Nyquist backfill as gap-finder |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 178 (176 pass, 2 skip, 0 fail) | (c8 available, not measured this milestone) | 0 new runtime deps — reused GSD Core's `js-yaml`; added only `ajv`+`ajv-formats`+`picomatch` as the JSON-Schema/glob contract layer |
| v2.0 | 417 (414 pass, 3 skip, 0 fail) | (c8 available, not measured) | 0 new runtime deps — reused the v1.0 contract layer (ajv/ajv-formats/picomatch) for all v2.0 schemas + validators |

### Top Lessons (Verified Across Milestones)

1. **Pure cores pay off across milestones** — v1's `eval-harness.ts` was wrapped unchanged in v2 Phase 10; v1's "persisted state as audit source" became v2's full-loop durable-state pattern. Pure + persisted design compounds.
2. **Code review is a distinct gate from plan-check** — the plan-checker verifies plan quality; deep review catches wiring gaps (helpers exist vs helpers are called). Both ran every v2 phase; review caught the one goal-blocking gap.
3. **Bounded gap-closure beats replanning** — `--gaps` + `gap_closure: true` + 1-retry cap turned a verification failure into a single targeted plan in Phase 9. The right shape for post-verification fixes.
4. **Some debt is upstream-only — document, don't force** — the capability manifest `consumes` constraint can't be fixed in-repo. Honest classification (coordination item, not milestone debt) beats a half-fix.
5. **"Already passed" ≠ "fully covered"** — Phase 6 Nyquist backfill found a real TD-05 gap the green suite hid. Advisory backfill of shipped phases is not wasted work.