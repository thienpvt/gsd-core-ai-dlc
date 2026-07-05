/**
 * Public API surface of the GSD AI-DLC governance overlay (`main: dist/index.js`).
 *
 * Task 1 (scaffold) re-exports the shared types. The function re-exports
 * (`main`, `buildIndex`, `writeIndex`, `loadRules`, `validateFrontmatter`) are
 * added in Task 2 once those modules exist — nodenext relative imports require
 * the target to be present at compile time, so they cannot be re-exported before
 * they are authored.
 */
export * from "./types.js";
