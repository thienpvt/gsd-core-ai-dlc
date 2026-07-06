/**
 * STUB — Atomic read/write of the governance ledger (RESEARCH §5).
 *
 * Implemented in the GREEN step. RED step ships this throw-only stub so
 * state-store.test.ts fails for the right reasons.
 */
import type {
  Phase,
  RuleIndex,
  SelectionConfig,
  SelectionResult,
  TaskSignal,
} from "../types.js";
import type { RiskTier } from "./risk.js";

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
 * Atomically write the selection record to `<root>/.planning/governance/
 * selection-state.json` via temp-then-rename (RESEARCH §5, Pitfall 5). A
 * mid-write crash leaves either the old or the new file, never a truncated one.
 */
export function writeSelection(
  _record: GovernanceRecord,
  _projectRoot: string,
): void {
  throw new Error("writeSelection: not implemented (RED stub)");
}

/**
 * Read the selection record. Returns null when the file does not exist yet
 * (no record yet — not an error). THROWS loud on a malformed file (non-JSON,
 * or JSON missing selectionResult) — Pitfall 7: a corrupt ledger must NOT
 * masquerade as "no governance".
 */
export function readSelection(_projectRoot: string): GovernanceRecord | null {
  throw new Error("readSelection: not implemented (RED stub)");
}

/**
 * Atomically write a per-phase record (same temp-then-rename pattern as
 * {@link writeSelection}). `key` is a caller-chosen identifier (task id,
 * timestamp, …).
 */
export function writePhaseRecord(
  _record: GovernanceRecord,
  _projectRoot: string,
  _key: string,
): void {
  throw new Error("writePhaseRecord: not implemented (RED stub)");
}

/** Per-phase counterpart of {@link readSelection}. */
export function readPhaseRecord(
  _projectRoot: string,
  _phase: Phase,
  _key: string,
): GovernanceRecord | null {
  throw new Error("readPhaseRecord: not implemented (RED stub)");
}
