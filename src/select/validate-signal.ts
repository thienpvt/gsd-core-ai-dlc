/**
 * TaskSignal input validation (SEL-01 boundary guard, threat T-2-BADSIGNAL).
 *
 * A caller-supplied signal is untrusted structured input. A malformed signal
 * (wrong types, missing axis, unknown taskType) must be rejected LOUDLY here
 * rather than letting {@link select} run over garbage and silently return an
 * empty selection — a silent empty selection is the #1 under-injection footgun
 * (02-RESEARCH Pitfall 8).
 *
 * STUB (Task 1 / RED): the real Ajv wiring lands in Task 2 (GREEN). This throws
 * unconditionally so the RED suites compile and fail against a correct signature.
 */
import type { TaskSignal } from "../types.js";

/**
 * Assert that `signal` is a well-formed {@link TaskSignal}; throw otherwise.
 * Task 2 compiles task-signal.schema.json once via Ajv 2020 and joins each
 * violation into an actionable error (mirrors src/schema/validate.ts).
 */
export function validateSignal(signal: unknown): asserts signal is TaskSignal {
  void signal;
  throw new Error("validateSignal not implemented");
}
