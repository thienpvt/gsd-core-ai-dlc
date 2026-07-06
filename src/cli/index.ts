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

    case "inject":
      return (await import("./commands/inject.js")).run(rest);

    case "rule-detail":
      return (await import("./commands/rule-detail.js")).run(rest);

    default:
      process.stderr.write(`Unknown command: ${subcommand ?? "(none)"}\n`);
      process.stderr.write(
        "Usage:\n" +
          "  governance build-index [--root <dir>] [--out <file>]\n" +
          "  governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]\n" +
          "  governance inject [--input <file>]\n" +
          "  governance rule-detail <id> [--index <f>]\n",
      );
      // CR-02 discipline (WR-02): set process.exitCode + return rather than
      // process.exit(2). process.exit() forces an immediate exit that can truncate
      // the buffered stderr usage text above on a Windows pipe; process.exitCode
      // fires the same non-zero signal while letting the buffered writes drain.
      // Every other command in this CLI already follows this pattern.
      process.exitCode = 2;
      return;
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
