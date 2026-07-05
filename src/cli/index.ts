/**
 * CLI dispatcher for the `governance` binary.
 *
 * `bin/governance.cjs` calls `main(process.argv.slice(2))`. Subcommands are
 * loaded lazily so a single command's dependencies are not paid for by others.
 * `select` (Phase 2) and `rule-detail` (Phase 3) extend this switch.
 */

export async function main(argv: string[]): Promise<void> {
  const [subcommand, ...rest] = argv;

  switch (subcommand) {
    case "build-index":
      return (await import("./commands/build-index.js")).run(rest);

    case "select":
      return (await import("./commands/select.js")).run(rest);

    // Phase 3: case "rule-detail" → ./commands/rule-detail.js

    default:
      process.stderr.write(`Unknown command: ${subcommand ?? "(none)"}\n`);
      process.stderr.write(
        "Usage:\n" +
          "  governance build-index [--root <dir>] [--out <file>]\n" +
          "  governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]\n",
      );
      process.exit(2);
  }
}

// Self-invocation guard: when this module is run directly (`node dist/cli/index.js`,
// which is how the smoke test and any direct invocation call it) rather than
// require()'d by bin/governance.cjs, run main() against the process argv. Under
// the CommonJS emit `require.main === module` is the canonical "am I the entry?" check.
if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
    process.exitCode = 1;
  });
}
