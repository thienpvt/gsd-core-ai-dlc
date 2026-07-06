import type { GovernanceRecord } from "./state-store.js";

export interface ExecuteHookArgs {
  projectRoot: string;
  statePath?: string;
}

export interface ExecuteHookResult {
  fragment: string;
  record: GovernanceRecord;
}

export function executeHook(_args: ExecuteHookArgs): ExecuteHookResult {
  throw new Error("not implemented");
}
