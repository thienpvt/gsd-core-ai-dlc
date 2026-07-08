import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
import { approvalPath, gateEvidencePath, evalEvidencePath } from "./paths.js";
import { writeEvalEvidence, type EvalReport } from "./eval-evidence.js";

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
      // Plan 04: ship gate now blocks on missing approval — seed an approved
      // record so this test (which exercises ship-evidence shape, not approval
      // blocking) reaches the evidence write.
      writeApproval(root, "08", makeApproval("approved", root));

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

// WR-02: TOCTOU regression. A human-approved record at the path must NOT be
// clobbered when shipGateHook's readApprovalOrFail path is exercised. The
// O_CREAT|O_EXCL create-if-absent primitive preserves the human's decision.

test("WR-02 shipGateHook does not overwrite an existing approved approval with pending (TOCTOU guard)", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    const humanApproved = makeApproval("approved", root, {
      decidedBy: "human-approver",
      decidedAt: "2026-07-07T00:01:00.000Z",
    });
    writeApproval(root, "08", humanApproved);
    const before = readFileSync(approvalPath(root, "08"), "utf8");

    shipGateHook({ projectRoot: root, phaseNumber: "08" });

    const after = readFileSync(approvalPath(root, "08"), "utf8");
    assert.equal(after, before, "human-approved record must be byte-identical after ship-gate run (WR-02)");
  });
});

test("WR-02 shipGateHook does not overwrite an existing pending approval with a fresh pending (idempotent create)", () => {
  withTempRoot((root) => {
    seedPriorEvidence(root);
    writeApproval(root, "08", makeApproval("pending", root));
    const before = readApproval(root, "08");
    assert.ok(before);
    const beforeRequestedAt = before!.requestedAt;

    // Re-run: readApprovalOrFail sees the existing pending, does NOT call
    // createPendingApprovalIfAbsent (the O_EXCL would EEXIST anyway). The
    // existing pending's requestedAt is preserved.
    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "08" }),
      /ship gate: approval ship-08 is pending/i,
    );
    const after = readApproval(root, "08");
    assert.ok(after);
    assert.equal(after!.requestedAt, beforeRequestedAt, "existing pending requestedAt must be preserved (WR-02)");
  });
});

// ---------------------------------------------------------------------------
// SEL-06 Plan 02 — ship gate consumes eval evidence fail-closed (D-07, D-05).
// Forward-scoping guard (RESEARCH Open Q2): only phases >= "10" are checked;
// legacy phases 06-09 shipped without eval evidence and are not retroactively
// failed. These 4 cases FAIL at RED because shipGateHook does not yet read
// eval evidence.
// ---------------------------------------------------------------------------

/**
 * Minimal schema-valid EvalReport fixture (mirrors makeValidEvalReport from
 * validate-eval-report.test.ts). "pass" → criticalRecall 1.0, no misses.
 * "fail" → criticalRecall 0.5 with one critical miss naming the
 * keywords-input-validation case.
 */
function evalReportFixture(
  status: "pass" | "fail",
  phaseNumber: string,
): EvalReport {
  const fail = status === "fail";
  return {
    phase: phaseNumber,
    capturedAt: "2026-07-08T00:00:00.000Z",
    aggregate: {
      microRecall: fail ? 0.75 : 1,
      microPrecision: 1,
      recallBySeverity: {
        critical: fail ? 0.5 : 1,
        high: 1,
        medium: 1,
        low: 1,
      },
    },
    cases: [
      {
        name: "keywords-input-validation",
        selectedIds: fail ? ["secrets-management"] : ["input-validation", "secrets-management"],
        expectedRuleIds: ["input-validation", "secrets-management"],
        tp: fail ? 1 : 2,
        fp: 0,
        fn: fail ? 1 : 0,
      },
    ],
    criticalMisses: fail
      ? [
          {
            case: "keywords-input-validation",
            expectedNotSelected: ["input-validation"],
            severity: "critical",
          },
        ]
      : [],
    precisionOffenders: [],
    corpusHash: "a".repeat(64),
  };
}

/**
 * Phase-parameterized variant of seedPriorEvidence + makeApproval for the
 * eval-blocking tests (phases 10/08). The legacy helpers are hardcoded to
 * metadata.phase "08" and approvalId "ship-08"; the gate-evidence-store
 * asserts metadata.phase === path phaseNumber, so phase-10 evidence needs its
 * own fixture.
 */
function evidenceFor(
  gateId: GateId,
  phaseNumber: string,
  status: GateResult["status"] = "pass",
): GateEvidence {
  return {
    request: request(gateId),
    result: result(gateId, status),
    metadata: {
      phase: phaseNumber,
      writtenAt: "2026-07-07T00:00:02.000Z",
      source: `${gateId}-fixture`,
    },
  };
}

function seedPriorEvidenceFor(
  root: string,
  phaseNumber: string,
  statuses: Partial<Record<"plan" | "verify", GateResult["status"]>> = {},
): void {
  writeGateEvidence(root, phaseNumber, evidenceFor("plan", phaseNumber, statuses.plan ?? "pass"));
  writeGateEvidence(root, phaseNumber, evidenceFor("verify", phaseNumber, statuses.verify ?? "pass"));
}

function makeApprovalFor(
  decision: ApprovalDecision,
  root: string,
  phaseNumber: string,
  overrides: Partial<ApprovalRecord> = {},
): ApprovalRecord {
  const pending = decision === "pending";
  return {
    approvalId: `ship-${phaseNumber}`,
    phase: "construction",
    gateId: "ship",
    artifactPath: gateEvidencePath(root, phaseNumber, "ship"),
    requestedBy: "test-fixture",
    requestedAt: "2026-07-07T00:00:00.000Z",
    decision,
    ...(pending
      ? {}
      : { decidedBy: "human-approver", decidedAt: "2026-07-07T00:01:00.000Z" }),
    ...overrides,
  };
}

test("shipGateHook fails closed when eval evidence is missing for phase >= 10 (D-07)", () => {
  withTempRoot((root) => {
    seedPriorEvidenceFor(root, "10");
    writeApproval(root, "10", makeApprovalFor("approved", root, "10"));
    // Deliberately do NOT seed eval evidence.

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "10" }),
      /ship gate: missing eval evidence .*\.planning[\\/]governance[\\/]eval[\\/]10\.json/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "10", "ship")), false);
  });
});

test("shipGateHook fails closed when eval evidence has criticalRecall < 1.0 (D-05)", () => {
  withTempRoot((root) => {
    seedPriorEvidenceFor(root, "10");
    writeApproval(root, "10", makeApprovalFor("approved", root, "10"));
    writeEvalEvidence(root, "10", evalReportFixture("fail", "10"));

    assert.throws(
      () => shipGateHook({ projectRoot: root, phaseNumber: "10" }),
      /ship gate: eval evidence failed - criticalRecall=0\.5.*keywords-input-validation.*input-validation/i,
    );
    assert.equal(existsSync(gateEvidencePath(root, "10", "ship")), false);
  });
});

test("shipGateHook proceeds when eval evidence passes (criticalRecall===1.0) and approval approved (D-05 pass path)", () => {
  withTempRoot((root) => {
    seedPriorEvidenceFor(root, "10");
    writeApproval(root, "10", makeApprovalFor("approved", root, "10"));
    writeEvalEvidence(root, "10", evalReportFixture("pass", "10"));

    shipGateHook({ projectRoot: root, phaseNumber: "10" });
    assert.equal(existsSync(gateEvidencePath(root, "10", "ship")), true);
  });
});

test("IN-02: forward-scoping guard fires for dotted phase number '10.1' (lexical compare handles dotted phases)", () => {
  withTempRoot((root) => {
    seedPriorEvidenceFor(root, "10.1");
    writeApproval(root, "10.1", makeApprovalFor("approved", root, "10.1"));
    writeEvalEvidence(root, "10.1", evalReportFixture("pass", "10.1"));

    shipGateHook({ projectRoot: root, phaseNumber: "10.1" });
    // Guard is `phaseNumber >= "10"`; "10.1" >= "10" is true lexically, so the
    // eval check fires and ship evidence is written (guard consumed the eval).
    assert.equal(existsSync(gateEvidencePath(root, "10.1", "ship")), true);
    assert.equal(existsSync(evalEvidencePath(root, "10.1")), true, "eval evidence required + present");
  });
});

test("shipGateHook skips eval check for legacy phases (phaseNumber < '10') (RESEARCH Open Q2 — forward-scoping)", () => {
  withTempRoot((root) => {
    seedPriorEvidenceFor(root, "08");
    writeApproval(root, "08", makeApprovalFor("approved", root, "08"));
    // No eval evidence seeded — legacy phases shipped without it and must not
    // retroactively fail.

    shipGateHook({ projectRoot: root, phaseNumber: "08" });
    assert.equal(existsSync(gateEvidencePath(root, "08", "ship")), true);
    assert.equal(existsSync(evalEvidencePath(root, "08")), false);
  });
});
