/**
 * Index builder: corpus in, `rule-index.json` out (PACK-04).
 *
 * Each record is assembled by an EXPLICIT field whitelist — the parse result is
 * never spread and gray-matter's `content` is never referenced, so a body cannot
 * leak into the index by construction (Pitfall 4 / D-05). The no-body output
 * schema + fast-check property test that lock this are added in 01-04.
 */
import { writeFileSync } from "node:fs";
import type { RuleIndex, RuleIndexRecord, ParsedRule } from "../types.js";
import { loadRules } from "../rules/load.js";

/** Current on-disk index schema version. */
const SCHEMA_VERSION = 1 as const;

/** Assemble one index record from a parsed rule via an explicit field whitelist. */
function toRecord(rule: ParsedRule): RuleIndexRecord {
  const fm = rule.frontmatter;
  const record: RuleIndexRecord = {
    id: fm.id,
    scope: fm.scope,
    triggers: fm.triggers,
    phases: fm.phases,
    severity: fm.severity,
    summary: fm.summary,
    classification: fm.classification,
    sourceFile: rule.sourceFile,
  };
  // Optional pointers — emitted only when present (never as `undefined` keys).
  if (fm.detailPath !== undefined) record.detailPath = fm.detailPath;
  if (fm.enforcement !== undefined) record.enforcement = fm.enforcement;
  return record;
}

/** Build the in-memory index from every rule under `rootDir`. */
export function buildIndex(rootDir: string): RuleIndex {
  const rules = loadRules(rootDir);
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    rules: rules.map(toRecord),
  };
}

/** Serialize the index to `outPath` as pretty-printed JSON (2-space indent). */
export function writeIndex(index: RuleIndex, outPath: string): void {
  writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}
