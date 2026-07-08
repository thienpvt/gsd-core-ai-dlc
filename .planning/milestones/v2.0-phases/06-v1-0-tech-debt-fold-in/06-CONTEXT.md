# Phase 6: v1.0 Tech-Debt Fold-In - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped, grey areas N/A)

<domain>
## Phase Boundary

Harden the v1.0 codebase before Phases 7-10 open a new gate surface: 3 correctness fixes (TD-01 timestamp shape, TD-02 consent audit-hook coverage, TD-03 atomic-write race) + 6 hygiene cleanups (TD-04 unified `selector_reason`, TD-05 `isDirectRun` narrowed to dist entry, TD-06 `buildAuditRecord` export narrowed to module-internal, TD-07 `writeGovernanceAudit` returns resolved absolute path, TD-08 `resolveGsdTools` handles `undefined` fallback, TD-09 config-key namespacing). No new features — refactor + hardening only. Phases 7-10 must open on a clean foundation.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure/hardening phase. ROADMAP success criteria (TD-01..09) are the spec. Use codebase conventions, existing test harness (`node scripts/run-tests.cjs`), and the v1.0 milestone audit's deferred-items list to guide decisions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/governance/audit-artifact.ts` — houses TD-01/03/05/06/07 targets: `assertTimestamp` (line 99, currently `Date.parse`-only — accepts non-ISO shapes like `"2026/07/06"`), `atomicWriteText` (line 68, temp suffix `${finalPath}.tmp` — collides under concurrent writers), `buildAuditRecord` (line 166, exported — should be module-internal), `writeGovernanceAudit` (line 197, returns input `outputPath` not resolved absolute), `isDirectRun` (line 220, matches basename only — too broad).
- `src/governance/state-store.ts` — `atomicWriteJson` (line 62) shares the same `${finalPath}.tmp` suffix collision pattern; TD-03 fix should land in a shared helper both files use.
- `resolveGsdTools` — bootstrap resolver, TD-08 target (handle `undefined` fallback explicitly).
- `.planning/config.json` — carries `tavily_search`, `ref_search`, `perplexity`, `jina`, `quick_branch_template` keys that trigger `gsd-tools` warnings on every invocation (observed in this session's init output). TD-09 namespacing/split target.

### Established Patterns
- CJS modules, `tsc`-only build, no bundler.
- Tests = custom runner `node scripts/run-tests.cjs` (suites: unit/integration/install/security/slow), coverage via `c8`, mutation via `stryker`, property tests via `fast-check`.
- `assert*` guard pattern (`assertString`, `assertOneOf`, `assertRecordObject`) — `assertTimestamp` should follow the same throw-on-malformed shape.
- Atomic write = temp-then-rename (`writeFileSync` to `.tmp`, `renameSync` to final).

### Integration Points
- `assertTimestamp` called by `assertGovernanceRecord` (audit-artifact.ts:143) — tightening it propagates to all audit-record validation.
- `writeGovernanceAudit` is the `verify:post` capability step (`.gsd/capabilities/aidlc-governance/capability.json`); TD-07 path return change is observable to callers expecting the prior shape.
- `buildAuditRecord` export narrowing (TD-06) must not break existing imports — verify callers before de-exporting.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Refer to ROADMAP success criteria (TD-01..09) and `.planning/milestones/v1.0-MILESTONE-AUDIT.md` deferred-items list.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>