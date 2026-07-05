/**
 * Frontmatter validation via Ajv (draft 2020-12).
 *
 * The JSON Schema is the language-neutral contract (CLAUDE.md: Ajv, not Zod, is
 * the contract layer). The full multi-axis / binding-enforcement schema is
 * hardened in 01-02; this compiles the minimal 01-01 schema.
 */
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import and import attributes are illegal on require().
import schema from "./frontmatter.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: true });
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
      return `${file}: ${where} ${e.message ?? "invalid"}`;
    })
    .join("\n");
}
