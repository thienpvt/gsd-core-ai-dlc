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
  return result;
}
