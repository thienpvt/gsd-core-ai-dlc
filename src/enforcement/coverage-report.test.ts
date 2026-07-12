/**
 * coverage-report GateAdapter contracts via runAdapter (Phase 17 Task 1 RED / Task 3 GREEN).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  openSync,
  ftruncateSync,
  closeSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAdapter } from "./run-adapter.js";
import {
  createCoverageAdapter,
  MAX_COVERAGE_REPORT_BYTES,
} from "./coverage-report.js";
import { STUB_NAMES, ADAPTERS, ECHO_ADAPTERS } from "./adapters.js";
import type { GateRequest } from "./types.js";

const PROJECT_ROOT = process.cwd();
const JACOCO = path.join("test", "fixtures", "coverage", "jacoco");
const LCOV = path.join("test", "fixtures", "coverage", "lcov");
const RULE_ID = "java-spring-unit-line-coverage";
const FINDING_ID = `${RULE_ID}:coverage-report`;

function makeRequest(): GateRequest {
  return {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "feature", keywords: [], paths: [] },
    rules: [
      {
        id: RULE_ID,
        severity: "high",
        summary: "Unit line coverage must be at least 70%.",
        matchedAxis: "paths",
        matchedValue: "**/*.java",
      },
    ],
    requestedAt: "2026-07-12T00:00:00.000Z",
  };
}

function adapter(reportPath: string, format?: "jacoco" | "lcov") {
  return createCoverageAdapter({
    projectRoot: PROJECT_ROOT,
    reportPath,
    format,
  });
}

function assertFailFinding(result: {
  status: string;
  findings: Array<{ id: string; severity: string }>;
  evaluatedBy: string;
  gateId: string;
}) {
  assert.equal(result.status, "fail");
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].id, /java-spring-unit-line-coverage/);
  assert.equal(result.findings[0].id, FINDING_ID);
  assert.equal(result.findings[0].severity, "high");
  assert.equal(result.evaluatedBy, "coverage-report");
  assert.equal(result.gateId, "verify");
}

test("createCoverageAdapter name is coverage-report", () => {
  const a = createCoverageAdapter({
    projectRoot: PROJECT_ROOT,
    reportPath: path.join(JACOCO, "pass-70.xml"),
  });
  assert.equal(a.name, "coverage-report");
});

test("MAX_COVERAGE_REPORT_BYTES is exactly 8 MiB", () => {
  assert.equal(MAX_COVERAGE_REPORT_BYTES, 8 * 1024 * 1024);
  assert.equal(MAX_COVERAGE_REPORT_BYTES, 8388608);
});

test("runAdapter jacoco pass-70 → pass empty findings", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "pass-70.xml"), "jacoco"),
    makeRequest(),
  );
  assert.equal(r.status, "pass");
  assert.deepEqual(r.findings, []);
  assert.equal(r.evaluatedBy, "coverage-report");
  assert.equal(r.gateId, "verify");
  assert.match(r.evaluatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("runAdapter lcov pass-70 → pass empty findings", async () => {
  const r = await runAdapter(
    adapter(path.join(LCOV, "pass-70.info"), "lcov"),
    makeRequest(),
  );
  assert.equal(r.status, "pass");
  assert.deepEqual(r.findings, []);
});

test("runAdapter jacoco fail-below-70 → fail with rule-token finding", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "fail-below-70.xml")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter jacoco zero-lines → fail closed", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "zero-lines.xml")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter missing report → fail closed", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "does-not-exist.xml")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter absolute reportPath → fail closed", async () => {
  const abs = path.resolve(PROJECT_ROOT, JACOCO, "pass-70.xml");
  const r = await runAdapter(adapter(abs), makeRequest());
  assertFailFinding(r);
});

test("runAdapter out-of-root path → fail closed", async () => {
  const r = await runAdapter(adapter("../../../etc/passwd"), makeRequest());
  assertFailFinding(r);
});

test("runAdapter directory path → fail closed", async () => {
  const r = await runAdapter(adapter(JACOCO), makeRequest());
  assertFailFinding(r);
});

test("runAdapter unknown suffix → fail closed", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "pass-70.xml").replace(/\.xml$/, ".json")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter malformed jacoco structure → fail closed", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "malformed-structure.xml")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter malformed jacoco dtd → fail closed", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "malformed-dtd.xml")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter oversized report (temp ftruncate) → fail closed", async () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "cov-oversized-"));
  const rel = "huge.xml";
  const target = path.join(tmpRoot, rel);
  let fd: number | undefined;
  try {
    fd = openSync(target, "w");
    ftruncateSync(fd, MAX_COVERAGE_REPORT_BYTES + 1);
    closeSync(fd);
    fd = undefined;
    const r = await runAdapter(
      createCoverageAdapter({
        projectRoot: tmpRoot,
        reportPath: rel,
        format: "jacoco",
      }),
      makeRequest(),
    );
    assertFailFinding(r);
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("runAdapter format inference: .info → lcov pass", async () => {
  const r = await runAdapter(
    adapter(path.join(LCOV, "pass-70.info")),
    makeRequest(),
  );
  assert.equal(r.status, "pass");
});

test("runAdapter format inference: .xml → jacoco pass", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "pass-70.xml")),
    makeRequest(),
  );
  assert.equal(r.status, "pass");
});

test("STUB_NAMES / ADAPTERS / ECHO_ADAPTERS remain size 7", () => {
  assert.equal(STUB_NAMES.length, 7);
  assert.equal(ADAPTERS.size, 7);
  assert.equal(ECHO_ADAPTERS.size, 7);
  assert.ok(!STUB_NAMES.includes("coverage-report" as never));
  assert.equal(ADAPTERS.has("coverage-report"), false);
});

test("runAdapter lcov fail-below-70 → fail", async () => {
  const r = await runAdapter(
    adapter(path.join(LCOV, "fail-below-70.info")),
    makeRequest(),
  );
  assertFailFinding(r);
});

test("runAdapter accepts .lcov suffix as lcov", async () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "cov-lcov-suffix-"));
  const rel = "pass.lcov";
  try {
    writeFileSync(
      path.join(tmpRoot, rel),
      "SF:a.java\nLF:10\nLH:7\nend_of_record\n",
      "utf8",
    );
    const r = await runAdapter(
      createCoverageAdapter({ projectRoot: tmpRoot, reportPath: rel }),
      makeRequest(),
    );
    assert.equal(r.status, "pass");
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

