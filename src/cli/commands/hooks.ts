/**
 * Package-owned governance hook subcommands.
 *
 * Skills and consumers invoke these via the `governance` binary so they resolve
 * through Node package resolution (node_modules / PATH) instead of bare
 * `node dist/...` paths that only work from a repo checkout.
 *
 * Each subcommand delegates to the existing hook module's pure function /
 * runDirect semantics — no second implementation of selection or gates.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import type { TaskSignal } from "../../types.js";
import { discussHook } from "../../governance/discuss-hook.js";
import { planHook, type PlanTaskSignalInputs } from "../../governance/plan-hook.js";
import { executeHook } from "../../governance/execute-hook.js";
import { verifyGateHook } from "../../governance/verify-gate-hook.js";
import { shipGateHook } from "../../governance/ship-gate-hook.js";
import { writeGovernanceAudit } from "../../governance/audit-artifact.js";
import { captureTestEvidence } from "../../governance/capture-test-evidence.js";
import { writeTestEvidence } from "../../governance/test-evidence.js";
import path from "node:path";

function die(msg: string): never {
  throw new Error(msg);
}

function parseDomains(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts;
}

export async function runDiscuss(argv: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      domains: { type: "string" },
      budget: { type: "string" },
      index: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });
  if (positionals.length !== 2) {
    die(
      "usage: governance discuss <projectRoot> <taskSignalJsonFile> [--domains a,b] [--budget n] [--index <f>]",
    );
  }
  const [projectRoot, signalPath] = positionals;
  const taskSignal = JSON.parse(readFileSync(signalPath, "utf8")) as TaskSignal;
  let budget: number | undefined;
  if (values.budget !== undefined) {
    const n = Number(values.budget);
    if (!Number.isInteger(n) || n < 0) die("discuss: --budget must be a non-negative integer");
    budget = n;
  }
  const result = discussHook({
    projectRoot,
    taskSignal,
    ...(values.index !== undefined ? { indexPath: values.index } : {}),
    ...(parseDomains(values.domains) !== undefined
      ? { baseDomains: parseDomains(values.domains) }
      : {}),
    ...(budget !== undefined ? { budget } : {}),
  });
  process.stdout.write(result.fragment);
}

export async function runPlan(argv: string[]): Promise<void> {
  if (argv.length !== 3) {
    die("usage: governance plan <projectRoot> <phaseNumber> <plannerInputsJsonFile>");
  }
  const [projectRoot, phaseNumber, inputsPath] = argv;
  const plannerInputs = JSON.parse(
    readFileSync(inputsPath, "utf8"),
  ) as PlanTaskSignalInputs;
  const result = planHook({ projectRoot, phaseNumber, plannerInputs });
  process.stdout.write(result.fragment);
}

export async function runExecute(argv: string[]): Promise<void> {
  if (argv.length !== 1) {
    die("usage: governance execute <projectRoot>");
  }
  executeHook({ projectRoot: argv[0]! });
}

export async function runVerify(argv: string[]): Promise<void> {
  if (argv.length !== 2) {
    die("usage: governance verify <projectRoot> <phaseNumber>");
  }
  const [projectRoot, phaseNumber] = argv;
  const result = await verifyGateHook({ projectRoot, phaseNumber });
  process.stdout.write(`${JSON.stringify(result.evidence, null, 2)}\n`);
  if (result.evidence.result.status === "fail") {
    process.exitCode = 1;
  }
}

export async function runShip(argv: string[]): Promise<void> {
  if (argv.length !== 2) {
    die("usage: governance ship <projectRoot> <phaseNumber>");
  }
  const [projectRoot, phaseNumber] = argv;
  const result = shipGateHook({ projectRoot, phaseNumber });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

export async function runAudit(argv: string[]): Promise<void> {
  if (argv.length !== 2) {
    die("usage: governance audit <projectRoot> <outputPath>");
  }
  const [projectRoot, outputPath] = argv;
  writeGovernanceAudit({ projectRoot, outputPath });
}

export async function runCaptureTestEvidence(argv: string[]): Promise<void> {
  if (argv.length !== 1) {
    die("usage: governance capture-test-evidence <phaseNumber>  (cwd = projectRoot)");
  }
  const [phaseNumber] = argv;
  const projectRoot = process.cwd();
  const record = captureTestEvidence({ projectRoot, phaseNumber });
  writeTestEvidence(projectRoot, phaseNumber, record);
  const filePath = path.join(
    projectRoot,
    ".planning",
    "governance",
    "tests",
    `${phaseNumber}.json`,
  );
  process.stdout.write(`capture-test-evidence: persisted ${filePath}\n`);
}
