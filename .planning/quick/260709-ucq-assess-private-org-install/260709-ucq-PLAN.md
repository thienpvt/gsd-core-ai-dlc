---
phase: 260709-ucq-assess-private-org-install
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md
  - README.md
  - docs/onboarding.md
autonomous: true
requirements:
  - ORG-01
  - ORG-02
  - ORG-03
  - ORG-04
must_haves:
  truths:
    - Assessment artifact states satisfied/gap for each of 4 org requirements with evidence paths
    - Install docs no longer claim public registry ownership of @opengsd/gsd-aidlc-overlay
    - Install docs describe private git / local path install that works after gsd-core is present
    - package.json name is unchanged
  artifacts:
    - .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md
    - README.md
    - docs/onboarding.md
  key_links:
    - ASSESSMENT.md verdict drives whether install docs are rewritten (gap confirmed → fix)
    - README.md Installation section points at same private path as docs/onboarding.md
---

<objective>
Assess whether current project state meets private/self-hosted org install model, write a clear satisfied/gap verdict, and fix install docs that falsely claim public npm package `@opengsd/gsd-aidlc-overlay`.

Purpose: Org needs leaders to own rules in private git, members to install via Node after gsd-core, without public-npm ownership claims this repo cannot honor.

Output: `260709-ucq-ASSESSMENT.md` verdict + corrected install path in README.md and docs/onboarding.md.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@package.json
@README.md
@docs/onboarding.md
@docs/rule-authoring.md
@.gsd/capabilities/aidlc-governance/capability.json
@aidlc-rules/enterprise/require-mfa.md

Known facts (do not re-verify via npm unless needed):
- `npm view @opengsd/gsd-aidlc-overlay` → E404 (not published)
- `@opengsd` npm org owned by open-gsd maintainers, not this repo owner (thienpvt)
- Repo: github.com/thienpvt/gsd-core-ai-dlc
- Rule scopes: enterprise | domain | project under aidlc-rules/; precedence project > domain > enterprise
- Rule authoring guide exists and is runnable
- Capability + 6 hooks wired; consent via `gsd-tools capability install`
- GSD Core keeps `.planning/` STATE/CONTEXT across sessions; this overlay injects governance summaries into that loop
- Org policy: rules/workflows in private git, not public npm; members already install gsd-core via Node
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write private-org install assessment verdict</name>
  <files>.planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md</files>
  <read_first>
    - package.json (name @opengsd/gsd-aidlc-overlay, not published)
    - README.md Installation section (claims `npm install @opengsd/gsd-aidlc-overlay`)
    - docs/onboarding.md Installation section (same claim)
    - docs/rule-authoring.md (leader custom rules: scopes + frontmatter)
    - .gsd/capabilities/aidlc-governance/capability.json (6 loop hooks)
    - aidlc-rules/ layout (enterprise/domain/project)
  </read_first>
  <action>
    Create `260709-ucq-ASSESSMENT.md` in the quick dir. Structure:

    1. **Org model** — one short paragraph: private/self-hosted governance overlay; rules in git; install via Node after gsd-core; no public npm ownership required.

    2. **Requirement matrix** — table with columns: ID | Requirement | Verdict (SATISFIED / GAP / PARTIAL) | Evidence | Minimal fix.
       Map these four requirements exactly:
       - **ORG-01** Team leaders define custom governance rules for GSD workload.
         Expected: SATISFIED — `docs/rule-authoring.md` + `aidlc-rules/{enterprise,domain,project}/` + project&gt;domain&gt;enterprise precedence + frontmatter schema.
       - **ORG-02** Rules/workflows live in git, self-hosted/private (not public npm as source of truth).
         Expected: PARTIAL — source of truth is already git (`aidlc-rules/`, `.gsd/capabilities/`, skills/hooks). GAP is distribution docs that claim public npm package which is unpublished and outside this owner's npm org.
       - **ORG-03** Members install easily via Node after gsd-core.
         Expected: PARTIAL — real path is clone/private-git or local `file:`/`npm install` in repo + `npm run build` + `gsd-tools capability install`. Docs currently lead with broken public install command.
       - **ORG-04** AI-DLC provides rules/workflows; GSD Core keeps multi-session context.
         Expected: SATISFIED — overlay selection/injection + capability hooks; GSD Core `.planning/` STATE/CONTEXT survives sessions; selection state under `.planning/governance/`.

    3. **Overall verdict** — one line: e.g. "PARTIAL — capability model fits private org; install docs misclaim public npm."

    4. **Minimal fix list** — bullet list only for real gaps:
       - Rewrite README.md + docs/onboarding.md install to private git / local path (Task 2).
       - Do NOT rename package.json name.
       - Do NOT invent publish pipeline or claim `@opengsd` ownership.
       - Optional note: package name `@opengsd/gsd-aidlc-overlay` is aspirational / unowned on public npm; private install does not need that scope.

    5. **Out of scope** — no publish workflow, no package rename, no private registry infra scaffolding, no capability code changes.

    Keep the file short and scannable. Cite concrete paths, not vague claims.
  </action>
  <verify>
    <automated>test -f .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md &amp;&amp; grep -E "ORG-0[1-4]" .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md | grep -c "ORG-0" | grep -qE '^[4-9]'</automated>
  </verify>
  <done>
    Assessment file exists, covers ORG-01..ORG-04 with verdicts + evidence + minimal fixes, overall PARTIAL with install-docs gap called out.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix install docs to private git/local path</name>
  <files>README.md, docs/onboarding.md</files>
  <read_first>
    - .planning/quick/260709-ucq-assess-private-org-install/260709-ucq-ASSESSMENT.md (verdict + fix list)
    - README.md (full Installation section)
    - docs/onboarding.md (Prerequisites + Installation through Consent Flow)
    - package.json (engines, bin, name — leave name unchanged)
  </read_first>
  <action>
    Gap confirmed on public-npm install claims. Rewrite install instructions only — no package rename, no publish pipeline.

    **README.md Installation section:**
    - Remove primary command `npm install @opengsd/gsd-aidlc-overlay` as the public-registry path.
    - Lead with private/self-hosted install that matches org model, after gsd-core is already installed:
      1. Obtain this repo via private git clone (org-hosted) or local checkout.
      2. From repo root: `npm install` then `npm run build`.
      3. Optional consumer-project install via local path / git URL examples (keep short):
         - local path: `npm install /path/to/gsd-core-ai-dlc` or `npm install file:../gsd-core-ai-dlc`
         - private git: `npm install git+ssh://git@&lt;org-host&gt;/&lt;team&gt;/gsd-core-ai-dlc.git` (placeholder host — do not invent a fake public URL as the only path)
      4. Point to Onboarding Guide for consent + first-run.
    - Add one short note: package name `@opengsd/gsd-aidlc-overlay` is the in-repo package name; it is **not** published to the public npm registry under `@opengsd` (that scope is owned by open-gsd maintainers). Private git / local install does not require public npm ownership.
    - Keep Development section (`npm install` / `npm run build` / `npm test`) as-is unless it still implies public publish.

    **docs/onboarding.md Installation section:**
    - Rename/reframe "### 1. Install the published overlay" — it must not say "published" or lead with public `npm install @opengsd/gsd-aidlc-overlay`.
    - Replace with private/self-hosted steps aligned with README:
      - Prerequisites stay: Node &gt;=22, npm &gt;=10, GSD Core (`@opengsd/gsd-core` / `gsd-tools`) already installed.
      - Step 1: get overlay from private git or local checkout (org source of truth).
      - Step 2: `npm install` + `npm run build` in the overlay repo (or install into consumer via `file:` / private git URL, then ensure build output exists).
      - Step 3: keep existing capability registration guidance (GSD registers from `.gsd/capabilities/aidlc-governance/capability.json`).
    - Keep Consent Flow (CB-3) and First-Run Smoke Check content intact — only install path wording changes.
    - Same aspirational/unowned package-name note as README (once, short).

    **Constraints:**
    - Do NOT change `package.json` `name`.
    - Do NOT add CI publish jobs, private registry setup guides, or ownership claims over `@opengsd` on public npm.
    - Do NOT claim `npm install @opengsd/gsd-aidlc-overlay` works from the public registry.
    - Prefer shortest truthful docs over inventing infra.
    - After edit, `grep` both files: zero hits for a bare public-install instruction that presents `npm install @opengsd/gsd-aidlc-overlay` as a working public-registry command (mentioning the name only inside the "not published / aspirational" note is OK).
  </action>
  <verify>
    <automated>grep -n "npm install @opengsd/gsd-aidlc-overlay" README.md docs/onboarding.md | grep -viE "not published|aspirational|does not|do not|never|unown|no public|not a public" ; test "$(grep -c 'npm install @opengsd/gsd-aidlc-overlay' README.md docs/onboarding.md || true)" -eq 0 || grep -nE 'not published|aspirational|private git|file:' README.md docs/onboarding.md | head -20</automated>
  </verify>
  <done>
    README.md and docs/onboarding.md describe private git / local / file: install; no working public-registry install claim; package.json name untouched; consent and smoke-check sections preserved.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| public docs → installer | Docs that claim a public package can mislead members into untrusted or failing installs |
| private git → member machine | Org-hosted source is the intended trust root for rules/workflows |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260709-ucq-01 | Spoofing | README/onboarding install command | medium | mitigate | Remove false public npm install; document private git/local as source of truth |
| T-260709-ucq-02 | Tampering | package name vs public registry | low | accept | Name left as-is; docs note scope is unowned publicly — private install does not depend on it |
| T-260709-ucq-SC | Tampering | npm/pip/cargo installs | high | accept | No new package installs in this quick task (docs-only) |
</threat_model>

<verification>
- Assessment covers ORG-01..04 with evidence paths
- Install docs match private/self-hosted model
- `package.json` name unchanged
- No public-registry install presented as working
</verification>

<success_criteria>
- `260709-ucq-ASSESSMENT.md` written with clear PARTIAL overall verdict and minimal fix list
- README.md + docs/onboarding.md install paths are private git / local / file:
- Org model (rules in git, Node install after gsd-core, AI-DLC overlay + GSD multi-session context) documented as satisfied where already true
</success_criteria>

<output>
Create `.planning/quick/260709-ucq-assess-private-org-install/260709-ucq-SUMMARY.md` when done
</output>
