/**
 * Approval runtime validation (APPR-01, D-07 anti-auto-approve invariant).
 *
 * The fifth instance of the canonical validate.ts pattern
 * (validateFrontmatter, validateIndex, validateSignal, validateGateResult,
 * now validateApproval): Ajv draft 2020-12 + ajv-formats, compiled once at
 * module load, errors joined into one actionable line per violation. Pure
 * structural validation — no I/O, no clock, no random. The only side effect is
 * a throw on malformed input.
 *
 * x-binding annotation keyword: approval.schema.json carries `x-binding:
 * "binding"`. Ajv 2020 strict mode rejects unknown keywords at compile, so the
 * keyword MUST be registered before `ajv.compile(schema)` or the validator
 * module fails to load (fail-closed — no validation happens).
 *
 * D-07 anti-auto-approve invariant (Pitfall 5): a non-pending decision MUST
 * carry a non-empty `decidedBy`. The model cannot self-approve its own work —
 * the ship hook writes only `decision: "pending"` with `decidedBy` absent, and
 * a human approver flips the decision out-of-band. This post-Ajv check is the
 * trust boundary; the schema-level `minLength: 1` on `decidedBy` catches empty
 * strings but not the field's absence (which is legitimate while pending), so
 * the runtime check is load-bearing.
 */
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "../schema/approval.schema.json";
import type { ApprovalRecord } from "../governance/approval-store.js";

// strict:true matches validate.ts / validate-signal.ts / validate-gate-result.ts.
// strictRequired relaxed to its Ajv default (false) — matches validate.ts so
// a future if/then branch on approval compiles without changing options.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

// MANDATORY: register the x-binding annotation keyword before compile. Ajv 2020
// strict mode REJECTS unknown keywords at compile. Without this, the module
// fails to load — the fail-closed posture. approval.schema.json has no $ref,
// so no addSchema is needed here.
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });

/** Compiled once at module load — a schema typo throws here, not per call. */
const validate: ValidateFunction = ajv.compile(schema);

/**
 * Format Ajv errors into one actionable line per error. Mirrors the shape of
 * `formatErrors` in validate-gate-result.ts (instancePath || "(root)" +
 * message, surfacing the allowed enum set and the missing property name) so a
 * caller sees exactly which field failed and what is permitted. Duplicated
 * across all five validators by design (one crash doesn't take down siblings).
 */
function formatErrors(errors: ValidateFunction["errors"]): string {
  if (!errors || errors.length === 0) {
    return "unknown validation error";
  }
  return errors
    .map((e) => {
      const where = e.instancePath || "(root)";
      let detail = e.message ?? "invalid";
      const params = e.params as Record<string, unknown> | undefined;
      if (params && typeof params.missingProperty === "string") {
        detail = `${detail} (missing '${params.missingProperty}')`;
      }
      if (params && Array.isArray(params.allowedValues)) {
        detail = `${detail} (allowed: ${params.allowedValues.join(", ")})`;
      }
      if (params && typeof params.additionalProperty === "string") {
        detail = `${detail} (unexpected key '${params.additionalProperty}')`;
      }
      return `${where} ${detail}`;
    })
    .join("\n");
}

/**
 * Assert that `result` is a well-formed {@link ApprovalRecord}; throw otherwise.
 * On success narrows the type for the caller (TS assertion signature). Throws
 * `invalid approval:\n<formatErrors lines>` so the APPR-01 failure is
 * actionable — every violation names its instancePath.
 *
 * Post-Ajv D-07 invariant (replaces validate-gate-result's lineRange check):
 * if `decision` is any value other than `"pending"`, `decidedBy` MUST be present
 * and non-empty (prevents the model from auto-deciding approvals — Pitfall 5).
 */
export function validateApproval(result: unknown): asserts result is ApprovalRecord {
  if (!validate(result)) {
    throw new Error(`invalid approval:\n${formatErrors(validate.errors)}`);
  }
  const record = result as ApprovalRecord;
  // D-07 anti-auto-approve invariant: non-pending decisions require a decider.
  // `decidedBy` is optional in the schema (pending approvals legitimately omit
  // it), so Ajv does not enforce its presence; this runtime check is load-bearing.
  if (record.decision !== "pending" && (record.decidedBy === undefined || record.decidedBy.length === 0)) {
    throw new Error(
      `invalid approval: ${record.approvalId} decision=${record.decision} requires decidedBy`,
    );
  }
}