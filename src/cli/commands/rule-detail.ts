/**
 * `governance rule-detail <id> [--index <f>]`
 *
 * The lazy detail loader (SEL-03) — the ONE sanctioned place in the whole system
 * where a rule BODY surfaces. Everything else (index, select, inject) stays
 * body-free. It:
 *   1. reads rule-index.json (reuses the select.ts readIndex idiom — validateIndex
 *      on a JSON file, or a buildIndex fallback when handed a directory),
 *   2. finds the ONE record whose id matches the positional argument; an unknown
 *      id throws a loud `unknown rule id: <id>` (non-zero exit via cli/index.ts) —
 *      never a silent empty body (CR-01),
 *   3. D-06: a rule with NO detailPath prints its summary + a clear "no separate
 *      detail file" signal and exits 0 — a summary-only rule is not an error,
 *   4. otherwise resolves the detailPath through the single-sourced resolveDetailPath
 *      guard (IN-05 backstop, BEFORE any readFileSync), reads ONLY that one target
 *      file, extracts the body via gray-matter matter(raw).content, and writes it to
 *      stdout. It NEVER iterates the index or opens any other rule's detail file
 *      (SEL-03 lazy guarantee, Pitfall 4).
 *
 * Mirrors select.ts: node:util parseArgs, fail-loud on a bad flag/arity, and
 * process.exitCode (never process.exit) — prefers throwing so the cli/index.ts
 * catch sets exitCode=1 without truncating a piped body (CR-02).
 */
import { parseArgs } from "node:util";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { buildIndex } from "../../index/build.js";
import { validateIndex } from "../../index/validate-index.js";
import { resolveDetailPath } from "../../rules/detail-path.js";
import type { RuleIndex } from "../../types.js";

/**
 * Read the rule index — a `.json` file is parsed + validated LOUD via validateIndex
 * (a hand-edited/corrupt index fails here, not with an opaque error later); a
 * DIRECTORY is compiled on the fly via buildIndex (developer convenience, mirrors
 * select.ts). buildIndex validates its own output, so no extra check on that branch.
 */
function readIndex(indexPath: string): RuleIndex {
  const resolved = path.resolve(indexPath);
  if (statSync(resolved).isDirectory()) {
    return buildIndex(resolved);
  }
  const parsed = JSON.parse(readFileSync(resolved, "utf8")) as RuleIndex;
  validateIndex(parsed); // fail loud on a malformed/corrupted index
  return parsed;
}

export async function run(rest: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      index: { type: "string", default: "rule-index.json" },
    },
    // rule-detail is the ONE command that legitimately takes a positional (the id).
    allowPositionals: true,
  });

  // Exactly one positional id is required — zero or more-than-one fails loud
  // rather than guessing (an ambiguous request must not silently pick one).
  if (positionals.length !== 1) {
    throw new Error(
      `rule-detail requires exactly one rule id argument (got ${positionals.length}): ` +
        `usage: governance rule-detail <id> [--index <f>]`,
    );
  }
  const id = positionals[0];
  const indexPath = values.index as string;

  const index = readIndex(indexPath);

  // Find the ONE record by id. An unknown id is a loud failure (non-zero exit via
  // the cli/index.ts catch) — never a silent empty body (CR-01 / Pitfall 7).
  const record = index.rules.find((r) => r.id === id);
  if (!record) {
    throw new Error(`unknown rule id: ${id}`);
  }

  // D-06: a summary-only rule (no detailPath) is NOT an error — print its summary
  // plus a clear, plain, pipe-friendly no-detail signal and exit 0.
  if (record.detailPath === undefined) {
    process.stdout.write(
      `${record.summary}\n\n(no separate detail file for ${id} — the summary above is the full rule)\n`,
    );
    return;
  }

  // Fetch-time IN-05 backstop. The index's records carry repo-relative sourceFiles
  // (relative to the cwd where build-index ran), so process.cwd() is the containment
  // base here. IMPORTANT: this is an INTENTIONAL COARSE BACKSTOP, NOT the same
  // boundary buildIndex uses. buildIndex's authoritative D-07 guard resolves against
  // the STORE root (absRoot = path.resolve(rootDir)), which is NARROWER than cwd — so
  // a legitimately-built index can never carry a detailPath that escapes its store.
  // This cwd-based guard only backstops a hand-crafted --index, and it still rejects
  // an absolute detailPath and any `..`-escape above the repo. It does NOT "match"
  // the build-time check — it is the looser repo-level backstop behind the
  // authoritative build-time store-scoped guard.
  const packRoot = process.cwd();
  const target = resolveDetailPath(record.sourceFile, record.detailPath, packRoot);

  // Read ONLY this one resolved target (SEL-03 — never pre-fetch another rule's
  // body). gray-matter matter(raw).content is the body; this is the sole place a
  // body legitimately surfaces. A target missing at fetch time throws loudly here.
  const raw = readFileSync(target, "utf8");
  process.stdout.write(matter(raw).content);
}
