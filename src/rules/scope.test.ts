/**
 * PACK-02 scope-derivation + precedence contract — table-driven RED suite.
 *
 * Encodes D-09 (directory is the source of truth for scope), D-10 (three-tier
 * store under aidlc-rules/), D-11 (full-replacement cross-tier override with the
 * loser recorded as superseded), and D-12 (globally-unique slug; same-scope
 * duplicate is a hard error, cross-scope duplicate is the override signal).
 *
 * Runs against the COMPILED module (dist-test/rules/scope.js). Against Task 1's
 * throwing stubs every function case is RED; Task 2's implementation is the exact
 * GREEN target. absPaths are built with node:path from a synthetic root so the
 * cases pass identically on Windows and Linux (no hard-coded separators).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  deriveScope,
  ORDINAL,
  assertScopeMatchesDirectory,
  resolvePrecedence,
  type ResolvedRule,
} from "./scope.js";
import type { ParsedRule, Scope } from "../types.js";

/** Synthetic store root — never touched on disk; deriveScope is pure path math. */
const SYNTH_ROOT = path.join(process.cwd(), "synthetic-aidlc-rules");

/** Extract a thrown value's message without assuming it is an Error at the type level. */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * A fresh ParsedRule per call (new literal every time — no shared nested
 * references, so a mutation in one case never leaks into another). Frontmatter is
 * minimal-but-fully-valid; sourceFile/absPath default from scope+id but can be
 * overridden to place a rule under a specific tier or domain sub-name.
 */
function makeRule(
  overrides: {
    id?: string;
    scope?: Scope;
    sourceFile?: string;
    absPath?: string;
  } = {},
): ParsedRule {
  const scope: Scope = overrides.scope ?? "enterprise";
  const id = overrides.id ?? "input-validation";
  const sourceFile = overrides.sourceFile ?? `aidlc-rules/${scope}/${id}.md`;
  const absPath = overrides.absPath ?? path.join(SYNTH_ROOT, scope, `${id}.md`);
  return {
    frontmatter: {
      id,
      scope,
      triggers: {},
      phases: ["construction"],
      severity: "high",
      summary: `Summary for ${id} at ${scope}.`,
      classification: "advisory",
    },
    sourceFile,
    absPath,
  };
}

test("deriveScope returns the tier from the first path segment under root (D-10)", () => {
  assert.equal(
    deriveScope(path.join(SYNTH_ROOT, "enterprise", "x.md"), SYNTH_ROOT),
    "enterprise",
  );
  assert.equal(
    deriveScope(path.join(SYNTH_ROOT, "domain", "security", "x.md"), SYNTH_ROOT),
    "domain",
  );
  assert.equal(
    deriveScope(path.join(SYNTH_ROOT, "project", "x.md"), SYNTH_ROOT),
    "project",
  );
});

test("deriveScope throws for a file outside the three tiers (D-10 boundary)", () => {
  assert.throws(
    () => deriveScope(path.join(SYNTH_ROOT, "misc", "x.md"), SYNTH_ROOT),
    /outside the enterprise\/domain\/project tiers/,
  );
});

test("assertScopeMatchesDirectory throws (naming both scopes) on a scope/dir mismatch (D-09)", () => {
  // Frontmatter claims 'project' authority while the file physically sits under
  // enterprise/ — a governance-privilege escalation that must be rejected.
  const rule = makeRule({
    scope: "project",
    sourceFile: "aidlc-rules/enterprise/mislabeled.md",
    absPath: path.join(SYNTH_ROOT, "enterprise", "mislabeled.md"),
  });
  assert.throws(
    () => assertScopeMatchesDirectory(rule, SYNTH_ROOT),
    (err: unknown) => {
      const m = messageOf(err);
      return (
        /does not match directory tier/.test(m) &&
        m.includes("project") && // the frontmatter scope value
        m.includes("enterprise") && // the derived directory tier
        m.includes("aidlc-rules/enterprise/mislabeled.md") // the offending file
      );
    },
  );
});

test("assertScopeMatchesDirectory returns without throwing when scope matches the tier (D-09)", () => {
  const rule = makeRule({
    scope: "enterprise",
    sourceFile: "aidlc-rules/enterprise/ok.md",
    absPath: path.join(SYNTH_ROOT, "enterprise", "ok.md"),
  });
  assert.doesNotThrow(() => assertScopeMatchesDirectory(rule, SYNTH_ROOT));
});

test("resolvePrecedence collapses a cross-tier id collision to the project winner with two superseded (D-11, success criterion 2)", () => {
  const rules = [
    makeRule({
      id: "input-validation",
      scope: "enterprise",
      sourceFile: "aidlc-rules/enterprise/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "enterprise", "input-validation.md"),
    }),
    makeRule({
      id: "input-validation",
      scope: "domain",
      sourceFile: "aidlc-rules/domain/security/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "domain", "security", "input-validation.md"),
    }),
    makeRule({
      id: "input-validation",
      scope: "project",
      sourceFile: "aidlc-rules/project/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "project", "input-validation.md"),
    }),
  ];
  const resolved: ResolvedRule[] = resolvePrecedence(rules);

  assert.equal(resolved.length, 1, "one winner for the single colliding id");
  const [r] = resolved;
  assert.equal(r.winner.frontmatter.scope, "project", "project outranks domain and enterprise");
  // Winner has the maximum precedence ordinal among the colliding rules.
  assert.equal(
    ORDINAL[r.winner.frontmatter.scope],
    Math.max(...rules.map((x) => ORDINAL[x.frontmatter.scope])),
  );

  assert.equal(r.superseded.length, 2, "both losers are recorded, not dropped");
  assert.deepEqual(
    r.superseded.map((s) => s.scope).sort(),
    ["domain", "enterprise"],
  );
  for (const s of r.superseded) {
    assert.equal(s.reason, "superseded");
    assert.equal(s.id, "input-validation");
  }
  assert.deepEqual(
    r.superseded.map((s) => s.sourceFile).sort(),
    [
      "aidlc-rules/domain/security/input-validation.md",
      "aidlc-rules/enterprise/input-validation.md",
    ].sort(),
  );
});

test("resolvePrecedence throws a duplicate-id error for two rules sharing one id in the same scope (D-12)", () => {
  const rules = [
    makeRule({
      id: "input-validation",
      scope: "project",
      sourceFile: "aidlc-rules/project/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "project", "input-validation.md"),
    }),
    makeRule({
      id: "input-validation",
      scope: "project",
      sourceFile: "aidlc-rules/project/nested/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "project", "nested", "input-validation.md"),
    }),
  ];
  assert.throws(
    () => resolvePrecedence(rules),
    (err: unknown) => {
      const m = messageOf(err);
      return (
        /duplicate id/.test(m) &&
        m.includes("input-validation") &&
        m.includes("aidlc-rules/project/input-validation.md") &&
        m.includes("aidlc-rules/project/nested/input-validation.md")
      );
    },
  );
});

test("resolvePrecedence throws for one id under two domain sub-names (both scope 'domain', D-12 / A4)", () => {
  // domain/security and domain/payments both derive scope 'domain' — a same-scope
  // duplicate, so it is a hard error, not a precedence resolution.
  const rules = [
    makeRule({
      id: "input-validation",
      scope: "domain",
      sourceFile: "aidlc-rules/domain/security/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "domain", "security", "input-validation.md"),
    }),
    makeRule({
      id: "input-validation",
      scope: "domain",
      sourceFile: "aidlc-rules/domain/payments/input-validation.md",
      absPath: path.join(SYNTH_ROOT, "domain", "payments", "input-validation.md"),
    }),
  ];
  assert.throws(() => resolvePrecedence(rules), /duplicate id/);
});

test("resolvePrecedence returns one ResolvedRule per non-colliding id, empty superseded, ordered by id ascending (determinism)", () => {
  // Deliberately supplied out of id order to prove the resolver sorts, not luck.
  const rules = [
    makeRule({
      id: "zzz-last",
      scope: "enterprise",
      sourceFile: "aidlc-rules/enterprise/zzz-last.md",
      absPath: path.join(SYNTH_ROOT, "enterprise", "zzz-last.md"),
    }),
    makeRule({
      id: "aaa-first",
      scope: "project",
      sourceFile: "aidlc-rules/project/aaa-first.md",
      absPath: path.join(SYNTH_ROOT, "project", "aaa-first.md"),
    }),
  ];
  const resolved: ResolvedRule[] = resolvePrecedence(rules);
  assert.equal(resolved.length, 2);
  assert.deepEqual(
    resolved.map((r) => r.winner.frontmatter.id),
    ["aaa-first", "zzz-last"],
  );
  for (const r of resolved) {
    assert.deepEqual(r.superseded, []);
  }
});
