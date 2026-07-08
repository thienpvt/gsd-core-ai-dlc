# GSD Governance Overlay — Rule Authoring Guide

Write, integrate, and verify a new governance rule without loading full rule bodies into every prompt. Rules are Markdown files with YAML frontmatter; the index stores only frontmatter summaries and pointers.

## Frontmatter Fields

The contract is `src/schema/frontmatter.schema.json`. Unknown fields are rejected because `additionalProperties` is `false`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Kebab-case slug matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Globally unique across the rule store; the same id across scopes is an override signal. |
| `scope` | string enum | Yes | One of `enterprise`, `domain`, `project`. Must match the declaring directory; a post-parse check enforces directory/frontmatter agreement. |
| `triggers` | object | Yes | Selector object. Empty `{}` is valid and means always-in-phase. Axes OR-combine; `exclude` wins over any positive match. |
| `phases` | string array | Yes | Min 1, unique values. Items must be one of `inception`, `construction`, `operations`, `common`. `common` applies across phases. |
| `severity` | string enum | Yes | One of `critical`, `high`, `medium`, `low`. Independent of `classification`. |
| `summary` | string | Yes | Min length 1. One-line summary injected into context; keep it enough to guide behavior without needing the full body. |
| `classification` | string enum | Yes | One of `advisory`, `binding`. Rule authors set this frontmatter field; the enforcement boundary maps binding contracts to JSON Schema `x-binding` annotations. |
| `detailPath` | string | No | Min length 1. Relative to the declaring rule file. Omit for summary-only rules like `require-mfa`. |
| `enforcement` | string | Required only when `classification: binding` | Min length 1. Free-form contract id such as `semgrep:no-eval`, `ci:exit-code`, or `human-approval`. Required by the schema `allOf` if/then rule for binding rules. |

Trigger subfields:

| Field | Type | Values |
| --- | --- | --- |
| `triggers.keywords` | string array | Unique non-empty strings. |
| `triggers.taskType` | string array | Unique values from `feature`, `bugfix`, `refactor`, `docs`, `test`, `infra`, `security`, `data`. |
| `triggers.paths` | string array | Unique non-empty picomatch globs. |
| `triggers.exclude.keywords` | string array | Negative keyword selectors. |
| `triggers.exclude.taskType` | string array | Negative task type selectors using the same enum. |
| `triggers.exclude.paths` | string array | Negative path globs. |

## Scope Placement

Place rules under the source rule-pack store, `aidlc-rules/`:

- `aidlc-rules/enterprise/` — applies to all projects and all domains.
- `aidlc-rules/domain/<name>/` — applies only when the caller subscribes to that domain with `governance select --domains <name>`.
- `aidlc-rules/project/` — applies only to this project.

Precedence on duplicate `id`: `project > domain > enterprise`. The winning rule appears in `selected[]` or `skipped[]`; superseded losers are recorded as skipped with reason `superseded`.

The `scope` frontmatter value must match the declaring directory. Example: a file in `aidlc-rules/project/` must declare `scope: project`.

## Trigger Axes

Positive axes OR-combine: any match selects the rule after phase and scope pass. Negative `exclude` selectors win over any positive match.

### `keywords`

Matched as case-insensitive substring against any signal keyword.

```yaml
triggers:
  keywords:
    - auth
    - mfa
```

Matches a task signal containing `keywords: ["authentication"]` because `auth` is a substring.

### `taskType`

Matched by enum equality against the signal `taskType`.

```yaml
triggers:
  taskType:
    - security
    - infra
```

Valid values: `feature`, `bugfix`, `refactor`, `docs`, `test`, `infra`, `security`, `data`.

### `paths`

Matched as picomatch globs against signal paths with `dot: true`, so dot-prefixed paths such as `.github/` and `.env` are included.

```yaml
triggers:
  paths:
    - src/auth/**
    - .env*
```

### `exclude`

Negative selectors block selection even when a positive axis matched.

```yaml
triggers:
  keywords:
    - auth
  exclude:
    paths:
      - "**/*.test.ts"
```

### Empty triggers

```yaml
triggers: {}
```

Empty triggers mean always-in-phase. Use this escape hatch only for rules that must never miss after phase and scope pass.

## Worked Examples

### Example A — 6 base fields + classification, summary-only

`aidlc-rules/enterprise/require-mfa.md` is the canonical summary-only example. It has the 6 base required fields plus `classification: advisory`. It has no `detailPath`; do not use it as an all-fields example.

```markdown
---
id: require-mfa
scope: enterprise
triggers: {}
phases:
  - common
severity: critical
summary: All privileged access requires multi-factor authentication.
classification: advisory
---

## Rule ENT-01: Multi-Factor Authentication For Privileged Access

Every account holding elevated or administrative privilege must present a second
authentication factor before its session is granted. Single-factor credentials
alone are never sufficient to reach a privileged operation.

### Verification

Confirm the identity provider enforces a second factor for every role mapped to a
privileged scope, and that any break-glass account is time-boxed and audited.
```

Notes:

- `triggers: {}` means always-in-phase.
- `phases: [common]` applies in `inception`, `construction`, and `operations` selection.
- `classification: advisory` means Markdown guides the agent but does not name a binding gate contract.
- No `detailPath` means `governance rule-detail require-mfa` prints the summary plus `(no separate detail file for require-mfa — the summary above is the full rule)`.

### Example B — all 7 fields including `detailPath`

Use a specifically-triggered temp rule for verification. This example includes all seven rule authoring fields (`id`, `scope`, `triggers`, `phases`, `severity`, `summary`, `detailPath`) plus required `classification`.

`/tmp/verify-rules/enterprise/billing-review.md`:

```markdown
---
id: billing-review
scope: enterprise
triggers:
  keywords:
    - billing
phases:
  - construction
severity: high
summary: Billing changes require cost-impact review.
classification: advisory
detailPath: ./details/billing-review-detail.md
---

## Rule ENT-BILL: Billing Change Review

All billing-flow changes must be reviewed for cost impact.

### Verification

Confirm the cost-impact analysis is attached before merge.
```

`/tmp/verify-rules/enterprise/details/billing-review-detail.md`:

```markdown
## Rule ENT-BILL: Billing Change Review (detail)

Billing changes touch pricing, invoicing, or payment flows.

### Verification

Cost-impact analysis attached; finance sign-off recorded.
```

### Binding contrast

A binding rule must declare `enforcement`:

```yaml
classification: binding
enforcement: semgrep:no-eval
```

The schema accepts `classification: binding` only when `enforcement` is present. `enforcement` is a named contract id; this project ships tool-neutral adapter stubs rather than hard-coding any scanner vendor.

## Verify the Rule Fires

These steps prove a specifically-triggered rule fires for intended input and not otherwise. Do not use `require-mfa` for negative tests: it has `triggers: {}` and `phases: [common]`, so it is always-in-phase and selected for every valid signal.

Use `node bin/governance.cjs ...` inside this repository after `npm run build`. If installed globally/as a package, the same subcommands are available as `governance build-index`, `governance select --phase`, `governance rule-detail`, and `governance eval`.

### 1. Build the project

```bash
npm run build
```

### 2. Create a temp rule pack

```bash
TMP_RULES=$(mktemp -d)
mkdir -p "$TMP_RULES/enterprise/details"

cat > "$TMP_RULES/enterprise/billing-review.md" <<'RULE'
---
id: billing-review
scope: enterprise
triggers:
  keywords:
    - billing
phases:
  - construction
severity: high
summary: Billing changes require cost-impact review.
classification: advisory
detailPath: ./details/billing-review-detail.md
---

## Rule ENT-BILL: Billing Change Review

All billing-flow changes must be reviewed for cost impact.

### Verification

Confirm the cost-impact analysis is attached before merge.
RULE

cat > "$TMP_RULES/enterprise/details/billing-review-detail.md" <<'DETAIL'
## Rule ENT-BILL: Billing Change Review (detail)

Billing changes touch pricing, invoicing, or payment flows.

### Verification

Cost-impact analysis attached; finance sign-off recorded.
DETAIL
```

### 3. Build the temp index

```bash
node bin/governance.cjs build-index --root "$TMP_RULES" --out "$TMP_RULES/rule-index.json"
```

Expected output:

```text
build-index: wrote /tmp/verify-rules/rule-index.json (1 rule) from /tmp/verify-rules
```

Path text varies because `mktemp -d` creates a unique directory.

### 4. Positive select: matching keyword + phase

```bash
cat > "$TMP_RULES/match-signal.json" <<'JSON'
{ "taskType": "feature", "keywords": ["billing"], "paths": [] }
JSON

node bin/governance.cjs select \
  --phase construction \
  --index "$TMP_RULES/rule-index.json" \
  --input "$TMP_RULES/match-signal.json" \
  > "$TMP_RULES/match-output.json"

node -e "const fs=require('node:fs');const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(!o.selected.some(r=>r.id==='billing-review')){throw new Error('billing-review missing from selected[]')}" "$TMP_RULES/match-output.json"
```

Expected: `billing-review` appears in `selected[]` with `matchedAxis: "keywords"`.

### 5. Negative select: wrong keyword

```bash
cat > "$TMP_RULES/nomatch-signal.json" <<'JSON'
{ "taskType": "feature", "keywords": ["unrelated"], "paths": [] }
JSON

node bin/governance.cjs select \
  --phase construction \
  --index "$TMP_RULES/rule-index.json" \
  --input "$TMP_RULES/nomatch-signal.json" \
  > "$TMP_RULES/nomatch-output.json"

node -e "const fs=require('node:fs');const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(o.selected.some(r=>r.id==='billing-review')){throw new Error('billing-review unexpectedly selected')}if(!o.skipped.some(r=>r.id==='billing-review'&&r.reason==='out-of-scope-by-trigger')){throw new Error('billing-review missing from skipped[] with out-of-scope-by-trigger')}" "$TMP_RULES/nomatch-output.json"
```

Expected: `billing-review` does not appear in `selected[]`. It appears in `skipped[]` with reason `out-of-scope-by-trigger`.

Important: parse JSON and check `selected[].id`. Do not grep the whole output for `billing-review`, because skipped rules keep the same id.

### 6. Negative select: wrong phase

```bash
node bin/governance.cjs select \
  --phase inception \
  --index "$TMP_RULES/rule-index.json" \
  --input "$TMP_RULES/match-signal.json" \
  > "$TMP_RULES/wrong-phase-output.json"

node -e "const fs=require('node:fs');const o=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));if(o.selected.some(r=>r.id==='billing-review')){throw new Error('billing-review unexpectedly selected')}if(!o.skipped.some(r=>r.id==='billing-review'&&r.reason==='out-of-phase')){throw new Error('billing-review missing from skipped[] with out-of-phase')}" "$TMP_RULES/wrong-phase-output.json"
```

Expected: `billing-review` does not appear in `selected[]`. It appears in `skipped[]` with reason `out-of-phase`.

### 7. Optional detail fetch

```bash
node bin/governance.cjs rule-detail billing-review --index "$TMP_RULES/rule-index.json"
```

Expected: prints only `billing-review-detail.md` body. It does not prefetch other rule bodies.

### 8. Corpus regression

```bash
node bin/governance.cjs eval 12
```

This uses the shipped `test/fixtures/eval/` corpus, not the temp pack.

Exit codes:

- `0` — pass.
- `2` — critical-recall regression.
- `3` — parse, index, or load error.

### 9. Clean up

```bash
rm -rf "$TMP_RULES"
```

Next: [Onboarding Guide](onboarding.md)
