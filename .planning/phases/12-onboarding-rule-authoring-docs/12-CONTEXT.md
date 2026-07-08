# Phase 12: Onboarding & Rule-Authoring Docs - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Three user-facing documentation deliverables (onboarding, governance-workflow usage, rule-authoring guide) that let an end user install + consent-activate + first-run the overlay, operate the core governance CLI workflow end-to-end, and let a rule author write + integrate + verify a new governance rule — all by following documentation alone. Deliverables are discoverable from the repo root and cross-reference each other (install → operate → author).

</domain>

<decisions>
## Implementation Decisions

### Doc Location & Discoverability
- 3 deliverables live in a `docs/` directory at repo root: `docs/onboarding.md`, `docs/governance-workflow.md`, `docs/rule-authoring.md`
- `README.md` gains a "Documentation" section linking to the 3 files — single root entry point
- Format: Markdown (`.md`) — matches repo corpus (rules, planning, CLAUDE.md all MD)
- Cross-reference: each doc ends with "Next: → [link]" pointing to the next in install→operate→author flow

### Onboarding Doc Content (DOC-01)
- Prerequisites: Node >=22, npm >=10 (from package.json `engines`), GSD Core installed (`@opengsd/gsd-core`)
- Install steps: `npm install @opengsd/gsd-aidlc-overlay`, `npm run build`, then the `gsd-tools` installer hook registers the capability + skills
- CB-3 consent flow documented: what triggers it, how to grant (`.planning/config.json` `governance.enabled` / capability consent), which hooks activate (discuss/plan/execute/verify/ship)
- First-run smoke check: concrete runnable chain — `governance build-index` → `governance select --phase inception --input <sample-signal>` → assert non-empty selection output proves governance active

### Workflow Usage Doc (DOC-02)
- Command coverage: all 5 CLI commands + gate chain — `build-index`, `select`, `inject`, `rule-detail`, `eval`, plus audit (`GOVERNANCE.md`) and ship gate chain
- Per-command structure: signature + flags table + concrete copy-pasteable example + sample output + exit codes
- One end-to-end worked example: build-index → select (sample `task-signal.json`) → inject → rule-detail → eval, as a single top-to-bottom narrative
- TaskSignal input format: documented as a sample `task-signal.json` (`taskDescription`, `phase`, `taskType`, `paths`, `domains`) the user can copy

### Rule-Authoring Guide (DOC-03)
- Frontmatter fields: all 7 (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`) + `classification: advisory|binding` (actual frontmatter uses `classification`; JSON Schema maps it to `x-binding`)
- Scope placement: 3 scope dirs `enterprise/` < `domain/` < `project/` (project wins on conflict), with precedence documented
- Trigger axes: all 3 with examples — `keywords` (string array), `taskType` (enum match), `paths` (picomatch globs, `dot:true` includes dot-prefixed paths)
- Verify-the-rule-fires: concrete loop — author rule → `governance build-index` → `governance select --phase <rule.phase> --input <matching-signal>` (assert rule appears, positive) → `--input <non-matching-signal>` (assert absent, negative) → `governance eval` for corpus regression

### Claude's Discretion
Exact prose tone, section ordering within each doc, example values (sample task descriptions, sample rule IDs), and the specific sample TaskSignal payloads — all at Claude's discretion, guided by the verified CLI signatures + the existing sample rule `aidlc-rules/enterprise/require-mfa.md` as the canonical format reference.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/governance.cjs` → published `governance` binary (package `@opengsd/gsd-aidlc-overlay` v0.1.0)
- CLI dispatcher `src/cli/index.ts` lazy-loads 5 subcommands: `build-index`, `select`, `inject`, `rule-detail`, `eval`
- Sample rule `aidlc-rules/enterprise/require-mfa.md` — canonical frontmatter format (`id, scope, triggers, phases, severity, summary, classification`)
- `.gsd/capabilities/aidlc-governance/capability.json` — registers discuss/plan/execute/verify/ship hooks
- `.claude/skills/aidlc-governance-{discuss,plan,execute,verify,audit,ship}/SKILL.md` — skill surface
- Codebase maps: `.planning/codebase/{STACK,STRUCTURE,CONVENTIONS,INTEGRATIONS,ARCHITECTURE}.md` — authoritative reference for what the docs must describe

### Established Patterns
- CLI signatures (exact, from command files):
  - `governance build-index [--root <dir>] [--out <file>]` (defaults: `--root aidlc-rules`, `--out rule-index.json`)
  - `governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]`
  - `governance inject [--input <file>]`
  - `governance rule-detail <id> [--index <f>]`
  - `governance eval <phaseNumber> [--json]`
- All commands fail loud on unknown flags/stray positionals (`node:util parseArgs`, `allowPositionals:false`)
- `--phase` must be a known phase (VALID_PHASES); `--budget` must be non-negative integer
- Rule-pack changes require `governance build-index` to refresh `rule-index.json`
- Runtime config: `.planning/config.json` (`governance.token_budget` default 2000); capability config: `.gsd/capabilities/aidlc-governance/capability.json` (`governance.enabled` default true)

### Integration Points
- `docs/` directory (new) linked from `README.md` (new Documentation section)
- Docs reference `aidlc-rules/` (rule authoring target dir) and the 5 CLI commands
- Cross-references between the 3 docs install→operate→author

</code_context>

<specifics>
## Specific Ideas

Use `aidlc-rules/enterprise/require-mfa.md` as the canonical frontmatter format reference in the rule-authoring guide (it demonstrates all 7 fields + `classification: advisory`). Document `classification: advisory|binding` as the frontmatter field that maps to the JSON Schema `x-binding` annotation (Phase 7 enforcement boundary) — rule authors set it in frontmatter, not in the schema.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. OPS-01 (operations-phase governance) and ENF-05/06 (real scanner integrations / dynamic adapter loading) remain deferred from prior milestones, not this phase.

</deferred>