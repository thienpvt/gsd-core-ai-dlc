---
name: aidlc-governance-plan
description: AI-DLC governance plan gate - derives planner input evidence, invokes planHook, and attaches the rendered <governance> fragment to planner context. Fires at plan:pre when governance.enabled is true.
---

# AI-DLC Governance - Plan Gate

This skill fires at **plan:pre**. Its job is to marshal planner context into
`PlanTaskSignalInputs`, invoke the compiled hook, and attach the returned
`<governance>` fragment to planner context. It is NOT a selector, renderer,
risk classifier, or evidence-store implementation.

## Steps

1. **Resolve the project root and phase number.** Read `.planning/STATE.md` and
   the host phase context. If the phase number is missing or ambiguous, FAIL
   LOUD. Do not synthesize a default phase.

2. **Collect `PlanTaskSignalInputs`.** Create one JSON object with exactly these
   source classes:
   - `phaseGoal` - phase goal text from `.planning/ROADMAP.md`.
   - `requirementIds` - requirement IDs from the phase Requirements line and
     `.planning/REQUIREMENTS.md`.
   - `riskThreatModel` - risk, security, and threat model text from phase
     context, research, validation, or plan material when present.
   - `acceptanceCriteria` - acceptance criteria and success criteria from
     roadmap, requirements, validation, and plan material.
   - `impactedFiles` - repo-relative files from phase context, pattern map file
     assignments, and plan frontmatter when present.
   - `impactedModules` - repo-relative modules/directories from canonical refs,
     pattern map assignments, and plan frontmatter when present.

   Write this JSON to a temp file. Do not pass a free-form prose blob.

3. **Invoke the plan hook.** Run:

   ```bash
   BIN=$(node -e "process.stdout.write(require('path').join(require('path').dirname(require.resolve('@opengsd/gsd-aidlc-overlay/package.json')),'bin','governance.cjs'))") && node "$BIN" plan <projectRoot> <phaseNumber> <plannerInputsJsonFile>
   ```

   The hook derives the `TaskSignal`, validates it, selects rules, renders the
   fragment, and writes `.planning/governance/gates/{NN}-plan.json`.

4. **Attach planner context.** Attach stdout as the `planner-context` produced
   artifact. The fragment must contain summaries and rule-detail pointers only.

## Failure mode

Missing or malformed planner inputs, missing STATE, invalid rule index, invalid
signal, or hook failure must be surfaced. Do not catch and replace with empty
governance. Do not duplicate selection, rendering, risk classification, or gate
evidence logic in this skill.
