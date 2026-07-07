/**
 * Enforcement contract TypeScript types (ENF-02).
 *
 * Mirrors the 3 JSON Schema (draft 2020-12) contracts from Task 1
 * (gate-request, gate-result, audit-artifact) for compile-time safety.
 * Runtime validation ships in 07-02 (validateGateResult); the GateAdapter
 * interface + 7 stubs ship in 07-03 (adapters.ts). This file is types only.
 *
 * Reuse over redeclare: Severity/Phase/TaskSignal from ../types.js and
 * AuditAppliedRule from ../governance/audit-artifact.js are imported, not
 * redefined — the applied-rule shape is single-sourced where the audit
 * writer already emits it (07-CONTEXT.md code_context).
 */
import type { Severity, Phase, TaskSignal } from "../types.js";
import type { AuditAppliedRule } from "../governance/audit-artifact.js";

/** The 5-step GSD loop gate being requested. Phase 8 consumes this union. */
export type GateId = "discuss" | "plan" | "execute" | "verify" | "ship";

/**
 * Structured evidence pointer on a gate finding. Object form per
 * 07-CONTEXT.md Claude's Discretion recommendation — matches SAST tool
 * output. path required; lineRange is 1-based [startLine, endLine].
 */
export interface GateFindingEvidence {
  path: string;
  lineRange?: [number, number];
  url?: string;
}

/** A single gate finding (SAST-style). */
export interface GateFinding {
  id: string;
  severity: Severity;
  message: string;
  evidence?: GateFindingEvidence;
}

/**
 * Binding contract for a gate evaluation request.
 * rules[] reuses AuditAppliedRule — the same shape the audit writer emits.
 */
export interface GateRequest {
  gateId: GateId;
  phase: Phase;
  taskSignal: TaskSignal;
  rules: AuditAppliedRule[];
  requestedAt: string;
}

/** Binding contract for a gate evaluation result (the enforcement decision). */
export interface GateResult {
  gateId: GateId;
  status: "pass" | "fail" | "waived";
  findings: GateFinding[];
  evaluatedBy: string;
  evaluatedAt: string;
}