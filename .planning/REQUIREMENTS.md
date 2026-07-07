# Requirements: GSD Governance Overlay (AI-DLC × GSD Core)

**Defined:** 2026-07-06
**Core Value:** The rule selection engine injects only the relevant AI-DLC rule summaries for the current task and phase — enough governance to be safe, little enough to avoid context bloat.

## v1 Requirements

Requirements for milestone **v2.0 Govern**. Each maps to a roadmap phase (numbering continues at 6).

### Gates — Remaining GSD Loop Hooks

- [x] **GATE-03**: At the plan gate, the overlay surfaces rules relevant to requirements, risks, acceptance criteria, and impacted modules into the planner's context (summary-only, same selection engine as discuss/execute)
- [x] **GATE-04**: At the verify gate, the overlay collects verification evidence (tests run, lint, scans, policy) through enforcement adapters and records pass/fail per rule
- [x] **GATE-05**: At the ship gate, the overlay checks audit records, approvals, rollback plan, and test evidence before release and blocks on incomplete gates

### Audit — Complete Audit Record

- [ ] **AUDIT-03**: The audit artifact records requirements covered by the phase (which REQ-IDs the work addressed)
- [ ] **AUDIT-04**: The audit artifact records tests executed and their results, derived from real test-runner output (not model narration)
- [ ] **AUDIT-05**: The audit artifact records remaining risks known at ship time
- [ ] **AUDIT-06**: The audit artifact records approvals required and who granted them

### Enforcement — Tool-Agnostic Contracts & Adapters

- [x] **ENF-02**: JSON Schema (draft 2020-12) documents define the gate-request, gate-result, and audit-artifact shapes; any CI/SAST/policy engine must be wrappable to produce schema-valid output, and adapter output is Ajv-validated at runtime (malformed = hard fail)
- [x] **ENF-03**: A single `GateAdapter` interface (`evaluate(request) → Promise<GateResult>`) ships with reference no-op/echo stubs named after AI-DLC-implied tools — semgrep, bandit, checkov, grype, gitleaks, generic exit-code CI, human approval — as stubs, not first-class integrations
- [x] **ENF-04**: Binding rules route through named gate contracts (binding lives in CI/CD, SAST, tests, policy-as-code, and human approval via the tool-agnostic contracts — markdown stays advisory)

### Selection Quality

- [ ] **SEL-06**: A standing recall/precision harness exercises the selection engine against the labeled eval set and reports under-injection (critical recall) and over-injection (precision) as a repeatable, auditable check

### Approval — Human-in-the-Loop

- [ ] **APPR-01**: A human approval checkpoint schema captures approval requests, the approver, the artifact under approval, and the decision, produced/consumed through the tool-agnostic contract layer

### Tech Debt — v1.0 Fold-in (first phase)

- [x] **TD-01**: `assertTimestamp` enforces ISO 8601 shape (rejects non-ISO like `"2026/07/06"`) in `src/governance/audit-artifact.ts` — fixes WR-01 (correctness)
- [x] **TD-02**: Consent integration test renders `verify:post` post-consent and asserts the audit hook fires — covers the `onError:halt` silent-failure path (WR-03, correctness)
- [x] **TD-03**: `atomicWriteText` uses a unique temp suffix (PID/counter) before atomic rename — closes the concurrent-writer race for v2 adapters (WR-05, correctness)
- [x] **TD-04**: `selector_reason` validation unified (single error shape) across `assertSelectionArrays` + `normalizeSkipReason` (WR-02, hygiene)
- [x] **TD-05**: `isDirectRun` narrowed to the dist entry path, not any `audit-artifact.js` (WR-04, hygiene)
- [x] **TD-06**: `buildAuditRecord` export narrowed to module-internal (IN-01, hygiene)
- [x] **TD-07**: `writeGovernanceAudit` returns the resolved absolute path, not the input `outputPath` (IN-02, hygiene)
- [x] **TD-08**: `resolveGsdTools` handles the `undefined` fallback explicitly instead of an `as string` cast (IN-03, hygiene)
- [x] **TD-09**: `.planning/config.json` governance keys namespaced or split so unrelated keys (`tavily_search`, `ref_search`, `perplexity`, `jina`, `quick_branch_template`) stop triggering `gsd-tools` warnings (hygiene)

## v2 Requirements

Deferred to future milestone. Tracked but not in v2.0 roadmap.

### Operations

- **OPS-01**: Overlay surfaces governance at the operations phase (deploy/monitor) — AI-DLC's Operations subphase is future work and intentionally not covered by v2.0 gates

## Out of Scope

| Feature | Reason |
|---------|--------|
| OPA/Rego as a hard dependency | Directly violates tool-agnostic + no-lock-in constraint; an OPA adapter can ship as one optional stub, not the core |
| GitHub Actions (or any single CI) as the enforcement mechanism | Vendor lock-in; overlay must run under any CI or none — generic exit-code CI adapter stub is the boundary |
| Embeddings / vector DB for rule selection | Non-deterministic, unexplainable (breaks auditability), overkill for bounded human-authored corpus — deterministic trigger/scope matching stays |
| Forking / patching GSD Core internals | Breaks upstream upgradability — explicit Out of Scope; overlay extends via installed surfaces |
| First-class SAST/scan integrations | Adapters ship as no-op/echo stubs in v2.0; real integrations are post-v2.0 |
| Operations phase (deploy/monitor) governance | OPS-01 deferred — v2.0 covers discuss→plan→execute→verify→ship only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TD-01 | Phase 6 | Complete |
| TD-02 | Phase 6 | Complete |
| TD-03 | Phase 6 | Complete |
| TD-04 | Phase 6 | Complete |
| TD-05 | Phase 6 | Complete |
| TD-06 | Phase 6 | Complete |
| TD-07 | Phase 6 | Complete |
| TD-08 | Phase 6 | Complete |
| TD-09 | Phase 6 | Complete |
| ENF-02 | Phase 7 | Complete |
| ENF-03 | Phase 7 | Complete |
| ENF-04 | Phase 7 | Complete |
| GATE-03 | Phase 8 | Complete |
| GATE-04 | Phase 8 | Complete |
| GATE-05 | Phase 8 | Complete |
| AUDIT-03 | Phase 9 | Pending |
| AUDIT-04 | Phase 9 | Pending |
| AUDIT-05 | Phase 9 | Pending |
| AUDIT-06 | Phase 9 | Pending |
| APPR-01 | Phase 9 | Pending |
| SEL-06 | Phase 10 | Pending |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-06*
*Last updated: 2026-07-06 after v2.0 Govern milestone definition*
