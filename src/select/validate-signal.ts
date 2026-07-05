/**
 * TaskSignal input validation (SEL-01 boundary guard, threat T-2-BADSIGNAL).
 *
 * A caller-supplied signal is untrusted structured input. A malformed signal
 * (wrong types, missing axis, unknown taskType) must be rejected LOUDLY here
 * rather than letting {@link select} run over garbage and silently return an
 * empty selection — a silent empty selection is the #1 under-injection footgun
 * (02-RESEARCH Pitfall 8).
 *
 * Mirrors src/schema/validate.ts exactly: Ajv 2020 { allErrors, strict } +
 * ajv-formats, compiled once at module load, errors joined into one actionable
 * line per violation. Pure structural validation — no I/O, no clock, no random.
 */
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "../schema/task-signal.schema.json";
import type { TaskSignal } from "../types.js";

// strict: true matches src/schema/validate.ts. The task-signal schema has no
// if/then branch, so strictRequired never trips here — the plain strict harness
// is sufficient (no strictRequired override needed, unlike the frontmatter schema).
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

/** Compiled validator, compiled once at module load (a schema typo throws here). */
const validate: ValidateFunction = ajv.compile(schema);

/**
 * Format Ajv errors into one actionable line per error. Mirrors the shape of
 * `formatErrors` in src/schema/validate.ts (instancePath || "(root)" + message,
 * surfacing the allowed enum set) so a caller sees exactly which axis failed.
 */
function formatSignalErrors(errors: ValidateFunction["errors"]): string {
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
      return `${where} ${detail}`;
    })
    .join("\n");
}

/**
 * Assert that `signal` is a well-formed {@link TaskSignal}; throw otherwise.
 * On success this narrows the type for the caller (TS assertion signature) so
 * select() runs over an already-typed signal and never has to re-check shape.
 */
export function validateSignal(signal: unknown): asserts signal is TaskSignal {
  if (!validate(signal)) {
    throw new Error(`invalid task signal:\n${formatSignalErrors(validate.errors)}`);
  }
}
