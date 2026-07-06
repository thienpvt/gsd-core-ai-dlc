/**
 * STUB — Risk heuristic + risk-adjusted domain subscription (RESEARCH §4).
 *
 * Implemented in the GREEN step. RED step ships this throw-only stub so
 * risk.test.ts fails for the right reasons (not implemented, not wrong
 * implementation).
 */
import type { Phase, TaskSignal } from "../types.js";

/** The three-tier risk classification produced by {@link classifyRisk}. */
export type RiskTier = "critical" | "elevated" | "baseline";

/**
 * Classify the risk of a task signal in a phase. PURE: no clock, no random,
 * no I/O — identical inputs yield identical tiers. RESEARCH §4.
 */
export function classifyRisk(_signal: TaskSignal, _phase: Phase): RiskTier {
  throw new Error("classifyRisk: not implemented (RED stub)");
}

/**
 * Adjust the domain subscription for a risk tier. `critical` widens with
 * `security` + `payments`; `elevated` widens with `security` only; `baseline`
 * returns the base subscription unchanged. Dedup, stable order: base first
 * then appended domains in their declared order.
 */
export function riskAdjustedDomains(
  _tier: RiskTier,
  _baseDomains: string[],
): string[] {
  throw new Error("riskAdjustedDomains: not implemented (RED stub)");
}
