---
phase: 1
slug: rule-pack-format-index
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 22) + fast-check ^4.8.0 + c8 ^11 |
| **Config file** | none for the runner; `tsconfig.json` compiles tests → `dist-test/` (Wave 0 installs) |
| **Quick run command** | `node --test "dist-test/**/*.test.js"` |
| **Full suite command** | `c8 node --test "dist-test/**/*.test.js"` |
| **Estimated runtime** | ~10 seconds (greenfield — small suite) |

---

## Sampling Rate

- **After every task commit:** Run `node --test "dist-test/**/*.test.js"` (compile first via `pretest`)
- **After every plan wave:** Run `c8 node --test "dist-test/**/*.test.js"`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Task IDs are provisional (mapped to the roadmap's planned plans 01-01/01-02/01-03); the planner finalizes IDs and waves. Every phase requirement has an automated command.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-* | 01 | 1 | PACK-01 | T-1-02 | Ajv rejects unknown/missing fields (`additionalProperties:false`); `triggers:{}` accepted (D-03) | unit | `node --test dist-test/schema/frontmatter.test.js` | ❌ W0 | ⬜ pending |
| 01-01-* | 01 | 1 | PACK-03 | — | binding-without-`enforcement` rejected at build; advisory allowed (D-14/D-15) | unit | `node --test dist-test/schema/classification.test.js` | ❌ W0 | ⬜ pending |
| 01-02-* | 02 | 1 | PACK-02 | — | project>domain>enterprise precedence; loser recorded `superseded` (D-11/D-12) | unit | `node --test dist-test/rules/scope.test.js` | ❌ W0 | ⬜ pending |
| 01-03-* | 03 | 2 | PACK-04 | T-1-01 | index emits summaries+pointers, never bodies; `detailPath` traversal-guarded (D-05/D-07/D-08) | integration + property | `node --test dist-test/index/build.test.js dist-test/index/no-body.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Threat refs: T-1-01 = path traversal via `detailPath`; T-1-02 = malformed frontmatter → build crash (see RESEARCH Security Domain).*

---

## Wave 0 Requirements

Greenfield — all test infrastructure is new:

- [ ] `package.json` + `tsconfig.json` (dev config includes tests → `dist-test/`) + `pretest` build script
- [ ] `dist-test` wiring + `node --test` glob confirmed on Windows **and** Linux
- [ ] **Resolve the fast-check/tsconfig interop** (`module: nodenext` + `moduleResolution: nodenext`, package stays CommonJS) — highest-risk build-config decision; must be exercised before any test file is written
- [ ] `test/fixtures/` — valid + invalid rule files (including `triggers:{}`, advisory/binding, dangling `detailPath`)
- [ ] `dist-test/schema/frontmatter.test.js` — PACK-01
- [ ] `dist-test/schema/classification.test.js` — PACK-03
- [ ] `dist-test/rules/scope.test.js` — PACK-02
- [ ] `dist-test/index/build.test.js` + `dist-test/index/no-body.test.js` (fast-check) — PACK-04
- [ ] Install: `npm i -D fast-check@^4.8.0 c8@^11 @types/picomatch @types/gray-matter` (fast-check/c8 may already exist via GSD)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | — | — |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
