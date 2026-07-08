/**
 * `governance eval <phaseNumber> [--json]`
 *
 * Thin shim: delegates argv to eval-cli.runDirect. No orchestration here —
 * all logic lives in src/select/eval-cli.ts (D-04 module split: pure
 * measurement layer stays pure, I/O in the CLI wrapper).
 *
 * IN-03: the shim no longer re-parses argv that runDirect already parses.
 * The shim's only job is the WR-01 try/catch mapping parse/load/usage errors
 * to exit 3 (D-08), since runDirect sets process.exitCode=2 directly for
 * critical-recall regression (no throw) and throws on parse/usage errors.
 */
import { runDirect } from "../../select/eval-cli.js";

export async function run(rest: string[]): Promise<void> {
  try {
    runDirect(rest);
  } catch (err) {
    process.stderr.write(`eval: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 3;
  }
}