/**
 * Atomic read/write of the governance ledger under
 * `<projectRoot>/.planning/governance/` (RESEARCH §5, Pitfalls 4 + 5 + 7).
 *
 * Write contract (Pitfall 5 — atomic):
 *   - serialize as pretty JSON
 *   - write to `<final>.tmp` (writeFileSync)
 *   - renameSync(tmp, final) — atomic on POSIX, near-atomic on Windows
 *   - a mid-write crash leaves either the old or the new file, never a truncated one
 *
 * Read contract (Pitfall 7 — loud on malformed):
 *   - missing file  -> null (no record yet — not an error)
 *   - non-JSON file -> throws "malformed governance state at <path>: <error>"
 *   - JSON missing `selectionResult` -> throws (a partial record must NOT
 *     masquerade as a valid one — under-injection footgun)
 *
 * Determinism (Pitfall 4 — no clock in selection):
 *   - the persisted `selectionResult` is the full Phase 2 SelectionResult
 *     with NO timestamp field; the wrapper record's `timestamp` is metadata.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  Phase,
  RuleIndex,
  SelectionConfig,
  SelectionResult,
  TaskSignal,
} from "../types.js";
import type { RiskTier } from "./risk.js";
import {
  phaseDir,
  phaseRecordPath,
  selectionStatePath,
} from "./paths.js";

/**
 * The persisted record shape. `selectionResult` carries the FULL Phase 2
 * SelectionResult (selected + skipped + reasons + budget) — no clock, no
 * timestamp, so byte-identical reload is achievable (Pitfall 4). `timestamp`
 * is wrapper METADATA only (when this record was written).
 */
export interface GovernanceRecord {
  phase: Phase;
  taskSignal: TaskSignal;
  selectionConfig: SelectionConfig;
  selectionResult: SelectionResult;
  riskTier: RiskTier;
  /** ISO timestamp — wrapper metadata only, NOT inside selectionResult. */
  timestamp: string;
}

/** Re-exported for callers that need to read the index alongside the record. */
export type { RuleIndex };

/**
 * Atomically write a record to `finalPath` via temp-then-rename. Ensures the
 * parent directory exists. Pretty-prints JSON (2-space indent) for diffability.
 *
 * Shared by both the canonical selection-state file and the per-phase files.
 */
function atomicWriteJson(finalPath: string, record: GovernanceRecord): void {
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmp = `${finalPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(record, null, 2), "utf8");
  renameSync(tmp, finalPath);
}

/**
 * Read + parse a governance record file. Returns null when the file does not
 * exist (no record yet). THROWS loud on a malformed file (non-JSON, or JSON
 * missing the `selectionResult` field) — Pitfall 7.
 *
 * Shared by both the canonical selection-state file and the per-phase files.
 */
function readJsonRecord(filePath: string): GovernanceRecord | null {
  if (!existsSync(filePath)) return null;
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `malformed governance state at ${filePath}: unreadable (${String(err)})`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `malformed governance state at ${filePath}: ${String(err)}`,
    );
  }
  // Defensive shape check — a partial record must NOT masquerade as valid.
  // The load-bearing field is selectionResult: if it's absent or not an
  // object, the reload cannot reproduce the discuss-time selection.
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("selectionResult" in parsed) ||
    typeof (parsed as { selectionResult: unknown }).selectionResult !== "object" ||
    (parsed as { selectionResult: unknown }).selectionResult === null
  ) {
    throw new Error(
      `malformed governance state at ${filePath}: record missing or invalid selectionResult`,
    );
  }
  return parsed as GovernanceRecord;
}

/**
 * Atomically write the selection record to `<root>/.planning/governance/
 * selection-state.json` (RESEARCH §5, Pitfall 5).
 */
export function writeSelection(
  record: GovernanceRecord,
  projectRoot: string,
): void {
  atomicWriteJson(selectionStatePath(projectRoot), record);
}

/**
 * Read the canonical selection record. Returns null when the file does not
 * exist yet (no record — not an error). THROWS loud on a malformed file
 * (Pitfall 7).
 */
export function readSelection(projectRoot: string): GovernanceRecord | null {
  return readJsonRecord(selectionStatePath(projectRoot));
}

/**
 * Atomically write a per-phase record (same temp-then-rename pattern). `key`
 * is a caller-chosen identifier (task id, timestamp, …). The phase dir is
 * created if needed.
 */
export function writePhaseRecord(
  record: GovernanceRecord,
  projectRoot: string,
  key: string,
): void {
  // Ensure the phase dir exists (mkdirSync recursive in atomicWriteJson covers
  // the parent of the final file, but this gives a stable layout even before
  // the first write — useful for tests that scan the dir).
  mkdirSync(phaseDir(projectRoot, record.phase), { recursive: true });
  atomicWriteJson(phaseRecordPath(projectRoot, record.phase, key), record);
}

/** Per-phase counterpart of {@link readSelection}. */
export function readPhaseRecord(
  projectRoot: string,
  phase: Phase,
  key: string,
): GovernanceRecord | null {
  return readJsonRecord(phaseRecordPath(projectRoot, phase, key));
}
