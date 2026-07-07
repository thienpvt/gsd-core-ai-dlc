# Phase 1: Rule-Pack Format & Index - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 1-Rule-Pack Format & Index
**Areas discussed:** Trigger model, Summary vs detail, Store & scope, Severity & binding

---

## Trigger model

### What the `triggers` field looks like

| Option | Description | Selected |
|--------|-------------|----------|
| Structured multi-axis | `triggers: { taskType, keywords, paths }`; fires if any populated axis matches. Highest recall + most auditable. | ✓ |
| Flat keyword list | `triggers: [auth, login, jwt]`. Simplest, closest to AI-DLC prose; recall hinges entirely on keyword overlap. | |
| Keywords + always flag | Flat keywords plus `alwaysInPhase: true` escape hatch. Lighter than full predicates. | |

**User's choice:** Structured multi-axis
**Notes:** Chosen for recall (multiple independent ways for a critical rule to fire) and auditability (the reason names which axis hit).

### How axes combine

| Option | Description | Selected |
|--------|-------------|----------|
| OR, no exclusion | Fires if any populated axis matches; no suppression once any axis hits. | |
| OR + optional exclude | OR across axes plus an optional `exclude` block; exclusion wins over any positive match. | ✓ |
| AND across axes | Fires only if all populated axes match. Highest precision, worsens under-injection risk. | |

**User's choice:** OR + optional exclude
**Notes:** Keeps recall high while letting authors kill known false-positives (e.g. exclude `**/*.test.*`).

### Meaning of an empty triggers block

| Option | Description | Selected |
|--------|-------------|----------|
| Empty = always-in-phase | Rule with no populated axes fires for every task whose phases + scope match — the always-on escape hatch. | ✓ |
| Empty = build error | Must populate at least one axis or index-build rejects it. | |
| Empty = never fires | Empty triggers means the rule never fires — a silent footgun. | |

**User's choice:** Empty = always-in-phase
**Notes:** A critical rule writes empty triggers to guarantee it never misses within its phase/scope. Phase + scope still bound it.

### How a keyword matches task signals

| Option | Description | Selected |
|--------|-------------|----------|
| Case-insensitive substring | Matches if keyword appears as substring in normalized task signal. Broadest recall, fully deterministic. | ✓ |
| Whole-token match | Matches only as a whole token (word boundary). Fewer false positives, misses morphological variants. | |
| Substring + regex opt-in | Substring default, keyword can opt into regex. Max control, harder to audit. | |

**User's choice:** Case-insensitive substring
**Notes:** taskType = enum equality, paths = picomatch globs; keywords were the open axis. Over-injection is the cheaper failure than under-injection.

---

## Summary vs detail

### Where full detail lives (`detailPath` target)

| Option | Description | Selected |
|--------|-------------|----------|
| Body = detail (self-contained) | One `.md` per rule; frontmatter `summary` + Markdown body as detail. No dangling-pointer bugs. | |
| Separate detail file | Rule file + separate detail `.md` (mirrors AI-DLC rules/ vs rule-details/ split). | ✓ |
| Body default, path override | Body is default detail, `detailPath` may override to a shared doc. Two code paths. | |

**User's choice:** Separate detail file
**Notes:** Mirrors AI-DLC's `aws-aidlc-rules/` vs `aws-aidlc-rule-details/` corpus split.

### Is `detailPath` mandatory?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional (summary-only OK) | `detailPath` optional; `rule-detail <id>` on a summary-only rule returns the summary or a "no detail" signal. | ✓ |
| Required on every rule | Every rule must name a `detailPath` that exists at build time. | |
| Required by severity | Required for binding/critical/high, optional otherwise. | |

**User's choice:** Optional (summary-only OK)
**Notes:** Matches AI-DLC, where details are conditionally referenced. First selected "Required on every rule" by accident; re-asked and chose Optional.

### Handling a missing `detailPath` target

| Option | Description | Selected |
|--------|-------------|----------|
| Build fails on missing target | Named-but-missing/empty target fails the build loudly with rule id + bad path. | ✓ |
| Warn, degrade to summary | Missing target is a warning; rule indexes but degrades to summary-only. | |
| Format-only, no existence check | Only validate path format; existence is Phase 3's problem at load time. | |

**User's choice:** Build fails on missing target
**Notes:** Consistent with PACK-03's fail-loud-not-silent stance.

### How `detailPath` resolves to a file

| Option | Description | Selected |
|--------|-------------|----------|
| Relative to rule file | Resolves relative to the declaring rule file; survives relocating a pack subtree. | ✓ |
| Relative to store root | Resolves from a single rule-store root; breaks if a subtree moves. | |
| Repo-root absolute | Repo-relative path from project root; verbose and brittle. | |

**User's choice:** Relative to rule file
**Notes:** Matches `$ref`/import conventions.

---

## Store & scope

### What determines a rule's scope

| Option | Description | Selected |
|--------|-------------|----------|
| Directory is source of truth | Scope from top-level dir; frontmatter `scope` validated against dir (build fails on mismatch). | ✓ |
| Frontmatter field is truth | Scope from frontmatter `scope`; directory cosmetic. Location can lie about scope. | |
| Directory + redundant field | Directory sets scope; optional frontmatter `scope` must match. Belt-and-suspenders. | |

**User's choice:** Directory is source of truth
**Notes:** Matches ESLint/Prettier positional-config convention. No drift, scope greppable by path.

### Same-`id`-across-scopes resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Full replace, record superseded | Higher-scope rule wins whole; loser recorded as `superseded` (feeds Phase 5 skip-reason enum). | ✓ |
| Full replace, drop loser | Winner-takes-all but superseded rule dropped entirely; no audit trail. | |
| Field-level merge | Higher scope overrides field-by-field; produces composite rules no single file describes. | |

**User's choice:** Full replace, record superseded
**Notes:** Cleanest audit story — one winner, one reason, loser still traceable.

### Where the rule store lives

| Option | Description | Selected |
|--------|-------------|----------|
| aidlc-rules/ at repo root | `enterprise/`, `domain/<name>/`, `project/` tiers; details under `<scope>/.../details/`. Mirrors AI-DLC corpus name. | ✓ |
| Under .planning/governance/ | Same layout nested with governance state. Buries author-facing files under `.planning/`. | |
| Under .gsd/ | Same layout under `.gsd/`. Risks looking like modifying the host runtime. | |

**User's choice:** aidlc-rules/ at repo root
**Notes:** `domain/<name>/` subdivision is what Phase 2's scope-glob (`project:payments-*`) globs against.

### `id` format and uniqueness

| Option | Description | Selected |
|--------|-------------|----------|
| Author-defined slug | Globally unique slug; duplicate within a scope fails build; same id across scopes = override signal. | ✓ |
| Derived from path | Builder derives id from scope+domain+filename; breaks the override model. | |
| Slug + derived namespace | Bare slug + domain namespace; two identities per rule. | |

**User's choice:** Author-defined slug
**Notes:** Human-readable in audit lines; author controls the name.

---

## Severity & binding

### The `severity` enum

| Option | Description | Selected |
|--------|-------------|----------|
| critical/high/medium/low | Matches SAST/scan tools (bandit/checkov/grype) and roadmap's critical/high language. | ✓ |
| + info rung | Adds `info` rung; overlaps heavily with `advisory` classification. | |
| error/warning/info | Linter-style; doesn't match roadmap or SAST tool language. | |

**User's choice:** critical/high/medium/low
**Notes:** Phase 2 targets 100% recall on `critical`, `high` a second threshold.

### How advisory/binding relates to severity

| Option | Description | Selected |
|--------|-------------|----------|
| Independent axes | `severity` and `classification` separate required fields, freely combined. | ✓ |
| Severity implies binding | Severity above a threshold implies binding; forces contracts on critical rules even without gates. | |
| Classification only | Only advisory/binding; severity derived. Loses critical-vs-high granularity Phase 2 needs. | |

**User's choice:** Independent axes
**Notes:** Matches how lint/scan tools separate importance from enforcement. A critical rule can be advisory; a low rule can be binding.

### How frontmatter references an enforcement contract (v1)

| Option | Description | Selected |
|--------|-------------|----------|
| Named contract id, existence-check deferred | `enforcement: <contract-id>` free-form string; build rejects binding-without-it but doesn't resolve against a registry (v2). | ✓ |
| Structured adapter + ref object | `enforcement: { adapter, ref }`; commits to adapter taxonomy before ENF-03 designs it. | |
| Validated against a contract registry | Enum validated against a checked-in registry; pulls ENF-02/03 forward into Phase 1. | |

**User's choice:** Named contract id, existence-check deferred
**Notes:** Clean v1/v2 seam — v1 enforces "you named a contract"; v2 enforces "the contract exists and ran."

---

## Claude's Discretion

Areas left to research/planning to resolve within the locked decisions:
- Concrete `taskType` enum values (shape locked as enum-by-equality; members not decided).
- What a task "signal" contains at selection time and how `paths` are sourced per task (Phase 2 concern).
- Whether the `phases` field reuses GSD phase identifiers or AI-DLC Inception/Construction/Operations vocabulary.
- Exact JSON Schema structuring (single vs. per-scope) and frontmatter parser choice (`gray-matter` vs GSD's `js-yaml`).

## Deferred Ideas

- **Summary length cap for the token budget** — belongs with Phase 2 token-budget work (SEL-05).
- **Body/detail checksum in the index** — stale-detail detection; out of scope for v1 format.
- **Project-scope consent flow** — already owned by Phase 4 (04-03); noted to avoid re-litigation.
