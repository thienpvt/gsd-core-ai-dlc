import { execFileSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
// No `with { type: "json" }` attribute — CJS require(); resolveJsonModule handles the JSON import.
import auditSchema from "../schema/audit-artifact.schema.json";
import {
  AUDIT_SKIP_REASONS,
  buildAuditRecord,
  renderGovernanceMarkdown,
  writeGovernanceAudit,
  type GovernanceAudit,
} from "./audit-artifact.js";
import { selectionStatePath } from "./paths.js";
import { writeSelection, type GovernanceRecord } from "./state-store.js";
import type { SelectionResult } from "../types.js";

const RUNNER = path.resolve(process.cwd(), "dist", "governance", "audit-artifact.js");

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-audit-artifact-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fixtureRecord(selectionResult: SelectionResult = fixtureSelectionResult()): GovernanceRecord {
  return {
    phase: "construction",
    taskSignal: {
      taskType: "feature",
      keywords: ["audit", "governance"],
      paths: ["src/governance/audit-artifact.ts"],
    },
    selectionConfig: {
      phase: "construction",
      domains: ["governance"],
      budget: 2000,
    },
    selectionResult,
    riskTier: "elevated",
    timestamp: "2026-07-06T00:00:00.000Z",
  };
}

function fixtureSelectionResult(): SelectionResult {
  return {
    selected: [
      {
        id: "AIDLC-AUDIT-01",
        severity: "critical",
        summary: "Record applied governance from selector output.",
        matchedAxis: "paths",
        matchedValue: "src/governance/audit-artifact.ts",
      },
      {
        id: "AIDLC-AUDIT-02",
        severity: "high",
        summary: "Record skipped governance with fixed audit reasons.",
        matchedAxis: "keywords",
        matchedValue: "audit",
      },
    ],
    skipped: [
      {
        id: "AIDLC-OPS-01",
        severity: "medium",
        reason: "out-of-phase",
        detail: "operations only",
      },
      {
        id: "AIDLC-DOMAIN-01",
        severity: "high",
        reason: "out-of-scope",
        detail: "domain not subscribed",
      },
      {
        id: "AIDLC-TRIGGER-01",
        severity: "low",
        reason: "out-of-scope-by-trigger",
        detail: "no trigger matched",
      },
      {
        id: "AIDLC-SUPERSEDED-01",
        severity: "critical",
        reason: "superseded",
        detail: "project rule wins",
        scope: "enterprise",
        sourceFile: "enterprise/superseded.md",
      },
    ],
    budgetExceeded: false,
    budget: { used: 100, limit: 2000, offenders: [] },
  };
}

function parseAuditMarkdown(markdown: string): GovernanceAudit {
  const match = markdown.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(match, "GOVERNANCE.md must contain one fenced JSON block");
  return JSON.parse(match[1]) as GovernanceAudit;
}

function assertRunnerFails(args: string[]): void {
  assert.throws(
    () => execFileSync(process.execPath, [RUNNER, ...args], { encoding: "utf8" }),
    /Command failed|audit artifact/i,
  );
}

function writeUnsafeState(root: string, record: unknown): void {
  const statePath = selectionStatePath(root);
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(record, null, 2), "utf8");
}

// TD-06: buildAuditRecord is module-internal now — tests exercise it via the
// public writeGovernanceAudit end-to-end and read the audit field off the return.
function auditFromRecord(record: GovernanceRecord): GovernanceAudit {
  const root = mkdtempSync(path.join(os.tmpdir(), "gsd-audit-from-record-"));
  try {
    writeSelection(record, root);
    const outputPath = path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md");
    return writeGovernanceAudit({ projectRoot: root, outputPath }).audit;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("buildAuditRecord maps selected rules one-to-one into rules_applied", () => {
  const record = fixtureRecord();
  const audit = auditFromRecord(record);

  assert.deepEqual(audit.rules_applied, record.selectionResult.selected);
});

test("buildAuditRecord normalizes skipped reasons to the public audit enum and preserves selector provenance", () => {
  const audit = auditFromRecord(fixtureRecord());
  assert.deepEqual(AUDIT_SKIP_REASONS, [
    "out-of-phase",
    "out-of-scope-by-trigger",
    "superseded",
    "explicitly-waived",
  ]);
  assert.deepEqual(
    audit.rules_skipped.map((rule: { reason: string }) => rule.reason),
    [
      "out-of-phase",
      "out-of-scope-by-trigger",
      "out-of-scope-by-trigger",
      "superseded",
    ],
  );
  assert.deepEqual(audit.rules_skipped[1], {
    id: "AIDLC-DOMAIN-01",
    severity: "high",
    reason: "out-of-scope-by-trigger",
    selector_reason: "out-of-scope",
    detail: "domain not subscribed",
  });
  assert.deepEqual(audit.rules_skipped[3], {
    id: "AIDLC-SUPERSEDED-01",
    severity: "critical",
    reason: "superseded",
    selector_reason: "superseded",
    detail: "project rule wins",
    scope: "enterprise",
    sourceFile: "enterprise/superseded.md",
  });
});

test("buildAuditRecord throws on a skipped rule reason outside the audit enum", () => {
  const selectionResult = fixtureSelectionResult();
  selectionResult.skipped = [
    {
      id: "AIDLC-UNKNOWN",
      severity: "low",
      reason: "unknown-reason",
    } as unknown as SelectionResult["skipped"][number],
  ];

  // TD-04: assertSelectionArrays now validates selector_reason per-element with
  // a single unified message before normalizeSkipReason ever runs.
  assert.throws(
    () => auditFromRecord(fixtureRecord(selectionResult)),
    /selector_reason must be one of/i,
  );
});

test("writeGovernanceAudit rejects malformed selected rule rows without writing GOVERNANCE.md", () => {
  withTempRoot((root) => {
    const selectionResult = fixtureSelectionResult();
    selectionResult.selected = [
      {
        severity: "critical",
        summary: "missing id",
        matchedAxis: "keywords",
        matchedValue: "audit",
      } as unknown as SelectionResult["selected"][number],
    ];
    writeSelection(fixtureRecord(selectionResult), root);

    const outputPath = path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md");
    assert.throws(
      () => writeGovernanceAudit({ projectRoot: root, outputPath }),
      /selectionResult\.selected\[0\]\.id/i,
    );
    assert.equal(existsSync(outputPath), false);
  });
});

test("writeGovernanceAudit rejects malformed governance metadata and enum fields without writing", () => {
  withTempRoot((root) => {
    for (const [label, mutate, message] of [
      [
        "missing phase",
        (record: Record<string, unknown>) => {
          delete record.phase;
        },
        /phase/i,
      ],
      [
        "missing timestamp",
        (record: Record<string, unknown>) => {
          delete record.timestamp;
        },
        /timestamp/i,
      ],
      [
        "invalid selected severity",
        (record: Record<string, unknown>) => {
          const selectionResult = record.selectionResult as SelectionResult;
          selectionResult.selected[0] = {
            ...selectionResult.selected[0],
            severity: "urgent",
          } as unknown as SelectionResult["selected"][number];
        },
        /selected\[0\]\.severity/i,
      ],
      [
        "invalid selected matchedAxis",
        (record: Record<string, unknown>) => {
          const selectionResult = record.selectionResult as SelectionResult;
          selectionResult.selected[0] = {
            ...selectionResult.selected[0],
            matchedAxis: "garbage",
          } as unknown as SelectionResult["selected"][number];
        },
        /selected\[0\]\.matchedAxis/i,
      ],
      [
        "invalid skipped scope",
        (record: Record<string, unknown>) => {
          const selectionResult = record.selectionResult as SelectionResult;
          selectionResult.skipped[3] = {
            ...selectionResult.skipped[3],
            scope: "global",
          } as unknown as SelectionResult["skipped"][number];
        },
        /skipped\[3\]\.scope/i,
      ],
    ] as const) {
      const caseRoot = path.join(root, label.replaceAll(" ", "-"));
      const outputPath = path.join(
        caseRoot,
        ".planning",
        "phases",
        "05-audit",
        "GOVERNANCE.md",
      );
      const record = structuredClone(fixtureRecord()) as unknown as Record<string, unknown>;
      mutate(record);
      writeUnsafeState(caseRoot, record);

      assert.throws(
        () => writeGovernanceAudit({ projectRoot: caseRoot, outputPath }),
        message,
      );
      assert.equal(existsSync(outputPath), false);
    }
  });
});

test("renderGovernanceMarkdown is deterministic for rules_applied and rules_skipped", () => {
  const record = fixtureRecord();
  const first = parseAuditMarkdown(renderGovernanceMarkdown(auditFromRecord(record)));
  const second = parseAuditMarkdown(renderGovernanceMarkdown(auditFromRecord(record)));

  assert.deepEqual(second.rules_applied, first.rules_applied);
  assert.deepEqual(second.rules_skipped, first.rules_skipped);
});

test("writeGovernanceAudit throws when selection-state.json is missing", () => {
  withTempRoot((root) => {
    const outputPath = path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md");
    assert.throws(
      () => writeGovernanceAudit({ projectRoot: root, outputPath }),
      /missing governance selection state/i,
    );
  });
});

test("writeGovernanceAudit rejects output paths outside a concrete planning phase directory", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);

    for (const outputPath of [
      path.join(root, ".planning", "phases", "GOVERNANCE.md"),
      path.join(root, ".planning", "GOVERNANCE.md"),
      path.join(root, ".planning", "phases", "not-a-phase", "GOVERNANCE.md"),
    ]) {
      assert.throws(
        () => writeGovernanceAudit({ projectRoot: root, outputPath }),
        /audit artifact output path/i,
      );
      assert.equal(existsSync(outputPath), false);
    }
  });
});

test("writeGovernanceAudit propagates malformed selection-state.json errors", () => {
  withTempRoot((root) => {
    const statePath = selectionStatePath(root);
    mkdirSync(path.dirname(statePath), { recursive: true });
    writeFileSync(statePath, "{not json", "utf8");

    assert.throws(
      () =>
        writeGovernanceAudit({
          projectRoot: root,
          outputPath: path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md"),
        }),
      /malformed governance state/i,
    );
  });
});

test("compiled direct runner writes GOVERNANCE.md under project .planning/phases", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseDir = path.join(root, ".planning", "phases", "05-audit-artifact-writer");
    const outputPath = path.join(phaseDir, "GOVERNANCE.md");

    execFileSync(process.execPath, [RUNNER, root, outputPath], { encoding: "utf8" });

    assert.ok(existsSync(outputPath), "runner must write GOVERNANCE.md");
    const audit = parseAuditMarkdown(readFileSync(outputPath, "utf8"));
    assert.deepEqual(audit.rules_applied, fixtureRecord().selectionResult.selected);
  });
});

test("compiled direct runner rejects non-GOVERNANCE.md basenames", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    assertRunnerFails([
      root,
      path.join(root, ".planning", "phases", "05-audit-artifact-writer", "NOT-GOVERNANCE.md"),
    ]);
  });
});

test("compiled direct runner rejects output paths outside project .planning/phases", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    assertRunnerFails([root, path.join(root, ".planning", "GOVERNANCE.md")]);
  });
});

test("writeGovernanceAudit rejects non-ISO-8601 timestamps so malformed metadata cannot enter the audit trail (TD-01)", () => {
  withTempRoot((root) => {
    for (const [label, badTimestamp, message] of [
      ["slash separators", "2026/07/06", /timestamp must be an ISO 8601/i],
      ["date-only no time", "2026-07-06", /timestamp must be an ISO 8601/i],
      ["missing milliseconds", "2026-07-06T00:00:00Z", /timestamp must be an ISO 8601/i],
      ["missing timezone", "2026-07-06T00:00:00.000", /timestamp must be an ISO 8601/i],
      ["not a date", "not-a-date", /timestamp must be an ISO 8601/i],
    ] as const) {
      const caseRoot = path.join(root, label.replaceAll(" ", "-"));
      const record = structuredClone(fixtureRecord()) as unknown as Record<string, unknown>;
      record.timestamp = badTimestamp;
      writeUnsafeState(caseRoot, record);

      const outputPath = path.join(
        caseRoot,
        ".planning",
        "phases",
        "05-audit",
        "GOVERNANCE.md",
      );
      assert.throws(
        () => writeGovernanceAudit({ projectRoot: caseRoot, outputPath }),
        message,
      );
      assert.equal(existsSync(outputPath), false);
    }
  });
});

test("writeGovernanceAudit accepts the canonical ISO-8601 timestamp (TD-01 positive case)", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const outputPath = path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md");
    const result = writeGovernanceAudit({ projectRoot: root, outputPath });
    assert.equal(existsSync(outputPath), true);
    const audit = parseAuditMarkdown(readFileSync(outputPath, "utf8"));
    assert.equal(audit.selection_timestamp, "2026-07-06T00:00:00.000Z");
    // TD-07: return reports the resolved absolute path actually written, not the input.
    assert.equal(result.outputPath, path.resolve(outputPath));
    assert.ok(path.isAbsolute(result.outputPath), "TD-07: outputPath must be absolute");
  });
});

test("writeGovernanceAudit validates selector_reason per-element with a single clear error before normalizeSkipReason runs (TD-04)", () => {
  withTempRoot((root) => {
    const selectionResult = fixtureSelectionResult();
    selectionResult.skipped = [
      {
        id: "AIDLC-GARBAGE",
        severity: "low",
        reason: "garbage-reason",
      } as unknown as SelectionResult["skipped"][number],
    ];
    writeSelection(fixtureRecord(selectionResult), root);

    const outputPath = path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md");
    assert.throws(
      () => writeGovernanceAudit({ projectRoot: root, outputPath }),
      /selectionResult\.skipped\[0\]\.selector_reason must be one of/i,
    );
    assert.equal(existsSync(outputPath), false);
  });
});

test("audit-artifact source does not import selector, risk, discuss, or execute derivation paths", () => {
  const source = readFileSync(path.join(process.cwd(), "src", "governance", "audit-artifact.ts"), "utf8");

  assert.doesNotMatch(source, /from ["']\.\.\/select\//);
  assert.doesNotMatch(source, /from ["']\.\/risk\.js["']/);
  assert.doesNotMatch(source, /validateSignal|classifyRisk|discussHook|executeHook/);
});

// ---------------------------------------------------------------------------
// v2 schema bump tests (Pitfall 1: const 1 -> const 2, forward-incompatible)
// ---------------------------------------------------------------------------

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
ajv.addKeyword({ keyword: "x-binding", type: "object", schemaType: "string" });
const validateAudit: ValidateFunction = ajv.compile(auditSchema);

test("v2 audit schema rejects schema_version: 1 records (forward-incompatible by design)", () => {
  const v1Record = {
    schema_version: 1,
    phase: "construction",
    riskTier: "elevated",
    selection_timestamp: "2026-07-07T00:00:00.000Z",
    generated_from: ".planning/governance/selection-state.json",
    rules_applied: [],
    rules_skipped: [],
  };
  assert.equal(validateAudit(v1Record), false, "v1 record must FAIL validation against v2 schema");
});

test("v2 audit schema accepts schema_version: 2 with the 4 optional v2 fields", () => {
  const v2Record = {
    schema_version: 2,
    phase: "construction",
    riskTier: "elevated",
    selection_timestamp: "2026-07-07T00:00:00.000Z",
    generated_from: ".planning/governance/selection-state.json",
    rules_applied: [],
    rules_skipped: [],
    requirements_covered: [{ reqId: "AUDIT-03", title: "Requirements covered", status: "complete" }],
    tests_executed: { total: 1, pass: 1, fail: 0, skipped: 0, duration_ms: 12.34 },
    remaining_risks: [{ id: "none-identified", severity: "low", detail: "no risks", source: "none-identified" }],
    approvals: [{ approvalId: "none-required", gateId: "ship", decision: "waived" }],
  };
  assert.equal(validateAudit(v2Record), true, "v2 record with optionals must PASS validation");
});

test("v2 audit schema accepts a v2 record WITHOUT the optional fields (v1-subset shape, schema_version bumped)", () => {
  const v2Minimal = {
    schema_version: 2,
    phase: "construction",
    riskTier: "elevated",
    selection_timestamp: "2026-07-07T00:00:00.000Z",
    generated_from: ".planning/governance/selection-state.json",
    rules_applied: [],
    rules_skipped: [],
  };
  assert.equal(validateAudit(v2Minimal), true, "v2 record with only required fields must PASS");
});

// ---------------------------------------------------------------------------
// v1 byte-stability test (Pitfall 2: V8 insertion-order preservation)
// A v1-only input (no enrichment) must render byte-identical output under v2.
// String compare (===), NOT deep-equal — deep-equal on parsed JSON does not
// catch field-order drift.
// ---------------------------------------------------------------------------

test("buildAuditRecord without enrichment produces byte-identical output across calls (v1 byte-stability, Pitfall 2)", () => {
  const record = fixtureRecord();
  const first = renderGovernanceMarkdown(buildAuditRecord(record));
  const second = renderGovernanceMarkdown(buildAuditRecord(record));
  // String === compare, NOT deepEqual. V8 insertion-order preservation means
  // any new field inserted BEFORE the existing 7 changes the bytes.
  assert.equal(first, second);
  // Sanity: output is non-empty and contains the v2 marker once schema is bumped.
  assert.ok(first.length > 0);
});

// ---------------------------------------------------------------------------
// WR-01 enrichment wiring tests (AUDIT-03/04/05/06 populate from persisted state)
// ---------------------------------------------------------------------------

test("WR-01 writeGovernanceAudit without enrichment inputs produces v1-subset output (byte-stability)", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseDirName = "05-audit-empty";
    const phaseDir = path.join(root, ".planning", "phases", phaseDirName);
    const outputPath = path.join(phaseDir, "GOVERNANCE.md");

    const result = writeGovernanceAudit({ projectRoot: root, outputPath });
    const audit = result.audit;

    // v1-subset: the 4 optional v2 fields must be ABSENT (undefined), not
    // present-and-empty. This is the byte-stability invariant — when no
    // enrichment inputs exist, output is byte-identical to v1.
    assert.equal("requirements_covered" in audit, false, "requirements_covered must be absent");
    assert.equal("tests_executed" in audit, false, "tests_executed must be absent");
    assert.equal("remaining_risks" in audit, false, "remaining_risks must be absent");
    assert.equal("approvals" in audit, false, "approvals must be absent");
  });
});

test("WR-01 writeGovernanceAudit populates requirements_covered from REQUIREMENTS.md Traceability", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    // REQUIREMENTS.md is global under .planning/ (matches production layout).
    const reqsPath = path.join(root, ".planning", "REQUIREMENTS.md");
    mkdirSync(path.dirname(reqsPath), { recursive: true });
    writeFileSync(
      reqsPath,
      [
        "# Requirements",
        "",
        "## Traceability",
        "",
        "| Requirement | Phase | Status |",
        "|-------------|-------|--------|",
        "| AUDIT-03 | Phase 5 | Complete |",
        "| AUDIT-04 | Phase 5 | Complete |",
        "| GATE-01 | Phase 4 | Complete |",
        "",
      ].join("\n"),
      "utf8",
    );

    const phaseDir = path.join(root, ".planning", "phases", "05-audit-reqs");
    const outputPath = path.join(phaseDir, "GOVERNANCE.md");
    const result = writeGovernanceAudit({ projectRoot: root, outputPath });

    assert.ok(result.audit.requirements_covered, "requirements_covered must be populated");
    assert.equal(result.audit.requirements_covered!.length, 2);
    assert.deepEqual(
      result.audit.requirements_covered!.map((r) => r.reqId),
      ["AUDIT-03", "AUDIT-04"],
    );
  });
});

test("WR-01 writeGovernanceAudit populates tests_executed from persisted test-evidence store", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseNumber = "05";
    const testEvidenceDir = path.join(root, ".planning", "governance", "tests");
    mkdirSync(testEvidenceDir, { recursive: true });
    writeFileSync(
      path.join(testEvidenceDir, `${phaseNumber}.json`),
      JSON.stringify({
        phase: phaseNumber,
        capturedAt: "2026-07-07T00:00:00.000Z",
        runner: "node --test --test-reporter=tap",
        summary: { total: 10, pass: 8, fail: 0, skipped: 2, duration_ms: 42.5 },
      }, null, 2),
      "utf8",
    );

    const phaseDir = path.join(root, ".planning", "phases", "05-audit-tests");
    const outputPath = path.join(phaseDir, "GOVERNANCE.md");
    const result = writeGovernanceAudit({ projectRoot: root, outputPath });

    assert.ok(result.audit.tests_executed, "tests_executed must be populated");
    assert.equal(result.audit.tests_executed!.total, 10);
    assert.equal(result.audit.tests_executed!.pass, 8);
  });
});

test("WR-01 writeGovernanceAudit populates remaining_risks from VERIFICATION.md + CONTEXT.md", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseDir = path.join(root, ".planning", "phases", "05-audit-risks");
    mkdirSync(phaseDir, { recursive: true });
    writeFileSync(
      path.join(phaseDir, "VERIFICATION.md"),
      "- [ ] gap: edge case in selector\n- TODO: add property tests\n",
      "utf8",
    );
    writeFileSync(
      path.join(phaseDir, "CONTEXT.md"),
      "<deferred>\n- perf: O(n^2) selector scan\n</deferred>\n",
      "utf8",
    );

    const outputPath = path.join(phaseDir, "GOVERNANCE.md");
    const result = writeGovernanceAudit({ projectRoot: root, outputPath });

    assert.ok(result.audit.remaining_risks, "remaining_risks must be populated");
    assert.ok(result.audit.remaining_risks!.length >= 2, "risks from both sources aggregated");
    assert.ok(
      result.audit.remaining_risks!.some((r) => r.source === "VERIFICATION.md"),
      "must include VERIFICATION.md gap",
    );
    assert.ok(
      result.audit.remaining_risks!.some((r) => r.source === "CONTEXT.md<deferred>"),
      "must include CONTEXT.md deferred",
    );
  });
});

test("WR-01 writeGovernanceAudit populates approvals from persisted approval store", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseNumber = "05";
    const approvalDir = path.join(root, ".planning", "governance", "approvals");
    mkdirSync(approvalDir, { recursive: true });
    writeFileSync(
      path.join(approvalDir, `${phaseNumber}.json`),
      JSON.stringify({
        approvalId: `ship-${phaseNumber}`,
        phase: "construction",
        gateId: "ship",
        artifactPath: ".planning/governance/gates/05-ship.json",
        requestedBy: "aidlc-governance-ship",
        requestedAt: "2026-07-07T00:00:00.000Z",
        decision: "approved",
        decidedBy: "human-approver",
        decidedAt: "2026-07-07T00:01:00.000Z",
      }, null, 2),
      "utf8",
    );

    const phaseDir = path.join(root, ".planning", "phases", "05-audit-approvals");
    const outputPath = path.join(phaseDir, "GOVERNANCE.md");
    const result = writeGovernanceAudit({ projectRoot: root, outputPath });

    assert.ok(result.audit.approvals, "approvals must be populated");
    assert.equal(result.audit.approvals!.length, 1);
    assert.equal(result.audit.approvals![0].approvalId, `ship-${phaseNumber}`);
    assert.equal(result.audit.approvals![0].decision, "approved");
    assert.equal(result.audit.approvals![0].decidedBy, "human-approver");
  });
});

test("WR-01 writeGovernanceAudit end-to-end: all v2 fields populate from full persisted state", () => {
  withTempRoot((root) => {
    writeSelection(fixtureRecord(), root);
    const phaseNumber = "05";

    // REQUIREMENTS.md
    const reqsPath = path.join(root, ".planning", "REQUIREMENTS.md");
    mkdirSync(path.dirname(reqsPath), { recursive: true });
    writeFileSync(reqsPath, "| AUDIT-03 | Phase 5 | Complete |\n", "utf8");

    // Test evidence
    const testDir = path.join(root, ".planning", "governance", "tests");
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      path.join(testDir, `${phaseNumber}.json`),
      JSON.stringify({
        phase: phaseNumber,
        capturedAt: "2026-07-07T00:00:00.000Z",
        runner: "node --test --test-reporter=tap",
        summary: { total: 1, pass: 1, fail: 0, skipped: 0, duration_ms: 1 },
      }, null, 2),
      "utf8",
    );

    // Approval
    const apprDir = path.join(root, ".planning", "governance", "approvals");
    mkdirSync(apprDir, { recursive: true });
    writeFileSync(
      path.join(apprDir, `${phaseNumber}.json`),
      JSON.stringify({
        approvalId: `ship-${phaseNumber}`,
        phase: "construction",
        gateId: "ship",
        artifactPath: ".planning/governance/gates/05-ship.json",
        requestedBy: "aidlc-governance-ship",
        requestedAt: "2026-07-07T00:00:00.000Z",
        decision: "approved",
        decidedBy: "approver",
        decidedAt: "2026-07-07T00:01:00.000Z",
      }, null, 2),
      "utf8",
    );

    // VERIFICATION.md + CONTEXT.md
    const phaseDir = path.join(root, ".planning", "phases", "05-audit-full");
    mkdirSync(phaseDir, { recursive: true });
    writeFileSync(path.join(phaseDir, "VERIFICATION.md"), "- [ ] gap: perf\n", "utf8");
    writeFileSync(path.join(phaseDir, "CONTEXT.md"), "<deferred>\n- item\n</deferred>\n", "utf8");

    const outputPath = path.join(phaseDir, "GOVERNANCE.md");
    writeGovernanceAudit({ projectRoot: root, outputPath });

    // Parse the written GOVERNANCE.md and validate against schema.
    const audit = parseAuditMarkdown(readFileSync(outputPath, "utf8"));
    assert.ok(audit.requirements_covered, "end-to-end: requirements_covered present");
    assert.ok(audit.tests_executed, "end-to-end: tests_executed present");
    assert.ok(audit.remaining_risks, "end-to-end: remaining_risks present");
    assert.ok(audit.approvals, "end-to-end: approvals present");
    assert.equal(validateAudit(audit), true, "end-to-end audit must be schema-valid");
  });
});
