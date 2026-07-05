/**
 * Public API surface of the GSD AI-DLC governance overlay (`main: dist/index.js`).
 *
 * Re-exports the shared types plus the functions later phases and `gsd-tools.cjs`
 * consume. Signatures are locked here; bodies are hardened in plans 01-02/03/04.
 */
export * from "./types.js";
export { main } from "./cli/index.js";
export { buildIndex, writeIndex } from "./index/build.js";
export { loadRules, loadRuleFile } from "./rules/load.js";
export { validateFrontmatter, formatErrors } from "./schema/validate.js";
