import type { GateRequest, GateResult } from "./types.js";

export interface GateAdapter {
  readonly name: string;
  evaluate(request: GateRequest): Promise<GateResult>;
}

/**
 * Reference stub names only; these are not first-class integrations and never
 * execute external tools. Real adapters replace these at the boundary.
 */
export const STUB_NAMES = [
  "semgrep",
  "bandit",
  "checkov",
  "grype",
  "gitleaks",
  "generic-exit-ci",
  "human-approval",
] as const;

/**
 * Build a reference no-op stub. It reports a clean pass and no findings; it
 * does not execute or impersonate a real integration.
 */
export function noopAdapter(name: string): GateAdapter {
  return {
    name,
    async evaluate(request: GateRequest): Promise<GateResult> {
      return {
        gateId: request.gateId,
        status: "pass",
        findings: [],
        evaluatedBy: name,
        evaluatedAt: new Date().toISOString(),
      };
    },
  };
}

/**
 * Build a reference echo stub. It mirrors selected rules as findings for tests;
 * it does not execute or impersonate a real integration.
 */
export function echoAdapter(name: string): GateAdapter {
  return {
    name,
    async evaluate(request: GateRequest): Promise<GateResult> {
      return {
        gateId: request.gateId,
        // ponytail: echo marks non-empty rules as fail so callers observe findings.
        // Upgrade path: Phase 8+ real adapters set status from tool output.
        status: request.rules.length > 0 ? "fail" : "pass",
        findings: request.rules.map((rule) => ({
          id: rule.id,
          severity: rule.severity,
          message: rule.summary,
        })),
        evaluatedBy: name,
        evaluatedAt: new Date().toISOString(),
      };
    },
  };
}

export const ADAPTERS: ReadonlyMap<string, GateAdapter> = new Map(
  STUB_NAMES.map((name) => [name, noopAdapter(name)] as const),
);

export const ECHO_ADAPTERS: ReadonlyMap<string, GateAdapter> = new Map(
  STUB_NAMES.map((name) => [name, echoAdapter(name)] as const),
);
