/**
 * APPR-01 durable-store round-trip + loud-fail on malformed state.
 *
 * Ports gate-evidence-store.test.ts 1:1 using the test-case mapping in
 * 09-PATTERNS.md (approvalPath under .planning/governance/approvals/{NN}.json,
 * round-trip, malformed-JSON loud-fail, missing-required-field loud-fail,
 * approvalId/gateId/decision-enum violations). Adds D-07-specific tests with
 * NO analog: writeApproval rejects a non-pending decision without decidedBy,
 * and accepts a pending decision with decidedBy absent.
 *
 * RED note: approval-store.ts does not exist yet — import resolves to undefined
 * and every case fails. Task 2 turns them GREEN.
 */
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
import { type ApprovalRecord, readApproval, writeApproval } from "./approval-store.js";
import { approvalPath, selectionStatePath } from "./paths.js";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-approval-store-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function approval(overrides: Partial<ApprovalRecord> = {}): ApprovalRecord {
  return {
    approvalId: "ship-09",
    phase: "construction",
    gateId: "ship",
    artifactPath: ".planning/governance/gates/09-ship.json",
    requestedBy: "aidlc-governance-ship",
    requestedAt: "2026-07-07T00:00:00.000Z",
    decision: "pending",
    ...overrides,
  };
}

test("approvalPath stores approvals under .planning/governance/approvals/{NN}.json", () => {
  withTempRoot((root) => {
    assert.equal(
      approvalPath(root, "09"),
      path.join(root, ".planning", "governance", "approvals", "09.json"),
    );
  });
});

test("readApproval returns null when approval is missing", () => {
  withTempRoot((root) => {
    assert.equal(readApproval(root, "09"), null);
  });
});

test("writeApproval round-trips an approval record", () => {
  withTempRoot((root) => {
    const original = approval();
    writeApproval(root, "09", original);
    const reloaded = readApproval(root, "09");
    assert.deepEqual(reloaded, original);
  });
});

test("writeApproval leaves no temp siblings and never writes selection-state.json", () => {
  withTempRoot((root) => {
    const finalPath = approvalPath(root, "09");
    writeApproval(root, "09", approval());
    const leftovers = readdirSync(path.dirname(finalPath)).filter(
      (name) => name !== path.basename(finalPath) && name.includes(".tmp"),
    );
    assert.deepEqual(leftovers, []);
    assert.equal(existsSync(selectionStatePath(root)), false);
  });
});

test("readApproval throws loud on malformed JSON", () => {
  withTempRoot((root) => {
    const finalPath = approvalPath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    writeFileSync(finalPath, "{not-json", "utf8");
    assert.throws(
      () => readApproval(root, "09"),
      /malformed approval at .*09\.json/i,
    );
  });
});

test("readApproval throws loud when a required field is missing", () => {
  for (const field of ["approvalId", "gateId", "decision"] as const) {
    withTempRoot((root) => {
      const finalPath = approvalPath(root, "09");
      mkdirSync(path.dirname(finalPath), { recursive: true });
      const corrupt: Record<string, unknown> = { ...approval() };
      delete corrupt[field];
      writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
      assert.throws(
        () => readApproval(root, "09"),
        new RegExp(`malformed approval at .*09\\.json`, "i"),
      );
    });
  }
});

test("readApproval throws loud when decision is out of enum", () => {
  withTempRoot((root) => {
    const finalPath = approvalPath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = approval({ decision: "maybe" as ApprovalRecord["decision"] });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readApproval(root, "09"),
      /malformed approval at .*09\.json/i,
    );
  });
});

test("readApproval throws loud when gateId is out of enum", () => {
  withTempRoot((root) => {
    const finalPath = approvalPath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = approval({ gateId: "review" as ApprovalRecord["gateId"] });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readApproval(root, "09"),
      /malformed approval at .*09\.json/i,
    );
  });
});

test("readApproval throws loud when requestedAt is not strict ISO", () => {
  withTempRoot((root) => {
    const finalPath = approvalPath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    const corrupt = approval({ requestedAt: "2026/07/07" });
    writeFileSync(finalPath, JSON.stringify(corrupt), "utf8");
    assert.throws(
      () => readApproval(root, "09"),
      /malformed approval at .*09\.json/i,
    );
  });
});

// D-07 anti-auto-approve trust boundary. No analog in gate-evidence-store.test.ts.

test("D-07 writeApproval rejects decision='approved' with no decidedBy", () => {
  withTempRoot((root) => {
    const bad = approval({ decision: "approved" });
    delete (bad as Partial<ApprovalRecord>).decidedBy;
    assert.throws(
      () => writeApproval(root, "09", bad),
      /invalid approval[\s\S]*decidedBy/i,
    );
  });
});

test("D-07 writeApproval rejects decision='rejected' with no decidedBy", () => {
  withTempRoot((root) => {
    const bad = approval({ decision: "rejected" });
    delete (bad as Partial<ApprovalRecord>).decidedBy;
    assert.throws(
      () => writeApproval(root, "09", bad),
      /invalid approval[\s\S]*decidedBy/i,
    );
  });
});

test("D-07 writeApproval rejects decision='approved' with empty-string decidedBy", () => {
  withTempRoot((root) => {
    const bad = approval({ decision: "approved", decidedBy: "" as unknown as string });
    assert.throws(
      () => writeApproval(root, "09", bad),
      /invalid approval[\s\S]*decidedBy/i,
    );
  });
});

test("D-07 writeApproval accepts decision='pending' with decidedBy absent", () => {
  withTempRoot((root) => {
    const ok = approval({ decision: "pending" });
    // decidedBy absent is the legitimate pending-request shape (D-07).
    delete (ok as Partial<ApprovalRecord>).decidedBy;
    writeApproval(root, "09", ok);
    const reloaded = readApproval(root, "09");
    assert.notEqual(reloaded, null);
    assert.equal(reloaded!.decision, "pending");
    assert.equal("decidedBy" in (reloaded as object), false);
  });
});

test("writeApproval round-trips a decided approval with all 10 fields", () => {
  withTempRoot((root) => {
    const original = approval({
      decision: "approved",
      decidedBy: "approver@team.example",
      decidedAt: "2026-07-07T12:34:56.789Z",
      rationale: "LGTM",
    });
    writeApproval(root, "09", original);
    const reloaded = readApproval(root, "09");
    assert.deepEqual(reloaded, original);
  });
});

// WR-03: identity guard mirrors assertTestEvidence metadata-phase check.

test("WR-03 readApproval throws loud when approvalId embeds the wrong phase (cross-phase leak)", () => {
  withTempRoot((root) => {
    const finalPath = approvalPath(root, "09");
    mkdirSync(path.dirname(finalPath), { recursive: true });
    // Tampered record: approvalId says ship-08 but file sits in approvals/09.json.
    const tampered = approval({ approvalId: "ship-08" });
    writeFileSync(finalPath, JSON.stringify(tampered), "utf8");
    assert.throws(
      () => readApproval(root, "09"),
      /malformed approval at .*09\.json.*approvalId 'ship-08' must end with -09/i,
    );
  });
});

test("WR-03 writeApproval rejects an approval whose approvalId phase does not match the path phase", () => {
  withTempRoot((root) => {
    const crossPhase = approval({ approvalId: "ship-08" });
    assert.throws(
      () => writeApproval(root, "09", crossPhase),
      /approvalId 'ship-08' must end with -09/i,
    );
  });
});