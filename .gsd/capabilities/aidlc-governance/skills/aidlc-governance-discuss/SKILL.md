---
name: aidlc-governance-discuss
description: AI-DLC governance discuss gate — derives the task signal + risk tier, calls the selection pure core, and attaches the rendered <governance> fragment to the discussion context. Fires at discuss:pre when governance.enabled is true.
---

# AI-DLC Governance — Discuss Gate

This skill fires at **discuss:pre**. Its single job is to attach the
`<governance>` summary fragment to the discussion context — it is a thin
**marshal-and-invoke** prompt, NOT a re-implementation of selection. All
governance logic lives in the pure cores under `src/governance/` +
`src/select/` + `src/inject/`.

## Steps

1. **Read the current phase.** Open `.planning/STATE.md` and read the
   `current_phase` field. Map it to the supported AI-DLC Phase enum:
   `1 -> inception`, `2+ -> construction`. GSD phase numbers are project-defined,
   so no numeric value implies operations; OPS-01 remains deferred until explicit
   AI-DLC phase metadata exists. If STATE.md is missing or `current_phase` is
   unparseable, FAIL LOUD -- never silently fall back to a default phase
   (under-injection footgun, Pitfall 7).

2. **Derive the TaskSignal.** From the discuss context, build:
   - `taskType` — one of `feature | bugfix | refactor | docs | test | infra | security | data`,
     inferred from the task title/description.
   - `keywords` — tokens from the task title + description (lowercased).
   - `paths` — repo-relative POSIX paths the task is expected to impact.

3. **Invoke the discuss hook.** Run:

   ```
   npx --no-install governance discuss <projectRoot> <taskSignalJsonFile> [--budget n]
   ```

   …passing the project root, derived TaskSignal, and optional budget.
   Domains come from `.planning/config.json` (`governance.domains`) only — no CLI override. The hook:
   - classifies risk via `classifyRisk(signal, phase)`,
   - widens the domain subscription via `riskAdjustedDomains(tier, base)` —
     a `critical` tier subscribes `security` + `payments`,
   - validates the signal via `validateSignal`,
   - selects via the pure `select(index, signal, config)` core,
   - renders the fragment via `renderInjection(result)`,
   - persists the full `SelectionResult` atomically to
     `.planning/governance/selection-state.json` (temp-then-rename).

   From a repository checkout you may also run `node bin/governance.cjs discuss ...`. Do not use bare `node dist/...` paths from a consumer install — they only resolve inside the package tree.

4. **Attach the fragment.** Write the returned `<governance>` fragment into
   the produces artifact (`CONTEXT.md`) so the host loop picks it up. The
   fragment carries summaries + `governance rule-detail <id>` pointers only
   — never a rule body.

## Failure mode

A malformed discuss context (missing index, unreadable STATE, invalid
TaskSignal) makes the hook THROW. Propagate the error — do NOT swallow it
into an empty fragment. A silent no-governance fragment is the #1
under-injection footgun (Pitfall 7).
