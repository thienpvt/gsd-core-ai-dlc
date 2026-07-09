# Private/Self-Hosted Org Install Assessment

## Org model

Private/self-hosted governance overlay. Team leaders author rules in git under `aidlc-rules/`. Members install via Node after GSD Core is present. Public npm ownership of `@opengsd` is not required and is not available to this repo.

## Requirement matrix

| ID | Requirement | Verdict | Evidence | Minimal fix |
|----|-------------|---------|----------|-------------|
| ORG-01 | Team leaders define custom governance rules for GSD workload | SATISFIED | `docs/rule-authoring.md`; `aidlc-rules/{enterprise,domain,project}/`; precedence project > domain > enterprise; frontmatter schema `src/schema/frontmatter.schema.json`; sample `aidlc-rules/enterprise/require-mfa.md` | None |
| ORG-02 | Rules/workflows live in git, self-hosted/private (not public npm as source of truth) | PARTIAL | Source of truth already git: `aidlc-rules/`, `.gsd/capabilities/aidlc-governance/capability.json`, `.claude/skills/aidlc-governance-*/`. Distribution docs claim public `npm install @opengsd/gsd-aidlc-overlay` which is unpublished (E404) and outside this owner's npm org | Rewrite install docs to private git / local path (Task 2) |
| ORG-03 | Members install easily via Node after gsd-core | PARTIAL | Real path: private-git clone or local checkout → `npm install` + `npm run build` → optional consumer `file:` / private git URL → `gsd-tools capability install`. Docs lead with broken public install command | Same install-doc rewrite as ORG-02 |
| ORG-04 | AI-DLC provides rules/workflows; GSD Core keeps multi-session context | SATISFIED | Overlay selection/injection + 6 capability hooks in `.gsd/capabilities/aidlc-governance/capability.json` (discuss/plan/execute/verify/audit/ship); GSD Core `.planning/` STATE/CONTEXT survives sessions; selection state under `.planning/governance/` | None |

## Overall verdict

**PARTIAL** — capability model fits private org; install docs misclaim public npm.

## Minimal fix list

- Rewrite `README.md` + `docs/onboarding.md` install to private git / local path / `file:` (Task 2).
- Do NOT rename `package.json` `name` (`@opengsd/gsd-aidlc-overlay`).
- Do NOT invent publish pipeline or claim `@opengsd` ownership on public npm.
- Optional note: package name is aspirational / unowned on public npm; private install does not need that scope.

## Out of scope

- No publish workflow
- No package rename
- No private registry infra scaffolding
- No capability code changes
