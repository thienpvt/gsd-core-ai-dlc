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

// ---------------------------------------------------------------------------
// Phase 2 selection types (SEL-01 / SEL-04).
//
// Added ALONGSIDE the Phase 1 format contract above — nothing here redefines
// {@link RuleIndex}, {@link Triggers}, {@link TaskType}, etc. The selector
// consumes the Phase 1 index (winners + superseded[]) and classifies every
// candidate against a caller-supplied {@link TaskSignal} + {@link SelectionConfig}.
// ---------------------------------------------------------------------------

/**
 * A task's matchable signal — the three positive trigger axes locked in Phase 1
 * (D-01), nothing more. There is deliberately NO free-form `text` field: callers
 * pre-tokenize prose into {@link TaskSignal.keywords} (02-CONTEXT input contract).
 */
export interface TaskSignal {
  taskType: TaskType;
  keywords: string[];
  paths: string[];
}

/**
 * Selection configuration for one request: the phase to match, the active-domain
 * subscription (enterprise + project are always candidates; only `domain/<name>`
 * is subscription-gated), and an optional token budget consumed in 02-03.
 */
export interface SelectionConfig {
  phase: Phase;
  domains: string[];
  budget?: number;
}

/**
 * Why a candidate was NOT selected, drawn from a machine-checkable enum aligned
 * with AUDIT-02. `out-of-phase` = phase gate; `out-of-scope` = non-active domain;
 * `out-of-scope-by-trigger` = in phase+scope but no axis matched or an `exclude`
 * fired; `superseded` = lost a Phase 1 precedence collision (D-11). Phase 5
 * RECONCILES this enum (adds `explicitly-waived`) rather than inheriting verbatim.
 */
export type SkipReason =
  | "out-of-phase"
  | "out-of-scope"
  | "out-of-scope-by-trigger"
  | "superseded";

/**
 * The trigger axis that fired for a selected rule. `always-in-phase` is the D-03
 * empty-triggers case — a rule with no positive axis matches every in-phase,
 * in-scope signal (the never-miss escape hatch a `critical` rule uses).
 */
export type MatchedAxis = "taskType" | "keywords" | "paths" | "always-in-phase";

/**
 * A selected rule: carries the summary Phase 3 injects plus the axis + concrete
 * value that fired, so an audit can name exactly WHY the rule was chosen.
 */
export interface SelectedRule {
  id: string;
  severity: Severity;
  summary: string;
  matchedAxis: MatchedAxis;
  matchedValue: string;
}

/**
 * A skipped candidate: the reason from {@link SkipReason} plus an optional detail
 * that distinguishes `matched-then-excluded` from `never-matched` while keeping
 * the enum value `out-of-scope-by-trigger`.
 */
export interface SkippedRule {
  id: string;
  severity: Severity;
  reason: SkipReason;
  detail?: string;
  /**
   * For a `superseded` skip (D-11), the LOSER's own scope — carried so the audit
   * can disambiguate a same-id cross-tier collision (the loser shares the winner's
   * id, and the winner may also appear in `selected`). Absent for other skips.
   */
  scope?: Scope;
  /**
   * For a `superseded` skip (D-11), the LOSER's own repo-relative sourceFile — the
   * `severity` on this record is the WINNER's (a SupersededRecord carries none), so
   * this names exactly WHICH physical rule file was dropped. Absent for other skips.
   */
  sourceFile?: string;
}

/**
 * The full, observable selection output (SEL-01 / SEL-04): every index candidate
 * appears in exactly one of `selected` / `skipped`. The `budgetExceeded` / `budget`
 * fields are declared here so 02-03 populates them without a type change; the
 * 02-02 core leaves them unset.
 */
export interface SelectionResult {
  selected: SelectedRule[];
  skipped: SkippedRule[];
  budgetExceeded?: boolean;
  budget?: {
    used: number;
    limit: number;
    offenders: string[];
  };
}
