import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { GateId, GateRequest, GateResult } from "../enforcement/types.js";
import { readGateEvidence, writeGateEvidence, type GateEvidence } from "./gate-evidence-store.js";
import {
  writeApproval,
  readApproval,
  type ApprovalRecord,
  type ApprovalDecision,
} from "./approval-store.js";
import { shipGateHook } from "./ship-gate-hook.js";
import { gateEvidencePath } from "./paths.js";

const RUNNER = path.resolve(process.cwd(), "dist-test", "governance", "ship-gate-hook.js");
const STRICT_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-ship-gate-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function request(gateId: GateId): GateRequest {
  return {
    gateId,
    phase: "construction",
    taskSignal: {
      taskType: "feature",
      keywords: ["ship", "governance"],
      paths: ["src/governance/ship-gate-hook.ts"],
    },
    rules: [
      {
        id: "GATE-05",
        severity: "critical",
        summary: "Ship must block on incomplete governance evidence.",
        matchedAxis: "always-in-phase",
        matchedValue: "always-in-phase",
      },
    ],
    requestedAt: "2026-07-07T00:00:00.000Z",
  };
}

function result(gateId: GateId, status: GateResult["status"] = "pass"): GateResult {
  return {
    gateId,
    status,
    findings:
      status === "fail"
        ? [
            {
              id: `${gateId}-blocked`,
              severity: "critical",
              message: `${gateId} gate failed`,
            },
          ]
        : [],
    evaluatedBy: `${gateId}-fixture`,
    evaluatedAt: "2026-07-07T00:00:01.000Z",
  };
}

function evidence(gateId: GateId, status: GateResult["status"] = "pass"): GateEvidence {
  return {
    request: request(gateId),
    result: result(gateId, status),
    metadata: {
      phase: "08",
      writtenAt: "2026-07-07T00:00:02.000Z",
      source: `${gateId}-fixture`,
    },
  };
}

function seedPriorEvidence(
  root: string,
  statuses: Partial<Record<"plan" | "verify", GateResult["status"]>> = {},
): void {
  writeGateEvidence(root, "08", evidence("plan", statuses.plan ?? "pass"));
  writeGateEvidence(root, "08", evidence("verify", statuses.verify ?? "pass"));
}

/**
 * Build a valid ApprovalRecord fixture for Phase 9 Plan 04 ship-gate approval
 * blocking tests. decision='pending' OMITS decidedBy/decidedAt (D-07 — absent,
 * not empty string); other decisions populate them so validateApproval accepts.
 */
function makeApproval(
  decision: ApprovalDecision,
  root: string,
  overrides: Partial<ApprovalRecord> = {},
): ApprovalRecord {
  const pending = decision === "pending";
  return {
    approvalId: "ship-08",
    phase: "construction",
    gateId: "ship",
    artifactPath: gateEvidencePath(root, "08", "ship"),
    requestedBy: "test-fixture",
    requestedAt: "2026-07-07T00:00:00.000Z",
    decision,
    ...(pending
      ? {}
      : { decidedBy: "human-approver", decidedAt: "2026-07-07T00:01:00.000Z" }),
    ...overrides,
  };
}

test("shipGateHook fails closed when plan evidence is missing and writes no ship evidence", () => {
  withTempRoot((root) => {
    writeGateEvidence(root, "08", evidence("verify"));

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: missing governance evidence .*\.planning[\\/]governance[\\/]gates[\\/]08-plan\.json/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
  });
});

test("shipGateHook fails closed when verify evidence is missing and writes no ship evidence", () => {
  withTempRoot((root) => {
    writeGateEvidence(root, "08", evidence("plan"));

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: missing governance evidence .*\.planning[\\/]governance[\\/]gates[\\/]08-verify\.json/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
  });
});

test("shipGateHook propagates malformed plan or verify evidence errors", () => {
  for (const gateId of ["plan", "verify"] as const) {
    withTempRoot((root) => {
      seedPriorEvidence(root);
      const filePath = gateEvidencePath(root, "08", gateId);
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, "{not-json", "utf8");

      assert.throws(
        () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
        new RegExp(`malformed gate evidence at .*08-${gateId}\\.json`, "i"),
      );
      assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
    });
  }
});

test("shipGateHook blocks failing plan or verify evidence with finding details", () => {
  for (const [gateId, statuses] of [
    ["plan", { plan: "fail" }],
    ["verify", { verify: "fail" }],
  ] as const) {
    withTempRoot((root) => {
      seedPriorEvidence(root, statuses);

      assert.throws(
        () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
        new RegExp(`ship gate: ${gateId} governance evidence failed[\\s\\S]*${gateId}-blocked[\\s\\S]*${gateId} gate failed`, "i"),
      );
      assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
    });
  }
});

test("shipGateHook writes ship evidence when plan and verify evidence pass or waive", () => {
  for (const [planStatus, verifyStatus] of [
    ["pass", "pass"],
    ["waived", "pass"],
    ["pass", "waived"],
  ] as const) {
    withTempRoot((root) => {
      seedPriorEvidence(root, { plan: planStatus, verify: verifyStatus });

      const hookResult = shipGateHook({ projectRoot: root, phaseNumber: "08" });
      const shipEvidence = readGateEvidence(root, "08", "ship");

      assert.ok(shipEvidence, "expected persisted ship evidence");
      assert.deepEqual(hookResult.evidence, shipEvidence);
      assert.equal(shipEvidence.request.gateId, "ship");
      assert.equal(shipEvidence.request.phase, request("verify").phase);
      assert.deepEqual(shipEvidence.request.taskSignal, request("verify").taskSignal);
      assert.deepEqual(shipEvidence.request.rules, request("verify").rules);
      assert.match(shipEvidence.request.requestedAt, STRICT_ISO);
      assert.equal(shipEvidence.result.gateId, "ship");
      assert.equal(shipEvidence.result.status, "pass");
      assert.equal(shipEvidence.result.evaluatedBy, "aidlc-governance-ship");
      assert.deepEqual(shipEvidence.result.findings, []);
      assert.match(shipEvidence.result.evaluatedAt, STRICT_ISO);
      assert.equal(shipEvidence.metadata.phase, "08");
      assert.equal(shipEvidence.metadata.source, "aidlc-governance-ship");
      assert.match(shipEvidence.metadata.writtenAt, STRICT_ISO);

      const asRecord = shipEvidence as unknown as Record<string, unknown>;
      assert.equal("approval" in asRecord, false);
      assert.equal("approvals" in asRecord, false);
      assert.equal("rollback" in asRecord, false);
      assert.equal("rollbackPlan" in asRecord, false);
      assert.equal("audit" in asRecord, false);
      assert.equal("auditRecord" in asRecord, false);
    });
  }
});

test("ship gate creates a pending approval when none exists and throws (D-07)", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    // Pre-condition: no approval file present.
    assert.equal(readApproval(root, "08"), null);

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: 08 pending approval created — human resolution required/i,
    );

    // D-07: pending approval was written with decidedBy ABSENT (undefined, not "").
    const approval = readApproval(root, "08");
    assert.ok(approval, "pending approval should be persisted");
    assert.equal(approval.decision, "pending");
    assert.equal(approval.approvalId, "ship-08");
    assert.equal(approval.gateId, "ship");
    assert.equal(approval.decidedBy, undefined);
    assert.equal("decidedBy" in approval, false, "decidedBy must be absent, not empty string");
    assert.equal(approval.decidedAt, undefined);
    assert.equal("decidedAt" in approval, false, "decidedAt must be absent");

    // No ship evidence written — fail-closed ordering.
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
  });
});

test("ship gate blocks on pending approval (D-08)", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    writeApproval(root, "08", makeApproval("pending", root));

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: approval ship-08 is pending — human resolution required/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
  });
});

test("ship gate blocks on rejected approval (D-08)", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    writeApproval(root, "08", makeApproval("rejected", root));

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: approval ship-08 is rejected/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), false);
  });
});

test("ship gate proceeds on approved approval and writes ship evidence", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    writeApproval(root, "08", makeApproval("approved", root));

    shipGateHook({ projectRoot: root, phaseNumber: "08" });
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), true);
  });
});

test("ship gate proceeds on waived approval and writes ship evidence", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    writeApproval(root, "08", makeApproval("waived", root));

    shipGateHook({ projectRoot: root, phaseNumber: "08" });
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), true);
  });
});

test("ship evidence record has NO approval fields after approval proceeds", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    writeApproval(root, "08", makeApproval("approved", root));

    shipGateHook({ projectRoot: root, phaseNumber: "08" });
    const shipEvidence = readGateEvidence(root, "08", "ship");
    assert.ok(shipEvidence);

    const asRecord = shipEvidence as unknown as Record<string, unknown>;
    assert.equal("approval" in asRecord, false);
    assert.equal("approvals" in asRecord, false);
    assert.equal("decision" in asRecord, false);
    assert.equal("approvalId" in asRecord, false);
  });
});

test("compiled direct runner fails with stderr and non-zero exit on blocking evidence", () => {
  withTempRoot((root) => {
    writeGateEvidence(root, "08", evidence("verify"));

    const child = spawnSync(process.execPath, [RUNNER, root, "08"], { encoding: "utf8" });
    assert.equal(child.status, 1);
    assert.match(child.stderr, /08-plan\.json/);
  });
});
