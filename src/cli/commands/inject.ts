/**
 * `governance inject [--input <file>]`
 *
 * The CLI seam for the pure {@link renderInjection} core (SEL-02 render surface,
 * SEL-05 budget continuity). It:
 *   1. reads a SelectionResult from `--input <file>` or stdin,
 *   2. JSON.parses it inside a try/catch that fails LOUD on malformed input
 *      (never a silent empty fragment — an empty <governance> block would drop ALL
 *      governance from the working context, an under-injection footgun, Pitfall 7),
 *   3. shape-checks it (selected[] + skipped[] must be arrays) and throws loud
 *      otherwise — a lightweight structural guard; a full Ajv SelectionResult
 *      schema is deferred, the guard's only job is to reject malformed input loudly,
 *   4. renders the <governance> fragment and writes it to stdout,
 *   5. when result.budgetExceeded is true, writes a stderr warning naming the
 *      offenders and sets process.exitCode = 1 — AFTER emitting the fragment, so an
 *      over-budget selection can never silently reach the working context yet the
 *      observable fragment is still available (SEL-05 continuity).
 *
 * The command does NOT recompute the budget — select() already computed it; inject
 * only surfaces the flag. Mirrors select.ts: node:util parseArgs with
 * allowPositionals:false so an unknown flag / stray positional fails loud, and
 * process.exitCode (NOT process.exit) so a piped stdout fragment is not truncated
 * (CR-02).
 */
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderInjection, SEVERITY_ORDINAL } from "../../inject/inject.js";
import type { SelectedRule, SelectionResult } from "../../types.js";

/** Read the whole of process.stdin as a UTF-8 string (result delivered via a pipe). */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function run(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    options: {
      input: { type: "string" },
    },
    // Fail loud on an unknown flag / stray positional rather than silently
    // ignoring it (mirrors select / build-index).
    allowPositionals: false,
  });

  // Read the raw payload from --input <file> or stdin.
  const raw = values.input
    ? readFileSync(path.resolve(values.input as string), "utf8")
    : await readStdin();

  // Parse LOUD: a malformed payload must fail non-zero, never render an empty
  // fragment (Pitfall 7 / CR-01 — do not mask a real failure as clean/empty).
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `malformed inject input: not valid JSON (${err instanceof Error ? err.message : String(err)})`,
    );
  }

  // Structural shape guard: require the two SelectionResult arrays. A lightweight
  // check (full Ajv schema deferred) whose only job is to reject a malformed input
  // loudly rather than silently emit an empty governance block.
  const candidate = parsed as Partial<SelectionResult> | null;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !Array.isArray(candidate.selected) ||
    !Array.isArray(candidate.skipped)
  ) {
    throw new Error(
      "malformed inject input: expected a SelectionResult with `selected` and `skipped` arrays",
    );
  }

  // Per-element guard (WR-01): array-ness alone is not enough. renderInjection
  // reads id/severity/summary off each selected rule, so a hand-crafted or
  // upstream-corrupted element like {"id":"x"} (no summary, no severity) would
  // otherwise render literal "[undefined] x: undefined" straight into the
  // <governance> context — silently emitting WRONG governance is exactly the
  // fail-loud lesson this command already applies to malformed JSON. Validate the
  // three rendered fields (full Ajv SelectionResult schema still deferred) and
  // throw loud otherwise. skipped[] is audit-only (Phase 5) and NOT rendered here,
  // so it needs no per-element check at this seam.
  for (const r of candidate.selected as SelectedRule[]) {
    if (
      typeof r !== "object" ||
      r === null ||
      typeof r.id !== "string" ||
      typeof r.summary !== "string" ||
      !(r.severity in SEVERITY_ORDINAL)
    ) {
      throw new Error(
        "malformed inject input: each selected rule needs a string `id`, a string " +
          "`summary`, and a valid `severity` (critical|high|medium|low)",
      );
    }
  }
  const result = candidate as SelectionResult;

  // Emit the fragment FIRST (SEL-02) — always written, even on overflow, so the
  // observable output exists before the exit code fires.
  process.stdout.write(renderInjection(result));

  // SEL-05 loud signal: honor the budgetExceeded flag select() already computed.
  // Write a stderr warning naming the offenders and set the exit code — but NOT
  // process.exit(), which would truncate the buffered stdout fragment on a pipe
  // (CR-02). process.exitCode fires the same non-zero signal and lets stdout drain.
  if (result.budgetExceeded) {
    const b = result.budget;
    const detail = b
      ? `used ${b.used} tokens > limit ${b.limit} (offenders: ${b.offenders.join(", ")})`
      : "selection over token budget";
    process.stderr.write(`budget exceeded: ${detail}\n`);
    process.exitCode = 1;
  }
}
