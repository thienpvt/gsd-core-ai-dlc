# Phase 18: Verify/Ship Wire + Consumer Docs - Research

**Researched:** 2026-07-12
**Domain:** Governance verify/ship wiring + consumer configuration + documentation
**Confidence:** HIGH

## Summary

Phase 18 connects the Phase 17 `coverage-report` factory to `verifyGateHook()` when persisted selection contains `java-spring-unit-line-coverage`, then relies on the existing ship gate to block failed verify evidence. It adds two capability-owned string settings and a focused consumer guide discoverable from README, onboarding, and workflow docs.

Most machinery already exists: `verifyGateHook()` reads persisted selected rules, builds a `GateRequest`, calls `runAdapter()`, derives rule statuses, and persists evidence. `createCoverageAdapter()` already closes over `projectRoot` and `reportPath`. `shipGateHook()` already calls `assertNonBlocking(verifyEvidence, "verify")`. Production ship logic should stay unchanged; add a regression test.

Primary implementation: add one shared governance config reader; use it as the default domain source in discuss/plan hooks and report-path source in verify; reject any explicit non-coverage adapter while the binding coverage rule is selected; preserve the generic adapter fallback otherwise.

<user_constraints>
## Locked Decisions

- Capability keys: `governance.domains` and `governance.coverage_report_path`, both strings with empty defaults.
- `domains` is comma-separated because the host capability schema supports boolean/string/number/enum, not arrays. Parse deterministically with trim, empty filtering, and first-seen deduplication; retain case sensitivity.
- Missing config/key means empty defaults. Malformed JSON, non-object governance block, or wrong types fail loud.
- Explicit hook arguments override config. Config supplies defaults only.
- Empty report path reaches the real adapter and produces durable fail evidence when the binding rule is selected.
- Format inferred only by `.xml`, `.info`, or `.lcov`; no format or threshold setting.
- Selected binding rule forces `coverage-report`. Explicit other adapter is a bypass attempt and throws before evidence write.
- Binding rule absent preserves explicit adapter or `generic-exit-ci` fallback.
- `runAdapter` and `GateRequest` stay unchanged; seven stub registries stay unchanged.
- Ship uses persisted verify failure; no coverage logic duplicated in ship.
- One focused Java/Spring consumer guide; links from README, onboarding, workflow docs.
- Producer examples: Gradle JaCoCo, Maven JaCoCo, LCOV path. Overlay never invokes Java tooling.
- Zero new dependencies; TDD for behavior with focused docs/config tests.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Coverage |
|----|-------------|----------|
| JAVA-DOC-01 | Explain domain subscription and JaCoCo/LCOV report production/configuration | Focused guide + three entrypoint links + test-locked content |

ROADMAP success criteria additionally require real adapter routing and discoverability.
</phase_requirements>

## Existing Architecture

### Runtime flow

```text
.planning/config.json
  governance.domains: "java-spring"
  governance.coverage_report_path: "build/reports/jacoco/test/jacocoTestReport.xml"
        │
        ├─ shared config reader → discussHook / planHook base domains
        │                         → selection contains binding rule
        │
        └─ shared config reader → verifyGateHook
                                  binding selected?
                                  ├─ yes: createCoverageAdapter(config)
                                  └─ no: explicit adapter / generic-exit-ci
                                           │
                                        runAdapter
                                           │
                                    verify evidence
                                           │
                         shipGateHook assertNonBlocking
```

### Responsibility map

| Capability | Owner | Change |
|------------|-------|--------|
| Config parsing | New `src/governance/config.ts` | Read/validate two settings; return typed defaults |
| Domain subscription | `discuss-hook.ts`, `plan-hook.ts` | `args.baseDomains ?? config.domains` |
| Binding adapter routing | `verify-gate-hook.ts` | Detect stable rule id; force real adapter; reject bypass |
| Coverage evaluation | Existing `coverage-report.ts` | Unchanged |
| Result validation | Existing `run-adapter.ts` | Unchanged |
| Ship block | Existing `ship-gate-hook.ts` | Unchanged; regression test only |
| Config declaration | Capability manifest | Add two string slices |
| Consumer setup | New focused guide | Link from three existing entrypoints |

## Recommended Implementation Patterns

### Shared config reader

Add `GovernanceProjectConfig` and `readGovernanceConfig(projectRoot)` under `src/governance/config.ts`.

Required semantics:

- Missing `.planning/config.json` or absent `governance` block returns `{ domains: [], coverageReportPath: "" }`.
- File read errors other than missing should fail loud; do not conflate unreadable with absent.
- Malformed JSON fails loud.
- `governance` must be a non-null non-array object.
- `domains` must be string when present. Split comma, trim, discard empty, deduplicate preserving first occurrence. Do not lowercase.
- `coverage_report_path` must be string when present. Preserve value for Phase 17 adapter validation.

Mirror the stdlib `readFileSync`/`JSON.parse` style used by `src/cli/commands/select.ts`, but do not copy its optional-budget catch-all behavior: malformed governance config here can disable binding selection, so wrong data must not silently fall back.

### Verify routing

Use constants for rule id `java-spring-unit-line-coverage` and adapter name `coverage-report`.

When selected:

1. Reject `args.adapterName` if defined and not exactly `coverage-report`.
2. If injected `args.adapters` contains `coverage-report`, use it as the test seam.
3. Otherwise read project config and construct `createCoverageAdapter({ projectRoot, reportPath: coverageReportPath })`.
4. Always call `runAdapter` afterward.

When absent: retain current `(args.adapters ?? ADAPTERS).get(args.adapterName ?? "generic-exit-ci")` behavior.

Do not statically register the real adapter. Static registry cannot carry project-specific report path and would corrupt the frozen seven-stub contract.

### Ship regression

Seed plan-pass and verify-fail evidence whose finding id is `java-spring-unit-line-coverage:coverage-report`. Assert `shipGateHook()` throws with verify-failed detail and writes no ship evidence. No production edit unless this test disproves current behavior.

### Capability config

Add siblings:

```json
"governance.domains": {
  "type": "string",
  "default": "",
  "description": "Comma-separated domain subscriptions, for example java-spring."
},
"governance.coverage_report_path": {
  "type": "string",
  "default": "",
  "description": "Project-relative path to a consumer-produced JaCoCo XML or LCOV report."
}
```

Host validation accepts only `boolean`, `string`, `number`, and `enum`. A focused test should lock types/defaults and validate the manifest through the installed registry/check surface where practical.

### Documentation

Recommended file: `docs/java-spring-coverage.md`.

Required sections:

1. Subscribe and configure:
   ```json
   {
     "governance": {
       "enabled": true,
       "domains": "java-spring",
       "coverage_report_path": "build/reports/jacoco/test/jacocoTestReport.xml"
     }
   }
   ```
   State that this resolves to `SelectionConfig.domains: ["java-spring"]`.
2. Explain binding selection: construction task touching Java production path; docs/test/infra and test/generated/build/target excluded.
3. Gradle JaCoCo producer example; CI runs `./gradlew test jacocoTestReport` before GSD verify.
4. Maven JaCoCo producer example; CI runs `mvn test`; usual output `target/site/jacoco/jacoco.xml`.
5. LCOV: existing producer writes `.info`/`.lcov`; configure that relative path. Do not invent a Java LCOV generator requirement.
6. Evidence path `.planning/governance/gates/{NN}-verify.json`; failures are durable and ship blocks.
7. Troubleshooting: rule absent, missing report, unknown suffix, zero lines, below 70%, absolute/root escape.
8. Explicit statement: overlay reads reports only; never invokes Maven, Gradle, or JDK.

README, onboarding, and governance-workflow should link, not duplicate.

## Pitfalls

1. **Explicit adapter bypass:** `generic-exit-ci` can falsely pass binding coverage unless rejected before adapter execution.
2. **Silent malformed config:** Catch-all fallback under-subscribes the domain, preventing the binding rule from ever selecting.
3. **Array docs mismatch:** Host schema rejects array values; docs must show string config and effective array semantics.
4. **Wrong injection behavior:** If an injected adapters map lacks `coverage-report`, production should still construct the real adapter rather than treating the whole map as authoritative while binding is selected. Only use injected map when it explicitly supplies the exact adapter.
5. **Multi-adapter overbuild:** Phase requires one binding adapter discriminator, not orchestration.
6. **Duplicated ship enforcement:** Ship consumes validated verify evidence; do not re-read the report.
7. **Invalid report paths:** Keep validation in Phase 17 adapter; config reader should not create a weaker parallel path validator.
8. **Docs executing Java tools:** Commands are consumer CI examples only; automated repo tests should inspect text, not run them.

## Security Threat Model Inputs

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Non-coverage adapter bypass with binding rule selected | high | Reject before adapter call/evidence write |
| Malformed/wrong-type config silently disables domain selection | high | Fail-loud JSON/object/type validation |
| Selected binding rule falls back to no-op stub | high | Stable-id routing to factory-created real adapter |
| Failed coverage verify does not block ship | high | Existing `assertNonBlocking`; regression test |
| Report path escape | high | Phase 17 lexical/canonical/post-open checks, unchanged |
| Config array/type confusion | medium | Capability string declaration + parser + docs lock |
| New dependency supply-chain surface | high | Accept zero-dependency constraint |

## Validation Architecture

| Property | Value |
|----------|-------|
| Framework | Node 22 `node:test` + `node:assert/strict` |
| Quick | `npm run build:test && node --test "dist-test/governance/config.test.js" "dist-test/governance/verify-gate-hook.test.js" "dist-test/governance/ship-gate-hook.test.js" "dist-test/governance/phase-18-docs.test.js"` |
| Full | `npm test` |

### Requirement/test map

| Behavior | Test surface |
|----------|--------------|
| Missing config defaults | New config unit test |
| Domains trim/dedup/case preservation | New config unit test |
| Malformed JSON/non-object/wrong types fail loud | New config unit test |
| Discuss/plan use configured domains unless explicit override | Existing discuss/plan suites extended |
| Binding selected routes to coverage pass/fail | Verify hook integration tests with temp reports |
| Binding selected + other adapter rejects with no evidence | Verify hook test |
| Missing report config produces durable fail | Verify hook test |
| Binding absent preserves generic/explicit fallback | Existing + regression verify tests |
| Stubs remain seven | Existing adapter test + focused assertion |
| Failed coverage verify blocks ship | Ship hook test |
| Manifest declares both string settings | Focused Phase 18 contract test |
| Guide content and three links | Focused Phase 18 docs test |

### Wave 0 gaps

- New config reader/test.
- Verify routing tests.
- Discuss/plan config integration tests.
- Ship coverage-failure regression.
- Capability config declaration test.
- Docs discoverability/content test.
- Focused consumer guide.

## Likely File Set

### New
- `src/governance/config.ts`
- `src/governance/config.test.ts`
- `src/governance/phase-18-contract.test.ts` (manifest + docs lock; one test file is enough)
- `docs/java-spring-coverage.md`

### Modified
- `src/governance/discuss-hook.ts`
- `src/governance/discuss-hook.test.ts`
- `src/governance/plan-hook.ts`
- `src/governance/plan-hook.test.ts`
- `src/governance/verify-gate-hook.ts`
- `src/governance/verify-gate-hook.test.ts`
- `src/governance/ship-gate-hook.test.ts`
- `.gsd/capabilities/aidlc-governance/capability.json`
- `.claude/skills/aidlc-governance-discuss/SKILL.md` (marshal config semantics)
- `.claude/skills/aidlc-governance-plan/SKILL.md` (marshal config semantics)
- `.claude/skills/aidlc-governance-verify/SKILL.md` (document automatic binding routing)
- `README.md`
- `docs/onboarding.md`
- `docs/governance-workflow.md`

### Frozen
- `src/enforcement/coverage-report.ts`
- `src/enforcement/run-adapter.ts`
- `src/enforcement/adapters.ts`
- `src/enforcement/types.ts`
- `src/governance/ship-gate-hook.ts`
- Gate schemas

## Sources

Primary: live Phase 18 CONTEXT, ROADMAP, REQUIREMENTS; Phase 17 CONTEXT/VERIFICATION/SECURITY; `verify-gate-hook.ts`, `ship-gate-hook.ts`, `discuss-hook.ts`, `plan-hook.ts`, `coverage-report.ts`, `run-adapter.ts`, capability manifest, existing tests/docs; installed GSD capability validator/federated config loader.

External examples should link to official JaCoCo Gradle/Maven documentation. The runtime wiring itself needs no external API research.

## Metadata

- Standard stack: HIGH confidence.
- Runtime architecture: HIGH confidence.
- Security/pitfalls: HIGH confidence.
- Java producer snippets: MEDIUM until checked against official plugin docs during doc implementation.
- Valid through: 2026-08-11.
