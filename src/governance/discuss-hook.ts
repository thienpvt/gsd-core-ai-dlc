/**
 * STUB — Discuss gate hook (RESEARCH §3 + §6, GATE-01).
 *
 * Implemented in the GREEN step. The hook is THIN: it marshals loop context
 * (STATE phase + task signal + index) through validateSignal -> classifyRisk
 * -> select -> renderInjection, persists the full record via the atomic
 * state-store, and returns the `<governance>` fragment. No matching /
 * rendering / budget logic lives here (Pitfall 3 — those stay in the pure
 * cores so the hook cannot drift into under-injection).
 */
import type {
  Phase,
  RuleIndex,
  SelectionConfig,
  SelectionResult,
  TaskSignal,
} from "../types.js";
import type { GovernanceRecord } from "./state-store.js";

/** Re-exported so callers can read the index alongside the hook result. */
export type { RuleIndex };

/** Arguments to {@link discussHook}. All paths are repo-relative or absolute. */
export interface DiscussHookArgs {
  /** The project root — used to locate STATE.md and the governance store. */
  projectRoot: string;
  /** Override path for STATE.md (defaults to `<root>/.planning/STATE.md`). */
  statePath?: string;
  /** Override path for the rule index (defaults to `<root>/rule-index.json`). */
  indexPath?: string;
  /** The task signal derived from the discuss context. */
  taskSignal: TaskSignal;
  /** The base domain subscription to widen with risk (default []). */
  baseDomains?: string[];
  /** Optional token budget override (default: the config/CLI default 2000). */
  budget?: number;
}

/** The return value of {@link discussHook}. */
export interface DiscussHookResult {
  /** The `<governance>` fragment to attach to the discuss context. */
  fragment: string;
  /** The persisted record (full SelectionResult, no body). */
  record: GovernanceRecord;
}

/** Re-exported types for callers. */
export type { Phase, SelectionConfig, SelectionResult, TaskSignal, GovernanceRecord };

/**
 * Discuss gate hook (RESEARCH §3 + §6, GATE-01). Marshals loop context
 * through the pure cores, persists the full selection, returns the fragment.
 * Throws loud on any malformed input (Pitfall 7).
 */
export function discussHook(_args: DiscussHookArgs): DiscussHookResult {
  throw new Error("discussHook: not implemented (RED stub)");
}
