/**
 * Output-schema validation for the emitted `rule-index.json` (PACK-04 / D-05).
 *
 * This is the second half of the body-leak guard (RESEARCH body-leak guard #2):
 * the rule-index output schema sets `additionalProperties: false` on every rule
 * record (and every superseded item), so a body/content key has nowhere to live,
 * and {@link validateIndex} rejects any index that carries a stray key. Wired into
 * `buildIndex` so a leak aborts the build at the strongest choke point (Pitfall 4).
 *
 * Mirrors src/schema/validate.ts: Ajv draft 2020-12 via `ajv/dist/2020` +
 * ajv-formats (for the `date-time` format on generatedAt), compiled once at module
 * load. Pure structural validation — no filesystem access, no registry resolution.
 */
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — this module emits a CommonJS require();
// resolveJsonModule handles the JSON import (illegal to attach the attribute here).
import schema from "../schema/rule-index.schema.json";
import type { RuleIndex } from "../types.js";

// strict:true stays on (no strictRequired relaxation needed here — the output
// schema has no allOf if/then, unlike the frontmatter schema). A compile-time
// throw would surface a schema typo immediately at module load.
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

/** Compiled once at module load — a schema typo throws here, not per call. */
const validate: ValidateFunction = ajv.compile(schema);

/**
 * Validate a fully-assembled {@link RuleIndex} against the no-body output schema.
 * Returns void on success; throws an Error listing each violation as one
 * "<instancePath || '(root)'> <message>" line, naming the stray key on an
 * additionalProperties failure so a leaked body identifies itself.
 */
export function validateIndex(index: RuleIndex): void {
  if (validate(index)) return;
  const errors = validate.errors ?? [];
  const lines = errors.map((e) => {
    const where = e.instancePath || "(root)";
    let detail = e.message ?? "invalid";
    const params = e.params as Record<string, unknown> | undefined;
    // Name the stray key so a leaked body/content field identifies itself.
    if (params && typeof params.additionalProperty === "string") {
      detail = `${detail} (unexpected key '${params.additionalProperty}')`;
    }
    return `${where} ${detail}`;
  });
  throw new Error(
    `rule-index.json failed output-schema validation (PACK-04 / D-05):\n${lines.join("\n")}`,
  );
}
