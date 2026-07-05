/**
 * Scope derivation + precedence resolution (PACK-02).
 *
 * Directory location is the source of truth for a rule's scope (D-09): the tier
 * a rule physically lives under determines its authority, and a frontmatter
 * `scope` that disagrees is rejected at build time. Same-id collisions across the
 * three tiers (D-10) resolve by full replacement to the highest-ordinal winner
 * (project > domain > enterprise, D-11), with every loser recorded as a
 * {@link SupersededRecord} rather than silently dropped. A same-id collision
 * WITHIN one tier has no defined winner and is a hard build error (D-12).
 *
 * No rule body/content is read anywhere in this module — precedence keys off the
 * `id`, `scope`, and `sourceFile` fields only, so the no-body guarantee (PACK-04)
 * survives precedence integration.
 */
import path from "node:path";
import type { ParsedRule, Scope, SupersededRecord } from "../types.js";

/**
 * Precedence ordinal (D-11): project (3) > domain (2) > enterprise (1).
 * The winner of a same-id collision is the rule with the maximum ordinal.
 */
export const ORDINAL: Record<Scope, number> = {
  enterprise: 1,
  domain: 2,
  project: 3,
};

/** The three valid scope tiers (D-10) — the only first path segments accepted. */
const TIERS: readonly Scope[] = ["enterprise", "domain", "project"];

/**
 * A resolved id group: the winning rule kept verbatim, plus every loser recorded
 * as a {@link SupersededRecord} (D-11 full replacement — losers are traced, not
 * dropped). `superseded` is empty when the id had no cross-tier collision.
 */
export type ResolvedRule = {
  winner: ParsedRule;
  superseded: SupersededRecord[];
};

/**
 * Derive a rule's scope from the first path segment of its location under
 * `rootDir` (D-10). `details/` subtrees are already excluded upstream by
 * {@link loadRules}, so any file reaching here must sit directly in one of the
 * three tiers. Throws (naming the offending relative path) for anything else.
 */
export function deriveScope(absPath: string, rootDir: string): Scope {
  // path.relative normalizes both inputs, so mixed separators resolve cleanly.
  const rel = path.relative(rootDir, absPath);
  // Split on either separator so the check is identical on Windows and POSIX.
  const firstSegment = rel.split(/[\\/]/)[0];
  if ((TIERS as readonly string[]).includes(firstSegment)) {
    return firstSegment as Scope;
  }
  throw new Error(
    `${rel}: rule is outside the enterprise/domain/project tiers (D-10) — ` +
      `every rule must live under one of aidlc-rules/{enterprise,domain,project}/`,
  );
}

/**
 * Throw when a rule's frontmatter `scope` disagrees with the directory tier it
 * physically lives under (D-09 — directory is the source of truth). The error
 * names the file, the frontmatter scope value, and the derived directory tier so
 * a mis-scoped rule cannot inherit precedence its location does not authorize.
 */
export function assertScopeMatchesDirectory(
  rule: ParsedRule,
  rootDir: string,
): void {
  const derived = deriveScope(rule.absPath, rootDir);
  const declared = rule.frontmatter.scope;
  if (derived !== declared) {
    throw new Error(
      `${rule.sourceFile}: frontmatter scope '${declared}' does not match ` +
        `directory tier '${derived}' (D-09 — directory is the source of truth ` +
        `for scope; move the file or correct the scope field)`,
    );
  }
}

/**
 * Collapse same-id collisions to a single max-ordinal winner with the losers
 * recorded as superseded (D-11); throw a hard error on a same-scope duplicate
 * (D-12, including one id under two domain sub-names — both derive scope
 * 'domain'). Output is sorted by winner id ascending and each superseded list by
 * descending ordinal, so the index is deterministic regardless of walk order.
 */
export function resolvePrecedence(rules: ParsedRule[]): ResolvedRule[] {
  // Group by id, preserving insertion for stable diagnostics.
  const groups = new Map<string, ParsedRule[]>();
  for (const rule of rules) {
    const id = rule.frontmatter.id;
    const group = groups.get(id);
    if (group) group.push(rule);
    else groups.set(id, [rule]);
  }

  const resolved: ResolvedRule[] = [];
  for (const [id, group] of groups) {
    // D-12: a same-scope duplicate has no defined winner — hard error naming the
    // id, the colliding scope, and both files (also catches one id under two
    // domain sub-names, since both derive scope 'domain' — RESEARCH A4).
    const byScope = new Map<Scope, ParsedRule>();
    for (const rule of group) {
      const scope = rule.frontmatter.scope;
      const existing = byScope.get(scope);
      if (existing) {
        throw new Error(
          `duplicate id '${id}' at scope '${scope}' (D-12 — an id must be ` +
            `globally unique within a scope tier): ` +
            `${existing.sourceFile} and ${rule.sourceFile}`,
        );
      }
      byScope.set(scope, rule);
    }

    // D-11: the winner is the rule with the maximum ORDINAL (surviving scopes are
    // distinct, so the max is unique); every other rule becomes a SupersededRecord.
    let winner = group[0];
    for (const rule of group) {
      if (ORDINAL[rule.frontmatter.scope] > ORDINAL[winner.frontmatter.scope]) {
        winner = rule;
      }
    }
    const superseded: SupersededRecord[] = group
      .filter((rule) => rule !== winner)
      .map((rule) => ({
        id,
        scope: rule.frontmatter.scope,
        sourceFile: rule.sourceFile,
        reason: "superseded" as const,
      }))
      // Highest-authority loser first for stable, readable output.
      .sort((a, b) => ORDINAL[b.scope] - ORDINAL[a.scope]);

    resolved.push({ winner, superseded });
  }

  // Deterministic, reproducible ordering — never rely on filesystem walk order.
  return resolved.sort((a, b) =>
    a.winner.frontmatter.id < b.winner.frontmatter.id
      ? -1
      : a.winner.frontmatter.id > b.winner.frontmatter.id
        ? 1
        : 0,
  );
}
