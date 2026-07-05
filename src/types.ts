/**
 * Shared type set for the GSD AI-DLC governance overlay.
 *
 * These types are the format contract every later phase inherits:
 * Phase 2 (`select`) matches against {@link Triggers}, Phase 3 (`rule-detail`)
 * resolves {@link Frontmatter.detailPath}, and Phase 5 (audit) reads the
 * {@link RuleIndex}. Bodies are deliberately absent from {@link ParsedRule} and
 * {@link RuleIndexRecord} — the body-quarantine guarantee (D-05 / PACK-04).
 */

/** Scope tier a rule sits in. Directory location is the source of truth (D-09). */
export type Scope = "enterprise" | "domain" | "project";

/** Rule importance (D-13). Phase 2 targets 100% recall on `critical`. */
export type Severity = "critical" | "high" | "medium" | "low";

/**
 * Enforcement classification, independent of {@link Severity} (D-14).
 * A `binding` rule must name an enforcement contract (D-15).
 */
export type Classification = "advisory" | "binding";

/** Applicable workflow phase(s). `common` is the shared/always bucket. */
export type Phase = "inception" | "construction" | "operations" | "common";

/** Task-type enum matched by equality (D-04). Starter set — extended in 01-02. */
export type TaskType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "docs"
  | "test"
  | "infra"
  | "security"
  | "data";

/** Negative selectors — exclusion wins over any positive match (D-02). */
export interface TriggerExclude {
  taskType?: TaskType[];
  keywords?: string[];
  paths?: string[];
}

/**
 * Multi-axis trigger object (D-01). Axes OR-combine (D-02).
 * An empty object `{}` is valid and means always-in-phase (D-03) — every axis
 * is optional, so the escape hatch a `critical` rule uses is representable.
 */
export interface Triggers {
  taskType?: TaskType[];
  keywords?: string[];
  paths?: string[];
  exclude?: TriggerExclude;
}

/** Parsed + validated YAML frontmatter of a single rule file (PACK-01). */
export interface Frontmatter {
  id: string;
  scope: Scope;
  triggers: Triggers;
  phases: Phase[];
  severity: Severity;
  summary: string;
  classification: Classification;
  /** Optional pointer to a separate detail file (D-05/D-06). */
  detailPath?: string;
  /** Free-form contract id, required when `classification: binding` (D-15). */
  enforcement?: string;
}

/**
 * A rule loaded from disk. Carries frontmatter + pointers only.
 * The Markdown body is intentionally NOT a field here (D-05 quarantine).
 */
export interface ParsedRule {
  frontmatter: Frontmatter;
  /** Repo-root-relative POSIX path to the rule file. */
  sourceFile: string;
  /** Absolute path to the rule file on the current machine. */
  absPath: string;
}

/** A superseded rule recorded under the winner (D-11). Feeds Phase 5 skip-reasons. */
export interface SupersededRecord {
  id: string;
  scope: Scope;
  sourceFile: string;
  reason: "superseded";
}

/** One record in `rule-index.json`. Summaries + pointers only — never a body. */
export interface RuleIndexRecord {
  id: string;
  scope: Scope;
  triggers: Triggers;
  phases: Phase[];
  severity: Severity;
  summary: string;
  classification: Classification;
  detailPath?: string;
  enforcement?: string;
  sourceFile: string;
  superseded?: SupersededRecord[];
}

/** The compact index artifact (PACK-04). */
export interface RuleIndex {
  schemaVersion: 1;
  generatedAt: string;
  rules: RuleIndexRecord[];
}
