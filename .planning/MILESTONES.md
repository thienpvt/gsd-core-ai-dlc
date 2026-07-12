# Milestones

## v4.0 Developer Coding Conventions (Shipped: 2026-07-12)

**Phases completed:** 6 phases, 11 plans, 28 tasks

**Key accomplishments:**

- Selectable `java-spring` domain pack: 10 advisory convention rules for service boundaries, REST/Kafka, Hexagonal Architecture, DDD, logging, OpenAPI, and saga/outbox decisions.
- Summary-only injection and lazy `detailPath` loading preserved across all Java/Spring rules; domain subscription prevents unrelated projects receiving the pack.
- Thin `examples/java-spring/` Order slice ships for LLM mirroring while remaining outside every rule-index path.
- Real stdlib-only JaCoCo/LCOV `coverage-report` adapter enforces inclusive ≥70% unit line coverage and fails closed on missing, malformed, unsafe, or low reports.
- Config-backed discuss/plan/verify/ship flow correlates authoritative binding evidence, invalidates stale verify passes, and blocks ship on durable coverage failure.
- Self-contained capability, package-owned CLI, immutable eval corpus, consumer guide, and executable install tests close the former activation gap; audit passed 18/18 requirements, 15/15 integrations, and 6/6 flows.

**Audit:** [passed](./milestones/v4.0-MILESTONE-AUDIT.md) — all six phases Nyquist-compliant and security-verified; 0 open threats.

---

## v3.0 Adoption & Hygiene (Shipped: 2026-07-09)

**Phases completed:** 2 phases, 3 plans, 6 tasks
**Closeout type:** verified_closeout (2/2 phases verified passed; 4/4 requirements 3-source satisfied)
**Known gaps:** 1 runtime blocker on DOC-01 install→consent→activate flow — `gsd-tools capability install` fails because capability.json `plan:pre` consumes RESEARCH.md/PATTERNS.md that no host hook resolves (RUN-01 upstream gsd-core constraint, deferred from v2.0). The documented consent command is accurate (matches consent.test.ts); governance hooks will activate once the upstream capability-manifest `consumes` fix lands. DOC-03 optional warning: `rule-detail <temp-pack>` outside repo root is rejected by containment (IN-05) — core verify loop passes.

**Key accomplishments:**

- Six archived v2.0 SUMMARY files now carry verified `requirements-completed` frontmatter, making all 21 v2.0 REQ-IDs discoverable from per-plan SUMMARY metadata.
- Source-grounded onboarding and CLI workflow docs with CB-3 consent, smoke checks, five commands, and gate evidence paths.
- Schema-grounded rule-authoring guide with runnable selector verification plus root README documentation entrypoint

---

## v2.0 Govern (Shipped: 2026-07-08)

**Phases completed:** 5 phases, 19 plans, 40 tasks

**Key accomplishments:**

- Shared `atomicWriteFile` with `.<pid>-<uuid>.tmp` temp suffix eliminates the fixed-`.tmp` collision between `atomicWriteText` and `atomicWriteJson`; concurrent writers to the same governance artifact now produce exactly one intact payload, never a merged/empty/truncated file (TD-03)
- 1. [Rule 2 - Missing critical functionality] Existing test expected the old fragmented selector_reason error shape
- 1. [Rule 3 - Blocking] Test file path `test/governance/` not compiled by build
- `src/schema/gate-request.schema.json`
- Static GateAdapter registry with 7 reference no-op/echo stubs for ENF-03
- runAdapter hard-fail wrapper with malformed-fixture contract tests for ENF-02 and ENF-04
- Durable gate evidence store with fixed atomic JSON files for plan, verify, and ship gates
- Plan gate hook deriving validated planner signals, rendering summary-only governance, and writing separate plan evidence
- Verify gate hook using runAdapter-validated evidence and per-rule pass/fail/waived status derivation
- Ship preflight gate that fails closed on missing, malformed, or failing plan/verify governance evidence
- Registered remaining governance gate hooks without replacing existing discuss, execute, verify audit, or consent behavior
- APPR-01 human approval checkpoint: draft 2020-12 schema, Ajv 2020 validator (5th instance of validate.ts pattern), and durable store routing approval persistence through validateApproval to inherit ENF-02 malformed-hard-fail + D-07 anti-auto-approve invariant.
- AUDIT-04 test-evidence capture: pure TAP-summary parser for `node --test --test-reporter=tap` stdout (the actual `npm test` runner — D-01 reconciliation), draft 2020-12 schema with runner const, and durable store persisting under `.planning/governance/tests/{NN}.json` (D-02). Malformed runner output hard-fails (D-04); model-authored narration is rejected (D-03).
- Audit artifact bumped to v2 (schema_version 1->2, forward-incompatible by design) with 4 optional enrichment fields (requirements_covered, tests_executed, remaining_risks, approvals) appended AFTER the existing 7 to preserve V8 insertion-order and v1 byte-stability. Three pure helpers in audit-enrich.ts (D-14) prepare the payload: extractRequirementsCovered (D-10), collectRemainingRisks (D-11 never-empty), summarizeApprovals (D-12 from store). buildAuditRecord exports and accepts an optional AuditEnrichment arg.
- Ship gate extended with approval blocking (D-07 pending-only writes, D-08 fail-closed on pending/rejected) via three new helpers in ship-gate-hook.ts, plus capability manifest extended (verify:post audit consumes CONTEXT.md; ship:pre produces approvals + consumes GOVERNANCE.md). Full Phase 9 audit+approval surface wired: approval store (01) + test evidence (02) + audit enrichment (03) + ship-gate blocking (04).
- AUDIT-04 producer-side wiring: thin captureTestEvidence orchestrator + injectable spawnRunner seam spawns `node --test --test-reporter=tap`, feeds stdout to parseTapSummary, and persists via writeTestEvidence — giving parseTapSummary and writeTestEvidence their first production callers and lifting the single root cause behind both Phase 9 VERIFICATION failures (SC-2 + D-03/D-04 production enforcement).
- 1. [Rule 3 - Blocking issue] `runDirect` not exported for CLI shim

---

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
