/**
 * Risk heuristic + risk-adjusted domain subscription (RESEARCH §4, D-RISK).
 *
 * PURE: no clock, no Math.random, no I/O — identical inputs yield identical
 * outputs (the determinism test asserts this across repeated calls).
 *
 * The heuristic is intentionally simple and deterministic:
 *   1. Critical-tier trigger: a sensitive keyword (security/payment/auth/…)
 *      OR a sensitive path segment (`auth/`, `payment/`, `security/`,
 *      `crypto/`). These signal a high-authority context where the security
 *      + payments domain rules MUST become candidates (the recall lever).
 *   2. Elevated-tier trigger: a broad construction-phase change (>=3 paths)
 *      without a critical trigger. A wide footprint in the build phase
 *      raises the baseline enough to subscribe the security domain.
 *   3. Baseline: everything else — no widening.
 *
 * Tier → domains mapping (D-RISK):
 *   - critical  => base ∪ [security, payments]
 *   - elevated  => base ∪ [security]
 *   - baseline  => base (unchanged)
 */
import type { Phase, TaskSignal } from "../types.js";

/** The three-tier risk classification produced by {@link classifyRisk}. */
export type RiskTier = "critical" | "elevated" | "baseline";

/**
 * Sensitive keywords — any substring match (case-insensitive) on a signal
 * keyword triggers the critical tier. The list is the union of security,
 * payments, and high-authority general terms from RESEARCH §4.
 */
const CRITICAL_KEYWORDS: readonly string[] = [
  "auth",
  "mfa",
  "secret",
  "credential",
  "token",
  "password",
  "eval",
  "payment",
  "pci",
  "card",
  "gdpr",
  "pii",
  "crypto",
  "injection",
];

/**
 * Sensitive path SEGMENTS — any signal path that contains one of these as a
 * path segment (e.g. `src/auth/login.ts`, `services/payment/charge.ts`)
 * triggers the critical tier. Path-only triggers catch a sensitive file move
 * even when the task title/keywords carry no security signal. The match is
 * segment-equality (not substring) so e.g. `authoring/` does not trip `auth`.
 */
const CRITICAL_PATH_SEGMENTS: readonly string[] = [
  "auth",
  "payment",
  "security",
  "crypto",
];

/**
 * The minimum number of impacted paths in a construction-phase change that
 * triggers the elevated tier (RESEARCH §4 "broad change" threshold). <3 is
 * a narrow change and stays baseline.
 */
const ELEVATED_PATH_THRESHOLD = 3;

/** Domains appended to the base subscription at each tier (D-RISK). */
const CRITICAL_DOMAINS: readonly string[] = ["security", "payments"];
const ELEVATED_DOMAINS: readonly string[] = ["security"];

/** True when `haystack` contains any substring of `needles` (case-insensitive). */
function matchesAny(haystack: string, needles: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  for (const needle of needles) {
    if (lower.includes(needle)) return true;
  }
  return false;
}

/** True when `p` contains any of `segments` as a path segment (after split on `/`). */
function matchesAnyPath(p: string, segments: readonly string[]): boolean {
  const lower = p.toLowerCase().replace(/\\/g, "/");
  const parts = lower.split("/");
  for (const seg of segments) {
    if (parts.includes(seg)) return true;
  }
  return false;
}

/**
 * Classify the risk of a task signal in a phase. PURE. Decision order is
 * fixed and documented (critical → elevated → baseline) so the tier is
 * deterministic for the same inputs.
 */
export function classifyRisk(signal: TaskSignal, phase: Phase): RiskTier {
  // 1. Critical: any keyword OR any path trigger.
  for (const kw of signal.keywords) {
    if (matchesAny(kw, CRITICAL_KEYWORDS)) return "critical";
  }
  for (const p of signal.paths) {
    if (matchesAnyPath(p, CRITICAL_PATH_SEGMENTS)) return "critical";
  }
  // 2. Elevated: a construction-phase broad change (>=3 paths), no critical.
  if (phase === "construction" && signal.paths.length >= ELEVATED_PATH_THRESHOLD) {
    return "elevated";
  }
  // 3. Baseline: everything else.
  return "baseline";
}

/**
 * Adjust the domain subscription for a risk tier (D-RISK). Dedup, stable
 * order: base first then appended domains in their declared order. PURE.
 */
export function riskAdjustedDomains(
  tier: RiskTier,
  baseDomains: string[],
): string[] {
  const widen =
    tier === "critical"
      ? CRITICAL_DOMAINS
      : tier === "elevated"
        ? ELEVATED_DOMAINS
        : [];
  // Stable union: keep base order, append missing widen entries in order.
  const seen = new Set(baseDomains);
  const out = [...baseDomains];
  for (const d of widen) {
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}
