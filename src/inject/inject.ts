/**
 * Summary injector core (SEL-02) — the render half of Phase 3's anti-bloat
 * mechanism.
 *
 * `renderInjection(result)` turns a Phase 2 {@link SelectionResult} into a single
 * tagged `<governance>` markdown block carrying each selected rule's id, severity,
 * summary, and a `governance rule-detail <id>` hint — summaries and pointers only,
 * never a rule body.
 *
 * The defining property is STRUCTURAL: this module imports no `node:fs` and no
 * `gray-matter`, so it has NO file-read path at all. The only body-bearing source
 * (a rule file) is never opened; the {@link SelectionResult} it reads carries
 * summaries only (bodies were quarantined in load.ts and are absent from the index
 * per PACK-04). Summary-only injection is therefore true BY CONSTRUCTION, not
 * merely by test (the fast-check no-body property is the belt-and-suspenders proof
 * on top of this guarantee). It is also deterministic: no clock, no `Math.random`,
 * no I/O — identical input yields byte-identical output.
 */
import type { Severity, SelectedRule, SelectionResult } from "../types.js";

/**
 * The injector's OWN severity ordinal (Pitfall 6) — the fragment sorts
 * severity-descending (critical first). This is a DIFFERENT axis from the scope
 * `ORDINAL` in `src/rules/scope.ts` (which ranks project/domain/enterprise
 * precedence); do NOT reuse that one. Single-sourced here and reused by the tests.
 */
export const SEVERITY_ORDINAL: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** The one-line human header naming the block's contents (summaries + pointers only). */
const HEADER =
  "Selected governance rules for this task (summaries only). " +
  "Run `governance rule-detail <id>` for a rule's full body.";

/** The empty-selection line — an unambiguous, still-strippable no-rules signal. */
const NO_RULES_LINE = "No governance rules apply to this task.";

/**
 * Ascending comparator over selected rules: severity-descending via
 * {@link SEVERITY_ORDINAL} (critical first), tie-broken by id ascending. Mirrors
 * select.ts's `byId` tie-break so ordering is deterministic and never depends on
 * the upstream selection order.
 */
function bySeverityThenId(a: SelectedRule, b: SelectedRule): number {
  const bySeverity = SEVERITY_ORDINAL[a.severity] - SEVERITY_ORDINAL[b.severity];
  if (bySeverity !== 0) return bySeverity;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Render the selected rules of a {@link SelectionResult} into a single tagged
 * `<governance>` markdown block (SEL-02).
 *
 * Reads ONLY `id`, `severity`, and `summary` from each selected rule — never any
 * body/content field (there is none) and never opens a file, so summary-only
 * injection is true by construction. Skip reasons are excluded (audit-only,
 * Phase 5). Deterministic: no clock, no `Math.random`, no I/O — identical input
 * yields byte-identical output. An empty selection still renders the
 * `<governance>` frame around a single no-rules line (never an empty string) so
 * Phase 4's inject/strip logic is uniform.
 */
export function renderInjection(result: SelectionResult): string {
  const lines: string[] = ["<governance>"];

  if (result.selected.length === 0) {
    lines.push(NO_RULES_LINE);
    lines.push("</governance>");
    return `${lines.join("\n")}\n`;
  }

  // Copy before sorting — never mutate the caller's array (purity).
  const ordered = [...result.selected].sort(bySeverityThenId);

  lines.push(HEADER);
  lines.push("");
  for (const rule of ordered) {
    // One entry per rule: [severity] id, its summary, and a per-rule rule-detail
    // hint so the reader can pull the full body on demand (03-CONTEXT).
    lines.push(
      `- [${rule.severity}] ${rule.id}: ${rule.summary} ` +
        `(run \`governance rule-detail ${rule.id}\` for the full rule)`,
    );
  }
  lines.push("</governance>");
  return `${lines.join("\n")}\n`;
}
