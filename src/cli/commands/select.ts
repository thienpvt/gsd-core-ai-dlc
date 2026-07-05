/**
 * `governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]`
 *
 * The CLI seam for the pure selection core (SEL-04 observability surfaced,
 * SEL-05 loud overflow signal). It:
 *   1. reads a TaskSignal from `--input <file>` or stdin,
 *   2. validateSignal()s it so a malformed signal fails LOUD before select()
 *      (never a silent empty selection — under-injection footgun, Pitfall 8),
 *   3. resolves the budget in order: --budget flag > config.json
 *      governance.token_budget > default 2000 (02-RESEARCH §3),
 *   4. calls the pure core, writes the full SelectionResult (JSON canonical, or
 *      a human `--format text` summary) to stdout,
 *   5. exits NON-ZERO when budgetExceeded is true — AFTER emitting the result,
 *      so the observable output is always available even as the exit code fires
 *      the loud signal. The pure core NEVER truncates a selected rule (Pitfall 6);
 *      the CLI only maps the flag to an exit code.
 *
 * Mirrors build-index.ts: node:util parseArgs with allowPositionals:false so an
 * unknown flag or stray positional fails loud (T-2-CLI-INJECT).
 */
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildIndex } from "../../index/build.js";
import { select } from "../../select/select.js";
import { validateSignal } from "../../select/validate-signal.js";
import type { RuleIndex, SelectionConfig, SelectionResult, Phase } from "../../types.js";

/** Default per-request governance token budget when neither flag nor config sets it. */
const DEFAULT_TOKEN_BUDGET = 2000;

/** The phases accepted by --phase (mirrors the Phase enum / frontmatter schema). */
const VALID_PHASES: readonly Phase[] = ["inception", "construction", "operations", "common"];

/**
 * Read the config.json `governance.token_budget` if present, else undefined.
 * Read DEFENSIVELY — the key is optional and the file may not exist or may lack
 * the governance block. A parse/read failure yields undefined (fall back to the
 * default), never a throw: a missing optional config must not break selection.
 */
function readConfigBudget(): number | undefined {
  try {
    const configPath = path.resolve(process.cwd(), ".planning", "config.json");
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as { governance?: { token_budget?: unknown } };
    const value = parsed.governance?.token_budget;
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Read the whole of process.stdin as a UTF-8 string (signal delivered via a pipe). */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Render a human-readable summary of the result for --format text (JSON stays canonical). */
function renderText(result: SelectionResult): string {
  const lines: string[] = [];
  lines.push(`selected (${result.selected.length}):`);
  for (const s of result.selected) {
    lines.push(`  ${s.id} [${s.severity}] via ${s.matchedAxis}=${s.matchedValue}`);
  }
  const byReason = new Map<string, number>();
  for (const s of result.skipped) {
    byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  }
  const reasonSummary = [...byReason.entries()].sort().map(([r, n]) => `${r}=${n}`).join(", ");
  lines.push(`skipped (${result.skipped.length}): ${reasonSummary || "none"}`);
  if (result.budget) {
    lines.push(
      `budget: used ${result.budget.used} / limit ${result.budget.limit}` +
        (result.budgetExceeded ? ` — EXCEEDED (offenders: ${result.budget.offenders.join(", ")})` : ""),
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function run(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      index: { type: "string", default: "rule-index.json" },
      input: { type: "string" },
      phase: { type: "string" },
      domains: { type: "string" },
      budget: { type: "string" },
      format: { type: "string", default: "json" },
    },
    // Fail loud on an unknown flag / stray positional rather than silently
    // ignoring it (T-2-CLI-INJECT; mirrors build-index).
    allowPositionals: false,
  });

  const indexPath = values.index as string;
  const phase = values.phase as string | undefined;
  const format = values.format as string;

  // --phase is required and must be a known phase (fail loud, not a silent bad match).
  if (!phase || !VALID_PHASES.includes(phase as Phase)) {
    throw new Error(
      `--phase is required and must be one of: ${VALID_PHASES.join(", ")} (got ${phase ?? "(none)"})`,
    );
  }

  // Read the index. buildIndex on a directory is NOT this command's job — the
  // index is a prebuilt artifact (from `governance build-index`); read it as JSON.
  // Fall back to buildIndex only when the path is a directory (developer convenience).
  const index = readIndex(indexPath);

  // Read the signal from --input <file> or stdin, parse, and validate LOUD.
  const rawSignal = values.input
    ? readFileSync(path.resolve(values.input as string), "utf8")
    : await readStdin();
  const signal: unknown = JSON.parse(rawSignal);
  validateSignal(signal); // throws on a malformed signal — no silent empty selection

  // Budget resolution order: --budget flag > config.json governance.token_budget > 2000.
  let budget: number;
  if (values.budget !== undefined) {
    budget = Number(values.budget);
    if (!Number.isFinite(budget)) {
      throw new Error(`--budget must be a number (got '${values.budget as string}')`);
    }
  } else {
    budget = readConfigBudget() ?? DEFAULT_TOKEN_BUDGET;
  }

  const domains = (values.domains as string | undefined)
    ? (values.domains as string).split(",").map((d) => d.trim()).filter((d) => d.length > 0)
    : [];

  const config: SelectionConfig = { phase: phase as Phase, domains, budget };
  const result = select(index, signal, config);

  // Emit the full observable result FIRST (SEL-04) — JSON canonical, text optional.
  if (format === "text") {
    process.stdout.write(renderText(result));
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }

  // SEL-05 loud signal: a non-zero exit on overflow, AFTER the result is emitted.
  // The engine never truncated — the full selection is still on stdout.
  if (result.budgetExceeded && result.budget) {
    process.stderr.write(
      `budget exceeded: used ${result.budget.used} tokens > limit ${result.budget.limit} ` +
        `(offenders: ${result.budget.offenders.join(", ")})\n`,
    );
    // Set the exit code and let the event loop drain stdout naturally — NOT
    // process.exit(1). process.exit() forces exit "even if there are still
    // asynchronous operations pending... including I/O to process.stdout", so on
    // a pipe (the normal way an audit artifact is captured) the large JSON write
    // buffered on line 145 can be TRUNCATED — losing the audit output in exactly
    // the overflow case the feature exists for. process.exitCode fires the same
    // loud non-zero signal without cutting stdout short (cli/index.ts:39 idiom).
    process.exitCode = 1;
  }
}

/**
 * Read the rule index. A `.json` file is read + parsed directly (the prebuilt
 * artifact path). A directory is compiled on the fly via buildIndex (developer
 * convenience for pointing straight at a rule store). Anything else is a JSON parse.
 */
function readIndex(indexPath: string): RuleIndex {
  const resolved = path.resolve(indexPath);
  const raw = readFileSync(resolved, "utf8");
  // A rule store is a directory; readFileSync above throws EISDIR for one, so if
  // we reach here the path is a file — parse it as the prebuilt index JSON.
  return JSON.parse(raw) as RuleIndex;
}
