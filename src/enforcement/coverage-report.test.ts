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
  mkdirSync,
  symlinkSync,
  realpathSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAdapter } from "./run-adapter.js";
import {
  createCoverageAdapter,
  MAX_COVERAGE_REPORT_BYTES,
  BINDING_RULE_NOT_SELECTED_ID,
  COVERAGE_FINDING_ID,
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


test("runAdapter empty rules fail closed without binding rule token (WR-04)", async () => {
  const req: GateRequest = {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "feature", keywords: [], paths: [] },
    rules: [],
    requestedAt: "2026-07-12T00:00:00.000Z",
  };
  const r = await runAdapter(
    adapter(path.join(JACOCO, "pass-70.xml")),
    req,
  );
  assert.equal(r.status, "fail");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].id, BINDING_RULE_NOT_SELECTED_ID);
  assert.ok(!r.findings[0].id.includes(RULE_ID));
  assert.equal(r.evaluatedBy, "coverage-report");
});

test("runAdapter other-rules-only fail closed without false rule attribution (WR-04)", async () => {
  const req: GateRequest = {
    gateId: "verify",
    phase: "construction",
    taskSignal: { taskType: "feature", keywords: [], paths: [] },
    rules: [
      {
        id: "some-other-rule",
        severity: "high",
        summary: "other",
        matchedAxis: "paths",
        matchedValue: "**/*",
      },
    ],
    requestedAt: "2026-07-12T00:00:00.000Z",
  };
  const r = await runAdapter(
    adapter(path.join(JACOCO, "pass-70.xml")),
    req,
  );
  assert.equal(r.status, "fail");
  assert.equal(r.findings[0].id, BINDING_RULE_NOT_SELECTED_ID);
  assert.ok(!r.findings[0].id.includes(RULE_ID));
  assert.ok(!r.findings[0].id.includes("some-other-rule"));
});

test("runAdapter forced lcov on jacoco xml fails as malformed (WR-06)", async () => {
  const r = await runAdapter(
    adapter(path.join(JACOCO, "pass-70.xml"), "lcov"),
    makeRequest(),
  );
  assert.equal(r.status, "fail");
  assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
  assert.match(r.findings[0].message, /malformed|no complete records/i);
  assert.ok(!/zero measurable lines/i.test(r.findings[0].message));
});

test("runAdapter directory path rejected as non-regular (WR-01/02)", async () => {
  const r = await runAdapter(adapter(JACOCO, "jacoco"), makeRequest());
  assertFailFinding(r);
});

function trySymlink(target: string, link: string, t: { skip: (m: string) => void }, type?: "file" | "dir"): boolean {
  try {
    if (type) {
      symlinkSync(target, link, type);
    } else {
      symlinkSync(target, link);
    }
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EPERM" || code === "EACCES" || code === "ENOTSUP" || code === "EOPNOTSUPP") {
      t.skip("symlink creation not permitted on this platform (" + code + ")");
      return false;
    }
    throw err;
  }
}

test("runAdapter leaf symlink outside projectRoot fails (WR-05)", async (t) => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-sym-leaf-"));
  try {
    const projectRoot = path.join(base, "proj");
    mkdirSync(projectRoot, { recursive: true });
    const outside = path.join(base, "outside.xml");
    writeFileSync(
      outside,
      '<?xml version="1.0"?><report name="x"><counter type="LINE" missed="0" covered="100"/></report>',
      "utf8",
    );
    const link = path.join(projectRoot, "report.xml");
    if (!trySymlink(outside, link, t)) return;
    const r = await runAdapter(
      createCoverageAdapter({ projectRoot, reportPath: "report.xml", format: "jacoco" }),
      makeRequest(),
    );
    assert.equal(r.status, "fail");
    assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("runAdapter parent-dir symlink outside projectRoot fails (WR-05)", async (t) => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-sym-parent-"));
  try {
    const projectRoot = path.join(base, "proj");
    mkdirSync(projectRoot, { recursive: true });
    const outsideDir = path.join(base, "outside-dir");
    mkdirSync(outsideDir, { recursive: true });
    writeFileSync(
      path.join(outsideDir, "report.xml"),
      '<?xml version="1.0"?><report name="x"><counter type="LINE" missed="0" covered="100"/></report>',
      "utf8",
    );
    const linkedSub = path.join(projectRoot, "sub");
    if (!trySymlink(outsideDir, linkedSub, t, "dir")) return;
    const r = await runAdapter(
      createCoverageAdapter({
        projectRoot,
        reportPath: path.join("sub", "report.xml"),
        format: "jacoco",
      }),
      makeRequest(),
    );
    assert.equal(r.status, "fail");
    assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("runAdapter symlinked projectRoot with in-tree report passes (WR-05)", async (t) => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-sym-root-"));
  try {
    const realRoot = path.join(base, "real");
    mkdirSync(realRoot, { recursive: true });
    writeFileSync(
      path.join(realRoot, "report.xml"),
      '<?xml version="1.0"?><report name="x"><counter type="LINE" missed="30" covered="70"/></report>',
      "utf8",
    );
    const linkRoot = path.join(base, "link-root");
    if (!trySymlink(realRoot, linkRoot, t, "dir")) return;
    const r = await runAdapter(
      createCoverageAdapter({
        projectRoot: linkRoot,
        reportPath: "report.xml",
        format: "jacoco",
      }),
      makeRequest(),
    );
    assert.equal(r.status, "pass");
    assert.deepEqual(r.findings, []);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("runAdapter dangling symlink fails closed (WR-05)", async (t) => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-sym-dang-"));
  try {
    const projectRoot = path.join(base, "proj");
    mkdirSync(projectRoot, { recursive: true });
    const missing = path.join(base, "does-not-exist.xml");
    const link = path.join(projectRoot, "report.xml");
    if (!trySymlink(missing, link, t)) return;
    const r = await runAdapter(
      createCoverageAdapter({ projectRoot, reportPath: "report.xml", format: "jacoco" }),
      makeRequest(),
    );
    assert.equal(r.status, "fail");
    assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});


const PASS_XML =
  "<?xml version=\"1.0\"?><report name=\"x\"><counter type=\"LINE\" missed=\"30\" covered=\"70\"/></report>";

test("runAdapter post-open containment escape fails closed (WR-07)", async () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-wr07-esc-"));
  try {
    const projectRoot = path.join(base, "proj");
    mkdirSync(projectRoot, { recursive: true });
    writeFileSync(path.join(projectRoot, "report.xml"), PASS_XML, "utf8");
    const outside = path.join(base, "outside.xml");
    writeFileSync(outside, PASS_XML, "utf8");
    const r = await runAdapter(
      createCoverageAdapter(
        { projectRoot, reportPath: "report.xml", format: "jacoco" },
        {
          postOpenRealpath: () => outside,
        },
      ),
      makeRequest(),
    );
    assert.equal(r.status, "fail");
    assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
    assert.match(r.findings[0].message, /escapes projectRoot after open|identity mismatch|changed after open/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("runAdapter post-open identity mismatch fails closed (WR-07)", async () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-wr07-id-"));
  try {
    const projectRoot = path.join(base, "proj");
    mkdirSync(projectRoot, { recursive: true });
    writeFileSync(path.join(projectRoot, "report.xml"), PASS_XML, "utf8");
    const r = await runAdapter(
      createCoverageAdapter(
        { projectRoot, reportPath: "report.xml", format: "jacoco" },
        {
          postOpenStat: () => ({
            dev: 999999,
            ino: 888888,
            isFile: () => true,
          }),
        },
      ),
      makeRequest(),
    );
    assert.equal(r.status, "fail");
    assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
    assert.match(r.findings[0].message, /identity mismatch after open/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("runAdapter post-open re-resolve failure fails closed (WR-07)", async () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "cov-wr07-re-"));
  try {
    const projectRoot = path.join(base, "proj");
    mkdirSync(projectRoot, { recursive: true });
    writeFileSync(path.join(projectRoot, "report.xml"), PASS_XML, "utf8");
    const r = await runAdapter(
      createCoverageAdapter(
        { projectRoot, reportPath: "report.xml", format: "jacoco" },
        {
          postOpenRealpath: () => {
            throw new Error("ENOENT");
          },
        },
      ),
      makeRequest(),
    );
    assert.equal(r.status, "fail");
    assert.equal(r.findings[0].id, COVERAGE_FINDING_ID);
    assert.match(r.findings[0].message, /changed after open/i);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
