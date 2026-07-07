import { existsSync, readFileSync } from "node:fs";
import { atomicWriteFile } from "./atomic-write.js";
import { gateEvidencePath } from "./paths.js";
import type { GateId, GateRequest, GateResult } from "../enforcement/types.js";
import { validateGateResult } from "../enforcement/validate-gate-result.js";

export interface GateEvidenceMetadata {
  phase: string;
  writtenAt: string;
  source: string;
}

export interface GateEvidence {
  request: GateRequest;
  result: GateResult;
  metadata: GateEvidenceMetadata;
}

const ISO_8601_STRICT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const GATE_IDS = new Set<GateId>(["discuss", "plan", "execute", "verify", "ship"]);

function fail(filePath: string, detail: string): never {
  throw new Error(`malformed gate evidence at ${filePath}: ${detail}`);
}

function assertObject(
  value: unknown,
  filePath: string,
  field: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(filePath, `${field} must be an object`);
  }
}

function assertString(
  value: unknown,
  filePath: string,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    fail(filePath, `${field} must be a non-empty string`);
  }
}

function assertGateId(
  value: unknown,
  filePath: string,
  field: string,
): asserts value is GateId {
  assertString(value, filePath, field);
  if (!GATE_IDS.has(value as GateId)) {
    fail(filePath, `${field} must be a known gate id`);
  }
}

function assertTimestamp(value: unknown, filePath: string, field: string): asserts value is string {
  assertString(value, filePath, field);
  if (!ISO_8601_STRICT.test(value)) {
    fail(filePath, `${field} must be YYYY-MM-DDTHH:mm:ss.sssZ`);
  }
}

function assertRequest(
  value: unknown,
  filePath: string,
  expectedGateId: GateId,
): asserts value is GateRequest {
  assertObject(value, filePath, "request");
  assertGateId(value.gateId, filePath, "request.gateId");
  if (value.gateId !== expectedGateId) {
    fail(filePath, `request.gateId must be ${expectedGateId}`);
  }
  assertString(value.phase, filePath, "request.phase");
  assertObject(value.taskSignal, filePath, "request.taskSignal");
  if (!Array.isArray(value.rules)) {
    fail(filePath, "request.rules must be an array");
  }
  assertTimestamp(value.requestedAt, filePath, "request.requestedAt");
}

function assertMetadata(
  value: unknown,
  filePath: string,
  phaseNumber: string,
): asserts value is GateEvidenceMetadata {
  assertObject(value, filePath, "metadata");
  assertString(value.phase, filePath, "metadata.phase");
  if (value.phase !== phaseNumber) {
    fail(filePath, `metadata.phase must be ${phaseNumber}`);
  }
  assertTimestamp(value.writtenAt, filePath, "metadata.writtenAt");
  assertString(value.source, filePath, "metadata.source");
}

function assertResult(value: unknown, filePath: string, expectedGateId: GateId): asserts value is GateResult {
  try {
    validateGateResult(value);
  } catch (err) {
    fail(filePath, String(err));
  }
  if (value.gateId !== expectedGateId) {
    fail(filePath, `result.gateId must be ${expectedGateId}`);
  }
}

function assertEvidence(
  value: unknown,
  filePath: string,
  phaseNumber: string,
  gateId: GateId,
): asserts value is GateEvidence {
  assertObject(value, filePath, "record");
  if (!("request" in value)) fail(filePath, "missing request");
  if (!("result" in value)) fail(filePath, "missing result");
  if (!("metadata" in value)) fail(filePath, "missing metadata");
  assertRequest(value.request, filePath, gateId);
  assertResult(value.result, filePath, gateId);
  assertMetadata(value.metadata, filePath, phaseNumber);
  if (value.request.gateId !== value.result.gateId) {
    fail(filePath, "request.gateId must match result.gateId");
  }
}

function gateIdForWrite(value: GateEvidence): GateId {
  const gateId = (value as { request?: { gateId?: unknown } }).request?.gateId;
  if (typeof gateId === "string" && GATE_IDS.has(gateId as GateId)) {
    return gateId as GateId;
  }
  throw new Error("malformed gate evidence: request.gateId must be a known gate id");
}

export function writeGateEvidence(
  projectRoot: string,
  phaseNumber: string,
  evidence: GateEvidence,
): void {
  const gateId = gateIdForWrite(evidence);
  const filePath = gateEvidencePath(projectRoot, phaseNumber, gateId);
  assertEvidence(evidence, filePath, phaseNumber, gateId);
  atomicWriteFile(filePath, JSON.stringify(evidence, null, 2));
}

export function readGateEvidence(
  projectRoot: string,
  phaseNumber: string,
  gateId: GateId,
): GateEvidence | null {
  const filePath = gateEvidencePath(projectRoot, phaseNumber, gateId);
  if (!existsSync(filePath)) return null;

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    fail(filePath, `unreadable (${String(err)})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(filePath, String(err));
  }

  assertEvidence(parsed, filePath, phaseNumber, gateId);
  return parsed;
}
