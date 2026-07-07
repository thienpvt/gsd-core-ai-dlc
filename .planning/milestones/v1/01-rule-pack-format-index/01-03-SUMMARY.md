---
phase: 01-rule-pack-format-index
plan: 03
subsystem: infra
tags: [typescript, scope, precedence, node-test, tdd, rule-pack, pack-02, pack-04, governance]

requires:
  - phase: 01-01
    provides: "loadRules(rootDir)/ParsedRule contract, buildIndex(rootDir) whitelist seam, Scope/SupersededRecord/RuleIndexRecord types, node:test toolchain, require-mfa.md fixture"
provides:
  - "PACK-02 scope organization: deriveScope maps enterprise/domain/project directory tiers to the Scope enum, rejects any file outside the three tiers (D-10)"
  - "D-09 directory-as-source-of-truth: assertScopeMatchesDirectory rejects a rule whose frontmatter scope disagrees with its directory tier, naming file + both scope values"
  - "D-11 full-replacement cross-tier override: resolvePrecedence collapses a same-id collision to the max-ORDINAL winner (project>domain>enterprise) with every loser recorded as a superseded record, not dropped"
  - "D-12 globally-unique slug: a same-scope duplicate id is a hard build error (incl. one id under two domain sub-names); a cross-tier duplicate is the intentional override signal"
  - "buildIndex integration: scope-vs-directory validated then precedence resolved before whitelist assembly; superseded[] attached only when non-empty (01-01 single-rule shape preserved)"
  - "PACK-04 preserved through precedence: winner/superseded carry only id/scope/pointers; no fixture body leaks into the serialized index (example-level assertion; definitive fast-check proof owned by 01-04)"
affects: [01-04, phase-02-select, phase-05-audit]

tech-stack:
  added: []
  patterns:
    - "buildIndex resolves rootDir to an absolute path before loadRules + assertScopeMatchesDirectory, so deriveScope's path.relative math matches the absolute paths loadRules emits on Windows and POSIX alike"
    - "resolvePrecedence groups by id, rejects same-scope collisions via a per-group scope Map, selects a strict max-ORDINAL winner (surviving scopes distinct), and sorts output by winner id ascending + superseded by descending ordinal for deterministic, walk-order-independent output (T-1-DET)"
    - "toRecord consumes a ResolvedRule (not a ParsedRule) and reads only winner.frontmatter + winner.sourceFile — the parse result is never spread and gray-matter content is never referenced (PACK-04 by construction)"
    - "deriveScope splits the root-relative path on /[\\\\/]/ so tier detection is separator-agnostic; details/ subtrees are already excluded upstream by 01-01 loadRules"
    - "TDD RED->GREEN at both task and plan granularity: scope.test.ts stubs throw 'not implemented' (unit RED) and precedence.test.ts is RED against the unwired build.ts before the buildIndex wiring (integration RED)"

key-files:
  created:
    - "src/rules/scope.ts"
    - "src/rules/scope.test.ts"
    - "src/index/precedence.test.ts"
    - "test/fixtures/precedence-store/enterprise/input-validation.md"
    - "test/fixtures/precedence-store/domain/security/input-validation.md"
    - "test/fixtures/precedence-store/project/input-validation.md"
    - "test/fixtures/scope-mismatch-store/enterprise/mislabeled.md"
  modified:
    - "src/index/build.ts"

key-decisions:
  - "Left src/types.ts UNCHANGED: 01-01 already declared both SupersededRecord and the optional superseded?: SupersededRecord[] field on RuleIndexRecord, so this plan's conditional 'safety-valve touch' resolved to a no-op exactly as the plan anticipated ('If 01-01 already declared it, this file is left unchanged'). No type was redefined."
  - "buildIndex resolves rootDir via path.resolve BEFORE calling loadRules and assertScopeMatchesDirectory. loadRules already resolves internally, but assertScopeMatchesDirectory/deriveScope compute path.relative(rootDir, rule.absPath) and rule.absPath is absolute — passing the raw (possibly relative) rootDir would break tier derivation. Resolving once at the top keeps both consumers consistent cross-platform (Rule 2 correctness)."
  - "toRecord signature changed from toRecord(rule: ParsedRule) to toRecord(resolved: ResolvedRule); the ParsedRule import was dropped from build.ts. Necessary wiring to attach superseded[] provenance from the resolver — not a scope change."
  - "Same-scope duplicate detection uses a per-id-group Map<Scope,ParsedRule>; the first collision on a scope throws naming the id, scope, and both sourceFiles. This subsumes the two-domain-sub-name case (domain/security + domain/payments both derive scope 'domain') without a separate code path (D-12 / RESEARCH A4)."

patterns-established:
  - "Integration RED via fixture stores: precedence.test.ts asserts the wired behavior (project winner + superseded, D-09 build-throws) and fails against the pre-wiring build.ts, forming the GREEN target for the buildIndex edit — the same RED->GREEN discipline 01-01/01-02 used, applied to an integration seam."
  - "Fixtures live under test/fixtures/ (never src/, so tsc never compiles them) and are read via fs from path.resolve(process.cwd(), 'test/fixtures/...') per the SKELETON fixture convention; each fixture body carries a distinct canary sentence the no-body assertion greps for."

requirements-completed: [PACK-02, PACK-04]

coverage:
  - id: D1
    description: "deriveScope maps the enterprise/, domain/<name>/, and project/ tiers under the store root to the Scope enum and throws for any file outside the three tiers (D-10)."
    requirement: "PACK-02"
    verification:
      - kind: unit
        ref: "src/rules/scope.test.ts#deriveScope returns the tier from the first path segment under root (D-10) + deriveScope throws for a file outside the three tiers"
        status: pass
    human_judgment: false
  - id: D2
    description: "Directory is the source of truth for scope (D-09): a rule whose frontmatter scope disagrees with its directory tier is rejected — by assertScopeMatchesDirectory (unit) and by buildIndex at build time over a mismatch fixture store (integration)."
    requirement: "PACK-02"
    verification:
      - kind: unit
        ref: "src/rules/scope.test.ts#assertScopeMatchesDirectory throws (naming both scopes) on a scope/dir mismatch (D-09)"
        status: pass
      - kind: e2e
        ref: "src/index/precedence.test.ts#buildIndex fails loudly when a rule's scope does not match its directory tier (D-09)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cross-tier same-id collision resolves to the project winner with the domain + enterprise losers recorded as superseded (D-11, ROADMAP success criterion 2); a same-scope duplicate id (incl. two domain sub-names) is a hard build error (D-12)."
    requirement: "PACK-02"
    verification:
      - kind: unit
        ref: "src/rules/scope.test.ts#resolvePrecedence collapses a cross-tier id collision to the project winner with two superseded + throws a duplicate-id error for two rules in the same scope + one id under two domain sub-names"
        status: pass
      - kind: e2e
        ref: "src/index/precedence.test.ts#buildIndex resolves a cross-tier id collision to the project winner with two superseded (D-11, success criterion 2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "PACK-04 no-body guarantee survives precedence integration: winner + superseded carry only id/scope/pointers, no fixture body text appears in the serialized index, and the real corpus still emits exactly one require-mfa record with no superseded key (backward compatible with 01-01)."
    requirement: "PACK-04"
    verification:
      - kind: e2e
        ref: "src/index/precedence.test.ts#no fixture body text leaks into the serialized precedence index (PACK-04 through precedence) + the real corpus still emits exactly one record with no superseded key"
        status: pass
      - kind: other
        ref: "node dist/cli/index.js build-index --root aidlc-rules --out rule-index.json -> single require-mfa record, no superseded key"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-05
status: complete
---

# Phase 1 Plan 03: Scope Organization & Precedence Resolution Summary

**PACK-02 directory-as-source-of-truth scope derivation + full-replacement cross-tier override (project>domain>enterprise) with superseded provenance, wired into buildIndex and driven test-first — a colliding id resolves to the project winner with two superseded losers, a mis-scoped rule fails the build, and no body leaks through precedence (37/37 green).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-05
- **Tasks:** 3 of 3
- **Files:** 7 created, 1 modified (src/types.ts deliberately untouched — see Decisions)

## Accomplishments

- Built `src/rules/scope.ts` (PACK-02): `deriveScope` (tier from the first path segment under the store root, throws outside enterprise/domain/project — D-10), the `ORDINAL` precedence const (project 3 > domain 2 > enterprise 1 — D-11), `assertScopeMatchesDirectory` (rejects a frontmatter scope that disagrees with the directory tier, naming both values — D-09), and `resolvePrecedence` (collapses same-id collisions to the max-ORDINAL winner with losers as superseded records, throws on same-scope duplicates — D-11/D-12).
- Wired `buildIndex` to validate scope-vs-directory for every rule first (D-09 fail-loud), then resolve cross-tier precedence (D-11/D-12), attaching a non-empty `superseded[]` to each winner record via the existing explicit field whitelist — so the 01-01 single-rule shape and its smoke test stay unchanged.
- Proved ROADMAP success criterion 2 end-to-end: a fixture store with `input-validation` at all three tiers yields one `input-validation` record with scope `project` and a length-2 superseded array (domain + enterprise, reason `superseded`).
- Preserved PACK-04 through precedence integration: winner/superseded carry only id/scope/pointers, and a body-canary assertion confirms none of the three fixture bodies leak into the serialized index (the definitive output-schema + fast-check property proof remains 01-04's job).
- Kept the whole run deterministic and audit-reproducible (T-1-DET): winner selection is a strict max over distinct ordinals, output is sorted by winner id ascending, and superseded lists sort by descending ordinal — independent of filesystem walk order.

## Task Commits

Each task was committed atomically (plan `type: tdd`; RED before GREEN, and Task 3 itself RED→GREEN):

1. **Task 1 (RED): table-driven failing scope-derivation + precedence suite** - `3a940e8` (test) — 8 tests, 8 fail against the throwing scope.ts stubs
2. **Task 2 (GREEN): implement scope derivation + precedence resolution** - `ceba594` (feat) — scope suite 8/8 green, full suite 33/33
3. **Task 3 (RED): failing buildIndex precedence integration test + fixtures** - `17bbcd4` (test) — 2 of 4 integration assertions fail against the unwired build.ts
4. **Task 3 (GREEN): wire scope validation + precedence into buildIndex** - `5dbd2f5` (feat) — full suite 37/37 green

_TDD note: `test(01-03)` (`3a940e8`) precedes `feat(01-03)` (`ceba594`), satisfying the MVP+TDD gate; the Task 3 integration test (`17bbcd4`) was likewise RED before the buildIndex wiring (`5dbd2f5`)._

## Files Created/Modified

- `src/rules/scope.ts` (created) - `deriveScope`, `ORDINAL`, `assertScopeMatchesDirectory`, `resolvePrecedence`, `ResolvedRule` type; no rule body ever referenced
- `src/rules/scope.test.ts` (created) - 8-case table-driven PACK-02 unit suite (tier derivation, outside-tier reject, scope mismatch, project-wins precedence + 2 superseded, same-scope duplicate + two-domain-name duplicate, deterministic id ordering)
- `src/index/precedence.test.ts` (created) - fixture-backed integration: project winner + superseded, D-09 build-throws, no-body-through-precedence, real-corpus backward compatibility
- `test/fixtures/precedence-store/{enterprise,domain/security,project}/input-validation.md` (created) - three-tier colliding store with distinct summaries + body canaries
- `test/fixtures/scope-mismatch-store/enterprise/mislabeled.md` (created) - a `scope: project` rule placed under enterprise/ to trigger the D-09 build failure
- `src/index/build.ts` (modified) - imports scope module; `toRecord` now consumes a `ResolvedRule` and attaches `superseded[]` only when non-empty; `buildIndex` resolves rootDir, asserts scope-vs-directory per rule, then resolves precedence

## Decisions Made

- **`src/types.ts` left unchanged (no-op conditional touch).** The plan listed `src/types.ts` in `files_modified` as a "conditional safety-valve touch only" — add the optional `superseded` field to `RuleIndexRecord` only *if* 01-01 had not. 01-01 already declared both `SupersededRecord` and `superseded?: SupersededRecord[]`, so the field was reused as-is and the file was left untouched, exactly as the plan directed. Verified: `git diff HEAD~4 HEAD` does not touch `src/types.ts`.
- **`buildIndex` resolves `rootDir` to an absolute path** before both `loadRules` and `assertScopeMatchesDirectory`. `deriveScope` computes `path.relative(rootDir, rule.absPath)` and `rule.absPath` is absolute; passing a raw relative `rootDir` (as the CLI does with `--root aidlc-rules`) would produce a wrong relative path and mis-derive the tier. Resolving once at the top keeps the loader and the scope check consistent on Windows and POSIX.
- **`toRecord` now takes a `ResolvedRule`** (was `ParsedRule`), reading `winner.frontmatter` + `winner.sourceFile` only. This is the minimal wiring needed to carry superseded provenance from the resolver into the record; it does not widen scope or touch the no-body whitelist discipline.
- **Same-scope duplicate detection via a per-group `Map<Scope, ParsedRule>`** subsumes the two-domain-sub-name case (both `domain/security` and `domain/payments` derive scope `domain`) with no separate branch — one throw path enforces D-12 / RESEARCH A4.

## Deviations from Plan

None - plan executed exactly as written. `src/types.ts` was intentionally not modified because 01-01 already provided the optional `superseded` field, which the plan explicitly anticipated as the no-change path (not a deviation). No Rule 1/2/3 auto-fixes were required: every task compiled and reached its RED/GREEN target on the first attempt.

## Issues Encountered

- None. The RED phases produced exactly the predicted failures (8/8 unit RED against the stubs; 2/4 integration RED against the unwired builder), confirming the tests targeted the right behavior before implementation. Mid-execution harness compactions occurred; on each resume I re-verified git state and on-disk files before continuing — no commits were lost or duplicated.

## User Setup Required

None - pure local build-time logic over local Markdown fixtures. No external service configuration.

## Next Phase Readiness

- Scope derivation, scope-vs-directory enforcement, and cross-tier precedence with superseded provenance are locked and test-covered; `buildIndex` now emits winners + superseded records over the real store layout.
- **01-04** adds the no-body `rule-index.schema.json`, a fast-check property invariant proving no body ever leaks (the definitive PACK-04 proof this plan only spot-checks at the example level), and build-fails-loudly on body leak — it inherits the `superseded` record shape emitted here.
- **Phase 2 (`select`)** consumes `deriveScope`/`ORDINAL` semantics indirectly through the resolved index and will glob against the `domain/<name>/` sub-name layout (a Phase 2 scope-glob facet, not part of precedence).
- No blockers.

---
*Phase: 01-rule-pack-format-index*
*Completed: 2026-07-05*

## Self-Check: PASSED

Files verified present: src/rules/scope.ts, src/rules/scope.test.ts, src/index/build.ts, src/index/precedence.test.ts, test/fixtures/precedence-store/enterprise/input-validation.md, test/fixtures/precedence-store/domain/security/input-validation.md, test/fixtures/precedence-store/project/input-validation.md, test/fixtures/scope-mismatch-store/enterprise/mislabeled.md, .planning/phases/01-rule-pack-format-index/01-03-SUMMARY.md.

Commits verified present: 3a940e8 (test/RED scope suite — 8 tests, 8 fail), ceba594 (feat/GREEN scope+precedence — scope 8/8, full 33/33), 17bbcd4 (test/RED buildIndex integration — 2/4 fail), 5dbd2f5 (feat/GREEN buildIndex wiring — full 37/37).

Test result: `npm test` exits 0 — 37 tests pass (8 scope + 4 precedence integration + 23 schema/classification + 2 skeleton smoke). `npm run build` exits 0. Real-corpus CLI emits a single require-mfa record with no superseded key (backward compatible).
