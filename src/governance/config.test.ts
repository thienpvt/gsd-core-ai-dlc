/**
 * Config reader contract (Phase 18 D-01..D-03, D-14).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { readGovernanceConfig } from "./config.js";

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-gov-config-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeConfig(root: string, body: unknown): string {
  const configPath = path.join(root, ".planning", "config.json");
  mkdirSync(path.dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(body), "utf8");
  return configPath;
}

test("readGovernanceConfig: missing config file returns empty defaults", () => {
  withTempRoot((root) => {
    assert.deepEqual(readGovernanceConfig(root), {
      domains: [],
      coverageReportPath: "",
    });
  });
});

test("readGovernanceConfig: missing governance key returns empty defaults", () => {
  withTempRoot((root) => {
    writeConfig(root, { other: true });
    assert.deepEqual(readGovernanceConfig(root), {
      domains: [],
      coverageReportPath: "",
    });
  });
});

test("readGovernanceConfig: domains trim, drop empty, first-seen dedupe, case-preserving", () => {
  withTempRoot((root) => {
    writeConfig(root, {
      governance: {
        domains: "java-spring, payments, java-spring , ,Foo",
      },
    });
    assert.deepEqual(readGovernanceConfig(root), {
      domains: ["java-spring", "payments", "Foo"],
      coverageReportPath: "",
    });
  });
});

test("readGovernanceConfig: coverage_report_path preserved as string", () => {
  withTempRoot((root) => {
    writeConfig(root, {
      governance: {
        coverage_report_path: "build/reports/jacoco/test/jacocoTestReport.xml",
      },
    });
    assert.deepEqual(readGovernanceConfig(root), {
      domains: [],
      coverageReportPath: "build/reports/jacoco/test/jacocoTestReport.xml",
    });
  });
});

test("readGovernanceConfig: empty domains string and empty coverage path", () => {
  withTempRoot((root) => {
    writeConfig(root, {
      governance: {
        domains: "",
        coverage_report_path: "",
      },
    });
    assert.deepEqual(readGovernanceConfig(root), {
      domains: [],
      coverageReportPath: "",
    });
  });
});

test("readGovernanceConfig: malformed JSON throws with config path", () => {
  withTempRoot((root) => {
    const configPath = path.join(root, ".planning", "config.json");
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, "{not-json", "utf8");
    assert.throws(
      () => readGovernanceConfig(root),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /config|governance|\.planning/i);
        assert.ok(
          err.message.includes(configPath) ||
            err.message.includes(".planning") ||
            err.message.includes("config.json"),
        );
        return true;
      },
    );
  });
});

test("readGovernanceConfig: governance array throws", () => {
  withTempRoot((root) => {
    writeConfig(root, { governance: [] });
    assert.throws(() => readGovernanceConfig(root), /config|governance/i);
  });
});

test("readGovernanceConfig: governance null throws", () => {
  withTempRoot((root) => {
    writeConfig(root, { governance: null });
    assert.throws(() => readGovernanceConfig(root), /config|governance/i);
  });
});

test("readGovernanceConfig: domains number throws", () => {
  withTempRoot((root) => {
    writeConfig(root, { governance: { domains: 42 } });
    assert.throws(() => readGovernanceConfig(root), /config|governance|domains/i);
  });
});

test("readGovernanceConfig: coverage_report_path number throws", () => {
  withTempRoot((root) => {
    writeConfig(root, { governance: { coverage_report_path: 7 } });
    assert.throws(
      () => readGovernanceConfig(root),
      /config|governance|coverage_report_path/i,
    );
  });
});

test("readGovernanceConfig: unreadable existing config throws (not silent default)", () => {
  withTempRoot((root) => {
    // Directory at config path makes readFileSync fail cross-platform (EISDIR).
    const configPath = path.join(root, ".planning", "config.json");
    mkdirSync(configPath, { recursive: true });
    assert.throws(
      () => readGovernanceConfig(root),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /config|unreadable|EISDIR|EACCES|read/i);
        return true;
      },
    );
  });
});

test("readGovernanceConfig: root array throws", () => {
  withTempRoot((root) => {
    const configPath = path.join(root, ".planning", "config.json");
    mkdirSync(path.dirname(configPath), { recursive: true });
    writeFileSync(configPath, "[]", "utf8");
    assert.throws(() => readGovernanceConfig(root), /config|governance|object/i);
  });
});
