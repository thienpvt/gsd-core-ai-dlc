# External Integrations

**Analysis Date:** 2026-07-08

## APIs & External Services

**GSD Runtime:**
- GSD capability registry - governance overlay hooks into GSD loop points through `.gsd/capabilities/aidlc-governance/capability.json`.
  - SDK/Client: local capability contract JSON; no package SDK detected.
  - Auth: Not applicable.
- GSD/Claude skills - project-local skills under `.claude/skills/aidlc-governance-*/SKILL.md` call compiled Node hook entrypoints in `dist/governance/`.
  - SDK/Client: skill markdown protocol plus local Node scripts.
  - Auth: Not applicable.

**Governance Rule Pack:**
- AI-DLC rule corpus - local Markdown rules under `aidlc-rules/` are parsed by `src/rules/load.ts`, indexed by `src/index/build.ts`, and consumed from `rule-index.json` by `src/select/select.ts`.
  - SDK/Client: `gray-matter` for Markdown/YAML frontmatter; no network client.
  - Auth: Not applicable.

**Policy / Scanner Adapter Surface:**
- Semgrep, Bandit, Checkov, Grype, Gitleaks, generic exit-code CI, and human approval are stub names only in `src/enforcement/adapters.ts`.
  - SDK/Client: `GateAdapter` TypeScript interface in `src/enforcement/adapters.ts`; `noopAdapter` and `echoAdapter` reference stubs.
  - Auth: Not applicable in current stubs.
- Real scanner execution is not implemented. `src/enforcement/run-adapter.ts` wraps adapter output with `validateGateResult` and enforces `gateId` plus `evaluatedBy` identity.
  - SDK/Client: `src/enforcement/run-adapter.ts`.
  - Auth: Adapter-specific auth not detected.

**Evaluation Harness:**
- Local eval case fixture corpus - `src/select/eval-cli.ts` reads `test/fixtures/eval/cases/eval-cases.json`, builds index from `test/fixtures/eval/eval-rules/`, and writes `.planning/governance/eval/{NN}.json` plus `{NN}-report.md`.
  - SDK/Client: local filesystem and `node:crypto` hash.
  - Auth: Not applicable.

**Network Services:**
- Not detected in production source. No `fetch`, HTTP client, WebSocket, Stripe, Supabase, AWS SDK, database driver, or Anthropic SDK import detected under `src/`.
  - SDK/Client: Not applicable.
  - Auth: Not applicable.

## Data Storage

**Databases:**
- No external database detected.
  - Connection: Not detected.
  - Client: Not detected.

**File Storage:**
- Local filesystem only.
  - Rule source: `aidlc-rules/enterprise/require-mfa.md`.
  - Generated index: `rule-index.json`.
  - Governance selection state: `.planning/governance/selection-state.json` via `src/governance/state-store.ts`.
  - Per-phase gate evidence: `.planning/governance/gates/{NN}-{gateId}.json` via `src/governance/gate-evidence-store.ts`.
  - Human approvals: `.planning/governance/approvals/{NN}.json` via `src/governance/approval-store.ts`.
  - Test evidence: `.planning/governance/tests/{NN}.json` via `src/governance/test-evidence.ts` and `src/governance/capture-test-evidence.ts`.
  - Eval evidence/report: `.planning/governance/eval/{NN}.json` and `.planning/governance/eval/{NN}-report.md` via `src/governance/eval-evidence.ts`.
  - Audit artifact: `.planning/phases/{NN}-*/GOVERNANCE.md` via `src/governance/audit-artifact.ts`.

**Caching:**
- No application cache layer detected.
- Research cache files exist under `.planning/research/.cache/*.json`, but production code under `src/` does not read them.

## Authentication & Identity

**Auth Provider:**
- No runtime authentication provider detected.
  - Implementation: Current rules require governance around privileged access, but `aidlc-rules/enterprise/require-mfa.md` is advisory rule content, not an identity-provider integration.
- Human approval identity is file-based evidence.
  - Implementation: `src/schema/approval.schema.json` defines `decidedBy` and `decidedAt`; `src/enforcement/validate-approval.ts` requires `decidedBy` for non-`pending` decisions; `src/governance/ship-gate-hook.ts` creates pending approvals without auto-approving.

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, Datadog, Honeycomb, OpenTelemetry, or similar dependency/import present.

**Logs:**
- CLI stdout/stderr only.
  - `bin/governance.cjs` prints uncaught errors to stderr and sets `process.exitCode`.
  - `src/cli/index.ts` prints usage for unknown commands and sets `process.exitCode = 2`.
  - `src/cli/commands/select.ts` emits full selection JSON/text to stdout and prints budget overflow to stderr while setting exit code `1`.
  - `src/governance/capture-test-evidence.ts`, `src/governance/audit-artifact.ts`, `src/governance/verify-gate-hook.ts`, and `src/governance/ship-gate-hook.ts` print hook results or errors through stdout/stderr.

## CI/CD & Deployment

**Hosting:**
- npm package/CLI distribution. `package.json` has package name `@opengsd/gsd-aidlc-overlay`, version `0.1.0`, main `dist/index.js`, bin `governance`, and published files `dist`, `bin`, `aidlc-rules`.
- No Dockerfile, docker-compose, or platform deployment config detected in repo root.

**CI Pipeline:**
- No `.github/workflows/` detected.
- No CI vendor config detected in scanned project files.
- Generic exit-code CI appears as an adapter stub name in `src/enforcement/adapters.ts`, not as a real CI integration.

## Environment Configuration

**Required env vars:**
- None detected for production runtime.
- Test-only env var references:
  - `CODEX_HOME` in `src/governance/audit-hook-contract.test.ts`, `src/governance/config-no-warnings.test.ts`, `src/governance/consent.test.ts`, and `src/governance/consent-verify-post.test.ts`.

**Secrets location:**
- No `.env*` files detected at repo root.
- No credential, key, certificate, or secret config files detected in scanned root patterns.
- Secrets should not be stored in rule packs or governance artifacts; current code stores only structured evidence and local config in `.planning/`.

## Webhooks & Callbacks

**Incoming:**
- None detected. No HTTP server, route handlers, webhook endpoints, or callback listeners detected in production source.

**Outgoing:**
- None detected. No production `fetch`, HTTP client, SDK network calls, or webhook emitter detected under `src/`.

## Integration Contracts

**GateAdapter Boundary:**
- Contract interface: `src/enforcement/adapters.ts` defines `GateAdapter` with `evaluate(request): Promise<GateResult>`.
- Safe caller: `src/enforcement/run-adapter.ts` must wrap all adapter calls and validate output with `src/enforcement/validate-gate-result.ts`.
- Stub registry: `ADAPTERS` and `ECHO_ADAPTERS` in `src/enforcement/adapters.ts` use names `semgrep`, `bandit`, `checkov`, `grype`, `gitleaks`, `generic-exit-ci`, and `human-approval`.
- Schema contracts: `src/schema/gate-request.schema.json` and `src/schema/gate-result.schema.json` define binding JSON contracts for enforcement gates.

**GSD Loop Integration:**
- Discuss gate: `.claude/skills/aidlc-governance-discuss/SKILL.md` calls `node dist/governance/discuss-hook.js`; `src/governance/discuss-hook.ts` selects rules and writes `.planning/governance/selection-state.json`.
- Plan gate: `.claude/skills/aidlc-governance-plan/SKILL.md` calls `node dist/governance/plan-hook.js <projectRoot> <phaseNumber> <plannerInputsJsonFile>`; `src/governance/plan-hook.ts` writes `.planning/governance/gates/{NN}-plan.json`.
- Execute gate: `.claude/skills/aidlc-governance-execute/SKILL.md` calls `node dist/governance/execute-hook.js`; `src/governance/execute-hook.ts` reloads persisted selection and renders governance fragment.
- Verify gate: `.claude/skills/aidlc-governance-verify/SKILL.md` calls `node dist/governance/verify-gate-hook.js <projectRoot> <phaseNumber>`, `node dist/governance/capture-test-evidence.js <phaseNumber>`, and `node dist/select/eval-cli.js <phaseNumber>`.
- Audit artifact: `.claude/skills/aidlc-governance-audit/SKILL.md` calls `node dist/governance/audit-artifact.js <projectRoot> <phaseDir>/GOVERNANCE.md`.
- Ship gate: `.claude/skills/aidlc-governance-ship/SKILL.md` calls `node dist/governance/ship-gate-hook.js <projectRoot> <phaseNumber>` and blocks on missing/failing plan/verify/eval evidence or unresolved approval.

---

*Integration audit: 2026-07-08*
