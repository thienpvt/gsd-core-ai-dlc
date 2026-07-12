/**
 * CLI dispatcher for the `governance` binary.
 *
 * `bin/governance.cjs` calls `main(process.argv.slice(2))`. Subcommands are
 * loaded lazily so a single command's dependencies are not paid by others.
 * Hook subcommands (discuss/plan/execute/verify/ship/audit/capture-test-evidence)
 * are the package-owned entrypoints skills must invoke from consumer installs.
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

    case "eval":
      return (await import("./commands/eval.js")).run(rest);

    case "discuss":
      return (await import("./commands/hooks.js")).runDiscuss(rest);

    case "plan":
      return (await import("./commands/hooks.js")).runPlan(rest);

    case "execute":
      return (await import("./commands/hooks.js")).runExecute(rest);

    case "verify":
      return (await import("./commands/hooks.js")).runVerify(rest);

    case "ship":
      return (await import("./commands/hooks.js")).runShip(rest);

    case "audit":
      return (await import("./commands/hooks.js")).runAudit(rest);

    case "capture-test-evidence":
      return (await import("./commands/hooks.js")).runCaptureTestEvidence(rest);

    default:
      process.stderr.write(`Unknown command: ${subcommand ?? "(none)"}\n`);
      process.stderr.write(
        "Usage:\n" +
          "  governance build-index [--root <dir>] [--out <file>]\n" +
          "  governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]\n" +
          "  governance inject [--input <file>]\n" +
          "  governance rule-detail <id> [--index <f>]\n" +
          "  governance eval <phaseNumber> [--json]\n" +
          "  governance discuss <projectRoot> <taskSignalJsonFile> [--budget n] [--index <f>]\n" +
          "  governance plan <projectRoot> <phaseNumber> <plannerInputsJsonFile>\n" +
          "  governance execute <projectRoot>\n" +
          "  governance verify <projectRoot> <phaseNumber>\n" +
          "  governance ship <projectRoot> <phaseNumber>\n" +
          "  governance audit <projectRoot> <outputPath>\n" +
          "  governance capture-test-evidence <phaseNumber>\n",
      );
      // CR-02 discipline (WR-02): set process.exitCode + return rather than
      // process.exit(2). process.exit() forces an immediate exit that can truncate
      // buffered stderr usage text above on Windows pipes; process.exitCode
      // fires the same non-zero signal while letting buffered writes drain.
      process.exitCode = 2;
  }
}

// Self-invocation for `node dist/cli/index.js` (mirrors bin/governance.cjs).
// CommonJS require.main check.
if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${err && err.stack ? err.stack : String(err)}\n`);
    process.exitCode = 1;
  });
}
