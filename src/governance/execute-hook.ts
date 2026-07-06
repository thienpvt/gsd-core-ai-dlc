import path from "node:path";
import { renderInjection } from "../inject/inject.js";
import { selectionStatePath } from "./paths.js";
import { readSelection, type GovernanceRecord } from "./state-store.js";

export interface ExecuteHookArgs {
  projectRoot: string;
  statePath?: string;
}

export interface ExecuteHookResult {
  fragment: string;
  record: GovernanceRecord;
}

function projectRootForState(args: ExecuteHookArgs): string {
  if (!args.statePath) return args.projectRoot;

  const requested = path.resolve(args.statePath);
  const defaultPath = path.resolve(selectionStatePath(args.projectRoot));
  if (requested === defaultPath) return args.projectRoot;

  const expectedTail = path.join(".planning", "governance", "selection-state.json");
  if (!requested.endsWith(`${path.sep}${expectedTail}`)) {
    throw new Error(
      `executeHook: statePath must point to ${expectedTail}: ${args.statePath}`,
    );
  }
  return path.dirname(path.dirname(path.dirname(requested)));
}

function budgetWarning(record: GovernanceRecord): string {
  const budget = record.selectionResult.budget;
  if (!budget) return "budget exceeded: selection over token budget\n";
  return (
    `budget exceeded: used ${budget.used} tokens > limit ${budget.limit} ` +
    `(offenders: ${budget.offenders.join(", ")})\n`
  );
}

export function executeHook(args: ExecuteHookArgs): ExecuteHookResult {
  const readRoot = projectRootForState(args);
  const statePath = args.statePath ?? selectionStatePath(args.projectRoot);
  const record = readSelection(readRoot);
  if (record === null) {
    throw new Error(`executeHook: missing governance selection state at ${statePath}`);
  }

  const fragment = renderInjection(record.selectionResult);
  process.stdout.write(fragment);

  if (record.selectionResult.budgetExceeded) {
    process.stderr.write(budgetWarning(record));
    process.exitCode = 1;
  }

  return { fragment, record };
}

if (require.main === module) {
  executeHook({ projectRoot: process.argv[2] ?? process.cwd() });
}
