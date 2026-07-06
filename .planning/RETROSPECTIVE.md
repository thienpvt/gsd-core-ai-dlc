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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 5 | Established: dependency-forced spine, RED→GREEN→docs TDD on every plan, pure-core + IO-shell architecture, closed-enum validation at persistence boundary |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 178 (176 pass, 2 skip, 0 fail) | (c8 available, not measured this milestone) | 0 new runtime deps — reused GSD Core's `js-yaml`; added only `ajv`+`ajv-formats`+`picomatch` as the JSON-Schema/glob contract layer |

### Top Lessons (Verified Across Milestones)

1. *(First milestone — lessons above become the cross-milestone baseline for v2.)*
2.
3.