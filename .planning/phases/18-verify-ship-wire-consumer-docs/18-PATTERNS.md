# Phase 18: Verify/Ship Wire + Consumer Docs - Pattern Map

**Mapped:** 2026-07-12
**Files analyzed:** 15
**Analogs found:** 15/15

## File Classification

| File | Role | Closest Analog | Assignment |
|------|------|----------------|------------|
| `src/governance/config.ts` (new) | Config trust-boundary utility | `src/cli/commands/select.ts` config read + `state-store.ts` loud shape checks | Missing defaults; malformed/type errors throw; domains trim/filter/dedup |
| `src/governance/config.test.ts` (new) | Unit tests | Temp-root patterns in governance hook tests | Lock defaults, values, unreadable/malformed/wrong types |
| `src/governance/discuss-hook.ts` | Selection controller | Existing `baseDomains` line | `args.baseDomains ?? readGovernanceConfig(root).domains` |
| `src/governance/plan-hook.ts` | Selection controller | Existing `baseDomains` line | Same explicit-override/default-config rule |
| `src/governance/verify-gate-hook.ts` | Adapter dispatcher | Existing adapter lookup | Stable-rule detection, real factory, bypass rejection, fallback preservation |
| `src/governance/verify-gate-hook.test.ts` | Integration tests | Existing temp selection/evidence tests | Pass/fail/missing/bypass/fallback through `runAdapter` |
| `src/governance/ship-gate-hook.test.ts` | Regression test | Existing failed-prior-evidence test | Coverage-specific failed verify blocks ship |
| `src/governance/phase-18-contract.test.ts` (new) | Static contract test | `config-no-warnings.test.ts`, gate contract tests | Manifest settings + docs content/links |
| Capability manifest | Federated config declaration | Existing enabled/token-budget slices | Two additive string settings |
| `docs/java-spring-coverage.md` (new) | Focused guide | `docs/rule-authoring.md` | Config, producer examples, evidence, troubleshooting |
| README/onboarding/workflow docs | Discovery links | Existing documentation sections | One concise link each |

## Exact Runtime Patterns

### Config reader

```typescript
export interface GovernanceProjectConfig {
  domains: string[];
  coverageReportPath: string;
}

export function readGovernanceConfig(
  projectRoot: string,
): GovernanceProjectConfig;
```

Use `existsSync` to distinguish missing from unreadable. Resolve `path.join(projectRoot, ".planning", "config.json")`. Missing returns empty defaults. Existing unreadable, invalid JSON, invalid root/governance shape, or wrong setting type throws a path-specific error.

Domain semantics:

```typescript
const domains = value
  .split(",")
  .map((domain) => domain.trim())
  .filter((domain) => domain.length > 0);
return [...new Set(domains)];
```

Do not lowercase. Preserve `coverage_report_path` for the Phase 17 adapter to validate.

### Discuss/plan default domains

Current:

```typescript
const domains = riskAdjustedDomains(tier, args.baseDomains ?? []);
```

Target:

```typescript
const baseDomains =
  args.baseDomains ?? readGovernanceConfig(args.projectRoot).domains;
const domains = riskAdjustedDomains(tier, baseDomains);
```

Explicit `[]` is an override and must not read config.

### Verify routing

Current adapter lookup is the edit point. Target decision tree:

```text
selected contains java-spring-unit-line-coverage?
  yes:
    explicit adapterName other than coverage-report → throw
    injected map contains coverage-report → use injected adapter
    otherwise → createCoverageAdapter(projectRoot + config report path)
  no:
    use explicit adapterName or generic-exit-ci from injected/default registry
then always runAdapter(adapter, request)
```

Imports:

```typescript
import { createCoverageAdapter } from "../enforcement/coverage-report.js";
import { readGovernanceConfig } from "./config.js";
```

Frozen after routing: `GateRequest`, `runAdapter`, `deriveRuleGateStatuses`, evidence construction/write.

### Ship regression

Reuse the existing failed-plan/verify test. Seed verify evidence:

```typescript
{
  gateId: "verify",
  status: "fail",
  findings: [{
    id: "java-spring-unit-line-coverage:coverage-report",
    severity: "high",
    message: "unit line coverage 6/10 is below 70%"
  }],
  evaluatedBy: "coverage-report",
  evaluatedAt: "..."
}
```

Assert `shipGateHook()` throws, includes finding detail, and no ship evidence exists. Production `ship-gate-hook.ts` remains unchanged.

### Capability config

Add two string slices beside existing keys:

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

Host accepts only boolean/string/number/enum. Dotted settings federate into nested `.planning/config.json`.

## Test Patterns

- Temp root: `mkdtempSync`, `try/finally rmSync`.
- Write `.planning/config.json` with `mkdirSync` + `writeFileSync`.
- Seed selection with actual binding selected record and safe fixture report copied/created under temp project root.
- Assert persisted evidence using `readGateEvidence`; assert no evidence after bypass/malformed config.
- Test explicit `baseDomains: []` overrides configured `java-spring`.
- Static contract test reads manifest/docs from `process.cwd()` and asserts exact keys/links/headings/commands. It must not execute Maven/Gradle/JDK.

## Documentation Pattern

Focused guide sections:

1. Configure `"domains": "java-spring"` + relative `coverage_report_path`; explain effective `SelectionConfig.domains: ["java-spring"]`.
2. State selection boundary: construction + Java production paths; exclusions.
3. Gradle JaCoCo producer command/path.
4. Maven JaCoCo producer command/path.
5. Existing LCOV producer `.info`/`.lcov` path.
6. Verify evidence path and ship block semantics.
7. Troubleshooting table for absent rule, missing path, unknown suffix, zero lines, low coverage, absolute/root escape.
8. Explicit no-Java-tool invocation statement.

Root README uses `docs/java-spring-coverage.md`; docs pages use relative `java-spring-coverage.md`.

## Frozen Files

- `src/enforcement/coverage-report.ts`
- `src/enforcement/run-adapter.ts`
- `src/enforcement/adapters.ts`
- `src/enforcement/types.ts`
- `src/governance/ship-gate-hook.ts`
- Gate schemas

## Minimal-Diff Guidance

- One shared config utility; no config framework.
- One combined static contract test rather than separate manifest/docs suites.
- No static real-adapter registry.
- No multi-adapter loop.
- No ship production edit unless regression disproves current behavior.
- Update project skills only if their current invocation prose would misstate automatic behavior; do not replicate implementation logic in prompts.

---

*Pattern extraction date: 2026-07-12*
