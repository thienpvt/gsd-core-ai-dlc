---
phase: 16
slug: starter-examples-outside-index
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-12
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
| 16-01-01 | 01 | 1 | JAVA-EX-01, JAVA-EX-02 | T-16-01 | Examples remain outside the selectable rule corpus | integration | `npm run build:test && node --test dist-test/select/starter-examples.test.js` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | JAVA-EX-01 | — | Static snippets contain no credentials or runtime dependencies | source/integration | `npm run build:test && node --test dist-test/select/starter-examples.test.js` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 1 | JAVA-EX-01, JAVA-EX-02 | T-16-01 | Published package includes examples without expanding the rule index | package/integration | `npm pack --dry-run --json` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/select/starter-examples.test.ts` — layout, non-indexing, D-10 backstop, no-frontmatter, and inventory assertions for JAVA-EX-01/02
- [ ] `examples/java-spring/README.md` plus thin Java snippets — implementation fixture exercised by the suite
- Existing test infrastructure covers execution; no framework install required.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
