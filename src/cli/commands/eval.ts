/**
 * `governance eval <phaseNumber> [--json]`
 *
 * Thin shim: parseArgs → delegates to eval-cli.runDirect. No orchestration
 * here — all logic lives in src/select/eval-cli.ts (D-04 module split: pure
 * measurement layer stays pure, I/O in the CLI wrapper).
 */
import { parseArgs } from "node:util";
import { runDirect } from "../../select/eval-cli.js";

export async function run(rest: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (positionals.length !== 1) {
    throw new Error("usage: governance eval <phaseNumber> [--json]");
  }

  const argv = [positionals[0], ...(values.json ? ["--json"] : [])];
  runDirect(argv);
}