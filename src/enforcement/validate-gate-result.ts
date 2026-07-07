/**
 * Gate-result runtime validation (ENF-02 integrity gate, threat T-07-04/T-07-05).
 *
 * A GateResult crosses from an adapter (untrusted structured output) into the
 * audit trail. A malformed result — status out of enum, missing required field,
 * bad ISO-8601 timestamp, stray key — must be rejected LOUDLY here rather than
 * silently corrupting the audit record. {@link validateGateResult} is the
 * hard-fail boundary 07-04's `runAdapter` wraps around every `evaluate()` call.
 *
 * This is the fourth instance of the canonical validate.ts pattern
 * (validateFrontmatter, validateIndex, validateSignal, now validateGateResult):
 * Ajv draft 2020-12 + ajv-formats, compiled once at module load, errors joined
 * into one actionable line per violation. Pure structural validation — no I/O,
 * no clock, no random. The only side effect is a throw on malformed input.
 *
 * x-binding annotation keyword: gate-result.schema.json carries `x-binding:
 * "binding"` (the advisory-vs-binding boundary made explicit per 07-CONTEXT
 * Area 3). Ajv 2020 strict mode rejects unknown keywords at compile, so the
 * keyword MUST be registered before `ajv.compile(schema)` or the validator
 * module fails to load (fail-closed — no validation happens, T-07-05).
 */
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "../schema/gate-result.schema.json";
import type { GateResult } from "./types.js";

// strict:true matches src/schema/validate.ts and src/select/validate-signal.ts.
// strictRequired relaxed to its Ajv default (false) — matches validate.ts so
// a future if/then branch on gate-result compiles without changing options.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

// MANDATORY: register the x-binding annotation keyword before compile. Ajv 2020
// strict mode REJECTS unknown keywords at compile (verified in 07-01). Without
// this, `ajv.compile(schema)` throws and the whole module fails to load — the
// fail-closed posture (T-07-05). gate-result.schema.json has no $ref, so no
// addSchema is needed here (only 07-01's gate-request compile needs task-signal
// registered as a referenced schema).
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });

/** Compiled once at module load — a schema typo throws here, not per call. */
const validate: ValidateFunction = ajv.compile(schema);

/**
 * Format Ajv errors into one actionable line per error. Mirrors the shape of
 * `formatSignalErrors` in src/select/validate-signal.ts (instancePath ||
 * "(root)" + message, surfacing the allowed enum set and the missing property
 * name) so a caller sees exactly which field failed and what is permitted.
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
      // Surface the stray key on an additionalProperties failure so a malformed
      // adapter output identifies itself (mirrors validate-index.ts).
      if (params && typeof params.additionalProperty === "string") {
        detail = `${detail} (unexpected key '${params.additionalProperty}')`;
      }
      return `${where} ${detail}`;
    })
    .join("\n");
}

/**
 * Assert that `result` is a well-formed {@link GateResult}; throw otherwise.
 * On success this narrows the type for the caller (TS assertion signature) so
 * Phase 8 gate routing runs over an already-typed result and never has to
 * re-check shape. Throws `invalid gate-result:\n<formatErrors lines>` so the
 * ENF-02 failure is actionable — every violation names its instancePath.
 */
export function validateGateResult(result: unknown): asserts result is GateResult {
  if (!validate(result)) {
    throw new Error(`invalid gate-result:\n${formatErrors(validate.errors)}`);
  }
}
