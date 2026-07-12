/**
 * coverage-report GateAdapter factory (JAVA-COV-02/03).
 *
 * RED stub — Task 1. Real fail-closed evaluate lands in Task 3.
 */

import type { GateAdapter } from "./adapters.js";

/** Explicit 8 MiB report-size ceiling; reject larger before readFileSync. */
export const MAX_COVERAGE_REPORT_BYTES = 8 * 1024 * 1024;

export interface CoverageAdapterConfig {
  projectRoot: string;
  reportPath: string;
  format?: "jacoco" | "lcov";
}

export function createCoverageAdapter(
  _config: CoverageAdapterConfig,
): GateAdapter {
  return {
    name: "coverage-report",
    async evaluate() {
      throw new Error("not implemented");
    },
  };
}
