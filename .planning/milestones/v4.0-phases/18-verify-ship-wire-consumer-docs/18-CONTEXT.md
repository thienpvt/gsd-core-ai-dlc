# Phase 18: Verify/Ship Wire + Consumer Docs - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning
**Mode:** Auto-decided (`/gsd-autonomous`)

<domain>
## Phase Boundary

Wire the Phase 17 `coverage-report` adapter into the existing verify/ship evidence chain when the selected binding rule is `java-spring-unit-line-coverage`. Add the smallest project configuration surface needed to subscribe the Java/Spring domain and name a consumer-produced JaCoCo or LCOV report. Document the complete consumer setup from existing documentation entrypoints. Do not add report generation, Java tooling, multi-adapter orchestration, dynamic adapter loading, or a second enforcement path.

</domain>

<decisions>
## Implementation Decisions

### Consumer Configuration
- **D-01:** Declare two additive capability-owned string keys: `governance.domains` (comma-separated, default empty) and `governance.coverage_report_path` (project-relative, default empty). The host capability schema supports boolean/string/number/enum, not arrays; documentation must state that `"domains": "java-spring"` resolves to `SelectionConfig.domains: ["java-spring"]`.
- **D-02:** Resolve domain subscriptions from `.planning/config.json` when hook callers do not supply `baseDomains`; explicit function arguments remain the test/programmatic override. Missing config means no subscribed domains. Malformed or wrongly typed governance values fail loud rather than silently under-selecting rules.
- **D-03:** `coverage_report_path` stays relative to the consumer project root. Empty/missing configuration is passed to the real adapter when the binding rule is selected so it produces durable fail evidence. Existing Phase 17 traversal, symlink, file-type, size, and canonical-containment controls remain authoritative.
- **D-04:** Do not add a format setting. Infer `.xml` as JaCoCo and `.info`/`.lcov` as LCOV; unknown suffix fails closed. Threshold remains fixed at inclusive 70%; no configurable threshold in v4.0.

### Verify and Ship Routing
- **D-05:** Detect the stable selected rule id `java-spring-unit-line-coverage` in persisted selection state. When present, `verifyGateHook` must construct/use `coverage-report`; it must never fall through to `generic-exit-ci`.
- **D-06:** An explicit non-coverage `adapterName` while the binding coverage rule is selected is a bypass attempt and must fail loud before writing verify evidence. Test injection may provide a `coverage-report` adapter under that exact name.
- **D-07:** When the binding coverage rule is absent, preserve existing behavior: explicit adapter selection wins; otherwise use `generic-exit-ci`. Keep the seven stub registries unchanged.
- **D-08:** Keep `runAdapter()` as the sole adapter validation/identity boundary and keep `GateRequest` unchanged. The persisted high-severity coverage failure remains the ship block; do not duplicate coverage parsing or threshold logic in `shipGateHook`.
- **D-09:** Add a ship-chain regression proving failed coverage verify evidence blocks shipping. Production `shipGateHook` should remain unchanged if that existing behavior is sufficient.

### Consumer Documentation
- **D-10:** Add one focused Java/Spring consumer guide, linked from README, onboarding, and governance workflow docs. Avoid duplicating full general onboarding content.
- **D-11:** Show exact project config, effective `domains: ["java-spring"]`, Java production-path selection, report-path rules, verify evidence location, and fail-closed/ship-block semantics.
- **D-12:** Show producer-owned examples for Gradle JaCoCo, Maven JaCoCo, and an LCOV report path. Clearly state the overlay never invokes Maven, Gradle, or a JDK; CI must generate the report before verify.
- **D-13:** Include a compact troubleshooting table for rule not selected, missing report, unknown suffix, zero lines, below 70%, and out-of-root/absolute paths.

### Test Contract
- **D-14:** Use TDD for config parsing and verify routing. Lock selected-coverage pass, low/missing report fail, bypass rejection, absent-rule generic fallback, unchanged stub registries, and persisted evidence through `runAdapter`.
- **D-15:** Lock capability config declarations and documentation discoverability/content with focused tests. No new npm dependencies.

### Claude's Discretion
- Exact helper filename and internal type names.
- Exact focused guide filename and prose layout.
- Whether comma-separated domain parsing trims/deduplicates values, provided ordering is deterministic and invalid empty entries do not subscribe a domain.
- Exact error text, provided bypass and malformed-config failures are explicit and test-locked.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Contract
- `.planning/ROADMAP.md` § Phase 18 — goal and three success criteria.
- `.planning/REQUIREMENTS.md` § JAVA-DOC-01 — consumer documentation requirement.
- `.planning/phases/17-coverage-parser-binding-gateadapter/17-CONTEXT.md` — frozen adapter, threshold, finding-id, and Phase 18 handoff decisions.
- `.planning/phases/17-coverage-parser-binding-gateadapter/17-VERIFICATION.md` — verified Phase 17 boundary and explicit Phase 18 deferred wiring.

### Runtime and Configuration
- `src/governance/verify-gate-hook.ts` — current default adapter routing and durable verify evidence.
- `src/governance/ship-gate-hook.ts` — existing fail-closed consumption of verify evidence.
- `src/enforcement/coverage-report.ts` — real factory, report-path trust boundary, format inference, and stable finding id.
- `src/enforcement/run-adapter.ts` — mandatory schema and adapter-identity boundary.
- `src/governance/discuss-hook.ts` and `src/governance/plan-hook.ts` — domain subscription integration points.
- `.gsd/capabilities/aidlc-governance/capability.json` — federated project config declarations and hook surfaces.

### Documentation
- `README.md` § Documentation — root discovery entrypoint.
- `docs/onboarding.md` § Activation toggle / Hook chain — project config and lifecycle entrypoint.
- `docs/governance-workflow.md` § Gate Chain — verify/ship evidence documentation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `createCoverageAdapter()` already closes over `projectRoot`, `reportPath`, and optional format; no schema widening needed.
- `verifyGateHook()` already reads persisted selected rules, calls `runAdapter()`, derives per-rule statuses, and writes verify evidence.
- `shipGateHook()` already rejects any prior verify evidence whose overall result is `fail`.
- Capability config slices accept string defaults and federate dotted keys into nested `.planning/config.json` values.

### Established Patterns
- Fail closed with durable schema-valid evidence for operational failures; throw for malformed configuration or attempted control-plane bypass.
- Keep stub registries honest and fixed at seven; real adapters are factory-created.
- Rule selection uses explicit domain subscription and summary-only selected records; stable rule id is the available enforcement discriminator.
- Node 22 stdlib, TypeScript, CommonJS-compatible output, co-located `node:test`, zero new dependencies.

### Integration Points
- Add a narrow governance config reader shared by discuss/plan/verify paths.
- Route `verifyGateHook` to `coverage-report` only when `java-spring-unit-line-coverage` is selected.
- Extend capability config declarations for domains and report path.
- Add focused docs and links from all three existing documentation entrypoints.

</code_context>

<specifics>
## Specific Ideas

- Configuration example should use `"domains": "java-spring"` and `"coverage_report_path": "build/reports/jacoco/test/jacocoTestReport.xml"`, then show the effective selection array to satisfy the domain-subscription contract without claiming array support from the host capability schema.
- A missing path must produce coverage failure evidence, not silently switch back to `generic-exit-ci`.
- Ship needs no second coverage parser: failed verify evidence is the binding handoff.

</specifics>

<deferred>
## Deferred Ideas

- Multiple simultaneous binding adapters and adapter orchestration.
- Dynamic adapter loading.
- Configurable coverage threshold, branch coverage, changed-lines coverage, and per-module report lists.
- Running Maven, Gradle, or JDK commands from the Node overlay.
- Environment-variable report-path overrides; add only if a real consumer cannot use project config.

</deferred>

---

*Phase: 18-verify-ship-wire-consumer-docs*
*Context gathered: 2026-07-12*
