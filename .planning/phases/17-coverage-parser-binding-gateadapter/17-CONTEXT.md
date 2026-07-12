# Phase 17: Coverage Parser + Binding GateAdapter - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning
**Mode:** Auto-decided (`/gsd-autonomous`)

<domain>
## Phase Boundary

Add one binding Java/Spring unit-line-coverage rule and one real, vendor-neutral `coverage-report` GateAdapter. The adapter reads an already-produced consumer report, parses JaCoCo XML or LCOV using Node stdlib only, and returns a schema-valid pass/fail result through the existing `runAdapter()` boundary. Phase 17 owns parser correctness, the 70% measurement contract, fail-closed outcomes, registration, fixtures, and rule selection. Phase 18 owns consumer report-path configuration, automatic verify/ship adapter choice, and user documentation.

</domain>

<decisions>
## Implementation Decisions

### Binding Rule Contract
- Add exactly one rule under `aidlc-rules/domain/java-spring/`: id `java-spring-unit-line-coverage`, heading `## Rule JS-COV-01: Unit Line Coverage`.
- Set `classification: binding`, `enforcement: coverage-report`, `severity: high`, and `phases: [construction]`.
- Require **unit-test line coverage ≥ 70%** for new or changed consumer Java production behavior.
- Select on Java production work rather than report files alone: `taskType` feature/bugfix/refactor plus tight Java production paths. Exclude docs, test-only tasks, and test/generated/build paths so a pure test edit does not create a circular coverage obligation.
- Keep the injected summary to one sentence. Put format/measurement explanation behind `detailPath`; retain a BODY_CANARY quarantine proof.

### Measurement Boundary
- The only binding metric is aggregate **line** coverage. Branch, instruction, method, and class coverage stay out of scope (`JAVA-COV-04` remains future).
- Threshold comparison is exact integer arithmetic: `covered * 100 >= total * 70`. Exactly 70% passes; no floating-point rounding or displayed-percent comparison.
- JaCoCo: use the single report-root `<counter type="LINE" missed="…" covered="…"/>`. Do not sum package/class/method counters because JaCoCo repeats the hierarchy and summing double-counts.
- LCOV: aggregate record-level `LF` and `LH` values across all `end_of_record` records. Reject duplicate `LF` or `LH` within a record, incomplete records, and inconsistent totals (`LH > LF`). Do not combine `DA` lines with summary counters.
- A syntactically valid report with `total === 0` fails closed: there is no measurable production-line evidence.
- Exclusions are producer-owned. The adapter evaluates exactly the report boundary supplied by the consumer; it does not infer Maven/Gradle/module/generated-source exclusions from paths.

### Parser & Format Contract
- Expose pure parser functions returning `{ covered, total }`, plus an adapter factory configured at construction time. Do not widen the published `GateRequest` schema merely to carry local filesystem configuration.
- Adapter name is exactly `coverage-report`; register it as a real adapter alongside, not inside, the locked seven-stub set. `STUB_NAMES` and `ECHO_ADAPTERS` remain seven-entry stub-only contracts.
- Factory input includes `projectRoot`, `reportPath`, and optional `format: "jacoco" | "lcov"`. Resolve relative report paths against `projectRoot`.
- When format is omitted, infer only from unambiguous suffixes (`.xml` → JaCoCo, `.info`/`.lcov` → LCOV). Unknown suffix fails closed; no content-sniffing ambiguity.
- Require the report target to stay under canonical `projectRoot`, including symlink resolution. Reject absolute/relative traversal escapes, directories, unreadable files, and oversized input before parsing. Freeze a small explicit size ceiling in implementation/tests; no streaming parser is needed for this milestone.
- XML support is deliberately narrow and report-specific: locate and validate the report-root LINE counter; reject missing, duplicate, non-integer, negative, or unsafe-integer attributes and malformed report structure. No general-purpose XML parser, DOM, entities, or DTD processing.

### Fail-Closed Gate Evidence
- Missing, unreadable, out-of-root, unsupported-format, oversized, malformed, zero-line, and below-threshold reports return a **valid `GateResult` with `status: "fail"`**, not an exception masquerading as absent evidence.
- Adapter programming faults may still throw. Schema-invalid results remain hard failures in `runAdapter()` and must never be persisted.
- Every coverage failure finding id must contain the selected binding rule id `java-spring-unit-line-coverage`, so existing `deriveRuleGateStatuses()` marks that rule failed. Use one stable finding id for the binding result; put the reason in `message`.
- Failure finding severity is `high`, matching the rule. Evidence points to the configured project-relative report path when such a safe in-project path exists.
- Passing reports return `status: "pass"` and no findings. Do not emit waived outcomes; coverage waivers require an explicit approval policy outside this phase.
- Phase 17 tests must invoke the real adapter via `runAdapter()` to prove output-schema and adapter-identity validation. Direct parser tests remain appropriate for format edge cases.

### Test & Fixture Contract
- Add focused fixtures for JaCoCo and LCOV: exactly 70% pass, below 70% fail, malformed, zero-line, and format-specific aggregation/duplication cases.
- Add missing-file and path-containment tests, plus a `runAdapter()` integration assertion for schema-valid pass/fail results.
- Add a real-corpus rule suite assertion: binding metadata, selective triggers/excludes, lazy detail/body quarantine, and inventory growth 10 → 11.
- Zero new npm dependencies. No Maven, Gradle, JDK, or shell execution. Tests use `node:test`, `node:assert/strict`, and repository-local fixtures.

### Claude's Discretion
- Exact production filenames under `src/enforcement/` and fixture directory layout.
- Exact safe report-size ceiling, provided it is explicit and tested.
- Exact wording of failure messages and detail prose.
- Whether the real adapter registry is exported as a separate map or composed registry, provided the seven-stub contract remains unchanged and Phase 18 can configure `coverage-report` without dynamic loading.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/enforcement/adapters.ts` defines `GateAdapter`, seven no-op/echo stubs, and static registries. Keep stub identity honest; add the real adapter separately.
- `src/enforcement/run-adapter.ts` is the mandatory output-validation/identity boundary.
- `src/enforcement/types.ts` and `src/schema/gate-result.schema.json` already support structured finding evidence; no result-contract change is needed.
- `src/governance/verify-gate-hook.ts` maps findings to selected rules by finding-id token and writes durable evidence. Phase 17 must produce compatible IDs; Phase 18 changes automatic selection/configuration.
- `src/rules/detail-path.ts` provides the established lexical + realpath containment pattern to mirror for report paths.

### Established Patterns
- Node 22, TypeScript, CJS-compatible output, `tsc` only.
- Tests co-located under `src/**`; fixed fixtures may live under `test/fixtures/**` and are copied by test build conventions where applicable.
- Real pack rules use one-sentence summaries, lazy detail files, tight triggers, docs/test excludes, and BODY_CANARY quarantine checks.
- Binding rules must name `enforcement`; frontmatter/index schemas already carry that field.
- Durable verify evidence is valid `GateRequest` + validated `GateResult`; ship already blocks a failing verify result.

### Integration Points
- Add the binding rule and detail under `aidlc-rules/domain/java-spring/`.
- Add parser/factory under `src/enforcement/`; export a stable `coverage-report` adapter seam for Phase 18.
- Keep `verifyGateHook` default behavior unchanged in Phase 17. Phase 18 configures the report path and chooses the real adapter when the binding rule is selected.
- Update the real-corpus inventory lock from 10 to 11.

</code_context>

<specifics>
## Specific Ideas

- JaCoCo root-level counter avoids hierarchical double counting.
- LCOV `LF`/`LH` is the portable summary contract; reject partial summaries rather than silently reconstructing a different metric.
- Integer cross-multiplication makes the inclusive 70% boundary deterministic.
- A valid fail result is preferable to a thrown parse error because verify/ship then retains durable, reviewable failure evidence.

</specifics>

<deferred>
## Deferred Ideas

- Report-path configuration surface and consumer defaults → Phase 18.
- Automatic `verifyGateHook` selection of `coverage-report` when the binding rule applies → Phase 18.
- Consumer JaCoCo/LCOV production commands and docs entrypoint links → Phase 18.
- Branch coverage → future `JAVA-COV-04`.
- Changed-lines-only coverage, per-module thresholds, Maven/Gradle invocation, streaming XML, and dynamic adapter loading → future work only if real consumer scale requires them.

</deferred>
