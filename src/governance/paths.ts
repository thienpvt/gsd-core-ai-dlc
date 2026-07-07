/**
 * Single-sourced path helpers for the on-disk governance ledger (RESEARCH §5).
 *
 * Layout under `<projectRoot>/.planning/governance/`:
 *   - `selection-state.json`        — the latest full SelectionResult record
 *   - `phase-<NN>/<key>.json`       — per-phase records (key chosen by callers)
 *
 * Centralizing path derivation here prevents the path-drift pitfall flagged in
 * 04-RESEARCH — every reader/writer composes through these helpers, so a layout
 * change is one edit, not many. Pure: no I/O, no clock, no random.
 */
import path from "node:path";
import type { GateId } from "../enforcement/types.js";
import type { Phase } from "../types.js";

const PHASE_NUMBER_RE = /^\d{2}(?:\.\d+)?$/;

/**
 * The governance directory under a project root. Created on first write by
 * state-store.ts (mkdirSync recursive) — readers must NOT assume it exists.
 */
export function governanceDir(projectRoot: string): string {
  return path.join(projectRoot, ".planning", "governance");
}

/**
 * Path to the canonical `selection-state.json` (the latest full record). This
 * is the file the execute hook (04-02) reads to reload a selection across a
 * subagent/compaction boundary — single source of truth for "what was
 * selected at discuss time".
 */
export function selectionStatePath(projectRoot: string): string {
  return path.join(governanceDir(projectRoot), "selection-state.json");
}

/**
 * Path to a per-phase governance directory. Phase is the Phase enum string
 * (`inception` | `construction` | `operations` | `common`) — callers pass the
 * same Phase value used in SelectionConfig.
 */
export function phaseDir(projectRoot: string, phase: Phase): string {
  return path.join(governanceDir(projectRoot), `phase-${phase}`);
}

/**
 * Path to a per-phase record file. `key` is a caller-chosen identifier (e.g.
 * a task id or timestamp) — the store does not interpret it.
 */
export function phaseRecordPath(
  projectRoot: string,
  phase: Phase,
  key: string,
): string {
  return path.join(phaseDir(projectRoot, phase), `${key}.json`);
}

export function gateEvidencePath(
  projectRoot: string,
  phaseNumber: string,
  gateId: GateId,
): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid gate evidence phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "gates", `${phaseNumber}-${gateId}.json`);
}

/**
 * Path to a per-phase approval record (APPR-01, D-06). One file per phase under
 * `.planning/governance/approvals/{NN}.json`. PHASE_NUMBER_RE-validated to catch
 * drift. The ship gate (09-04) writes pending records here; the audit (09-03)
 * reads the resolved record to embed an approval summary.
 */
export function approvalPath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid approval phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "approvals", `${phaseNumber}.json`);
}

/**
 * Path to a per-phase test-evidence record (AUDIT-04, D-02). One file per phase
 * under `.planning/governance/tests/{NN}.json`. PHASE_NUMBER_RE-validated.
 * Plan 02 consumes this helper without modifying paths.ts again — paths.ts is
 * the single source of the governance layout.
 */
export function testEvidencePath(projectRoot: string, phaseNumber: string): string {
  if (!PHASE_NUMBER_RE.test(phaseNumber)) {
    throw new Error(`invalid test evidence phase number: ${phaseNumber}`);
  }
  return path.join(governanceDir(projectRoot), "tests", `${phaseNumber}.json`);
}
