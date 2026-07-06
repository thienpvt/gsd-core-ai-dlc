/**
 * RED-first tests for the risk heuristic (RESEARCH §4) + risk-adjusted domain
 * subscription (D-RISK). Every <behavior> assertion in 04-01-PLAN Task 2 maps
 * to one test below.
 *
 * Pure-function tests: no I/O, no clock, no fixtures. Mirrors the style of
 * src/select/select.test.ts (node:test + node:assert/strict).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRisk,
  riskAdjustedDomains,
  type RiskTier,
} from "./risk.js";
import type { TaskSignal } from "../types.js";

/** Build a signal with the given axes — keeps the table below readable. */
function sig(opts: {
  taskType?: TaskSignal["taskType"];
  keywords?: string[];
  paths?: string[];
}): TaskSignal {
  return {
    taskType: opts.taskType ?? "feature",
    keywords: opts.keywords ?? [],
    paths: opts.paths ?? [],
  };
}

// ── classifyRisk — keyword triggers ──────────────────────────────────────────

const KEYWORD_CASES: Array<[string, TaskSignal]> = [
  ["auth", sig({ keywords: ["oauth", "login"] })], // substring
  ["mfa", sig({ keywords: ["enable mfa"] })],
  ["secret", sig({ keywords: ["secret rotation"] })],
  ["credential", sig({ keywords: ["credential leak"] })],
  ["token", sig({ keywords: ["api token"] })],
  ["password", sig({ keywords: ["PASSWORD HASH"] })], // case-insensitive
  ["eval", sig({ keywords: ["unsafe eval"] })],
  ["payment", sig({ keywords: ["payment-flow"] })],
  ["pci", sig({ keywords: ["PCI-DSS"] })],
  ["card", sig({ keywords: ["card number"] })],
  ["gdpr", sig({ keywords: ["gdpr deletion"] })],
  ["pii", sig({ keywords: ["PII storage"] })],
  ["crypto", sig({ keywords: ["crypto operation"] })],
  ["injection", sig({ keywords: ["sql-injection"] })],
];

for (const [label, signal] of KEYWORD_CASES) {
  test(`classifyRisk returns "critical" for keyword trigger: ${label}`, () => {
    assert.equal(
      classifyRisk(signal, "construction"),
      "critical",
      `keyword "${label}" should trigger critical tier`,
    );
  });
}

// ── classifyRisk — path-only triggers (no keyword) ───────────────────────────

const PATH_CASES: Array<[string, string]> = [
  ["auth/", "src/auth/login.ts"],
  ["payment/", "services/payment/charge.ts"],
  ["security/", "lib/security/threat-model.md"],
  ["crypto/", "pkg/crypto/sign.ts"],
];

for (const [label, p] of PATH_CASES) {
  test(`classifyRisk returns "critical" for path-only trigger: ${label}`, () => {
    const signal = sig({ paths: [p] });
    assert.equal(
      classifyRisk(signal, "construction"),
      "critical",
      `path "${p}" should trigger critical tier even with no keyword`,
    );
  });
}

// ── classifyRisk — elevated: construction-phase broad change ─────────────────

test('classifyRisk returns "elevated" for a construction-phase broad change (>=3 paths, no critical trigger)', () => {
  const signal = sig({
    paths: ["src/a.ts", "src/b.ts", "src/c.ts"],
  });
  assert.equal(classifyRisk(signal, "construction"), "elevated");
});

test('classifyRisk returns "baseline" for a construction-phase narrow change (<3 paths)', () => {
  const signal = sig({ paths: ["src/a.ts", "src/b.ts"] });
  assert.equal(classifyRisk(signal, "construction"), "baseline");
});

test('classifyRisk does NOT promote to elevated on a non-construction phase even with broad paths', () => {
  // inception/operations do not get the broad-change bump (per RESEARCH §4:
  // the elevated tier is a construction-only signal).
  const signal = sig({
    paths: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"],
  });
  assert.equal(classifyRisk(signal, "inception"), "baseline");
});

// ── classifyRisk — baseline default ──────────────────────────────────────────

test('classifyRisk returns "baseline" for an unremarkable signal with no triggers', () => {
  assert.equal(classifyRisk(sig({}), "construction"), "baseline");
});

// ── classifyRisk — determinism ──────────────────────────────────────────────

test("classifyRisk is deterministic — identical inputs yield identical tiers across repeated calls (no clock, no Math.random)", () => {
  const signal = sig({
    keywords: ["auth"],
    paths: ["src/x.ts", "src/y.ts", "src/z.ts"],
  });
  const results = new Set<RiskTier>();
  for (let i = 0; i < 5; i++) {
    results.add(classifyRisk(signal, "construction"));
  }
  assert.equal(results.size, 1, `expected 1 tier across 5 calls, got ${[...results].join(", ")}`);
});

// ── riskAdjustedDomains — tier → domains mapping ────────────────────────────

test("riskAdjustedDomains: critical tier unions [security, payments] onto base (dedup, stable order)", () => {
  // base with no overlap — security + payments appended in declared order.
  assert.deepEqual(riskAdjustedDomains("critical", []), ["security", "payments"]);
  // base with one overlap — security deduped, payments appended.
  assert.deepEqual(riskAdjustedDomains("critical", ["security"]), [
    "security",
    "payments",
  ]);
  // base with both overlaps — unchanged (both already present, no dupes).
  assert.deepEqual(
    riskAdjustedDomains("critical", ["security", "payments"]),
    ["security", "payments"],
  );
  // base order preserved when appending new domains.
  assert.deepEqual(riskAdjustedDomains("critical", ["observability"]), [
    "observability",
    "security",
    "payments",
  ]);
});

test("riskAdjustedDomains: elevated tier unions [security] onto base", () => {
  assert.deepEqual(riskAdjustedDomains("elevated", []), ["security"]);
  assert.deepEqual(riskAdjustedDomains("elevated", ["security"]), ["security"]);
  assert.deepEqual(riskAdjustedDomains("elevated", ["observability"]), [
    "observability",
    "security",
  ]);
});

test("riskAdjustedDomains: baseline tier returns base unchanged (no widening)", () => {
  assert.deepEqual(riskAdjustedDomains("baseline", []), []);
  assert.deepEqual(riskAdjustedDomains("baseline", ["observability"]), [
    "observability",
  ]);
});

test("riskAdjustedDomains: critical tier is the recall lever — a base subscription WITHOUT security widens to include it", () => {
  // This is the load-bearing case: a baseline subscription that omits
  // security MUST be widened for a critical auth task, or the security
  // domain rules never become candidates.
  const widened = riskAdjustedDomains("critical", []);
  assert.ok(
    widened.includes("security"),
    `critical tier must widen base to include security, got [${widened.join(", ")}]`,
  );
  assert.ok(
    widened.includes("payments"),
    `critical tier must widen base to include payments, got [${widened.join(", ")}]`,
  );
});
