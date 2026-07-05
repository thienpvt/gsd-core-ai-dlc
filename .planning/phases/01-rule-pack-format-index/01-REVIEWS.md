---
phase: 1
reviewers: [codex]
reviewed_at: 2026-07-05T09:00:39Z
plans_reviewed: [01-01-PLAN.md, 01-02-PLAN.md, 01-03-PLAN.md]
model: gpt-5.5 (codex-cli 0.141.0, reasoning effort xhigh)
---

# Cross-AI Plan Review — Phase 1

## Codex Review

Checked local `.planning/` and `.claude/`. Plans are mostly sound, but not phase-complete yet.

**Cross-Plan**
- **HIGH:** Missing `01-04`. SKELETON.md:93 expects no-body/index-schema hardening in Plan 01-04, and 01-02-PLAN.md:155 punts build-time binding proof there. No such plan exists in the reviewed set.
- **HIGH:** `detailPath` coverage unresolved. ROADMAP.md:28 (success criterion 4) requires `rule-index.json` with `detailPath` pointers; current plans test only rules without `detailPath`.
- **MEDIUM:** Roadmap numbering drift. ROADMAP.md:35 says 01-01 schema, 01-02 store, 01-03 index builder; plans use 01-01 skeleton, 01-02 schema, 01-03 precedence.

**Plan 01-01**
Summary: Strong walking skeleton. Proves CJS/TS build and one-rule CLI path, but should not be treated as full PACK-04.

Strengths:
- Good early build-risk retirement: `nodenext`, CommonJS, built CLI, smoke test.
- Uses boring stack from CLAUDE.md:52: Ajv, gray-matter, node:test, no bundler.
- Body quarantine starts right: `ParsedRule` has no body, index uses whitelist fields.

Concerns:
- **MEDIUM:** `rule-index.schema.json` absent despite research calling it body-leak guard (01-RESEARCH.md:420).
- **MEDIUM:** `package-lock.json` not listed, but `npm install` will create it. Deterministic governance tooling should commit lockfile.
- **LOW:** Body absence smoke test should use unique canary strings, not whole body text only.

Suggestions:
- Add lockfile to artifacts.
- Add minimal `rule-index.schema.json` now, or explicitly move PACK-04 hardening to real 01-04.
- Make canary body text unique and assert each canary fragment absent.

Risk Assessment: **MEDIUM**

**Plan 01-02**
Summary: Best-formed plan. Schema decisions match D-01..D-04 and D-13..D-15.

Strengths:
- Preserves `triggers: {}` per 01-CONTEXT.md:25.
- Correct `binding -> enforcement` schema shape, with `enforcement` top-level to avoid `additionalProperties` trap.
- Good negative tests: enums, unknown keys, required fields, advisory/binding matrix.

Concerns:
- **MEDIUM:** Roadmap success criterion 3 says rejected "at index-build time" (ROADMAP.md:27); plan proves validator only, then references missing 01-04.
- **MEDIUM:** `taskType` and `phases` enums are low-confidence research assumptions, but plan locks them as contract.

Suggestions:
- Add fixture test: `buildIndex()` over binding-without-enforcement corpus fails.
- Record enum assumptions as accepted phase decisions, or insert human checkpoint before execution.

Risk Assessment: **LOW-MEDIUM**

**Plan 01-03**
Summary: Good precedence plan. Scope derivation, collision rules, and `superseded` provenance are well covered. PACK-04 claim is too broad.

Strengths:
- Correctly implements D-09/D-10/D-11/D-12 from 01-CONTEXT.md:35.
- Strong tests for project > domain > enterprise and same-scope duplicate errors.
- Deterministic ordering called out; useful for audit reproducibility.

Concerns:
- **HIGH:** Lists PACK-04 (01-03-PLAN.md:21) but lacks output schema validation, property no-body test, and `detailPath` pointer fixture.
- **MEDIUM:** Locks same id across `domain/security` and `domain/payments` as duplicate. Research flags this as A4 needing confirmation.
- **LOW:** Should assert `sourceFile`/`detailPath` stored as POSIX repo-relative paths; Windows/Linux drift is known pitfall.

Suggestions:
- Drop PACK-04 from this plan, or add missing index-schema/property/detailPath tests here.
- Add path normalization assertion: no `\`, no absolute path in emitted pointers.
- Confirm domain-id namespace rule before execution.

Risk Assessment: **MEDIUM-HIGH**

Overall: approve direction, but not phase-ready until missing 01-04 is added or folded into 01-01/01-03.

---

## Consensus Summary

Only one external reviewer (Codex) ran this pass, so "consensus" here means **Codex cross-referenced against the internal `gsd-plan-checker`** that verified these plans earlier. Codex verified against the local `.planning/` and `.claude/` files (a forward-looking spec review — the `src/` tree is greenfield and does not exist yet). Findings below are grounded in `file:line` citations that were spot-checked against source.

### Corroborated by both reviewers (highest confidence)
- **A4 domain-id namespacing** — Codex (01-03 MEDIUM) and the internal plan-checker independently flagged that treating the same `id` under `domain/security` and `domain/payments` as a same-scope duplicate is a load-bearing assumption RESEARCH marked for confirmation. Two independent reviewers converging on this makes it the top thing to confirm before execution.
- **taskType/phases enums locked from low-confidence research** — Codex (01-02 MEDIUM) echoes the plan-checker's Dimension-11 note. The enums are editable in one `$defs` location and flagged for Phase 2 confirmation, which partially mitigates.

### New findings Codex added (not caught internally) — verified against source
- **HIGH — the SKELETON's `01-04` was dropped.** SKELETON.md:91-93 planned a 4-plan slice: 01-02 schema, 01-03 store+precedence+**detailPath resolution**, 01-04 **index no-body hardening (whitelist + output schema + fast-check property + build-fails-loudly)**. The walking-skeleton reorg folded the index builder into 01-01 and never created 01-04. Confirmed: no `01-04-PLAN.md` exists.
- **HIGH — PACK-04 is claimed but only example-tested.** 01-01 and 01-03 both claim PACK-04, and both assert body-absence with example fixtures, but neither ships `rule-index.schema.json` (01-RESEARCH.md:420 calls it the body-leak guard) nor a fast-check **property** test. This is the substance of the missing 01-04.
- **HIGH/interacts-with-a-prior-decision — `detailPath` pointer coverage.** ROADMAP success criterion 4 (line 28) requires the index to emit `detailPath` pointers. No plan tests a rule that *has* a detailPath, so pointer pass-through is unproven. **Note:** this partially overlaps the D-06/D-07/D-08 deferral made during planning — but those deferred decisions were about *validating/resolving* the target (Phase 3), whereas criterion 4 is about the index *carrying* the pointer (Phase 1). 01-01 whitelists `detailPath` if present, so emission likely works; it is simply untested.
- **MEDIUM — binding rejection proven at validator level, not build level.** Success criterion 3 (ROADMAP.md:27) says a binding-without-enforcement rule is rejected "at index-build time." 01-02 proves it at the Ajv-validator layer and explicitly defers the build-time fixture proof to the (missing) 01-04.
- **MEDIUM — no committed lockfile.** Deterministic governance tooling should commit `package-lock.json`; it is not in any plan's artifacts.
- **LOW — POSIX path assertions + unique canary strings** — hardening nits for the no-body and path-normalization tests.

### Divergent / worth-noting
- Codex's "roadmap numbering drift" (MEDIUM) matches what was surfaced during planning. The ROADMAP plan *list* was re-annotated (Wave 1: 01-01; Wave 2: 01-02, 01-03), but the plan *descriptions* on ROADMAP.md:35-40 still read from the pre-skeleton breakdown (schema / store / index-builder). Cosmetic, but it is what misled the reviewer's numbering expectation.

### Bottom line
Codex approves the direction of all three plans but judges the phase **not yet phase-complete**: the SKELETON's `01-04` (output schema + property no-body test + build-time binding proof + detailPath pointer coverage) was lost in the walking-skeleton reorg. The fix is either a new `01-04` plan or folding that hardening into 01-01/01-03. This is a real gap in *proving* PACK-04 to the standard RESEARCH and the ROADMAP success criteria set — the plans build the guarantee by construction but under-test it.
