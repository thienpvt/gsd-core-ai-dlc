# Codebase Concerns

**Analysis Date:** 2026-07-08

## Tech Debt

**Capability manifest evidence declaration constrained by installed GSD runtime:**
- Issue: The verify/audit capability `consumes` lists stay narrow because extending them invalidates the installed GSD Core capability content hash. The audit step reads more state than the manifest declares.
- Files: `.gsd/capabilities/aidlc-governance/capability.json`, `.planning/milestones/v2.0-MILESTONE-AUDIT.md`, `.claude/skills/aidlc-governance-audit/SKILL.md`, `.claude/skills/aidlc-governance-verify/SKILL.md`
- Impact: Capability metadata under-declares inputs used by audit/evidence production. Runtime consent and audit visibility can diverge from actual file access until GSD Core supports the consumes edit cleanly.
- Fix approach: Coordinate with installed GSD Core capability hashing/consent behavior, then extend `verify:post` and audit `consumes` to include `.planning/governance/tests/{NN}.json`, `.planning/governance/approvals/{NN}.json`, `.planning/REQUIREMENTS.md`, and phase `VERIFICATION.md`.

**Reference enforcement adapters are stubs only:**
- Issue: `ADAPTERS` returns clean pass results for `semgrep`, `bandit`, `checkov`, `grype`, `gitleaks`, `generic-exit-ci`, and `human-approval`; external scanners are not executed.
- Files: `src/enforcement/adapters.ts`, `src/enforcement/run-adapter.ts`, `src/governance/verify-gate-hook.ts`, `.planning/STATE.md`
- Impact: Verify gate evidence is schema-valid but not backed by scanner execution unless callers inject real adapters through `VerifyGateHookArgs.adapters`. Ship gates can pass on no-op verify evidence.
- Fix approach: Keep `GateAdapter` contract stable and add optional real adapter implementations at the boundary. Route all adapters through `runAdapter()` so malformed tool output still fails via `validateGateResult()`.

**Early governance gates skip on hook errors:**
- Issue: `discuss:pre`, `plan:pre`, and `execute:pre` use `onError: "skip"`; only `verify:post` and `ship:pre` use `onError: "halt"`.
- Files: `.gsd/capabilities/aidlc-governance/capability.json`, `.claude/skills/aidlc-governance-discuss/SKILL.md`, `.claude/skills/aidlc-governance-plan/SKILL.md`, `.claude/skills/aidlc-governance-execute/SKILL.md`
- Impact: Failed early injection can remove governance context from discussion/planning/execution. Ship catches missing plan/verify evidence later, but user-facing context can still be under-injected before the hard gates.
- Fix approach: Decide whether early gate context loss should halt or remain advisory. If hard enforcement is required, change `onError` to `halt` for early steps and update consent/runtime tests.

**Per-plan SUMMARY frontmatter omits requirement IDs in selected plans:**
- Issue: Six per-plan summaries omit `requirements-completed` despite verification evidence covering the requirements.
- Files: `.planning/milestones/v2.0-phases/06-v1-0-tech-debt-fold-in/06-02-SUMMARY.md`, `.planning/milestones/v2.0-phases/06-v1-0-tech-debt-fold-in/06-03-SUMMARY.md`, `.planning/milestones/v2.0-phases/07-enforcement-contracts-adapter-stubs/07-01-SUMMARY.md`, `.planning/milestones/v2.0-phases/07-enforcement-contracts-adapter-stubs/07-02-SUMMARY.md`, `.planning/milestones/v2.0-phases/10-selection-quality-harness/10-01-SUMMARY.md`, `.planning/milestones/v2.0-phases/10-selection-quality-harness/10-02-SUMMARY.md`
- Impact: Machine readers using only SUMMARY frontmatter see partial coverage and require manual verification against phase `VERIFICATION.md` files.
- Fix approach: Backfill `requirements-completed` fields from phase verification tables. Treat phase `VERIFICATION.md` as authoritative until frontmatter is normalized.

**Eval npm script needs positional forwarding:**
- Issue: `npm run eval` maps to `node dist/select/eval-cli.js` and requires a phase argument passed as `npm run eval -- <phaseNumber>`.
- Files: `package.json`, `src/select/eval-cli.ts`, `src/cli/commands/eval.ts`, `.planning/milestones/v2.0-MILESTONE-AUDIT.md`
- Impact: Bare `npm run eval` exits with usage error. Operators can mistake this for a harness break when the canonical skill path invokes `node dist/select/eval-cli.js <NN>` directly.
- Fix approach: Keep current script if npm convention is acceptable, or add a second script such as `eval:phase10` only if repeated manual invocation needs a shortcut.

**Validator boilerplate deliberately duplicated:**
- Issue: Ajv setup and `formatErrors()` are duplicated across validation modules for crash isolation.
- Files: `src/schema/validate.ts`, `src/enforcement/validate-gate-result.ts`, `src/enforcement/validate-approval.ts`, `src/governance/test-evidence.ts`, `src/governance/eval-evidence.ts`
- Impact: Schema validation behavior can drift if future changes update one validator and skip another.
- Fix approach: Preserve duplication only where crash isolation is required. When editing validation behavior, update all validator copies and add contract tests for each boundary.

## Known Bugs

**No critical runtime bugs detected in current source scan:**
- Symptoms: Test and milestone evidence show current shipped state with zero critical blockers.
- Files: `.planning/milestones/v2.0-MILESTONE-AUDIT.md`, `package.json`, `src/**/*.test.ts`
- Trigger: Not applicable.
- Workaround: Not applicable.

**Bare eval command reports usage without phase argument:**
- Symptoms: `npm run eval` exits with usage error because `src/select/eval-cli.ts` requires exactly one positional phase number.
- Files: `package.json`, `src/select/eval-cli.ts`, `src/cli/commands/eval.ts`
- Trigger: Run `npm run eval` without `-- <phaseNumber>`.
- Workaround: Run `npm run eval -- 10` or `node dist/select/eval-cli.js 10`.

## Security Considerations

**Scanner names do not imply scanner execution:**
- Risk: Consumers can assume `semgrep`, `bandit`, `checkov`, `grype`, or `gitleaks` evidence reflects real tool output, but default adapters are no-op stubs.
- Files: `src/enforcement/adapters.ts`, `src/governance/verify-gate-hook.ts`, `.gsd/capabilities/aidlc-governance/capability.json`
- Current mitigation: Stubs are documented as reference-only, `runAdapter()` validates schema shape, and `ECHO_ADAPTERS` is test-only behavior.
- Recommendations: Label default verify evidence as stub-backed in operator docs and require injected real adapters for production security enforcement.

**Human approval is file-backed and editable out-of-band:**
- Risk: Approval decisions live in `.planning/governance/approvals/{NN}.json`; a local actor with repository write access can edit approval state.
- Files: `src/governance/approval-store.ts`, `src/governance/ship-gate-hook.ts`, `src/enforcement/validate-approval.ts`, `src/schema/approval.schema.json`
- Current mitigation: `validateApproval()` rejects malformed approval records and anti-auto-approval invariants require human fields for resolved decisions. Ship gate creates pending approval with `O_CREAT | O_EXCL` to avoid clobbering concurrent human edits.
- Recommendations: Treat approval files as audit artifacts, not identity proof. For production, back approval decisions with signed commits, protected branches, or an external approval system adapter.

**Rule detail body loading is intentionally narrow but still opens local files:**
- Risk: `governance rule-detail` reads detail Markdown bodies from paths declared in rule frontmatter. A crafted index could attempt path traversal or symlink escape.
- Files: `src/cli/commands/rule-detail.ts`, `src/rules/detail-path.ts`, `src/index/build.ts`, `src/rules/detail-path.test.ts`
- Current mitigation: `resolveDetailPath()` rejects absolute paths, `..` escapes, and symlink escapes; `buildIndex()` validates detail targets at build time; fetch-time guard rechecks before `readFileSync()`.
- Recommendations: Keep all future detail loaders routed through `resolveDetailPath()` and never read `detailPath` directly.

**No secret files detected in repo root scan:**
- Risk: Not detected for `.env*` files. Secret-looking fixture name is a rule fixture, not a credential file.
- Files: `test/fixtures/eval/eval-rules/enterprise/secrets-management.md`
- Current mitigation: Secret files are absent from scan results; forbidden secret contents are not read.
- Recommendations: Keep `.env*`, credentials, and private keys out of git; scan with real `gitleaks` adapter when production enforcement is added.

## Performance Bottlenecks

**Rule selection recompiles path globs per selection:**
- Problem: `select()` calls `picomatch(glob, { dot: true })` inside each selection run for each rule path trigger.
- Files: `src/select/select.ts`
- Cause: Matchers are not cached in `RuleIndex`; selection stays pure and index records stay serializable.
- Improvement path: Add an in-memory matcher cache keyed by glob string only if large rule packs make selection measurable. Keep cache outside persisted `rule-index.json`.

**Build and eval paths read and parse full corpora synchronously:**
- Problem: `buildIndex()` and the eval CLI synchronously scan/read Markdown and JSON inputs.
- Files: `src/index/build.ts`, `src/rules/load.ts`, `src/select/eval-cli.ts`, `test/fixtures/eval/cases/eval-cases.json`
- Cause: CLI workload favors deterministic simple filesystem access over async complexity.
- Improvement path: Keep sync I/O for CLI-sized corpora. Add incremental index reuse only when rule packs are large enough for build time to block workflows.

**Test evidence capture runs compiled test suite:**
- Problem: `capture-test-evidence` spawns `node --test --test-reporter=tap dist-test/**/*.test.js`, so verify-time evidence cost grows with test suite size.
- Files: `src/governance/capture-test-evidence.ts`, `src/governance/test-evidence.ts`, `.claude/skills/aidlc-governance-verify/SKILL.md`
- Cause: Audit evidence intentionally comes from real runner output, not model narration.
- Improvement path: Keep real runner output as source of truth. Add suite filters only if governance evidence requires scoped test runs by phase.

**Audit enrichment parses Markdown with regex:**
- Problem: Requirements and remaining risks extraction uses regex over markdown tables, checkboxes, and `<deferred>` blocks.
- Files: `src/governance/audit-enrich.ts`, `src/governance/audit-artifact.ts`
- Cause: Planning artifacts are Markdown, and no structured sidecar exists for requirements/risk extraction.
- Improvement path: Introduce structured JSON/YAML planning sidecars only if Markdown formats become unstable. Until then, update regex tests whenever planning table shape changes.

## Fragile Areas

**Capability manifest and installed runtime consent hash:**
- Files: `.gsd/capabilities/aidlc-governance/capability.json`, `.gsd-capabilities.json`, `.planning/milestones/v2.0-MILESTONE-AUDIT.md`
- Why fragile: Capability content hash and `consumes` validation are enforced by installed GSD Core behavior outside this repository. Local manifest edits can deactivate the capability.
- Safe modification: Change manifest fields with consent/hash tests against the installed runtime. Avoid broadening `consumes` until runtime behavior is coordinated.
- Test coverage: Contract coverage exists in `src/governance/audit-hook-contract.test.ts`; installed-runtime behavior remains an external dependency.

**STATE.md phase parsing duplicated:**
- Files: `src/governance/discuss-hook.ts`, `src/governance/plan-hook.ts`, `.claude/skills/aidlc-governance-discuss/SKILL.md`, `.claude/skills/aidlc-governance-plan/SKILL.md`
- Why fragile: Both hooks parse `current_phase` frontmatter with regex and map numbers through `phaseFromNumber()`. Format drift in `.planning/STATE.md` can break early gate injection.
- Safe modification: Keep failure loud on missing/malformed phase. If STATE shape changes, update both parsers or extract one shared parser with tests.
- Test coverage: Hook tests cover malformed and missing state paths; real project `.planning/STATE.md` shape remains the integration contract.

**Governance state is a latest-record singleton:**
- Files: `src/governance/state-store.ts`, `src/governance/execute-hook.ts`, `src/governance/verify-gate-hook.ts`, `.planning/governance/selection-state.json`
- Why fragile: Execute and verify reload the latest selection state. Concurrent governed tasks can overwrite `.planning/governance/selection-state.json` before later gates read it.
- Safe modification: Use `writePhaseRecord()` or task-specific keys for concurrent workflows. Keep canonical singleton for simple single-task loop behavior.
- Test coverage: Atomic write and reload tests cover file integrity, not concurrent independent task isolation.

**Audit enrichment depends on artifact naming conventions:**
- Files: `src/governance/audit-artifact.ts`, `src/governance/audit-enrich.ts`, `.claude/skills/aidlc-governance-audit/SKILL.md`
- Why fragile: Audit output path must be `.planning/phases/{NN}-*/GOVERNANCE.md`, but current repository stores historical phases under `.planning/milestones/...`; the audit skill requires exactly one matching `.planning/phases/{NN}-*/` directory.
- Safe modification: Keep `assertGovernanceOutputPath()` strict for generated artifacts. If phase storage layout stays milestone-scoped, update skill resolution and output guard together.
- Test coverage: Unit/integration tests cover output guard behavior; repository layout scan shows `.planning/phases/` absent.

**Eval corpus is small and fixture-backed:**
- Files: `test/fixtures/eval/cases/eval-cases.json`, `test/fixtures/eval/eval-rules/`, `src/select/eval-cli.ts`, `src/select/eval-harness.ts`
- Why fragile: Selection quality gate only measures labeled fixture cases. New rule domains can miss coverage if fixture cases are not expanded with them.
- Safe modification: Add a labeled eval case whenever adding a critical rule, new domain, or new trigger pattern. Keep `expectedRuleIds` aligned with `test/fixtures/eval/eval-rules/`.
- Test coverage: Eval fixture tests assert consistency and critical recall math; coverage quality depends on fixture breadth.

**Synchronous atomic writes are local-filesystem oriented:**
- Files: `src/governance/atomic-write.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/test-evidence.ts`, `src/governance/eval-evidence.ts`, `src/governance/approval-store.ts`
- Why fragile: `renameSync()` is atomic on POSIX and near-atomic on Windows local filesystems, but network filesystems and cross-device paths can weaken assumptions.
- Safe modification: Keep final paths within the same local `.planning/governance/` tree. Avoid writing governance ledgers across mounted volumes.
- Test coverage: Atomic-write tests cover temp suffix and write behavior; filesystem semantics outside local development are environment-dependent.

## Scaling Limits

**Rule pack size:**
- Current capacity: Source scan shows one production rule under `aidlc-rules/enterprise/require-mfa.md` plus eval fixtures under `test/fixtures/eval/eval-rules/`.
- Limit: Selection is linear over index rules, and each path trigger compiles a picomatch matcher per run in `src/select/select.ts`.
- Scaling path: Cache compiled matchers or precompute normalized trigger metadata when rule packs grow enough to make `governance select` latency visible.

**Single-task governance ledger:**
- Current capacity: `.planning/governance/selection-state.json` stores one latest selection record; per-phase evidence stores one record per gate/phase.
- Limit: Parallel governed tasks in the same repo can race semantically even though writes are atomic.
- Scaling path: Add task IDs to state and gate evidence paths, then thread task identity through `.claude/skills/aidlc-governance-*` and hook args.

**Approval workflow:**
- Current capacity: One approval JSON per phase at `.planning/governance/approvals/{NN}.json`.
- Limit: Multiple ship candidates in the same phase share one approval slot.
- Scaling path: Add artifact-specific approval IDs or external approval adapter integration when multiple independent ship artifacts exist per phase.

**Eval harness corpus:**
- Current capacity: `test/fixtures/eval/cases/eval-cases.json` is small and committed.
- Limit: Recall/precision confidence is bounded by manually authored fixture cases; it does not sample live project tasks.
- Scaling path: Add cases from real missed/over-selected governance events and keep critical recall at 1.0 for all critical rules.

## Dependencies at Risk

**GSD Core installed runtime behavior:**
- Risk: Capability content hash and consent/consume semantics live outside this package but determine whether `.gsd/capabilities/aidlc-governance/capability.json` activates safely.
- Impact: Manifest changes can deactivate governance capability or misalign declared file access.
- Migration plan: Keep manifest edits minimal and validate against target GSD Core runtime. Track upstream runtime changes before broadening capability contracts.

**gray-matter YAML parsing:**
- Risk: Rule frontmatter parsing depends on `gray-matter` behavior and its YAML parser defaults.
- Impact: YAML edge-case behavior affects `src/rules/load.ts`, rule indexing, and `governance rule-detail` body extraction.
- Migration plan: If dependency behavior becomes a concern, replace with a small frontmatter splitter plus existing `js-yaml` parsing, preserving schema validation in `src/schema/validate.ts`.

**picomatch path matching:**
- Risk: Trigger path semantics depend on `picomatch` with `{ dot: true }`.
- Impact: A matching semantic change can alter selected governance rules, especially dotfile/CI/config paths.
- Migration plan: Pin dependency versions and keep path-trigger tests for `.github`, `.env`-style, Windows-normalized, and globstar patterns.

## Missing Critical Features

**Production scanner adapters:**
- Problem: Tool-agnostic contract exists, but real scanner execution adapters are absent.
- Blocks: Binding security enforcement through actual Semgrep/Bandit/Checkov/Grype/Gitleaks results.

**External approval identity:**
- Problem: Human approval state is local JSON without cryptographic identity proof.
- Blocks: Strong enterprise approval attestations unless repository controls supply identity and tamper resistance.

**Structured planning metadata sidecars:**
- Problem: Audit enrichment extracts requirements and remaining risks from Markdown.
- Blocks: Fully stable machine-readable audit generation across arbitrary planning-doc format changes.

**Concurrent governed task identity:**
- Problem: Selection state and approvals are keyed by latest record or phase.
- Blocks: Safe parallel governance loops in one working tree.

## Test Coverage Gaps

**Real external adapters:**
- What's not tested: Actual scanner execution, scanner output parsing, tool availability errors, and scanner-specific finding normalization.
- Files: `src/enforcement/adapters.ts`, `src/enforcement/adapters.test.ts`, `src/governance/verify-gate-hook.test.ts`
- Risk: Production adapter implementations can emit malformed or misleading results unless added with contract tests through `runAdapter()`.
- Priority: High when real enforcement adapters are added.

**Installed GSD runtime manifest behavior:**
- What's not tested: Full installed-runtime response to broadened capability `consumes` declarations.
- Files: `.gsd/capabilities/aidlc-governance/capability.json`, `src/governance/audit-hook-contract.test.ts`, `.planning/milestones/v2.0-MILESTONE-AUDIT.md`
- Risk: Local changes can pass unit tests but deactivate or mis-register the capability under installed GSD Core.
- Priority: High for capability manifest changes.

**Parallel governed workflows:**
- What's not tested: Two simultaneous tasks writing and reading `.planning/governance/selection-state.json`, phase gate evidence, or approvals.
- Files: `src/governance/state-store.ts`, `src/governance/gate-evidence-store.ts`, `src/governance/approval-store.ts`, `src/governance/ship-gate-hook.ts`
- Risk: Atomic file integrity holds, but semantic cross-talk between tasks can produce wrong evidence for a later gate.
- Priority: Medium until concurrent task execution is supported.

**Markdown planning format drift:**
- What's not tested: Broad variations of `.planning/REQUIREMENTS.md`, `VERIFICATION.md`, and `<deferred>` section formatting beyond current fixtures.
- Files: `src/governance/audit-enrich.ts`, `src/governance/audit-enrich.test.ts`, `src/governance/audit-artifact.ts`
- Risk: Audit enrichment can omit requirements or risks when planning docs change shape.
- Priority: Medium.

**Repository layout mismatch for current audit skill path:**
- What's not tested: Running `.claude/skills/aidlc-governance-audit/SKILL.md` in a repo that stores phases under `.planning/milestones/v2.0-phases/` while `.planning/phases/` is absent.
- Files: `.claude/skills/aidlc-governance-audit/SKILL.md`, `src/governance/audit-artifact.ts`, `.planning/milestones/v2.0-phases/`
- Risk: Audit skill can fail to resolve phase directory in this repository layout even though audit writer tests pass for its strict path contract.
- Priority: Medium.

---

*Concerns audit: 2026-07-08*
