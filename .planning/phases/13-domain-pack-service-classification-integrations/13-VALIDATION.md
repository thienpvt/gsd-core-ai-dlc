---
phase: 13
slug: domain-pack-service-classification-integrations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` + `node:assert/strict` (TypeScript via `tsc -p tsconfig.json`) |
| **Config file** | `tsconfig.json` (tests → `dist-test/`); no jest/vitest |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30–90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (or targeted pack test after `npm run build:test`)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|---------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | JAVA-PACK-01 | T-13-04 | Unsubscribed domains never inject pack rules | unit | `npm test` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | JAVA-PACK-02 | T-13-03 | Summaries only in inject; body canaries absent | unit | `npm test` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | JAVA-SVC-01 | T-13-01 | Internal XOR internet; ambiguous → neither | unit | `npm test` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | JAVA-SVC-02 | — | Internal summary encodes JDBC/ORM OK | unit | `npm test` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | JAVA-SVC-03 | T-13-02 | Internet gateway language; WSO2 only in Markdown | unit + grep | `npm test` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | JAVA-IN-01 | — | Controller/API paths select REST; construction only | unit | `npm test` | ❌ W0 | ⬜ pending |
| 13-01-07 | 01 | 1 | JAVA-IN-02 | — | Listener/Kafka paths select Kafka; construction only | unit | `npm test` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | JAVA-PACK-01..IN-02 | T-13-01..04 | Content + index make pack suite GREEN | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/select/java-spring-pack.test.ts` — stubs/suite for JAVA-PACK/SVC/IN matrices
- [ ] Production rules under `aidlc-rules/domain/java-spring/*.md` + `details/*`
- [ ] Rebuild `rule-index.json` after rules land
- [ ] Framework install: none — existing `npm test` sufficient

*Existing infrastructure covers the runner; missing pieces are content + pack suite only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Optional CLI smoke | JAVA-PACK-01 | Human confidence only | `governance build-index` then select with/without `--domains java-spring` |

*Core phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
