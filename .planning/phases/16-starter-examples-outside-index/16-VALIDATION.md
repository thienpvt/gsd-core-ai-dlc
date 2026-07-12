---
phase: 16
slug: starter-examples-outside-index
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-12
verified: 2026-07-13
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` + `node:assert/strict` |
| **Config file** | `package.json`, `tsconfig.json` |
| **Quick run command** | `npm run build:test && node --test dist-test/select/starter-examples.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds quick; ~90 seconds full |

---

## Sampling Rate

- **After every task commit:** Run `npm run build:test && node --test dist-test/select/starter-examples.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | JAVA-EX-01, JAVA-EX-02 | T-16-01 | Examples remain outside the selectable rule corpus | integration | focused starter suite | ✅ | ✅ green |
| 16-01-02 | 01 | 1 | JAVA-EX-01 | — | Static snippets contain no credentials or runtime dependencies | source/integration | focused starter suite | ✅ | ✅ green |
| 16-01-03 | 01 | 1 | JAVA-EX-01, JAVA-EX-02 | T-16-01 | Published package includes examples without expanding the rule index | package/integration | `npm pack --dry-run --json` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/select/starter-examples.test.ts` — 13 layout, non-indexing, D-10, frontmatter, inventory, and package assertions.
- [x] `examples/java-spring/README.md` plus thin Java snippets — implementation fixture exercised by the suite.
- Existing test infrastructure covers execution; no framework install required.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity preserved.
- [x] Wave 0 complete.
- [x] No watch-mode flags.
- [x] Feedback latency target met.
- [x] `nyquist_compliant: true`.

**Audit 2026-07-13:** focused starter suite 13/13; package dry-run includes 9 example paths; full regression green; gaps 0.

**Approval:** verified 2026-07-13
