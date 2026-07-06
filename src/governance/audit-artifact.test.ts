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

test("buildAuditRecord maps selected rules one-to-one into rules_applied", () => {
  const record = fixtureRecord();
  const audit = buildAuditRecord(record);

  assert.deepEqual(audit.rules_applied, record.selectionResult.selected);
});

test("buildAuditRecord normalizes skipped reasons to the public audit enum and preserves selector provenance", () => {
  const audit = buildAuditRecord(fixtureRecord());
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

  assert.throws(
    () => buildAuditRecord(fixtureRecord(selectionResult)),
    /invalid audit skip reason/i,
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
  const first = parseAuditMarkdown(renderGovernanceMarkdown(buildAuditRecord(record)));
  const second = parseAuditMarkdown(renderGovernanceMarkdown(buildAuditRecord(record)));

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

test("audit-artifact source does not import selector, risk, discuss, or execute derivation paths", () => {
  const source = readFileSync(path.join(process.cwd(), "src", "governance", "audit-artifact.ts"), "utf8");

  assert.doesNotMatch(source, /from ["']\.\.\/select\//);
  assert.doesNotMatch(source, /from ["']\.\/risk\.js["']/);
  assert.doesNotMatch(source, /validateSignal|classifyRisk|discussHook|executeHook/);
});
