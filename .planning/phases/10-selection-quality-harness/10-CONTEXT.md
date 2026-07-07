# Phase 10: Selection-Quality Harness - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

Wrap the existing pure `eval-harness.ts` measurement layer (Phase 2 SEL-01 evidence — `scoreCase`/`runCases`/`aggregate`) into a **standing** recall/precision harness: a CLI command that loads the built index + labeled eval corpus, runs every case through `select()`, produces a repeatable + auditable report (markdown + JSON), persists it as governance evidence under `.planning/governance/eval/`, and blocks ship on critical-recall regression. This phase does NOT re-derive the selection math (already shipped in `eval-harness.ts`), does NOT add new scanner integrations, does NOT bump the audit-artifact schema (deferred to a future phase), and does NOT gate precision (CONTEXT Phase 2 rejects precision-gating — it pushes the engine toward under-injection).

</domain>

<decisions>
## Implementation Decisions

### Invocation & CLI
- **D-01:** New CLI command `governance eval` — matches the existing `select`/`inject`/`rule-detail`/`build-index` command family in `src/cli/commands/`. Registered through `src/index.ts` like its siblings.
- **D-02:** The harness loads the built `rule-index.json` (from `build-index`) and the labeled corpus `test/fixtures/eval/cases/eval-cases.json` — both single-sourced, already the SEL-01 ground truth. No separate eval-corpus copy, no in-process rebuild.
- **D-03:** Output modes — `--json` emits machine-readable JSON; default (no flag) emits pretty markdown to stdout for humans.
- **D-04:** New module `src/select/eval-cli.ts` (CLI entrypoint + I/O) alongside the existing pure `src/select/eval-harness.ts`; new command shim `src/cli/commands/eval.ts`. The pure measurement layer stays pure; all I/O lives in the CLI wrapper.

### Blocking Thresholds & Ship Integration
- **D-05:** Critical-recall gate is a hard floor: `criticalRecall === 1.0`. ANY missed critical rule (severity `critical` in the index ground truth, expected but not selected) blocks. Matches the existing SEL-01 eval gate invariant.
- **D-06:** Precision is REPORTED + warned, NEVER blocked. Phase 2 CONTEXT explicitly rejects precision-gating because it pressures the engine toward under-injection (the exact anti-pattern this project exists to kill).
- **D-07:** A new SEL-06 eval-evidence record persists at `.planning/governance/eval/{NN}.json` per phase (mirrors the `gates/`/`tests/`/`approvals/` durable-state pattern). The ship gate consumes it and fails closed on missing or failed eval evidence — same GATE-05 fail-closed prior-evidence pattern as Phase 8/9.
- **D-08:** Exit codes — `0` pass, `2` critical-recall regression (a critical miss), `3` parse/index/load error. Distinct from generic `1` so CI/audit can distinguish "selection regressed" from "infra broke".

### Report Format & Audit Evidence
- **D-09:** Report artifacts persist under `.planning/governance/eval/`: `{NN}-report.md` (human) + `{NN}.json` (machine) per phase, matching the durable-state convention.
- **D-10:** Markdown report contains: aggregate scores (microRecall, microPrecision, per-severity recall), a per-case TP/FP/FN table, **named critical misses** (under-injection — the goal-blocking signal), precision offenders (over-injection — advisory), a timestamp, and a corpus hash pinning the eval-set version for reproducibility.
- **D-11:** New `src/schema/eval-report.schema.json` (draft 2020-12 + `x-binding`, cloned from `test-evidence.schema.json`). Runtime validation via the existing Ajv/validate pattern; malformed report = hard fail.
- **D-12:** Phase 10 does NOT bump `audit-artifact.schema.json`. An `eval_summary` field in the audit artifact is a future bump (v3), explicitly deferred — Phase 10 only persists eval evidence alongside the other governance state (D-07), following the same "audit reads durable state" pattern Phase 9 established for approvals.

### Repeatability & Standing Integration
- **D-13:** `npm run eval` script runs `node dist/select/eval-cli.js`. The `aidlc-governance-verify` skill (verify:post) gets a new step invoking `node dist/select/eval-cli.js <phaseNumber>` AFTER `capture-test-evidence` and BEFORE the audit step — so every governed phase's ship evidence includes a fresh eval run.
- **D-14:** Determinism — deterministic case ordering (sort by case name), no clock/random in the measurement path (already pure in `eval-harness.ts`), corpus hash pins the eval-set version into the report.
- **D-15:** Eval corpus growth — new cases are appended to the single `test/fixtures/eval/cases/eval-cases.json`. The harness reads whatever is there; adding a case is the only change needed to extend coverage.
- **D-16:** TDD plan shape — single TDD plan (RED: harness fails to load/run/report; GREEN: CLI + report + evidence + schema + ship-gate consumption; REFACTOR). Reuses existing `eval-harness.ts` pure functions (`scoreCase`/`runCases`/`aggregate`) — NO re-derivation of selection math.

### Claude's Discretion
- Exact CLI flag names beyond `--json` (e.g. `--threshold` if a configurable floor is ever wanted) are flexible — but D-05's hard 1.0 floor is the default and the load-bearing invariant.
- Exact markdown table column ordering / report styling is flexible as long as D-10's required content is present.
- Whether the ship-gate reads eval evidence via a new `readEvalOrFail` helper (mirroring `readApprovalOrFail`) or a generic `readGateEvidence` extension is at Claude's discretion — keep the sibling-store idiom consistent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` - Phase 10 goal, success criteria (SEL-06), dependency on Phase 9.
- `.planning/REQUIREMENTS.md` - SEL-06 requirement text + traceability (currently Pending).
- `.planning/PROJECT.md` - Current milestone state; Phase 9 validated the durable-state + ship-gate boundary this phase extends.

### Existing Eval Surface (to wrap, NOT re-derive)
- `src/select/eval-harness.ts` - PURE measurement layer: `EvalCase`, `CaseScore`, `CaseResult`, `Aggregate`, `scoreCase`, `runCases`, `aggregate`. Severity-partitioned recall on the EXPECTED rule's ground-truth severity. This is the math Phase 10 wraps with I/O + reporting + gating.
- `src/select/select.ts` - the `select()` function the harness exercises.
- `test/fixtures/eval/cases/eval-cases.json` - the labeled eval corpus (02-01 ground truth). Single source; harness reads this.
- `src/select/recall.test.ts`, `eval-fixtures.test.ts` - existing eval tests proving the math.

### Durable-State + Ship-Gate Pattern (to clone, from Phase 8/9)
- `src/governance/gate-evidence-store.ts` - durable-store pattern (`writeGateEvidence`/`readGateEvidence`/`assertEvidence`/`atomicWriteFile`) — template for eval-evidence persistence.
- `src/governance/test-evidence.ts` + `src/governance/capture-test-evidence.ts` - the Phase 9 producer/CLI pattern (`captureTestEvidence` + CLI main + `isDirectRun`) — closest analog for `eval-cli.ts`.
- `src/governance/ship-gate-hook.ts` - `readApprovalOrFail`/`assertNoBlockingApprovals` fail-closed pattern — template for `readEvalOrFail`/`assertNoFailedEval`.
- `src/schema/test-evidence.schema.json` - draft 2020-12 + `x-binding` schema template for `eval-report.schema.json`.
- `src/enforcement/validate-gate-result.ts` / `validate-approval.ts` - Ajv-2020 validate pattern (5th/6th instance).

### CLI + Hook Wiring (to extend)
- `src/cli/commands/select.ts`, `inject.ts`, `rule-detail.ts`, `build-index.ts` - the command family `governance eval` joins; `src/index.ts` registration.
- `.claude/skills/aidlc-governance-verify/SKILL.md` - verify:post step flow; Phase 9 added `capture-test-evidence` as step 4; Phase 10 adds the eval step after it.
- `src/governance/paths.ts` - add `evalReportPath` (mirrors `approvalPath`/`testEvidencePath`).

### Tests To Mirror
- `src/governance/capture-test-evidence.test.ts` - producer CLI test pattern (injectable seam + end-to-end persistence proof).
- `src/governance/ship-gate-hook.test.ts` - fail-closed gate test pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `eval-harness.ts` already ships the complete recall/precision math as PURE functions — Phase 10 adds only the I/O + reporting + gating wrapper. Zero re-derivation.
- `gate-evidence-store.ts` / `capture-test-evidence.ts` give a proven durable-store + CLI-producer pattern to clone for eval evidence.
- `ship-gate-hook.ts` gives the fail-closed prior-evidence consumption pattern.
- `paths.ts` is the single source for governance durable-state paths — extend, don't fork.

### Established Patterns
- Durable state lives under `.planning/governance/{gates,tests,approvals,eval}/` as one JSON file per phase; survives context compaction and reruns.
- Schemas are draft 2020-12 JSON Schema with `x-binding`; runtime validation via Ajv; malformed = hard fail.
- CLI commands are thin shims over pure helpers in `src/cli/commands/`, registered in `src/index.ts`; `isDirectRun()` mirrors the audit-artifact/capture-test-evidence pattern.
- Hook wrappers stay thin; the verify:post skill chains capture-test-evidence → audit; Phase 10 inserts the eval step between them.

### Integration Points
- `verify:post` (the aidlc-governance-verify skill) is where the eval step lands — after capture-test-evidence, before audit-artifact reads durable state.
- `ship:pre` (ship-gate-hook) is the blocking point — fail closed on missing/failed eval evidence alongside approvals + prior gates.
- `.planning/governance/eval/` is the durable-state home — `{NN}-report.md` + `{NN}.json` per phase.

</code_context>

<specifics>
## Specific Ideas

- Auto-selected all grey areas via smart discuss; user accepted all recommended answers.
- Keep Phase 10 boring: wrap existing math, no new selection logic, no precision gating, no audit v3 bump, no new runtime deps.
- The corpus hash in the report is the reproducibility anchor — same corpus + same index = byte-identical recall/precision. Determinism is already guaranteed by `eval-harness.ts` purity; the hash proves it.
- Critical-recall = 1.0 is the load-bearing invariant. The whole project's Core Value ("injects only the relevant rules") collapses if a critical rule is silently dropped; the harness exists to make that drop loud and ship-blocking.

</specifics>

<deferred>
## Deferred Ideas

- `eval_summary` field in the audit artifact — future audit v3 bump (Phase 9's D-12 approvals pattern). Phase 10 persists eval evidence alongside; audit consumption is a later concern.
- Configurable recall threshold — D-05 hard 1.0 floor is correct for v2.0; a `--threshold` flag can land later if a relaxed floor is ever justified.
- Precision regression alerts / trend tracking across phases — Phase 10 reports precision per-run; cross-phase trend dashboards are a future concern.
- Cross-corpus / external benchmark eval sets — Phase 10 reads the single in-repo `eval-cases.json`; importing external benchmarks is a future concern.

</deferred>

---

*Phase: 10-Selection-Quality Harness*
*Context gathered: 2026-07-08*
