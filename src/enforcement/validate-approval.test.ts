/**
 * APPR-01 runtime integrity gate — acceptance/rejection over the approval schema.
 *
 * Mirrors validate-gate-result.test.ts idiom: closed decision/gateId/phase enums,
 * the 7 required top-level fields, the closed top-level shape
 * (additionalProperties false), and the TD-01 strict ISO-8601 contract on
 * requestedAt / decidedAt. Adds D-07-specific tests: a non-pending decision
 * without decidedBy is rejected (anti-auto-approve trust boundary).
 *
 * RED note: validateApproval does not exist yet — import resolves to undefined
 * and every case fails. Task 2 turns them GREEN. The schema JSON is the system
 * under test — never paste the schema inline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateApproval } from "./validate-approval.js";

/** Required top-level fields per D-05 / D-15 approval.schema.json. */
const REQUIRED_FIELDS = [
  "approvalId",
  "phase",
  "gateId",
  "artifactPath",
  "requestedBy",
  "requestedAt",
  "decision",
] as const;

/**
 * Fresh fully-valid pending approval per call. New literal every time so a
 * mutation in one case never leaks into another. decidedBy/decidedAt/rationale
 * intentionally absent (D-07 — pending approvals have no decider).
 */
function makeValidApproval(): Record<string, unknown> {
  return {
    approvalId: "ship-09",
    phase: "construction",
    gateId: "ship",
    artifactPath: ".planning/governance/gates/09-ship.json",
    requestedBy: "aidlc-governance-ship",
    requestedAt: "2026-07-07T00:00:00.000Z",
    decision: "pending",
  };
}

test("the validator is compiled once at module load", () => {
  // If the schema failed to compile under Ajv 2020 strict, importing the module
  // would have thrown and this whole file would fail to load.
  assert.equal(typeof validateApproval, "function");
});

test("accepts a valid pending approval with no decidedBy/decidedAt/rationale", () => {
  assert.doesNotThrow(() => validateApproval(makeValidApproval()));
});

test("accepts an approved approval with decidedBy and decidedAt", () => {
  const r = makeValidApproval();
  r.decision = "approved";
  r.decidedBy = "approver@team.example";
  r.decidedAt = "2026-07-07T12:34:56.789Z";
  r.rationale = "LGTM";
  assert.doesNotThrow(() => validateApproval(r));
});

test("accepts a rejected approval", () => {
  const r = makeValidApproval();
  r.decision = "rejected";
  r.decidedBy = "approver@team.example";
  r.decidedAt = "2026-07-07T12:34:56.789Z";
  assert.doesNotThrow(() => validateApproval(r));
});

test("accepts a waived approval", () => {
  const r = makeValidApproval();
  r.decision = "waived";
  r.decidedBy = "approver@team.example";
  r.decidedAt = "2026-07-07T12:34:56.789Z";
  assert.doesNotThrow(() => validateApproval(r));
});

for (const field of REQUIRED_FIELDS) {
  test(`rejects approval missing required field: ${field}`, () => {
    const r = makeValidApproval();
    delete r[field];
    assert.throws(
      () => validateApproval(r),
      (err: Error) => {
        assert.ok(
          err.message.includes("invalid approval"),
          `error should be prefixed 'invalid approval', got:\n${err.message}`,
        );
        return true;
      },
      `missing '${field}' must be rejected`,
    );
  });
}

test("rejects a decision out of enum (maybe)", () => {
  const r = makeValidApproval();
  r.decision = "maybe";
  assert.throws(() => validateApproval(r));
});

test("rejects a gateId out of enum (review)", () => {
  const r = makeValidApproval();
  r.gateId = "review";
  assert.throws(() => validateApproval(r));
});

test("rejects a phase out of enum (deployment)", () => {
  const r = makeValidApproval();
  r.phase = "deployment";
  assert.throws(() => validateApproval(r));
});

test("rejects a malformed ISO-8601 requestedAt (2026/07/07)", () => {
  const r = makeValidApproval();
  r.requestedAt = "2026/07/07";
  assert.throws(() => validateApproval(r));
});

test("rejects requestedAt without milliseconds", () => {
  const r = makeValidApproval();
  r.requestedAt = "2026-07-07T00:00:00Z";
  assert.throws(() => validateApproval(r));
});

test("rejects requestedAt with a non-UTC offset", () => {
  const r = makeValidApproval();
  r.requestedAt = "2026-07-07T00:00:00.000+07:00";
  assert.throws(() => validateApproval(r));
});

test("rejects decidedAt with a non-UTC offset when present", () => {
  const r = makeValidApproval();
  r.decision = "approved";
  r.decidedBy = "approver@team.example";
  r.decidedAt = "2026-07-07T12:34:56.789+07:00";
  assert.throws(() => validateApproval(r));
});

test("rejects an unknown top-level key (additionalProperties false)", () => {
  const r = makeValidApproval();
  (r as Record<string, unknown>).extra = 1;
  assert.throws(() => validateApproval(r));
});

// D-07 anti-auto-approve trust boundary. These two tests have no analog in
// validate-gate-result.test.ts — approval has a pending→decided lifecycle that
// the model must not be able to self-fulfill.

test("D-07 rejects a non-pending decision without decidedBy (anti-auto-approve)", () => {
  const r = makeValidApproval();
  r.decision = "approved";
  // decidedBy intentionally absent
  assert.throws(
    () => validateApproval(r),
    /invalid approval[\s\S]*decidedBy/i,
  );
});

test("D-07 rejects a non-pending decision with empty-string decidedBy", () => {
  const r = makeValidApproval();
  r.decision = "approved";
  r.decidedBy = "";
  assert.throws(
    () => validateApproval(r),
    /invalid approval[\s\S]*decidedBy/i,
  );
});

test("D-07 rejects a non-pending decision with whitespace-only decidedBy (trim guard, WR-04)", () => {
  const r = makeValidApproval();
  r.decision = "approved";
  r.decidedBy = "   ";
  assert.throws(
    () => validateApproval(r),
    /invalid approval[\s\S]*decidedBy/i,
  );
});

test("D-07 accepts a pending decision without decidedBy (hook-written pending request)", () => {
  // This is the legitimate path: ship gate writes pending approvals with no decider.
  const r = makeValidApproval();
  r.decision = "pending";
  // decidedBy intentionally absent — schema minLength:1 catches empty strings,
  // and the D-07 post-Ajv check only fires when decision !== "pending".
  assert.doesNotThrow(() => validateApproval(r));
});

test("throws with a message naming the failing instancePath", () => {
  // On a missing required field, the thrown Error.message must surface the
  // field name (either via instancePath or params.missingProperty) so the
  // APPR-01 failure is actionable — not a bare "schema rejected".
  const r = makeValidApproval();
  delete r.decision;
  assert.throws(
    () => validateApproval(r),
    /invalid approval:[\s\S]*decision/,
  );
});
