---
name: aidlc-governance-audit
description: AI-DLC governance audit verify:post step - writes GOVERNANCE.md from persisted selection state by invoking the Phase 05 audit artifact writer. Fires at verify:post when governance.enabled is true.
---

# AI-DLC Governance - Audit Artifact

This skill fires at **verify:post**. Its single job is to write the
`GOVERNANCE.md` audit artifact from persisted machine state. It is a thin
**marshal-and-invoke** prompt, NOT a rule-selection, skip-reason, approval,
scanner, ship-hook, or enforcement implementation.

## Steps

1. **Locate persisted state.** Confirm `.planning/governance/selection-state.json`
   exists under the project root. It MUST have been written by a prior
   `discuss:pre` run. If it is missing, FAIL LOUD - do not synthesize audit
   content.

2. **Resolve the current phase directory.** Read `.planning/STATE.md` and parse
   the `current_phase` frontmatter field. Pad the numeric value to two digits
   as `{NN}`. Find phase directories matching `.planning/phases/{NN}-*/`.
   Exactly one directory MUST match. If STATE.md is missing, `current_phase` is
   unparseable, or the glob has zero or multiple matches, FAIL LOUD.

3. **Invoke the audit writer.** Run:

   ```bash
   node dist/governance/audit-artifact.js <projectRoot> <phaseDir>/GOVERNANCE.md
   ```

   Pass the absolute project root as `<projectRoot>` and the resolved phase
   directory's explicit `GOVERNANCE.md` path as `<phaseDir>/GOVERNANCE.md`.
   The writer reads `.planning/governance/selection-state.json`, builds the
   audit record, and writes the artifact. Do not duplicate skip-reason mapping
   or audit record rendering in this skill.

4. **Propagate failures.** If the writer exits non-zero, surface stderr and fail
   the verify:post step. A missing, malformed, or out-of-place audit artifact is
   blocking evidence loss.

## Failure mode

Any missing state, ambiguous phase directory, invalid output path, malformed
selection record, or writer failure must make this step fail. Do NOT catch and
continue. Do NOT write narrative governance content. The artifact must come from
`dist/governance/audit-artifact.js` over persisted selection state only.
