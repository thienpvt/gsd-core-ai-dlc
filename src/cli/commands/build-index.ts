/**
 * `governance build-index [--root <dir>] [--out <file>]`
 *
 * Reads the rule-pack store, builds the index, writes `rule-index.json`.
 * Defaults: `--root aidlc-rules`, `--out rule-index.json`.
 */
import { parseArgs } from "node:util";
import { buildIndex, writeIndex } from "../../index/build.js";

export async function run(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      root: { type: "string", default: "aidlc-rules" },
      out: { type: "string", default: "rule-index.json" },
    },
    // Fail loud on an unknown flag rather than silently ignoring a typo.
    allowPositionals: false,
  });

  const root = values.root as string;
  const out = values.out as string;

  const index = buildIndex(root);
  writeIndex(index, out);

  process.stdout.write(
    `build-index: wrote ${out} (${index.rules.length} rule${
      index.rules.length === 1 ? "" : "s"
    }) from ${root}\n`,
  );
}
