/**
 * The selection engine core (SEL-01 / SEL-04) — the project's Core Value.
 *
 * `select(index, signal, config)` is a PURE function: no clock (`new Date()`),
 * no `Math.random`, no filesystem, no I/O. It reads Phase 1's {@link RuleIndex}
 * shape (winners already resolved, losers carried under each winner's
 * `superseded[]`) and classifies EVERY candidate as either selected (with the
 * axis + value that fired) or skipped (with a reason from the AUDIT-02-aligned
 * enum). Identical `(index, signal, config)` inputs always produce byte-identical
 * output (02-RESEARCH determinism traps, Pitfalls 1 + 7).
 *
 * STUB (Task 1 / RED): the real gate pipeline lands in Task 2 (GREEN). This throws
 * unconditionally so the RED suites compile and fail against a correct signature.
 */
import type {
  RuleIndex,
  TaskSignal,
  SelectionConfig,
  SelectionResult,
} from "../types.js";

/**
 * Classify every candidate in `index` against `signal` + `config`.
 * Task 2 implements the fixed phase -> scope -> trigger -> superseded pipeline.
 */
export function select(
  index: RuleIndex,
  signal: TaskSignal,
  config: SelectionConfig,
): SelectionResult {
  void index;
  void signal;
  void config;
  throw new Error("select not implemented");
}
