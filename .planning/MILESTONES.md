# Milestones

## v1.0 Core (Shipped: 2026-07-06)

**Phases completed:** 5 phases, 14 plans, 38 tasks

**Key accomplishments:**

- End-to-end governance CLI slice: author one real rule, run `governance build-index`, emit a schema-valid body-free `rule-index.json` — proven by a smoke test that spawns the built CLI, under a CommonJS/tsc stack with fast-check/nodenext interop resolved.
- Full PACK-01 multi-axis trigger schema + PACK-03 binding/enforcement if/then, validated by Ajv draft 2020-12 under strict mode, driven test-first by two table-driven suites (25/25 green).
- PACK-02 directory-as-source-of-truth scope derivation + full-replacement cross-tier override (project>domain>enterprise) with superseded provenance, wired into buildIndex and driven test-first — a colliding id resolves to the project winner with two superseded losers, a mis-scoped rule fails the build, and no body leaks through precedence (37/37 green).
- Turned the walking skeleton's by-construction "no body in the index" promise into a schema-enforced, property-proven invariant: a draft 2020-12 output schema whose per-record additionalProperties:false leaves no place for a body, validateIndex wired into buildIndex so a leak aborts the build, and a fast-check property over arbitrary corpora with per-rule canaries — plus build-level proof that a binding-without-contract rule fails the build and a detailPath pointer is carried verbatim (43/43 green).
- A controlled 11-file eval-rules corpus (→10 winners) plus a 12-case labeled ground-truth set, with an integrity test that proves every expected rule id resolves to a real buildIndex winner before the selection engine exists.
- The pure, deterministic `select(index, signal, config)` core — a fixed phase -> scope -> trigger -> superseded gate pipeline that classifies every index candidate as selected (with the axis + value that fired) or skipped (with an AUDIT-02-aligned reason), reusing Phase 1's D-01..D-04 trigger semantics verbatim, plus an Ajv-validated `TaskSignal` boundary that fails loud on a malformed signal.
- The two halves of the Core Value made concrete: a build-gating recall test that fails the build if a critical rule is ever under-injected (criticalRecall===1.0, highRecall>=0.9, precision reported-not-gated), a never-truncating char/4 token budget with a loud overflow signal (SEL-05), four fast-check invariants proving the matching core on arbitrary corpora, and the `governance select` CLI wired end-to-end (SEL-04).
- Pure renderInjection renders a deterministic <governance> summary fragment with no file-read path, proven body-free by a fast-check no-body property, plus a governance inject CLI that honors the SEL-05 budget signal
- A single-sourced resolveDetailPath resolver+traversal guard enforced at both build (D-07) and fetch time (IN-05), plus governance rule-detail — the one sanctioned place a rule body surfaces, fetching exactly one body on demand (SEL-03)
- `src/governance/risk.ts`
- Execute gate reloads persisted governance selection, renders summaries through the shared injector, and proves byte-identical survival across a simulated compaction/subagent boundary.
- Project-scope capability consent now fails closed before user consent, activates after loader-bound consent, and deactivates on bundle tamper.
- Deterministic GOVERNANCE.md writer over persisted selector state with public skip-reason audit records
- Artifact-only verify:post governance audit step wired to the deterministic Phase 05 GOVERNANCE.md writer

---
