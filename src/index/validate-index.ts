/**
 * Output-schema validation for the emitted `rule-index.json` (PACK-04 / D-05).
 *
 * This is the second half of the body-leak guard (RESEARCH body-leak guard #2):
 * the rule-index output schema sets `additionalProperties: false` on every rule
 * record (and every superseded item), so a body/content key has nowhere to live,
 * and {@link validateIndex} rejects any index that carries a stray key. Wired into
 * `buildIndex` so a leak aborts the build at the strongest choke point (Pitfall 4).
 *
 * STUB (Task 1 / RED): the real Ajv-backed implementation lands in Task 2. This
 * placeholder has the correct signature so the RED suites compile, but throws so
 * every assertion fails until Task 2 wires the schema.
 */
import type { RuleIndex } from "../types.js";

/**
 * Validate a fully-assembled {@link RuleIndex} against the no-body output schema.
 * Returns void on success; throws an Error listing schema violations on failure.
 */
export function validateIndex(_index: RuleIndex): void {
  throw new Error("validateIndex not implemented");
}
