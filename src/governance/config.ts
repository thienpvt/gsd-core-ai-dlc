/**
 * Project governance config reader (Phase 18).
 *
 * Trust boundary: `.planning/config.json` → typed GovernanceProjectConfig.
 * Missing file/key → empty defaults. Malformed/wrong types → throw (fail loud).
 */

export interface GovernanceProjectConfig {
  domains: string[];
  coverageReportPath: string;
}

/**
 * Read governance settings from `<projectRoot>/.planning/config.json`.
 * RED stub — real parse lands in Task 2.
 */
export function readGovernanceConfig(_projectRoot: string): GovernanceProjectConfig {
  throw new Error("not implemented");
}
