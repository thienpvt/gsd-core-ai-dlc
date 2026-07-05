/**
 * Frontmatter validation via Ajv (draft 2020-12).
 *
 * The JSON Schema is the language-neutral contract (CLAUDE.md: Ajv, not Zod, is
 * the contract layer). This compiles the full PACK-01 multi-axis trigger schema
 * and the PACK-03 binding/enforcement if/then (hardened in 01-02).
 */
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "./frontmatter.schema.json";

// strict: true stays on for every check EXCEPT strictRequired, which is set to
// its documented Ajv default (false). strictRequired does not resolve a property
// named in `required` through an allOf -> if/then branch back to the root
// `properties`, so the D-15 binding->enforcement if/then (enforcement declared at
// the top level, required only when classification is binding) would otherwise
// throw at compile time. Disabling only strictRequired keeps the RESEARCH schema
// shape verbatim while preserving strictSchema/strictTypes/strictTuples.
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

/**
 * Compiled validator. Call `validateFrontmatter(data)`; on `false`, read
 * `validateFrontmatter.errors`. Compiled once at module load — a compile-time
 * throw here surfaces schema typos immediately (asserted in tests).
 */
export const validateFrontmatter: ValidateFunction = ajv.compile(schema);

/**
 * Format Ajv errors into one actionable line per error, prefixed with the file.
 * Keeps per-file diagnostics readable across a large corpus.
 *
 * Signature is `(file, errors)` — locked in 01-01 and relied on by
 * `src/rules/load.ts`; do NOT flip the argument order. The body surfaces
 * `params.missingProperty` (which required field is absent) and
 * `params.allowedValues` (the enum the value must be drawn from) so an author
 * sees exactly which field failed and what is permitted (T-1-02 mitigation).
 */
export function formatErrors(
  file: string,
  errors: ValidateFunction["errors"],
): string {
  if (!errors || errors.length === 0) {
    return `${file}: unknown validation error`;
  }
  return errors
    .map((e) => {
      const where = e.instancePath || "(root)";
      let detail = e.message ?? "invalid";
      const params = e.params as Record<string, unknown> | undefined;
      // Name the missing required field (Ajv already quotes it in the message;
      // repeating it in a stable form keeps the field name greppable per file).
      if (params && typeof params.missingProperty === "string") {
        detail = `${detail} (missing '${params.missingProperty}')`;
      }
      // Surface the allowed set for enum violations so the fix is obvious.
      if (params && Array.isArray(params.allowedValues)) {
        detail = `${detail} (allowed: ${params.allowedValues.join(", ")})`;
      }
      return `${file}: ${where} ${detail}`;
    })
    .join("\n");
}
