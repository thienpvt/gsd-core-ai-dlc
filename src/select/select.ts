/**
 * The selection engine core (SEL-01 / SEL-04) — the project's Core Value.
 *
 * `select(index, signal, config)` is a PURE function: no clock (`new Date()`),
 * no `Math.random`, no filesystem, no I/O. It reads Phase 1's {@link RuleIndex}
 * shape (winners already resolved, losers carried under each winner's
 * `superseded[]`) and classifies EVERY candidate as either selected (with the
 * axis + value that fired) or skipped (with a reason from the AUDIT-02-aligned
 * enum). Identical `(index, signal, config)` inputs always produce byte-identical
 * output (02-RESEARCH determinism traps, Pitfalls 1 + 7).
 *
 * The per-rule decision runs a FIXED gate order so the skip reason is
 * deterministic and matches AUDIT-02 (02-RESEARCH §1):
 *   1. phase gate    -> "out-of-phase"
 *   2. scope gate    -> "out-of-scope"        (domain not subscribed)
 *   3. trigger gate  -> "out-of-scope-by-trigger" (no axis, or matched-then-excluded)
 *   otherwise        -> selected (matchedAxis + matchedValue)
 * The FIRST failing gate wins the reason. After the main loop, every winner's
 * superseded[] losers (D-11) are emitted as "superseded" skips WITHOUT re-running
 * matching — they lost precedence at build time (Pitfall 9).
 */
import picomatch from "picomatch";
import { estimateTokens, PER_RULE_OVERHEAD } from "./tokens.js";
import type {
  RuleIndex,
  RuleIndexRecord,
  TaskSignal,
  SelectionConfig,
  SelectionResult,
  SelectedRule,
  SkippedRule,
  Triggers,
  TriggerExclude,
  MatchedAxis,
} from "../types.js";

/**
 * Default per-request governance token budget (02-CONTEXT / 02-RESEARCH §3). The
 * CLI resolves the real limit (flag > config.json governance.token_budget > this
 * default); this fallback keeps the pure core self-contained so callers that pass
 * no `config.budget` (e.g. the property tests) still get a populated budget.
 */
const DEFAULT_TOKEN_BUDGET = 2000;

/**
 * The result of evaluating a rule's positive trigger axes against a signal.
 * `matched: false` means no populated positive axis fired (a plain no-match).
 * When `matched: true`, `axis` + `value` are the FIRST matching axis in the
 * fixed order taskType -> keywords -> paths (documented, deterministic).
 */
type PositiveMatch =
  | { matched: false }
  | { matched: true; axis: MatchedAxis; value: string };

/** taskType axis (D-04): enum equality — the signal type equals any listed member. */
function matchTaskType(
  triggerTypes: readonly string[] | undefined,
  signal: TaskSignal,
): string | undefined {
  if (!triggerTypes || triggerTypes.length === 0) return undefined;
  return triggerTypes.includes(signal.taskType) ? signal.taskType : undefined;
}

/**
 * keywords axis (D-04): case-insensitive substring. The trigger keyword is the
 * NEEDLE — a trigger fires when it is a substring of some normalized signal
 * keyword (both lowercased + trimmed; the signal is the free text). Returns the
 * matching SIGNAL keyword (the concrete value the audit records).
 */
function matchKeywords(
  triggerKeywords: readonly string[] | undefined,
  signal: TaskSignal,
): string | undefined {
  if (!triggerKeywords || triggerKeywords.length === 0) return undefined;
  for (const sig of signal.keywords) {
    const haystack = sig.trim().toLowerCase();
    for (const trig of triggerKeywords) {
      if (haystack.includes(trig.trim().toLowerCase())) return sig;
    }
  }
  return undefined;
}

/**
 * paths axis (D-04): picomatch globs. A trigger glob fires when it matches any
 * signal path. Returns the matching SIGNAL path (the concrete value recorded).
 * picomatch is pure/deterministic for a given pattern+string (02-RESEARCH §1).
 *
 * `dot: true` is REQUIRED: with picomatch's default (`dot: false`), a `*` or `**`
 * wildcard does not match a path segment that begins with `.`. So a rule authored
 * to catch YAML via a globstar-then-`.yml` pattern would silently NOT fire on
 * `.github/workflows/deploy.yml`, and a `src` globstar would miss `src/.env`. For
 * a governance overlay whose whole point is catching dot-prefixed CI/config/secret
 * paths, that narrows matching in the dangerous direction (under-injection, the #1
 * project risk). Enabling dotfile matching errs toward over-injection — the
 * acceptable direction.
 */
function matchPaths(
  triggerPaths: readonly string[] | undefined,
  signal: TaskSignal,
): string | undefined {
  if (!triggerPaths || triggerPaths.length === 0) return undefined;
  for (const glob of triggerPaths) {
    const isMatch = picomatch(glob, { dot: true }); // match .github/, .env, etc.
    for (const p of signal.paths) {
      if (isMatch(p)) return p;
    }
  }
  return undefined;
}

/**
 * Evaluate the populated POSITIVE axes of `triggers` against `signal`, returning
 * the FIRST match in the fixed order taskType -> keywords -> paths (D-02
 * OR-combine; first-match rule is documented + deterministic). Empty triggers
 * (no positive axis) are handled by the caller as always-in-phase (D-03) — this
 * helper only sees whether a populated axis fired.
 */
function matchPositive(triggers: Triggers, signal: TaskSignal): PositiveMatch {
  const taskType = matchTaskType(triggers.taskType, signal);
  if (taskType !== undefined) return { matched: true, axis: "taskType", value: taskType };
  const keyword = matchKeywords(triggers.keywords, signal);
  if (keyword !== undefined) return { matched: true, axis: "keywords", value: keyword };
  const path = matchPaths(triggers.paths, signal);
  if (path !== undefined) return { matched: true, axis: "paths", value: path };
  return { matched: false };
}

/**
 * Whether `exclude` fires for `signal` (D-02 exclude-wins). Any exclude sub-axis
 * matching (same per-axis rules as the positive axes) excludes the rule.
 */
function matchExclude(
  exclude: TriggerExclude | undefined,
  signal: TaskSignal,
): boolean {
  if (!exclude) return false;
  if (matchTaskType(exclude.taskType, signal) !== undefined) return true;
  if (matchKeywords(exclude.keywords, signal) !== undefined) return true;
  if (matchPaths(exclude.paths, signal) !== undefined) return true;
  return false;
}

/** True when a rule's triggers have NO populated positive axis (D-03 always-in-phase). */
function isEmptyTriggers(triggers: Triggers): boolean {
  return (
    (triggers.taskType?.length ?? 0) === 0 &&
    (triggers.keywords?.length ?? 0) === 0 &&
    (triggers.paths?.length ?? 0) === 0
  );
}

/**
 * Phase gate (02-RESEARCH §1 step 1): a record matches the signal's phase if its
 * `phases[]` contains that phase OR the shared `common` bucket (common applies to
 * every phase).
 */
function inPhase(record: RuleIndexRecord, config: SelectionConfig): boolean {
  return record.phases.includes(config.phase) || record.phases.includes("common");
}

/**
 * Derive a domain rule's sub-name from its sourceFile (D-10 domain/<name>/ layout).
 * The record carries scope "domain" but NOT the sub-name, so we read the path
 * segment immediately after the "domain" tier: e.g.
 *   ".../eval-rules/domain/security/threat-model.md" -> "security".
 * Returns undefined if the layout is unexpected (defensive; a domain rule always
 * lives under domain/<name>/ per Phase 1's deriveScope).
 */
function domainName(record: RuleIndexRecord): string | undefined {
  const segments = record.sourceFile.split("/");
  const domainIdx = segments.lastIndexOf("domain");
  if (domainIdx === -1 || domainIdx + 1 >= segments.length) return undefined;
  return segments[domainIdx + 1];
}

/**
 * Scope gate (02-RESEARCH §1 step 2): enterprise and project are ALWAYS in the
 * candidate set; only a `domain` rule is subscription-gated — it stays a candidate
 * only when its domain sub-name is in `config.domains` (exact string equality,
 * deterministic + audit-simple; a glob subscription is a future option). Returns
 * true when the rule passes the scope gate.
 */
function inScope(record: RuleIndexRecord, config: SelectionConfig): boolean {
  if (record.scope !== "domain") return true;
  const name = domainName(record);
  return name !== undefined && config.domains.includes(name);
}

/** Ascending-by-id comparator — the single documented sort key for both output arrays. */
function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Classify every candidate in `index` against `signal` + `config`.
 *
 * Pure: builds `selected`/`skipped` explicitly, constructs each record
 * field-by-field (mirrors build.ts toRecord — never spread an input-ordered
 * object), and sorts both arrays by id ascending so ordering never depends on
 * upstream index order (Pitfall 7). Does NOT compute budget (02-03) and does NOT
 * call validateSignal (the CLI/harness boundary validates; select() stays pure
 * over an already-typed TaskSignal).
 */
export function select(
  index: RuleIndex,
  signal: TaskSignal,
  config: SelectionConfig,
): SelectionResult {
  const selected: SelectedRule[] = [];
  const skipped: SkippedRule[] = [];

  for (const record of index.rules) {
    // Gate 1 — phase. First failing gate wins the reason.
    if (!inPhase(record, config)) {
      skipped.push({ id: record.id, severity: record.severity, reason: "out-of-phase" });
      continue;
    }
    // Gate 2 — scope (domain subscription).
    if (!inScope(record, config)) {
      skipped.push({ id: record.id, severity: record.severity, reason: "out-of-scope" });
      continue;
    }
    // Gate 3 — trigger (D-01..D-04).
    if (isEmptyTriggers(record.triggers)) {
      // D-03: no POSITIVE axis = always-in-phase (never "never fires"; Pitfall 2).
      // WR-01: an exclude-only rule (`triggers: { exclude: {...} }`) also has no
      // positive axis, yet it still carries authored intent — "fire always EXCEPT
      // <carve-out>". isEmptyTriggers inspects only the positive axes, so we must
      // consult matchExclude HERE (D-02 exclude-wins) before selecting; otherwise
      // the authored exclude is a silent no-op and the rule fires even for a signal
      // the author explicitly carved out.
      if (matchExclude(record.triggers.exclude, signal)) {
        skipped.push({
          id: record.id,
          severity: record.severity,
          reason: "out-of-scope-by-trigger",
          detail: "matched-then-excluded",
        });
        continue;
      }
      selected.push({
        id: record.id,
        severity: record.severity,
        summary: record.summary,
        matchedAxis: "always-in-phase",
        matchedValue: "always-in-phase",
      });
      continue;
    }
    const positive = matchPositive(record.triggers, signal);
    if (!positive.matched) {
      // No populated positive axis fired.
      skipped.push({
        id: record.id,
        severity: record.severity,
        reason: "out-of-scope-by-trigger",
      });
      continue;
    }
    if (matchExclude(record.triggers.exclude, signal)) {
      // D-02 exclude-wins: matched a positive axis, then an exclude sub-axis fired.
      // Enum stays out-of-scope-by-trigger; detail distinguishes it from no-match.
      skipped.push({
        id: record.id,
        severity: record.severity,
        reason: "out-of-scope-by-trigger",
        detail: "matched-then-excluded",
      });
      continue;
    }
    // Selected — record the first matching axis + concrete value.
    selected.push({
      id: record.id,
      severity: record.severity,
      summary: record.summary,
      matchedAxis: positive.axis,
      matchedValue: positive.value,
    });
  }

  // Superseded losers (D-11): emitted from each winner's superseded[], NEVER
  // re-run through matching — they lost precedence at build time (Pitfall 9).
  for (const record of index.rules) {
    if (!record.superseded) continue;
    for (const loser of record.superseded) {
      skipped.push({
        // A loser shares its winner's id (same-id cross-tier collision is the
        // whole mechanism), so if the winner is also selected the same id lands
        // in BOTH arrays. The SupersededRecord carries no severity; inherit the
        // winner's so the skip stays shape-complete (WR-06: severity is therefore
        // the WINNER's, not the loser's — the loser's own scope + sourceFile below
        // name which physical rule was dropped and disambiguate the collision).
        id: loser.id,
        severity: record.severity,
        reason: "superseded",
        scope: loser.scope,
        sourceFile: loser.sourceFile,
      });
    }
  }

  // Sort both arrays by id ascending — the single documented key (Pitfall 7).
  selected.sort(byId);
  skipped.sort(byId);

  // Token budget (SEL-05). Sum estimateTokens(summary) + PER_RULE_OVERHEAD over
  // the SELECTED rules (summaries are exactly what Phase 3 injects). The caller
  // (CLI/harness) resolves the real limit; when absent the pure core falls back
  // to the locked default so it stays self-contained (the property tests pass no
  // budget). NEVER drop/slice/truncate a selected rule to fit — dropping a rule
  // could drop a critical one (Pitfall 6); we only flag the overflow. The CLI
  // maps budgetExceeded -> a non-zero exit; the core stays pure + testable.
  const limit = config.budget ?? DEFAULT_TOKEN_BUDGET;
  let used = 0;
  for (const rule of selected) {
    used += estimateTokens(rule.summary) + PER_RULE_OVERHEAD;
  }
  const budgetExceeded = used > limit;
  // Construct the budget object field-by-field (determinism — never an
  // input-ordered spread). Offenders are the selected ids on overflow, [] within.
  const budget = {
    used,
    limit,
    offenders: budgetExceeded ? selected.map((r) => r.id) : [],
  };

  return { selected, skipped, budgetExceeded, budget };
}
