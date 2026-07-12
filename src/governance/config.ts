/**
 * Project governance config reader (Phase 18).
 *
 * Trust boundary: `.planning/config.json` → typed GovernanceProjectConfig.
 * Missing file/key → empty defaults. Malformed/wrong types → throw (fail loud).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface GovernanceProjectConfig {
  domains: string[];
  coverageReportPath: string;
}

const EMPTY: GovernanceProjectConfig = {
  domains: [],
  coverageReportPath: "",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDomains(value: string): string[] {
  const parts = value
    .split(",")
    .map((domain) => domain.trim())
    .filter((domain) => domain.length > 0);
  return [...new Set(parts)];
}

/**
 * Read governance settings from `<projectRoot>/.planning/config.json`.
 * Fail loud on malformed JSON, non-object governance, or wrong types.
 */
export function readGovernanceConfig(projectRoot: string): GovernanceProjectConfig {
  const configPath = path.join(projectRoot, ".planning", "config.json");
  if (!existsSync(configPath)) {
    return { ...EMPTY, domains: [] };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `readGovernanceConfig: unreadable config at ${configPath}: ${detail}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `readGovernanceConfig: malformed JSON at ${configPath}: ${detail}`,
    );
  }

  if (!isPlainObject(parsed)) {
    throw new Error(
      `readGovernanceConfig: config root must be a plain object at ${configPath}`,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(parsed, "governance")) {
    return { domains: [], coverageReportPath: "" };
  }

  const governance = parsed.governance;
  if (!isPlainObject(governance)) {
    throw new Error(
      `readGovernanceConfig: governance must be a plain object at ${configPath}`,
    );
  }

  let domains: string[] = [];
  if (Object.prototype.hasOwnProperty.call(governance, "domains")) {
    if (typeof governance.domains !== "string") {
      throw new Error(
        `readGovernanceConfig: governance.domains must be a string at ${configPath}`,
      );
    }
    domains = parseDomains(governance.domains);
  }

  let coverageReportPath = "";
  if (Object.prototype.hasOwnProperty.call(governance, "coverage_report_path")) {
    if (typeof governance.coverage_report_path !== "string") {
      throw new Error(
        `readGovernanceConfig: governance.coverage_report_path must be a string at ${configPath}`,
      );
    }
    coverageReportPath = governance.coverage_report_path;
  }

  return { domains, coverageReportPath };
}
