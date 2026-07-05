/**
 * Scope derivation + precedence resolution (PACK-02).
 *
 * STUB (Task 1 RED): the signatures, the `ORDINAL` const, and the `ResolvedRule`
 * type are real so `scope.test.ts` compiles, but every function throws
 * "not implemented" so the suite is RED. Task 2 fills in the bodies per
 * D-09 (directory is source of truth), D-10 (three-tier store), D-11
 * (full-replacement override + superseded), D-12 (globally-unique slug).
 *
 * No rule body/content is ever read in this module — precedence keys off the
 * `id`, `scope`, and `sourceFile` fields only (PACK-04 no-body guarantee).
 */
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
 * `rootDir` (D-10). Throws for a file outside the enterprise/domain/project
 * tiers. STUB — implemented in Task 2.
 */
export function deriveScope(_absPath: string, _rootDir: string): Scope {
  throw new Error("not implemented");
}

/**
 * Throw when a rule's frontmatter `scope` disagrees with the directory tier it
 * physically lives under (D-09 — directory is the source of truth). STUB.
 */
export function assertScopeMatchesDirectory(
  _rule: ParsedRule,
  _rootDir: string,
): void {
  throw new Error("not implemented");
}

/**
 * Collapse same-id collisions to a single max-ordinal winner with the losers
 * recorded as superseded (D-11); throw a hard error on a same-scope duplicate
 * (D-12). STUB — implemented in Task 2.
 */
export function resolvePrecedence(_rules: ParsedRule[]): ResolvedRule[] {
  throw new Error("not implemented");
}
