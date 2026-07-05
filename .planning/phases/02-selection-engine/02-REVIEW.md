---
phase: 02-selection-engine
reviewed: 2026-07-05T16:46:10Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/select/select.ts
  - src/select/tokens.ts
  - src/select/validate-signal.ts
  - src/select/eval-harness.ts
  - src/cli/commands/select.ts
  - src/cli/index.ts
  - src/schema/task-signal.schema.json
  - src/types.ts
findings:
  critical: 2
  warning: 7
  info: 6
  total: 15
status: issues_found
---

# Phase 2: Code Review Report — Selection Engine

**Depth:** deep (cross-file: CLI → validateSignal → select → tokens; build → scope → superseded → select; eval-harness recall math)
**Status:** issues_found

## Summary

The pure core (`select()`) is genuinely solid on determinism and total-accounting: it iterates the index in array order, classifies each candidate into exactly one bucket, emits superseded losers from winners' `superseded[]` without re-matching, and sorts both outputs by id — so identical inputs produce byte-identical output with no clock/random/Set-order dependence. The matching direction (trigger-as-needle), OR-combine, empty-triggers-as-always-in-phase, and the no-truncate budget flag are all implemented as specified.

Two defects rise to BLOCKER: (1) `matchPaths` uses picomatch with its default `dot:false`, which silently narrows path matching for any dot-prefixed segment — exactly the `.github/`, `.env`, `.gitlab-ci.yml` paths a governance overlay must catch — an untested under-injection vector; and (2) the CLI's budget-overflow path calls `process.exit(1)` immediately after writing the result JSON, which can truncate stdout on a pipe and lose the audit output in the one scenario the feature exists for, contradicting its own documented guarantee. The recall harness math is correct, but it delegates gate integrity entirely to external fixture tests (`if (sev)` silently drops unknown ids; case-name uniqueness is assumed) — a defensive gap on the single most important gate in the milestone.

## Critical Issues

### CR-01: picomatch default `dot:false` silently drops rules on dot-prefixed paths (under-injection)

**File:** `src/select/select.ts:89-101` (specifically line 95, `const isMatch = picomatch(glob);`)
**Issue:** `matchPaths` compiles globs with picomatch's default options, where `dot` is `false`. With that default, `*` and `**` do not match a path segment that begins with `.`. A rule authored `paths: ["**/*.yml"]` to govern CI configs will NOT match a signal path `.github/workflows/deploy.yml`; `paths: ["src/**"]` will NOT match `src/.env`. For a security/CI/compliance governance overlay whose whole point is catching dot-prefixed config and secret paths, this narrows matching for an entire high-value class of paths. Per the review mandate, "a bug that narrows matching (drops a rule that should fire) is Critical." No eval case or unit test exercises a dot-prefixed path (`select.test.ts` uses `infra/main.tf`, `docs/index.md`, `src/api/v1.ts`), so the recall gate cannot catch this. It fails in the dangerous direction: a `critical` path-triggered rule silently never fires. (Counterpoint for the fixer: `dot:false` is the ecosystem-standard glob default; if the team decides dotfile matching should be opt-in per rule, close this as intended — but then add an explicit test proving the behavior.)
**Fix:** Enable dotfile matching so path triggers err toward over-injection (the acceptable direction):
```typescript
function matchPaths(triggerPaths, signal): string | undefined {
  if (!triggerPaths || triggerPaths.length === 0) return undefined;
  for (const glob of triggerPaths) {
    const isMatch = picomatch(glob, { dot: true }); // match .github/, .env, etc.
    for (const p of signal.paths) {
      if (isMatch(p)) return p;
    }
  }
  return undefined;
}
```
Add a regression test: a signal path `.github/workflows/deploy.yml` selecting a rule with `paths: ["**/*.yml"]`.

### CR-02: `process.exit(1)` on budget overflow can truncate the emitted result on a pipe (audit data loss)

**File:** `src/cli/commands/select.ts:145` (stdout write) and `:150-156` (`process.exit(1)`)
**Issue:** The command writes the full `SelectionResult` JSON to stdout (line 145), then on `budgetExceeded` writes to stderr and calls `process.exit(1)` (line 155). Node's docs are explicit that `process.exit()` forces exit "even if there are still asynchronous operations pending... including I/O operations to `process.stdout`." When stdout is a pipe (redirected to a file or another process — the normal way an audit artifact is captured), the large JSON write is buffered asynchronously and can be truncated by the immediate `process.exit`. This directly contradicts this file's own docstring guarantee (lines 14-16): "the observable output is always available even as the exit code fires the loud signal... The full selection is still on stdout." The overflow case is exactly when the observable output matters most. Notably, `src/cli/index.ts:39` already uses the correct pattern (`process.exitCode = 1`), so the codebase knows the safe idiom — the risky path is the one handling the audit output.
**Fix:** Set the exit code and let the event loop drain stdout naturally instead of hard-exiting:
```typescript
if (result.budgetExceeded && result.budget) {
  process.stderr.write(
    `budget exceeded: used ${result.budget.used} tokens > limit ${result.budget.limit} ` +
      `(offenders: ${result.budget.offenders.join(", ")})\n`,
  );
  process.exitCode = 1; // NOT process.exit(1) — let stdout flush before exit
}
```

## Warnings

### WR-01: `exclude`-only triggers are silently ignored (always-in-phase bypasses exclude)

**File:** `src/select/select.ts:136-142` (`isEmptyTriggers`) and `:216-226` (always-in-phase branch)
**Issue:** `isEmptyTriggers` inspects only the positive axes (`taskType`/`keywords`/`paths`) and ignores `exclude`. A rule authored `triggers: { exclude: { taskType: ["docs"] } }` — "fire always, except for docs tasks" — has no positive axis, so `isEmptyTriggers` returns `true` and the rule is selected as `always-in-phase` on line 218 *before* `matchExclude` is ever consulted (line 237 is unreachable for this rule). The authored `exclude` is a silent no-op, violating D-02's "exclude wins." The frontmatter schema permits exclude-only triggers, so nothing warns the author. This errs toward over-injection (the safe direction), which is why it isn't a BLOCKER — but it silently discards authored governance intent. The property test does not catch it: `passesAllGatesIndep` (`select.property.test.ts:221-225`) shares the identical blind spot (`if (empty) return true` before checking exclude), so the independent cross-check re-encodes the same assumption.
**Fix:** Either apply `exclude` in the always-in-phase branch, or forbid exclude-without-positive in the schema. Preferred (honor intent):
```typescript
if (isEmptyTriggers(record.triggers)) {
  if (matchExclude(record.triggers.exclude, signal)) {
    skipped.push({ id: record.id, severity: record.severity,
      reason: "out-of-scope-by-trigger", detail: "matched-then-excluded" });
    continue;
  }
  selected.push({ /* always-in-phase */ });
  continue;
}
```
Update `passesAllGatesIndep` in the property test to match, so it remains a genuine cross-check.

### WR-02: `aggregate()` silently drops expected ids with unknown severity — the critical gate can pass vacuously

**File:** `src/select/eval-harness.ts:149-151` (`if (sev) bySeverity[sev].push(key)`), with `:154-156` and `subsetRecall` `:100-111`
**Issue:** When `severityById.get(id)` is `undefined` (an expected id that is not a winner in the built index — a typo, or a rule renamed without updating the case), the occurrence is silently skipped and never enters `bySeverity`. Combined with `subsetRecall` returning `1` for an empty subset (line 100) and `microRecall` returning `1` for a zero denominator (line 155), a mislabeled *critical* expected id can leave `bySeverity.critical` empty → `criticalRecall === 1.0` → the build-gating assertion passes even though a critical rule never fired. This is the exact "wrong recall calc lets the 100%-critical gate pass falsely" risk. It is currently mitigated only by a *separate* file (`eval-fixtures.test.ts` asserts every `expectedRuleId` resolves to a winner); the harness itself has no internal defense. If that fixtures test is skipped, removed, or the corpus is swapped, the gate silently weakens.
**Fix:** Make the harness self-defending — throw on an expected id absent from the index rather than dropping it:
```typescript
for (const id of r.expectedIds) {
  const sev = severityById.get(id);
  if (!sev) {
    throw new Error(
      `eval case '${r.name}' expects id '${id}' not present in the index — ` +
        `a mislabeled expected id must not silently pass the recall gate`,
    );
  }
  const key = `${r.name}::${id}`;
  caseOf.set(key, r.name);
  bySeverity[sev].push(key);
}
```

### WR-03: `aggregate()` assumes case-name uniqueness; a duplicate name corrupts severity recall

**File:** `src/select/eval-harness.ts:145-151` (`selectedByCase.set(r.name, ...)` and `caseOf.set(key, r.name)`)
**Issue:** Severity-partitioned recall is keyed by `r.name`. If two cases share a name, `selectedByCase.set(r.name, ...)` overwrites, so the first case's expected keys are checked against the *second* case's selection set in `subsetRecall`. This can flip individual hit/miss results and either falsely pass or falsely fail the critical gate. `eval-fixtures.test.ts:84-90` validates each `name` is a non-empty string but never asserts uniqueness, so duplicate names pass fixture integrity and silently corrupt the gate. (Micro recall is unaffected — `scoreCase` iterates `results` directly — which makes the divergence between the two recall figures easy to miss.)
**Fix:** Assert uniqueness when populating the map:
```typescript
if (selectedByCase.has(r.name)) {
  throw new Error(`duplicate eval case name '${r.name}' — case names must be unique for severity recall`);
}
selectedByCase.set(r.name, new Set(r.selectedIds));
```
Also add a fixtures assertion that `new Set(cases.map(c => c.name)).size === cases.length`.

### WR-04: CLI trusts `--index` JSON with a blind cast — no schema validation, unlike the signal

**File:** `src/cli/commands/select.ts:164-170` (`readIndex`) and `:114`
**Issue:** `readIndex` does `JSON.parse(raw) as RuleIndex` with no validation, while the signal on the same request path is rigorously validated by `validateSignal` (which the docstrings rightly justify as anti-under-injection). This asymmetry matters: a hand-edited or third-party `rule-index.json` with `phases: []` on a record makes `inPhase` return false → that rule is silently skipped `out-of-phase` (under-injection of a possibly critical rule) with no error. Other corruptions (missing `rules`, missing `triggers`) instead throw an opaque `TypeError` ("undefined is not iterable" / "cannot read properties of undefined") rather than a clear "malformed index." `validateIndex` already exists and is used by `build.ts:75`, so the loud-validation tool is available and unused here.
**Fix:** Validate the parsed index before selecting:
```typescript
import { validateIndex } from "../../index/validate-index.js";
function readIndex(indexPath: string): RuleIndex {
  const raw = readFileSync(path.resolve(indexPath), "utf8");
  const parsed = JSON.parse(raw) as RuleIndex;
  validateIndex(parsed); // fail loud on a malformed/corrupted index, mirroring validateSignal
  return parsed;
}
```

### WR-05: Dead `buildIndex` import; the documented directory→buildIndex fallback is not implemented and crashes

**File:** `src/cli/commands/select.ts:24` (import), `:111-114` and `:159-170` (docstrings)
**Issue:** `buildIndex` is imported but never called. Both the inline comment (lines 111-114: "Fall back to buildIndex only when the path is a directory") and the `readIndex` docstring (lines 159-163: "A directory is compiled on the fly via buildIndex") describe a developer-convenience fallback that does not exist. Pointing `--index` at a directory does not compile it — `readFileSync` throws `EISDIR`, which propagates as an uncaught error and crashes with a cryptic message rather than the promised behavior. Dead import plus documentation that lies about behavior.
**Fix:** Either implement the fallback or delete the import and correct the docs. To implement:
```typescript
import { statSync } from "node:fs";
function readIndex(indexPath: string): RuleIndex {
  const resolved = path.resolve(indexPath);
  if (statSync(resolved).isDirectory()) return buildIndex(resolved);
  return JSON.parse(readFileSync(resolved, "utf8")) as RuleIndex;
}
```
Otherwise remove the unused `buildIndex` import (line 24) and the fallback claims in both comments.

### WR-06: Superseded skip records discard scope/sourceFile and inherit the winner's severity — lossy audit trail

**File:** `src/select/select.ts:260-271`; contrast `src/types.ts:181-186` (`SkippedRule`) vs `:84-89` (`SupersededRecord`)
**Issue:** A superseded loser shares its winner's `id` (same-id cross-tier collision is the whole mechanism). When emitted as a skip, only `{ id, severity, reason }` is recorded, and `severity` is the *winner's* (the comment at 264-265 concedes `SupersededRecord` carries none). Two problems for AUDIT-02 traceability: (a) if the winner is selected, the same `id` appears in both `selected` and `skipped` with no `scope`/`sourceFile` to tell the two files apart — a reviewer cannot see which physical rule was dropped; (b) a `critical` enterprise rule superseded by a `low` project rule is recorded as `low` in the skip, mislabeling the dropped rule's severity. The source `SupersededRecord` (built in `scope.ts`) has exactly the `scope` and `sourceFile` that would disambiguate, but `SkippedRule` drops them. This also technically breaks the property test's stated "selected/skipped id-sets are disjoint" invariant for superseded ids — it only passes because the generated corpus has no collisions.
**Fix:** Carry the discriminating provenance through to the skip record (extend `SkippedRule` with optional `scope`/`sourceFile`, or reuse the loser's own fields from `SupersededRecord`):
```typescript
skipped.push({
  id: loser.id,
  severity: record.severity, // winner's, by necessity — note this in output
  reason: "superseded",
  detail: `${loser.scope}:${loser.sourceFile}`, // preserve which file was dropped
});
```

### WR-07: `--budget` accepts negative, zero, and exotic numeric strings via `Number()`

**File:** `src/cli/commands/select.ts:125-129`
**Issue:** `Number(values.budget)` guarded only by `Number.isFinite` accepts `""` → `0`, `"-5"` → `-5`, `"0x10"` → `16`, `"1e3"` → `1000`. A zero or negative budget makes `used > limit` true for any non-empty selection (and even for an empty selection when negative), silently flipping every request to `budgetExceeded` with a confusing exit 1. It fails loud (exit 1) so it isn't a BLOCKER, but a nonsensical budget should be rejected at parse time, not turned into a spurious overflow. (`readConfigBudget` at `:41-51` has the same gap — it accepts a negative `token_budget`.)
**Fix:** Require a non-negative integer:
```typescript
budget = Number(values.budget);
if (!Number.isInteger(budget) || budget < 0) {
  throw new Error(`--budget must be a non-negative integer (got '${values.budget as string}')`);
}
```

## Info

### IN-01: `DEFAULT_TOKEN_BUDGET = 2000` duplicated in two files

**File:** `src/select/select.ts:43` and `src/cli/commands/select.ts:30`
**Issue:** The same magic default lives in the core and the CLI. If one changes, they drift. Single-source it (export from `tokens.ts` or `select.ts` and import in the CLI) so the fallback and the CLI default cannot diverge.

### IN-02: `--format` is not validated; any non-`text` value silently falls back to JSON

**File:** `src/cli/commands/select.ts:102-103` and `:142-146`
**Issue:** `--format xml` or a typo like `--format jsonn` silently produces JSON instead of failing loud, inconsistent with the `--phase` check that throws on an unknown value. Validate against `["json", "text"]` and throw otherwise, matching the fail-loud ethos.

### IN-03: A whitespace-only trigger keyword becomes a match-everything wildcard after `trim()`

**File:** `src/select/select.ts:70-82` (`matchKeywords`)
**Issue:** The schema enforces `minLength: 1` on the raw keyword, but a value like `"   "` (length 3) passes, and after `trig.trim().toLowerCase()` becomes `""`. `haystack.includes("")` is always `true`, so such a keyword matches every signal keyword (over-injection). Errs in the safe direction, but it's a latent authoring footgun. Consider skipping empty-after-trim trigger tokens, or tightening the schema pattern to reject all-whitespace.

### IN-04: `domainName()` uses `lastIndexOf("domain")` — fragile for a domain literally named "domain"

**File:** `src/select/select.ts:161-166`
**Issue:** The domain sub-name is derived by finding the last `"domain"` path segment and taking the next one. For a domain rule whose sub-name is itself `"domain"` (`.../domain/domain/rule.md`), `lastIndexOf` locks onto the sub-name segment and returns the *filename* instead, so `inScope` compares the wrong string against `config.domains` → the rule is marked `out-of-scope` and dropped (under-injection). Pathological and absent from the corpus, hence Info, but under-injection is the project's #1 risk. `select()` only has the repo-relative `sourceFile`, not the build root, so the tier position is ambiguous; consider carrying the domain sub-name explicitly on the index record at build time rather than re-deriving it here.

### IN-05: `types.ts` comment claims the core leaves `budgetExceeded`/`budget` unset — now stale

**File:** `src/types.ts:194-203` vs `src/select/select.ts:284-298`
**Issue:** The `SelectionResult` doc says "the 02-02 core leaves them unset," but `select()` now always populates `budgetExceeded` and `budget` (falling back to the default limit). Harmless behavior, stale documentation — update the comment so a future reader doesn't treat the fields as optional-in-practice.

### IN-06: Doc says "CLI/harness boundary validates" but the harness doesn't call `validateSignal`

**File:** `src/select/eval-harness.ts:81-93` (`runCases`) vs `src/select/select.ts:6-11` and `:190-195` docstrings
**Issue:** `select()`'s comments state it stays pure because "the CLI/harness boundary validates." The CLI does (`validateSignal`), but `runCases` passes cast-only fixture signals straight into `select()`. A malformed fixture (e.g., missing `keywords`) would crash `select()` in `matchKeywords` (`for (const sig of signal.keywords)` over `undefined`) rather than being rejected. Test-only exposure, but the doc claim is half-true; either validate in `runCases` or soften the comment to "the CLI validates; the harness trusts fixture integrity tests."

---

## Cross-file notes (deep pass)

- **Determinism (SEL-01): clean.** No `Date`/`Math.random`/Set-iteration reliance in `select()`; both output arrays are sorted by `byId`, and same-id skip pairs (superseded winner + loser) stay deterministic under Node 22's stable sort because the main loop always precedes the superseded loop. `build.ts:69` uses `new Date()` for `generatedAt`, but `select()` never reads it, so selection output is clock-independent.
- **Total accounting (SEL-04): clean.** `|selected| + |skipped| === |index.rules| + Σ superseded` holds by construction — every `index.rules` entry lands in exactly one bucket, every `superseded[]` loser adds one skip.
- **Recall math (`scoreCase`/`subsetRecall`): arithmetically correct.** Set-based tp/fp/fn is right; the `key.slice(caseName.length + 2)` id recovery is robust even when ids or case names contain `::` (it slices by length, not by searching the separator). The gate's integrity risk is not the math — it's the two delegated invariants in WR-02 and WR-03.
- **Budget (SEL-05): the core never truncates** (confirmed — it only sums and flags; `selected` is never sliced), so the no-drop guarantee holds in the pure function. The loud-signal delivery is where it breaks, at the CLI boundary (CR-02).

---

_Reviewed: 2026-07-05T16:46:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
