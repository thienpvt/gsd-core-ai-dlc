---
phase: 6
slug: v1-0-tech-debt-fold-in
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-08
---

# Phase 6 — Validation Strategy

> v1.0 Tech-Debt Fold-In: nine TD items (TD-01..09) reconstructed from SUMMARYs + existing test suite.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node 22 built-in) |
| **Config file** | package.json `scripts.test` / `tsconfig.build.json` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (`node --test "dist-test/**/*.test.js"` after `npm run build`) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | TD-03 | T-06-01 | Shared atomicWriteFile with unique `.<pid>-<uuid>.tmp` suffix — concurrent writers cannot clobber | unit | `npm test` | ✅ | ✅ green |
| 06-01-02 | 01 | 1 | TD-03 | T-06-02 | audit-artifact.ts + state-store.ts delegate to shared atomicWriteFile; no fixed `.tmp` suffix | unit | `npm test` | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | TD-01 | T-06-03 | assertTimestamp rejects non-ISO 8601 shapes (5 malformed variants) | unit | `npm test` | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | TD-04 | — | selector_reason validated per-element with single error shape before normalizeSkipReason | unit | `npm test` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | TD-05 | T-06-04 | isDirectRun narrowed to dist entry (__filename) — same-basename sibling does NOT trigger runDirect | integration | `npm test` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | TD-06 | T-06-05 | buildAuditRecord de-exported; tests exercise via writeGovernanceAudit end-to-end (auditFromRecord helper) | unit | `npm test` | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | TD-07 | T-06-06 | writeGovernanceAudit returns path.resolve(outputPath) absolute path | unit | `npm test` | ✅ | ✅ green |
| 06-03-01 | 03 | 1 | TD-09 | T-06-09 | gsd-tools emits no unknown-config-key warning for 5 namespaced/removed keys | integration | `npm test` | ✅ | ✅ green |
| 06-03-02 | 03 | 1 | TD-02 | T-06-07 | Consent-gated verify:post fires audit hook post-consent (onError=halt); fail-closed pre-consent/revoke/tamper | integration | `npm test` | ✅ | ✅ green |
| 06-03-03 | 03 | 1 | TD-08 | T-06-08 | resolveGsdTools returns string\|null; caller guards null explicitly — no `as string` cast | unit | `npm test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Test-File → Requirement Mapping

| Requirement | Test File | Test Name(s) |
|-------------|-----------|--------------|
| TD-01 | `src/governance/audit-artifact.test.ts` | `writeGovernanceAudit rejects non-ISO-8601 timestamps so malformed metadata cannot enter the audit trail (TD-01)`; `writeGovernanceAudit accepts the canonical ISO-8601 timestamp (TD-01 positive case)` — 5 malformed shapes rejected (slash, date-only, missing-ms, missing-tz, not-a-date) |
| TD-02 | `src/governance/consent-verify-post.test.ts` | `TD-02: consent gate keeps verify:post inactive pre-consent`; `TD-02: post-consent verify:post fires aidlc-governance-audit hook with onError=halt`; `TD-02: consent revocation deactivates verify:post`; `TD-02: tamper with capability manifest deactivates verify:post` |
| TD-03 | `src/governance/atomic-write.test.ts` | `concurrent writers to the same final path do not clobber`; `after a successful write, no *.tmp* leftover`; `uses a unique temp suffix — sentinel at .tmp survives`; `write then read returns the exact data`; `parent directory is created if missing` |
| TD-04 | `src/governance/audit-artifact.test.ts` | `writeGovernanceAudit validates selector_reason per-element with a single clear error before normalizeSkipReason runs (TD-04)`; `buildAuditRecord throws on a skipped rule reason outside the audit enum` (asserts `/selector_reason must be one of/i`) |
| TD-05 | `src/governance/audit-artifact.test.ts` | `TD-05: isDirectRun narrowed to dist entry — a same-basename sibling requiring the dist module does NOT trigger runDirect` (added during Nyquist backfill) |
| TD-06 | `src/governance/audit-artifact.test.ts` | `auditFromRecord` helper (line ~131) exercises `buildAuditRecord` via `writeGovernanceAudit` end-to-end; 5 test sites moved off direct import at Phase 6 close |
| TD-07 | `src/governance/audit-artifact.test.ts` | `writeGovernanceAudit accepts the canonical ISO-8601 timestamp` — asserts `path.isAbsolute(result.outputPath)` + `result.outputPath === path.resolve(outputPath)` (TD-07) |
| TD-08 | `src/governance/audit-hook-contract.test.ts` | `resolveGsdTools(): string \| null` (line ~66); null guard at caller (line ~253) — `if (!GSD_TOOLS \|\| !existsSync(GSD_TOOLS))` skip cleanly |
| TD-09 | `src/governance/config-no-warnings.test.ts` | asserts config.json valid JSON; no top-level `tavily_search`/`ref_search`/`perplexity`/`jina`/`quick_branch_template`; `gsd-tools query init.plan-phase 6` emits no `unknown config key` warning for the 5 keys |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no Wave 0 stubs needed. Framework (node:test) is Node 22 built-in; no install required.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-08 (Nyquist backfill — phase VERIFICATION.md already `passed`)

---

## Backfill Notes

- **TD-05 gap filled:** The original Phase 6 close left TD-05 verified only by a runtime probe (per SUMMARY 06-02: "Verified at runtime: loading the dist module with argv[1] pointing at a same-basename sibling does NOT fire runDirect"). The existing direct-runner tests (lines 350/364/374) use `RUNNER` as argv[1] and pass regardless of basename-vs-__filename comparison, so they did not cover the narrowing. Added `TD-05: isDirectRun narrowed to dist entry` integration test that creates a sibling `audit-artifact.js` requiring the dist module and asserts no `GOVERNANCE.md` is written (runDirect must not fire).
- **TD-06 note:** At Phase 6 close, `buildAuditRecord` was de-exported and tests exercised it via `auditFromRecord` → `writeGovernanceAudit` end-to-end. A later phase (09-03, commit `4b37523`) re-exported `buildAuditRecord` for v2 audit enrichment — this is a later-phase decision, not a Phase 6 regression. The `auditFromRecord` helper remains in the test file as the Phase 6 coverage artifact.
- All other TD items (01, 02, 03, 04, 07, 08, 09) were COVERED by existing tests at Phase 6 close per SUMMARYs; verified by grepping test assertions against each TD invariant.