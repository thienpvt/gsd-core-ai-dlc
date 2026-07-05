---
phase: 01-rule-pack-format-index
plan: 04
subsystem: infra
tags: [typescript, json-schema, ajv, draft-2020-12, fast-check, property-test, node-test, tdd, rule-pack, pack-03, pack-04, no-body, governance]

requires:
  - phase: 01-01
    provides: "buildIndex(rootDir)/writeIndex CLI seam + whitelist toRecord, RuleIndex/RuleIndexRecord/SupersededRecord types, loadRules body-quarantine, Ajv2020 + ajv-formats construction pattern (src/schema/validate.ts), fast-check/nodenext interop, node:test toolchain, require-mfa.md fixture"
  - phase: 01-02
    provides: "hardened frontmatter.schema.json binding->enforcement allOf if/then (D-15) — makes the binding-without-enforcement build fixture fail at load"
  - phase: 01-03
    provides: "resolvePrecedence + superseded[] record shape (id/scope/sourceFile/reason) the output schema must allow; assertScopeMatchesDirectory ordering in buildIndex"
provides:
  - "PACK-04 output schema (src/schema/rule-index.schema.json): draft 2020-12, per-record AND per-superseded-item additionalProperties:false — RESEARCH body-leak guard #2, a body/content key has nowhere to live (D-05)"
  - "validateIndex(index): Ajv2020 + ajv-formats, compiled once at module load, throws naming any stray key; wired into buildIndex before return so a body leak aborts the build at the strongest choke point (Pitfall 4)"
  - "Definitive PACK-04 proof: a fast-check property over arbitrary corpora with per-rule-unique body canaries — no canary ever reaches the serialized index and validateIndex never throws (beyond 01-01/01-03 example tests)"
  - "ROADMAP criterion 3 at BUILD level: buildIndex over a binding-without-enforcement corpus fails loudly naming the file (D-15/PACK-03), not just at the validator layer"
  - "ROADMAP criterion 4: a detailPath-bearing rule's pointer is carried verbatim into the index record; the target is never resolved/opened/stat'd (D-06 carry only; D-07/D-08 deferred to Phase 3)"
  - "Pitfall 5 build-level assertion: emitted sourceFile/detailPath are POSIX repo-relative — no backslash, not absolute, not drive-rooted"
affects: [phase-02-select, phase-03-rule-detail, phase-05-audit]

tech-stack:
  added: []
  patterns:
    - "validateIndex mirrors src/schema/validate.ts (Ajv2020 { allErrors:true, strict:true } + addFormats, compile once at load) but keeps strictRequired at its default ON — the output schema has no allOf if/then, so the 01-02 strictRequired:false relaxation is not needed"
    - "output schema single-sources ruleRecord + supersededRecord via $defs and $ref so the record shape stays one edit-point; additionalProperties:false lives on both so a body cannot hide inside a superseded loser either"
    - "fast-check 4.x has no hexaString — token generated with fc.stringMatching(/^[a-z0-9]{4,12}$/); per-rule canary sentinel __BODY_CANARY_<i>_<token>__ makes every canary positionally unique and non-colliding with any frontmatter value (review LOW), asserted per-fragment so a leak names the exact rule"
    - "no-body property drives leakage through REAL temp .md files (mkdtempSync under os.tmpdir(), cleaned in finally, numRuns 30) because loadRules quarantines the body off ParsedRule — synthetic ParsedRules could never prove the real load->build path"
    - "build-guards binding-rejection assertion checks only that buildIndex throws AND the message names the file — deliberately NOT coupled to the Ajv field name (/enforcement/), since loadRules is not contracted to surface the missing-field name and formatErrors lives in 01-02 (wave-order-stable)"

key-files:
  created:
    - "src/schema/rule-index.schema.json"
    - "src/index/validate-index.ts"
    - "src/index/validate-index.test.ts"
    - "src/index/no-body.property.test.ts"
    - "src/index/build-guards.test.ts"
    - "test/fixtures/binding-no-enforcement-store/enterprise/needs-contract.md"
    - "test/fixtures/detailpath-store/enterprise/with-detail.md"
  modified:
    - "src/index/build.ts"

key-decisions:
  - "validateIndex keeps Ajv strictRequired at its default (ON), unlike src/schema/validate.ts which sets it false. The output schema has no allOf/if-then (it only mirrors the runtime RuleIndex shape), so the strictRequired-vs-nested-required compile clash that forced the 01-02 relaxation does not exist here — leaving the full strict suite ON is the stronger default."
  - "Output schema validates triggers as `type: object` ONLY (no field-internal trigger sub-schema). The frontmatter schema (01-02) is the single source of truth for trigger internals at load time; duplicating them in the output schema would create a drift surface where a Phase 2 enum change must be edited in two places. The output schema's job is the no-body structural guard, not re-validating already-validated frontmatter."
  - "Task 1 used fc.stringMatching(/^[a-z0-9]{4,12}$/) for the canary token because fast-check 4.8.0 removed hexaString. The plan action text explicitly listed 'fc.stringMatching over a word-character regex, OR fc.hexaString' as equivalents, so this is the sanctioned option, not a substitution — verified fc.hexaString is undefined at runtime before switching."
  - "buildIndex change is a single added `validateIndex(index)` call before return; the assembled RuleIndex is hoisted into a named const first. Signature, whitelist, generatedAt/schemaVersion assignment, and writeIndex are untouched — the 01-01/01-03 contract is preserved, only the guard is added (T-1-LEAK mitigation moves from construction-only to schema-enforced)."

patterns-established:
  - "Two-layer PACK-04 enforcement is now complete: loadRules body-quarantine + toRecord whitelist (construction, 01-01) AND rule-index.schema.json additionalProperties:false + validateIndex wired into buildIndex (schema-enforced, 01-04). The fast-check property is the proof that binds both layers into a machine-checked invariant."
  - "Deferred-boundary fixtures: detailpath-store deliberately omits the details/with-detail.md target so buildIndex returning without throwing IS the proof that Phase 1 carries the pointer without resolving it (D-06/D-07/D-08 boundary made auditable by absence)."

requirements-completed: [PACK-04, PACK-03]

coverage:
  - id: D1
    description: "The emitted rule-index output schema sets additionalProperties:false on each rule record (and each superseded item), so no body/content key can exist; validateIndex rejects any index whose rule record carries an extra key (D-05, PACK-04, RESEARCH body-leak guard #2)."
    requirement: "PACK-04"
    verification:
      - kind: unit
        ref: "src/index/validate-index.test.ts#validateIndex accepts a clean, body-free index + rejects an index whose rule record carries an extra key (D-05 body-leak guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A fast-check property over arbitrary rule corpora with per-rule-unique body canaries proves the serialized index NEVER contains any rule's body text and always validates against the output schema — the definitive PACK-04 proof beyond the example-based smoke test."
    requirement: "PACK-04"
    verification:
      - kind: unit
        ref: "src/index/no-body.property.test.ts#no rule body ever reaches the serialized index across arbitrary corpora (PACK-04 / D-05) — 30 runs, per-fragment canary-absence + validateIndex never throws"
        status: pass
    human_judgment: false
  - id: D3
    description: "buildIndex over a corpus containing a binding rule that names no enforcement contract FAILS loudly at build time, naming the offending file (ROADMAP criterion 3 at index-build time, D-15, PACK-03) — 01-02 proves this only at the validator layer."
    requirement: "PACK-03"
    verification:
      - kind: e2e
        ref: "src/index/build-guards.test.ts#buildIndex fails loudly over a binding rule that names no enforcement contract (criterion 3 / D-15)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A rule that declares a detailPath has its pointer carried verbatim into the emitted index record (ROADMAP criterion 4); the target is never resolved, opened, or existence-checked (D-06 carry; D-07/D-08 deferred to Phase 3)."
    requirement: "PACK-04"
    verification:
      - kind: e2e
        ref: "src/index/build-guards.test.ts#buildIndex carries a detailPath pointer verbatim without resolving it (criterion 4 / D-06)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Emitted sourceFile pointers are POSIX repo-relative; detailPath is carried verbatim as authored, POSIX-shaped: no backslash, not absolute/drive-rooted (RESEARCH Pitfall 5, Windows/Linux drift guard)."
    requirement: "PACK-04"
    verification:
      - kind: e2e
        ref: "src/index/build-guards.test.ts#emitted sourceFile and detailPath pointers are POSIX repo-relative (Pitfall 5)"
        status: pass
      - kind: other
        ref: "node dist/cli/index.js build-index --root aidlc-rules --out rule-index.json -> schema-valid require-mfa index, exit 0"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-05
status: complete
---

# Phase 1 Plan 04: Index No-Body Hardening Summary

**Turned the walking skeleton's by-construction "no body in the index" promise into a schema-enforced, property-proven invariant: a draft 2020-12 output schema whose per-record additionalProperties:false leaves no place for a body, validateIndex wired into buildIndex so a leak aborts the build, and a fast-check property over arbitrary corpora with per-rule canaries — plus build-level proof that a binding-without-contract rule fails the build and a detailPath pointer is carried verbatim (43/43 green).**

## Performance

- **Duration:** ~6 min
- **Completed:** 2026-07-05
- **Tasks:** 3 of 3
- **Files:** 7 created, 1 modified

## Accomplishments

- Shipped `src/schema/rule-index.schema.json` — the OUTPUT schema RESEARCH calls body-leak guard #2. Per-record and per-superseded-item `additionalProperties:false` means a body/content key has literally nowhere to live (D-05/PACK-04). Record and superseded shapes are single-sourced via `$defs`/`$ref`.
- Implemented `validateIndex(index)` mirroring the 01-01/01-02 Ajv2020 + ajv-formats pattern (compiled once at load), and wired it into `buildIndex` immediately before return — so any stray key (a leaked body) aborts the build at the strongest choke point, protecting `writeIndex` and every programmatic caller transitively (Pitfall 4 defense).
- Proved PACK-04 definitively with a fast-check property (`no-body.property.test.ts`): arbitrary corpora, per-rule-unique `__BODY_CANARY_<i>_<token>__` sentinels driven through REAL temp `.md` files, asserting per-fragment that no canary reaches the serialized index AND validateIndex never throws across 30 runs.
- Proved ROADMAP criterion 3 at the BUILD level: `buildIndex` over the binding-without-enforcement fixture throws and names `needs-contract.md` — the D-15/PACK-03 rejection surfaced at index-build time, not just at the 01-02 validator layer.
- Proved ROADMAP criterion 4 and Pitfall 5: a `detailPath` pointer is carried verbatim (`details/with-detail.md`) without the target ever being resolved/opened (D-06 carry; D-07/D-08 stay deferred), and both `sourceFile`/`detailPath` are POSIX repo-relative (no backslash, not absolute, not drive-rooted).

## Task Commits

Each task committed atomically (plan `type: tdd`; RED before GREEN):

1. **Task 1 (RED): failing no-body output-schema + fast-check property + validateIndex stub** - `cf7b662` (test) — validate-index + property suites compile and are RED against the throwing stub
2. **Task 2 (GREEN): rule-index.schema.json + validateIndex wired into buildIndex** - `8648ed5` (feat) — 40/40 green, CLI emits a schema-valid require-mfa index
3. **Task 3: build-level binding-rejection + detailPath pointer + POSIX guards** - `bc445eb` (test) — build-guards suite 3/3, full suite 43/43

_TDD note: `test(01-04)` (`cf7b662`) precedes `feat(01-04)` (`8648ed5`), satisfying the MVP+TDD gate. Task 3 is an integration guard suite over the already-GREEN builder (fixtures are data), so it is a `test(...)` commit with no separate implementation._

## Files Created/Modified

- `src/schema/rule-index.schema.json` (created) - draft 2020-12 output schema; top-level required [schemaVersion, generatedAt, rules]; `$defs.ruleRecord` + `$defs.supersededRecord` both `additionalProperties:false` (no-body guard); triggers validated as object-only to avoid drift with the frontmatter schema
- `src/index/validate-index.ts` (created) - Ajv2020 + ajv-formats, compiled once; `validateIndex(index): void` throws joining Ajv errors, naming the stray key on additionalProperties failures
- `src/index/validate-index.test.ts` (created) - unit: clean index passes; extra rule-record key (injected via runtime-held key + bracket notation) rejected with an additionalProperties error
- `src/index/no-body.property.test.ts` (created) - fast-check property: per-rule-unique canaries through real temp `.md` files; per-fragment absence + `doesNotThrow(validateIndex)`; numRuns 30, temp dirs cleaned in finally
- `src/index/build-guards.test.ts` (created) - integration: binding-without-enforcement build failure names the file (criterion 3/D-15); detailPath carried verbatim (criterion 4/D-06); sourceFile/detailPath POSIX repo-relative (Pitfall 5)
- `test/fixtures/binding-no-enforcement-store/enterprise/needs-contract.md` (created) - binding rule that omits enforcement (scope matches enterprise/ tier so the failure is the missing contract, not a D-09 mismatch)
- `test/fixtures/detailpath-store/enterprise/with-detail.md` (created) - advisory rule declaring `detailPath: details/with-detail.md`; target intentionally NOT authored (proves carry-not-resolve)
- `src/index/build.ts` (modified) - hoisted the assembled RuleIndex into a named const and added a single `validateIndex(index)` call before return; imports validateIndex from `./validate-index`; signature/whitelist/writeIndex unchanged

## Decisions Made

- **validateIndex keeps Ajv `strictRequired` ON** (unlike `src/schema/validate.ts`, which sets it false). The output schema has no `allOf`/if-then — it only mirrors the runtime `RuleIndex` shape — so the strictRequired-vs-nested-required compile clash that forced the 01-02 relaxation does not arise. Leaving the full strict suite on is the stronger default.
- **Output schema validates `triggers` as `type: object` only** (no field-internal trigger sub-schema). The frontmatter schema (01-02) is the single source of truth for trigger internals at load time; duplicating them here would create a drift surface where a Phase 2 enum change must be edited twice. The output schema's job is the no-body structural guard, not re-validating already-validated frontmatter.
- **`fc.stringMatching(/^[a-z0-9]{4,12}$/)` for the canary token** because fast-check 4.8.0 removed `hexaString`. The plan action text listed "fc.stringMatching over a word-character regex, OR fc.hexaString" as equivalents, so this is the sanctioned option — verified `fc.hexaString` is `undefined` at runtime before switching.
- **build-guards binding assertion does not couple to the Ajv field name.** It asserts only that `buildIndex` throws AND the message names `needs-contract.md`. `loadRules` (01-01) is not contracted to surface the missing-field name and `formatErrors` lives in 01-02, so a file-naming throw is the wave-order-stable proof of the binding-without-contract rejection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `fc.hexaString` does not exist in fast-check 4.8.0**
- **Found during:** Task 1 (RED) first `build:test`
- **Issue:** `npm run build:test` emitted `TS2339: Property 'hexaString' does not exist` — fast-check 4.x removed the `hexaString` arbitrary the plan listed as one token-generator option.
- **Fix:** Switched to `fc.stringMatching(/^[a-z0-9]{4,12}$/)`, the co-equal option the plan action text explicitly named ("fc.stringMatching over a word-character regex, or fc.hexaString"). Verified `fc.hexaString` is `undefined` and `fc.stringMatching` is a function at runtime before editing. Not a package substitution.
- **Files modified:** src/index/no-body.property.test.ts
- **Committed in:** cf7b662 (Task 1 RED commit)

**2. [Rule 3 - Blocking] Cast to `Record<string, unknown>` needed to route through `unknown`**
- **Found during:** Task 1 (RED) first `build:test`
- **Issue:** `TS2352: Conversion of type 'RuleIndexRecord' to type 'Record<string, unknown>' may be a mistake` — TS 6 rejects the direct structural cast used to attach the stray key.
- **Fix:** Changed `as Record<string, unknown>` to `as unknown as Record<string, unknown>` (the documented escape hatch), keeping the runtime-held key + bracket-notation approach so no body/content literal appears in the test source.
- **Files modified:** src/index/validate-index.test.ts
- **Committed in:** cf7b662 (Task 1 RED commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking compile fixes within the RED task, resolved before the RED commit)
**Impact on plan:** Both were compile-time fixes to the test files needed to reach the intended RED state; the tested contract is unchanged. No scope creep — the schema/validateIndex/buildIndex behaviors match the plan exactly.

## Issues Encountered

- None beyond the two blocking compile fixes above. Both RED suites failed for exactly the intended reason (the validateIndex stub throw), confirming the tests targeted the right behavior before implementation. Mid-execution harness compactions occurred; on each resume I re-verified git state and on-disk files before continuing — no commits were lost or duplicated.

## User Setup Required

None - pure local build-time logic over local Markdown fixtures. No external service configuration.

## Next Phase Readiness

- PACK-04 is now schema-enforced (output schema, additionalProperties:false) AND property-proven (fast-check, per-rule canaries), not merely example-tested — the review's central gap ("PACK-04 claimed but only example-tested") is closed. Phase 2 selects over this index, Phase 3 injects its summaries, and Phase 5 audits from it, all inheriting the enforced no-body guarantee.
- ROADMAP criteria 3 (binding rejected at index-build time) and 4 (detailPath pointers emitted) both have passing build-level tests.
- The detailPath scope fence holds: pointers are carried, never resolved. D-06/D-07/D-08 remain deferred to Phase 3, referenced by decision id in the fixture and tests so the boundary is auditable.
- Phase-01 open flag carried forward: the taskType/phases enums 01-02 locked are accepted-for-v1 starter sets, single-sourced in the frontmatter schema `$defs` — revisit in Phase 2 before the selector binds to `taskType`. 01-04 depends on those enums only via the frontmatter schema it does not modify.
- No blockers.

---
*Phase: 01-rule-pack-format-index*
*Completed: 2026-07-05*

## Self-Check: PASSED

Files verified present: src/schema/rule-index.schema.json, src/index/validate-index.ts, src/index/validate-index.test.ts, src/index/no-body.property.test.ts, src/index/build-guards.test.ts, test/fixtures/binding-no-enforcement-store/enterprise/needs-contract.md, test/fixtures/detailpath-store/enterprise/with-detail.md, .planning/phases/01-rule-pack-format-index/01-04-SUMMARY.md.

Commits verified present: cf7b662 (test/RED no-body output-schema + property + validateIndex stub), 8648ed5 (feat/GREEN rule-index.schema.json + validateIndex wired into buildIndex — 40/40), bc445eb (test build-guards binding-rejection + detailPath + POSIX — full suite 43/43).

Test result: `npm test` exits 0 — 43 tests pass (2 validate-index unit + 1 no-body property + 3 build-guards + 37 prior 01-01/02/03 suites). `npm run build` exits 0. Real-corpus CLI emits a schema-valid single require-mfa record (exit 0).
