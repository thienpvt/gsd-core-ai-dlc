# Phase 8: Remaining Gate Hooks - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 8-Remaining Gate Hooks
**Areas discussed:** Plan gate signal and output, Verify gate adapter flow, Ship blocking policy, Gate evidence storage
**Mode:** Auto-selected recommended defaults (`--auto`)

---

## Plan Gate Signal And Output

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse selection core at `plan:pre` | Build a planning `TaskSignal`, run existing select/render path, surface summary-only context, and persist separate plan gate evidence. | yes |
| Reuse execute selection state | Treat plan output as the same state execute reloads. | |
| New planner-only selector | Add a second selection path specialized to plan requirements/risks/acceptance criteria. | |

**Auto choice:** Reuse selection core at `plan:pre`.
**Notes:** Shortest path with least drift. Keeps anti-bloat behavior consistent and avoids corrupting execute-time selection state.

---

## Verify Gate Adapter Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Use `runAdapter` with `ADAPTERS` | Build a `GateRequest`, call `runAdapter`, store validated `GateResult`. | yes |
| Call adapters directly | Use `adapter.evaluate()` and trust returned output. | |
| Write verify evidence without adapters | Bypass Phase 7 contracts and create audit records directly. | |

**Auto choice:** Use `runAdapter` with `ADAPTERS`.
**Notes:** Phase 7 exists to make `runAdapter` the hard-fail boundary. Direct adapter calls would bypass ENF-02/ENF-04.

---

## Ship Blocking Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Block on missing/failing prior gate evidence | `ship:pre` requires plan and verify gate evidence and composes with existing ship gates. | yes |
| Implement full approval/audit blocking now | Add APPR-01 and full audit evidence rules in Phase 8. | |
| Advisory-only ship gate | Warn on missing gate data but never block. | |

**Auto choice:** Block on missing/failing prior gate evidence.
**Notes:** Meets GATE-05 without stealing Phase 9 scope. Missing governance evidence should fail closed.

---

## Gate Evidence Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Separate JSON files under `.planning/governance/gates/` | One phase/gate artifact containing request, validated result, and metadata. | yes |
| Piggyback on `selection-state.json` | Add gate results to the existing execute selection file. | |
| Write directly into `GOVERNANCE.md` | Merge Phase 8 evidence into the human audit artifact immediately. | |

**Auto choice:** Separate JSON files under `.planning/governance/gates/`.
**Notes:** Keeps durable evidence machine-readable and lets Phase 9 roll it into the complete audit artifact.

---

## the agent's Discretion

- Exact filenames and helper boundaries.
- Whether verify evidence runs at `verify:post` or a new `verify:pre` step, if ordering requires it.
- Plan split, as long as GATE-03/04/05 are covered and Phase 9 scope is not pulled forward.

## Deferred Ideas

- Full audit expansion and APPR-01 approval capture.
- Real scanner integrations and dynamic adapter loading.
