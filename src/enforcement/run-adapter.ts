import type { GateAdapter } from "./adapters.js";
import type { GateRequest, GateResult } from "./types.js";
import { validateGateResult as assertGateResult } from "./validate-gate-result.js";

/**
 * Callers MUST use this wrapper, not direct adapter calls, to preserve the
 * integrity gate between adapter output and consumers.
 */
export async function runAdapter(
  adapter: GateAdapter,
  request: GateRequest,
): Promise<GateResult> {
  const result = await adapter.evaluate(request);
  assertGateResult(result);
  if (result.gateId !== request.gateId) {
    throw new Error(
      `invalid gate-result: gateId '${result.gateId}' does not match request gateId '${request.gateId}'`,
    );
  }
  if (result.evaluatedBy !== adapter.name) {
    throw new Error(
      `invalid gate-result: evaluatedBy '${result.evaluatedBy}' does not match adapter '${adapter.name}'`,
    );
  }
  return result;
}
