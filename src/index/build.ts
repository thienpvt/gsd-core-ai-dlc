/**
 * Index builder: corpus in, `rule-index.json` out (PACK-04).
 *
 * Each record is assembled by an EXPLICIT field whitelist — the parse result is
 * never spread and gray-matter's `content` is never referenced, so a body cannot
 * leak into the index by construction (Pitfall 4 / D-05). The no-body output
 * schema + fast-check property test that lock this are added in 01-04.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { RuleIndex, RuleIndexRecord } from "../types.js";
import { loadRules } from "../rules/load.js";
import {
  assertScopeMatchesDirectory,
  resolvePrecedence,
  type ResolvedRule,
} from "../rules/scope.js";

/** Current on-disk index schema version. */
const SCHEMA_VERSION = 1 as const;

/**
 * Assemble one index record from a resolved precedence winner via an EXPLICIT
 * field whitelist. The winner's Markdown body is never referenced — only its
 * frontmatter + `sourceFile` are read — so a body cannot leak (Pitfall 4 / D-05).
 */
function toRecord(resolved: ResolvedRule): RuleIndexRecord {
  const fm = resolved.winner.frontmatter;
  const record: RuleIndexRecord = {
    id: fm.id,
    scope: fm.scope,
    triggers: fm.triggers,
    phases: fm.phases,
    severity: fm.severity,
    summary: fm.summary,
    classification: fm.classification,
    sourceFile: resolved.winner.sourceFile,
  };
  // Optional pointers — emitted only when present (never as `undefined` keys).
  if (fm.detailPath !== undefined) record.detailPath = fm.detailPath;
  if (fm.enforcement !== undefined) record.enforcement = fm.enforcement;
  // Superseded provenance (D-11) — attached ONLY when non-empty, so a
  // non-colliding rule's record carries no `superseded` key and stays shape-
  // identical to the 01-01 single-rule output (backward compatible).
  if (resolved.superseded.length > 0) record.superseded = resolved.superseded;
  return record;
}

/**
 * Build the in-memory index from every rule under `rootDir`.
 *
 * Order matters: validate scope-vs-directory for every rule FIRST (D-09 — a
 * mis-scoped rule fails the build loudly before any record is assembled), then
 * collapse same-id collisions across tiers to a single winner + superseded losers
 * (D-11/D-12). `rootDir` is resolved to an absolute path so scope derivation
 * matches the absolute paths `loadRules` produces on Windows and POSIX alike.
 */
export function buildIndex(rootDir: string): RuleIndex {
  const absRoot = path.resolve(rootDir);
  const rules = loadRules(absRoot);
  for (const rule of rules) {
    assertScopeMatchesDirectory(rule, absRoot);
  }
  const resolved = resolvePrecedence(rules);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    rules: resolved.map(toRecord),
  };
}

/** Serialize the index to `outPath` as pretty-printed JSON (2-space indent). */
export function writeIndex(index: RuleIndex, outPath: string): void {
  writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}
