import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { type GateEvidence, readGateEvidence, writeGateEvidence } from "./gate-evidence-store.js";
import { gateEvidencePath, selectionStatePath } from "./paths.js";
import type { GateRequest, GateResult } from "../enforcement/types.js";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-gate-evidence-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function request(gateId: GateRequest["gateId"] = "plan"): GateRequest {
  return {
    gateId,
    phase: "construction",
    taskSignal: {
      taskType: "feature",
      keywords: ["governance", "gate"],
      paths: ["src/governance/gate-evidence-store.ts"],
    },
    rules: [
      {
        id: "GATE-STORE-01",
        severity: "high",
        summary: "Gate evidence must persist atomically.",
        matchedAxis: "paths",
        matchedValue: "src/governance/gate-evidence-store.ts",
      },
    ],
    requestedAt: "2026-07-07T00:00:00.000Z",
  };
}

function result(gateId: GateResult["gateId"] = "plan"): GateResult {
  return {
    gateId,
    status: "pass",
    findings: [],
    evaluatedBy: "generic-exit-ci",
    evaluatedAt: "2026-07-07T00:00:01.000Z",
  };
}

function evidence(overrides: Partial<GateEvidence> = {}): GateEvidence {
  return {
    request: request("plan"),
    result: result("plan"),
    metadata: {
      phase: "08",
      writtenAt: "2026-07-07T00:00:02.000Z",
      source: "gate-evidence-store.test",
    },
    ...overrides,
  };
}

test("gateEvidencePath stores gate evidence under .planning/governance/gates/{NN}-{gate}.json", () => {
  withTempRoot((root) => {
    assert.equal(
      gateEvidencePath(root, "08", "plan"),
      path.join(root, ".planning", "governance", "gates", "08-plan.json"),
    );
  });
});

test("readGateEvidence returns null when evidence is missing", () => {
  withTempRoot((root) => {
    assert.equal(readGateEvidence(root, "08", "plan"), null);
  });
});

test("writeGateEvidence round-trips request, validated result, and metadata", () => {
  withTempRoot((root) => {
    const original = evidence();
    writeGateEvidence(root, "08", original);
    const reloaded = readGateEvidence(root, "08", "plan");
    assert.deepEqual(reloaded, original);
  });
});

test("writeGateEvidence leaves no temp siblings and never writes selection-state.json", () => {
  withTempRoot((root) => {
    const finalPath = gateEvidencePath(root, "08", "plan");
    writeGateEvidence(root, "08", evidence());
    const leftovers = readdirSync(path.dirname(finalPath)).filter(
      (name) => name !== path.basename(finalPath) && name.includes(".tmp"),
    );
    assert.deepEqual(leftovers, []);
    assert.equal(existsSync(selectionStatePath(root)), false);
  });
});

test("readGateEvidence throws loud on malformed JSON", () => {
  withTempRoot((root) => {
    const finalPath = gateEvidencePath(root, "08", "plan");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(finalPath, "{not-json", "utf8");
    assert.throws(
      () => readGateEvidence(root, "08", "plan"),
      /malformed gate evidence at .*08-plan\.json/i,
    );
  });
});

test("readGateEvidence throws loud when request, result, or metadata is missing", () => {
  for (const field of ["request", "result", "metadata"] as const) {
    withTempRoot((root) => {
      const finalPath = gateEvidencePath(root, "08", "plan");
      mkdirSync(path.dirname(finalPath), { recursive: true });
      const corrupt: Record<string, unknown> = { ...evidence() };
      delete corrupt[field];
      writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
      assert.throws(
        () => readGateEvidence(root, "08", "plan"),
        new RegExp(`malformed gate evidence at .*08-plan\\.json: .*${field}`, "i"),
      );
    });
  }
});

test("readGateEvidence throws loud when request and result gate ids differ", () => {
  withTempRoot((root) => {
    const finalPath = gateEvidencePath(root, "08", "plan");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(
      finalPath,
      JSON.stringify(evidence({ result: result("verify") })),
      "utf8",
    );
    assert.throws(
      () => readGateEvidence(root, "08", "plan"),
      /malformed gate evidence at .*08-plan\.json: .*gateId/i,
    );
  });
});

test("readGateEvidence throws loud when metadata phase mismatches the path phase", () => {
  withTempRoot((root) => {
    const finalPath = gateEvidencePath(root, "08", "plan");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(
      finalPath,
      JSON.stringify(evidence({ metadata: { ...evidence().metadata, phase: "09" } })),
      "utf8",
    );
    assert.throws(
      () => readGateEvidence(root, "08", "plan"),
      /malformed gate evidence at .*08-plan\.json: .*metadata\.phase/i,
    );
  });
});

test("readGateEvidence throws loud when metadata.writtenAt is not strict ISO", () => {
  withTempRoot((root) => {
    const finalPath = gateEvidencePath(root, "08", "plan");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(
      finalPath,
      JSON.stringify(evidence({ metadata: { ...evidence().metadata, writtenAt: "2026/07/07" } })),
      "utf8",
    );
    assert.throws(
      () => readGateEvidence(root, "08", "plan"),
      /malformed gate evidence at .*08-plan\.json: .*metadata\.writtenAt/i,
    );
  });
});
