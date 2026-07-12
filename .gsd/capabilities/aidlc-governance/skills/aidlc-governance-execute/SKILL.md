---
name: aidlc-governance-execute
description: AI-DLC governance execute gate - reloads persisted selection state, invokes executeHook, and attaches the rendered <governance> fragment to executor or subagent context. Fires at execute:pre when governance.enabled is true.
---

# AI-DLC Governance - Execute Gate

This skill fires at **execute:pre**. Its single job is to attach the persisted
`<governance>` summary fragment to executor/subagent context, which otherwise
inherits nothing. It is a thin **marshal-and-invoke** prompt, NOT a selection,
risk, or rendering implementation.

## Steps

1. **Locate persisted state.** Confirm `.planning/governance/selection-state.json`
   exists. It MUST have been written by a prior `discuss:pre` run. If it is
   missing, FAIL LOUD - do not silently skip governance.

2. **Invoke the execute hook.** Run:

   ```bash
   npx --no-install governance execute <projectRoot>
   ```

   The hook reloads the persisted `GovernanceRecord` through the state-store,
   renders `record.selectionResult` through `renderInjection`, emits the
   `<governance>` fragment on stdout, and returns the same fragment to the host.

3. **Attach the fragment.** Attach the returned stdout `<governance>` fragment
   to the execute produces artifact (`executor-context`) so the executor or
   subagent receives the same summaries selected at discuss time.

4. **Surface budget overflow.** If the hook exits non-zero because
   `record.selectionResult.budgetExceeded` is true, surface the stderr warning
   and still attach the stdout fragment. The overflow must be visible, but the
   fragment must remain observable.

## Failure mode

A missing or malformed persisted record makes `executeHook` throw. Propagate the
error - do NOT catch it and do NOT emit an empty fragment. Execute reloads the
discuss-time selection; it never re-runs selection, risk classification, or
STATE parsing.
