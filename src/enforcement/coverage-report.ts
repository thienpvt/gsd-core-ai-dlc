/**
 * coverage-report GateAdapter factory (JAVA-COV-02/03).
 *
 * Factory-configured real adapter: reads a consumer-produced JaCoCo/LCOV report
 * under projectRoot, parses line coverage, and returns a schema-valid GateResult
 * via runAdapter. Fail-closed on every expected error class.
 *
 * Factory only - no static configured instance. STUB_NAMES remains 7 stubs.
 */

import {
  closeSync,
  fstatSync,
  openSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import type { GateAdapter } from "./adapters.js";
import type { GateFinding, GateRequest, GateResult } from "./types.js";
import { parseJacoco } from "./parse-jacoco.js";
import { parseLcov } from "./parse-lcov.js";

/** Explicit 8 MiB report-size ceiling; reject larger before full parse. */
export const MAX_COVERAGE_REPORT_BYTES = 8 * 1024 * 1024;

/** Stable finding id so deriveRuleGateStatuses marks the binding rule failed. */
export const COVERAGE_FINDING_ID = "java-spring-unit-line-coverage:coverage-report";

/**
 * Configuration finding when adapter is invoked without the binding rule selected.
 * Must NOT contain the unselected rule token.
 */
export const BINDING_RULE_NOT_SELECTED_ID =
  "coverage-report:binding-rule-not-selected";

const BINDING_RULE_ID = "java-spring-unit-line-coverage";
const ADAPTER_NAME = "coverage-report";
const THRESHOLD_NUM = 70;
const THRESHOLD_DEN = 100;

export interface CoverageAdapterConfig {
  projectRoot: string;
  reportPath: string;
  format?: "jacoco" | "lcov";
}

/**
 * Non-public internals for defense-in-depth seams (tests only).
 * Not part of consumer configuration.
 */
export interface CoverageAdapterInternals {
  /** Called after openSync, before post-open revalidation. */
  afterOpen?: (candidatePath: string) => void;
  /** Override post-open realpath (deterministic identity tests). */
  postOpenRealpath?: (candidatePath: string) => string;
  /** Override post-open path stat (deterministic identity tests). */
  postOpenStat?: (resolvedPath: string) => {
    dev: number | bigint;
    ino: number | bigint;
    isFile(): boolean;
  };
}

function escapesRoot(rel: string): boolean {
  return (
    rel === ".." ||
    rel.startsWith(".." + path.sep) ||
    rel.startsWith("../") ||
    path.isAbsolute(rel)
  );
}

function canonicalize(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

type ReportFormat = "jacoco" | "lcov";

function inferFormat(reportPath: string): ReportFormat {
  const lower = reportPath.toLowerCase();
  if (lower.endsWith(".xml")) return "jacoco";
  if (lower.endsWith(".info") || lower.endsWith(".lcov")) return "lcov";
  throw new Error("unknown coverage report suffix for '" + reportPath + "'");
}

function meetsThreshold(covered: number, total: number): boolean {
  if (total === 0) return false;
  if (
    !Number.isSafeInteger(covered) ||
    !Number.isSafeInteger(total) ||
    covered < 0 ||
    total < 0
  ) {
    return false;
  }
  if (covered > Number.MAX_SAFE_INTEGER / THRESHOLD_DEN || total > Number.MAX_SAFE_INTEGER / THRESHOLD_NUM) {
    return BigInt(covered) * BigInt(THRESHOLD_DEN) >= BigInt(total) * BigInt(THRESHOLD_NUM);
  }
  return covered * THRESHOLD_DEN >= total * THRESHOLD_NUM;
}

function failResult(
  request: GateRequest,
  message: string,
  evidencePath?: string,
  findingId: string = COVERAGE_FINDING_ID,
): GateResult {
  const finding: GateFinding = {
    id: findingId,
    severity: "high",
    message,
  };
  if (evidencePath !== undefined) {
    finding.evidence = { path: evidencePath };
  }
  return {
    gateId: request.gateId,
    status: "fail",
    findings: [finding],
    evaluatedBy: ADAPTER_NAME,
    evaluatedAt: new Date().toISOString(),
  };
}

function passResult(request: GateRequest): GateResult {
  return {
    gateId: request.gateId,
    status: "pass",
    findings: [],
    evaluatedBy: ADAPTER_NAME,
    evaluatedAt: new Date().toISOString(),
  };
}

type FileIdentity = { dev: number | bigint; ino: number | bigint };

/** True when both stats share the same device+inode identity. */
function sameFileIdentity(a: FileIdentity, b: FileIdentity): boolean {
  return String(a.dev) === String(b.dev) && String(a.ino) === String(b.ino);
}

/**
 * Re-bind the opened fd to the candidate path: re-resolve, re-check root
 * containment, then compare fd identity to the post-open real path.
 *
 * ponytail: Node stdlib ceiling — no openat2 / O_PATH / handle-based
 * canonical path. Residual TOCTOU remains under hostile concurrent path
 * mutation. Upgrade path: platform openat2+RESOLVE_BENEATH or fd-based
 * realpath when available.
 */
function verifyOpenedPathIdentity(
  fd: number,
  candidatePath: string,
  realRoot: string,
  internals?: CoverageAdapterInternals,
): void {
  if (internals?.afterOpen) {
    internals.afterOpen(candidatePath);
  }

  const resolve = internals?.postOpenRealpath ?? realpathSync;
  let postReal: string;
  try {
    postReal = resolve(candidatePath);
  } catch {
    throw new Error("coverage report path changed after open");
  }

  const postRel = path.relative(realRoot, postReal);
  if (escapesRoot(postRel)) {
    throw new Error("coverage report real path escapes projectRoot after open");
  }

  const fdStat = fstatSync(fd);
  if (!fdStat.isFile()) {
    throw new Error("coverage report path is not a regular file");
  }

  const pathStatFn = internals?.postOpenStat ?? statSync;
  let pathStat: FileIdentity & { isFile(): boolean };
  try {
    pathStat = pathStatFn(postReal);
  } catch {
    throw new Error("coverage report path changed after open");
  }
  if (!pathStat.isFile()) {
    throw new Error("coverage report path is not a regular file");
  }

  // Where dev/ino are meaningful (non-zero on at least one side), require match.
  if (
    (Number(fdStat.ino) !== 0 || Number(pathStat.ino) !== 0) &&
    !sameFileIdentity(fdStat, pathStat)
  ) {
    throw new Error("coverage report identity mismatch after open");
  }
}

/**
 * Open a regular file, re-validate path identity/containment on the fd,
 * then read at most MAX+1 bytes. Always closes the fd.
 */
function readBoundedRegularFile(
  absPath: string,
  realRoot: string,
  internals?: CoverageAdapterInternals,
): string {
  const fd = openSync(absPath, "r");
  try {
    verifyOpenedPathIdentity(fd, absPath, realRoot, internals);
    const cap = MAX_COVERAGE_REPORT_BYTES + 1;
    const buf = Buffer.allocUnsafe(cap);
    let offset = 0;
    while (offset < cap) {
      const n = readSync(fd, buf, offset, cap - offset, offset);
      if (n === 0) break;
      offset += n;
    }
    if (offset > MAX_COVERAGE_REPORT_BYTES) {
      throw new Error("coverage report exceeds " + MAX_COVERAGE_REPORT_BYTES + " bytes");
    }
    return buf.subarray(0, offset).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

/**
 * Build a real coverage-report GateAdapter closed over projectRoot/reportPath.
 * Does not register into STUB_NAMES / ADAPTERS / ECHO_ADAPTERS.
 *
 * Second arg is a non-public internals seam (tests only); not consumer config.
 */
export function createCoverageAdapter(
  config: CoverageAdapterConfig,
  internals?: CoverageAdapterInternals,
): GateAdapter {
  const { projectRoot, reportPath, format: formatOpt } = config;

  return {
    name: ADAPTER_NAME,
    async evaluate(request: GateRequest): Promise<GateResult> {
      const evidencePath =
        typeof reportPath === "string" &&
        reportPath.length > 0 &&
        !path.isAbsolute(reportPath) &&
        !escapesRoot(reportPath)
          ? reportPath
          : undefined;

      try {
        // WR-04: fail closed before filesystem when binding rule is not selected.
        const rules = Array.isArray(request.rules) ? request.rules : [];
        const selected = rules.some((r) => r && r.id === BINDING_RULE_ID);
        if (!selected) {
          return failResult(
            request,
            "coverage-report adapter invoked without selected binding rule",
            undefined,
            BINDING_RULE_NOT_SELECTED_ID,
          );
        }

        if (typeof reportPath !== "string" || reportPath.length === 0) {
          return failResult(request, "coverage report path is missing", evidencePath);
        }
        if (path.isAbsolute(reportPath)) {
          return failResult(
            request,
            "coverage report path must be relative to projectRoot",
          );
        }

        const rootAbs = path.resolve(projectRoot);
        const targetAbs = path.resolve(rootAbs, reportPath);

        const lexRel = path.relative(rootAbs, targetAbs);
        if (escapesRoot(lexRel)) {
          return failResult(
            request,
            "coverage report path escapes projectRoot",
            evidencePath,
          );
        }

        let realTarget: string;
        try {
          realTarget = realpathSync(targetAbs);
        } catch {
          return failResult(
            request,
            "coverage report not found or unreadable: " + reportPath,
            evidencePath,
          );
        }
        const realRoot = canonicalize(rootAbs);
        const realRel = path.relative(realRoot, realTarget);
        if (escapesRoot(realRel)) {
          return failResult(
            request,
            "coverage report real path escapes projectRoot (symlink)",
            evidencePath,
          );
        }

        let format: ReportFormat;
        try {
          format = formatOpt ?? inferFormat(reportPath);
        } catch (err) {
          return failResult(
            request,
            err instanceof Error ? err.message : "unknown coverage report format",
            evidencePath,
          );
        }

        let text: string;
        try {
          text = readBoundedRegularFile(realTarget, realRoot, internals);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : ("coverage report unreadable: " + reportPath);
          if (
            msg.includes("exceeds") ||
            msg.includes("not a regular file") ||
            msg.includes("identity mismatch") ||
            msg.includes("changed after open") ||
            msg.includes("escapes projectRoot after open")
          ) {
            return failResult(request, msg, evidencePath);
          }
          return failResult(
            request,
            "coverage report unreadable: " + reportPath,
            evidencePath,
          );
        }

        let covered: number;
        let total: number;
        try {
          const counter =
            format === "jacoco" ? parseJacoco(text) : parseLcov(text);
          covered = counter.covered;
          total = counter.total;
        } catch (err) {
          return failResult(
            request,
            err instanceof Error
              ? ("malformed coverage report: " + err.message)
              : "malformed coverage report",
            evidencePath,
          );
        }

        if (total === 0) {
          return failResult(
            request,
            "coverage report has zero measurable lines",
            evidencePath,
          );
        }

        if (!meetsThreshold(covered, total)) {
          return failResult(
            request,
            "unit line coverage " + covered + "/" + total + " is below " + THRESHOLD_NUM + "%",
            evidencePath,
          );
        }

        return passResult(request);
      } catch (err) {
        if (err instanceof TypeError || err instanceof RangeError) {
          throw err;
        }
        return failResult(
          request,
          err instanceof Error ? err.message : "coverage evaluation failed",
          evidencePath,
        );
      }
    },
  };
}
