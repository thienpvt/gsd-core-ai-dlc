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
import type { Severity, SelectionResult } from "../types.js";

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

/**
 * Render the `<governance>` fragment from a SelectionResult (STUB — Task 2 GREEN).
 *
 * Reads only `selected[].{id, severity, summary}`; never opens a file.
 */
export function renderInjection(_result: SelectionResult): string {
  throw new Error("renderInjection not implemented");
}
