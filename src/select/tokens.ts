/**
 * Token-budget estimation for the selection engine (SEL-05).
 *
 * The budget is the guard on "little enough to avoid context bloat" — the second
 * half of the Core Value. Two pieces live here, single-sourced so `select()` and
 * every test share one definition:
 *
 *  - {@link estimateTokens} — a deterministic, ZERO-dependency char/4 heuristic.
 *    02-CONTEXT locked `Math.ceil(text.length / 4)` over a real tokenizer
 *    (tiktoken et al.) on purpose: determinism + auditability + zero-dep matter
 *    more than exact counts. The budget is a guard-rail, not a billing meter, so
 *    a documented estimate is the right tool.
 *  - {@link PER_RULE_OVERHEAD} — a small fixed per-rule constant approximating the
 *    id/severity framing Phase 3 will wrap around each injected summary. It is a
 *    VALUE (not logic), so it is real even in the RED stub; Phase 3 may refine it
 *    once the actual injection shape is known (02-CONTEXT Claude's-discretion).
 *
 * Pure: no clock, no `Math.random`, no I/O — so the budgeted `select()` stays
 * byte-identical for identical inputs (02-RESEARCH determinism traps).
 */

/**
 * Per-rule token overhead added on top of each selected rule's summary length,
 * approximating the id/severity/framing Phase 3 wraps around the summary at
 * injection time. Single-sourced here so the estimator, `select()`, and the
 * tests never drift. Refinable by Phase 3 (02-CONTEXT Claude's-discretion).
 */
export const PER_RULE_OVERHEAD = 6;

/**
 * Estimate the token count of `text` as `ceil(length / 4)` — the locked,
 * deterministic, zero-dependency char/4 heuristic (02-CONTEXT / 02-RESEARCH §3).
 *
 * RED STUB (Task 1): throws so tokens.test.ts fails until Task 2 implements the
 * ceil logic. Do NOT implement here.
 */
export function estimateTokens(_text: string): number {
  throw new Error("estimateTokens not implemented");
}
