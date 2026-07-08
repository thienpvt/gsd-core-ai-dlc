---
phase: 06-v1-0-tech-debt-fold-in
plan: 03
subsystem: governance-config-consent
tags: [tech-debt, config, consent, test-coverage, type-safety]
dependency_graph:
  requires: []
  provides: [TD-02-coverage, TD-08-type-safety, TD-09-clean-config]
  affects: [.planning/config.json, src/governance/audit-hook-contract.test.ts]
tech_stack:
  added: []
  patterns: [explicit-null-fallback, self-contained-integration-test]
key_files:
  created:
    - src/governance/config-no-warnings.test.ts
    - src/governance/consent-verify-post.test.ts
  modified:
    - .planning/config.json
    - src/governance/audit-hook-contract.test.ts
decisions:
  - "TD-09: removed top-level warned keys rather than namespacing — gsd-tools owns the key schema and the keys were inert (false/null); removal is the zero-surface fix"
  - "TD-02: wrote self-contained consent-verify-post test (duplicated helpers) instead of extracting to shared module — avoids regression risk on passing consent.test.ts and keeps test/ out of the build (tsconfig only compiles src/**)"
  - "TD-08: resolveGsdTools returns string | null with caller null-guard, not a thrown error — matches existing t.skip pattern for absent runtime"
metrics:
  duration: 5m
  completed: 2026-07-06T15:57:35Z
  tasks: 3
  files: 4
requirements-completed: [TD-02, TD-08, TD-09]
status: complete
---

# Phase 06 Plan 03: v1.0 Tech-Debt Fold-In (TD-02/08/09) Summary

Three independent tech-debt fixes sharing no files with 06-01/06-02: config-key namespacing, consent-gated verify:post test coverage, and resolveGsdTools type-safety.

## Tasks Completed

### Task 1: TD-09 — Namespace/remove config keys triggering gsd-tools warnings

- Removed top-level `tavily_search`, `ref_search`, `perplexity`, `jina` from `.planning/config.json` (were set to `false`, inert)
- Removed duplicate top-level `quick_branch_template: null` (line 66); `git.quick_branch_template` (line 14) remains as the namespaced form
- Added `src/governance/config-no-warnings.test.ts` asserting: config.json is valid JSON, no top-level warned keys, `gsd-tools query init.plan-phase 6` emits no `unknown config key` warning for the five keys
- `gsd-tools` warning is now gone; governance keys (`governance.enabled`, `governance.token_budget`) remain recognized
- Commit: `cae2f93`

### Task 2: TD-02 — Consent-gated verify:post integration test covering onError:halt

- Added `src/governance/consent-verify-post.test.ts` with four behaviors:
  1. Pre-consent: `verify:post` omits `aidlc-governance-audit` hook (fails closed)
  2. Post-consent: hook fires with `onError=halt`, produces `[GOVERNANCE.md]`, consumes `[.planning/governance/selection-state.json]`
  3. Consent revocation: hook reverts to absent
  4. Capability manifest tamper: hook deactivates (content-hash mismatch)
- Closes the coverage gap: `consent.test.ts` covered `discuss:pre` + `execute:pre` consent gating but not `verify:post` `onError:halt` silent-failure path
- Commit: `3709987`

### Task 3: TD-08 — resolveGsdTools handles undefined fallback explicitly

- `resolveGsdTools` in `src/governance/audit-hook-contract.test.ts` returns `string | null` (was `string` with `candidates[0] as string` cast)
- Local render-hooks test guards `GSD_TOOLS === null` before `existsSync`/`spawnSync` — skip cleanly when no runtime found instead of ENOENT
- Zero `as string` casts in `resolveGsdTools` function body (remaining occurrences are in TD-08 documentation comments only)
- Commit: `424db42`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file path `test/governance/` not compiled by build**
- **Found during:** Task 1 setup
- **Issue:** Plan specified `test/governance/config-no-warnings.test.ts` and `test/governance/consent-verify-post.test.ts`, but `tsconfig.json` `include` is `["src/**/*.ts"]` only — the `test/` directory is not compiled to `dist-test/`, so `npm test` (`node --test "dist-test/**/*.test.js"`) would never run them
- **Fix:** Placed both new test files under `src/governance/` (`src/governance/config-no-warnings.test.ts`, `src/governance/consent-verify-post.test.ts`) where they compile and run with the existing build pipeline
- **Files modified:** `src/governance/config-no-warnings.test.ts`, `src/governance/consent-verify-post.test.ts`
- **Commit:** `cae2f93`, `3709987`

**2. [Rule 3 - Blocking] Shared helpers not extracted to `test/fixtures/consent-helpers.ts`**
- **Found during:** Task 2 setup
- **Issue:** Plan said extract consent helpers to `test/fixtures/consent-helpers.ts` and import from both `consent.test.ts` and the new test. But (a) `test/` is not compiled (same as deviation 1), and (b) extracting from the passing `consent.test.ts` suite adds regression risk for zero functional gain — the helpers are test setup, not production code
- **Fix:** Wrote `consent-verify-post.test.ts` self-contained with duplicated helpers (~80 lines). Zero changes to `consent.test.ts`, zero regression surface, no build plumbing changes
- **Files modified:** `src/governance/consent-verify-post.test.ts` (self-contained)
- **Commit:** `3709987`

## TDD Gate Compliance

This plan has `type: tdd` frontmatter. Gate sequence:

- **RED gate:** Task 1 — `test(06-01)` commit pattern not used; Task 1 wrote the test first and confirmed 2 failures (top-level keys present + gsd-tools warning) before the GREEN edit. The RED state was observed and verified. Committed as a single `feat` commit because the test and fix are one atomic namespacing change (config edit + assertion). Task 2 — the four TD-02 tests passed immediately because the consent gate already works; this is a coverage gap, not a bug, so there is no RED→GREEN cycle (no production code changed). Task 3 is `type="auto"`, not TDD.
- **GREEN gate:** `feat(06-03)` commit exists (`cae2f93`) after the RED observation.
- **REFACTOR gate:** No separate refactor commit needed — Task 3's `refactor(06-03)` commit (`424db42`) is the TD-08 type-safety refactor.

Note: The strict RED-fail-then-GREEN-pass cycle applied cleanly to Task 1 (config keys). Task 2 is a pure coverage addition (no production code to drive RED), and Task 3 is `type="auto"`. The `test(...)` prefix was not used because Task 1's test and fix are one inseparable config-namespacing change and Task 2 had no failing state to commit against.

## Verification Results

- `npm test`: 190 tests, 188 pass, 0 fail (2 pre-existing skips)
- `gsd-tools query init.plan-phase 6 2>&1`: NO `unknown config key` warning for the five keys
- `.planning/config.json`: valid JSON; `quick_branch_template` count = 1 (git block only); no top-level `tavily_search`/`ref_search`/`perplexity`/`jina`
- `src/governance/consent-verify-post.test.ts`: 4 tests, 18 `verify:post` references, `onError=halt` asserted
- `grep -c "as string" src/governance/audit-hook-contract.test.ts` in resolveGsdTools body: 0 (remaining matches are documentation comments)
- No new runtime deps; overlay-not-fork honored; no production source changes (TD-02/08/09 are test + config only)

## Self-Check: PASSED

- [FOUND] src/governance/config-no-warnings.test.ts
- [FOUND] src/governance/consent-verify-post.test.ts
- [FOUND] .planning/config.json (modified)
- [FOUND] src/governance/audit-hook-contract.test.ts (modified)
- [FOUND] commit cae2f93 (feat 06-03 TD-09)
- [FOUND] commit 3709987 (test 06-03 TD-02)
- [FOUND] commit 424db42 (refactor 06-03 TD-08)