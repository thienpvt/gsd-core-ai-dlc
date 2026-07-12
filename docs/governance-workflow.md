# GSD Governance Overlay — Workflow Guide

Operate the five governance CLI commands and the audit/ship gate chain. Use this guide as the command reference for building the rule index, selecting summaries, injecting context, loading detail on demand, and running selection-quality evals.

## Overview

| Command | Purpose |
| --- | --- |
| `governance build-index [--root <dir>] [--out <file>]` | Build `rule-index.json` from Markdown rules. |
| `governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]` | Select matching rule summaries for one task signal. |
| `governance inject [--input <file>]` | Render a `<governance>` fragment from a `SelectionResult`. |
| `governance rule-detail <id> [--index <f>]` | Print one rule's full body, or its summary-only fallback when no detail file exists. |
| `governance eval <phaseNumber> [--json]` | Run the labeled recall/precision corpus and persist eval evidence. |

## TaskSignal Input Format

Create task signals as JSON:

```json
{ "taskType": "feature", "keywords": ["auth", "mfa"], "paths": ["src/auth/login.ts"] }
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `taskType` | enum | yes | One of `feature`, `bugfix`, `refactor`, `docs`, `test`, `infra`, `security`, `data`. Matched by enum equality. |
| `keywords` | string array | yes | Pre-tokenized prose terms. There is no free-form text field; callers pre-tokenize prose into keywords. |
| `paths` | string array | yes | Repo-relative POSIX paths, matched by rule path globs. |

`additionalProperties` is false. Unknown fields fail validation instead of silently under-injecting governance.

## Commands

### build-index

Signature:

```bash
governance build-index [--root <dir>] [--out <file>]
```

Flags:

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--root` | string | `aidlc-rules` | Rule-pack root directory to scan. |
| `--out` | string | `rule-index.json` | Output index file. |

Example:

```bash
node bin/governance.cjs build-index
```

Sample output:

```text
build-index: wrote rule-index.json (1 rule) from aidlc-rules
```

Exit codes:

- `0` — success.

### select

Signature:

```bash
governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]
```

Flags:

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--phase` | string | required | One of `inception`, `construction`, `operations`, `common`. |
| `--index` | string | `rule-index.json` | Index JSON file, or a directory for developer-convenience build. |
| `--input` | string | stdin | TaskSignal JSON file. Reads stdin when absent. |
| `--domains` | string | empty | Comma-separated active domain subscriptions. |
| `--budget` | string parsed as non-negative integer | `.planning/config.json` `governance.token_budget`, else `2000` | Per-request governance token budget. |
| `--format` | string | `json` | `json` or `text`. |

Example:

```bash
echo '{"taskType":"feature","keywords":["auth"],"paths":[]}' | node bin/governance.cjs select --phase inception
```

Sample output:

```json
{
  "selected": [
    {
      "id": "require-mfa",
      "severity": "critical",
      "summary": "All privileged access requires multi-factor authentication.",
      "matchedAxis": "always-in-phase",
      "matchedValue": "always-in-phase"
    }
  ],
  "skipped": [],
  "budgetExceeded": false,
  "budget": {
    "used": 21,
    "limit": 2000,
    "offenders": []
  }
}
```

Exit codes:

- `0` — normal result emitted.
- `1` — budget exceeded; full result is still emitted before the non-zero signal.

### inject

Signature:

```bash
governance inject [--input <file>]
```

Flags:

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--input` | string | stdin | `SelectionResult` JSON file. Reads stdin when absent. |

Example:

```bash
node bin/governance.cjs select --phase inception --input task-signal.json | node bin/governance.cjs inject
```

Sample output:

```xml
<governance>
Selected governance rules for this task (summaries only). Run `governance rule-detail <id>` for a rule's full body.

- [critical] require-mfa: All privileged access requires multi-factor authentication. (run `governance rule-detail require-mfa` for the full rule)
</governance>
```

Exit codes:

- `0` — normal fragment emitted.
- `1` — budget exceeded; fragment is still emitted before the non-zero signal.

### rule-detail

Signature:

```bash
governance rule-detail <id> [--index <f>]
```

Positionals:

| Positional | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Rule id. Exactly one id is required. |

Flags:

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--index` | string | `rule-index.json` | Index JSON file, or a directory for developer-convenience build. |

Example:

```bash
node bin/governance.cjs rule-detail require-mfa
```

Sample output for the shipped `require-mfa` summary-only rule:

```text
All privileged access requires multi-factor authentication.

(no separate detail file for require-mfa — the summary above is the full rule)
```

Behaviors:

- A rule without `detailPath` prints its summary plus the no-detail message and exits `0`. `require-mfa` is the shipped example.
- A rule with `detailPath` resolves that single detail target and prints the Markdown body extracted by `gray-matter`.

Exit codes:

- `0` — success for both summary-only and detail-body cases.
- `1` — unknown rule id or invalid arity/flags.

### eval

Signature:

```bash
governance eval <phaseNumber> [--json]
```

Positionals:

| Positional | Type | Required | Description |
| --- | --- | --- | --- |
| `phaseNumber` | string | yes | Phase number used for persisted eval evidence paths. |

Flags:

| Flag | Type | Default | Description |
| --- | --- | --- | --- |
| `--json` | boolean | `false` | Emit JSON instead of markdown. |

Example:

```bash
node bin/governance.cjs eval 12
```

Sample output:

```markdown
# Selection Eval Report — Phase 12

Captured: 2026-07-09T00:00:00.000Z
Corpus hash: `...`

## Aggregate

- microRecall: 100.0%
- microPrecision: 66.7%
- recall by severity:
  - critical: 100.0%
  - high: 100.0%
  - medium: 100.0%
  - low: 100.0%

## Per-case TP/FP/FN
```

Exit codes:

- `0` — pass.
- `2` — critical-recall regression; evidence persisted before exit.
- `3` — parse/load error.

## End-to-End Worked Example

### 1. Build the index

```bash
node bin/governance.cjs build-index
```

```text
build-index: wrote rule-index.json (1 rule) from aidlc-rules
```

### 2. Create a task signal

```bash
cat > task-signal.json <<'JSON'
{ "taskType": "feature", "keywords": ["auth", "mfa"], "paths": ["src/auth/login.ts"] }
JSON
```

### 3. Select matching rules

```bash
node bin/governance.cjs select --phase inception --input task-signal.json > sel.json
```

```json
{
  "selected": [
    {
      "id": "require-mfa",
      "severity": "critical",
      "summary": "All privileged access requires multi-factor authentication.",
      "matchedAxis": "always-in-phase",
      "matchedValue": "always-in-phase"
    }
  ],
  "skipped": [],
  "budgetExceeded": false,
  "budget": {
    "used": 21,
    "limit": 2000,
    "offenders": []
  }
}
```

### 4. Inject the summary-only governance fragment

```bash
node bin/governance.cjs inject --input sel.json
```

```xml
<governance>
Selected governance rules for this task (summaries only). Run `governance rule-detail <id>` for a rule's full body.

- [critical] require-mfa: All privileged access requires multi-factor authentication. (run `governance rule-detail require-mfa` for the full rule)
</governance>
```

### 5. Load one rule detail on demand

`require-mfa` has no `detailPath`, so it prints its summary and a no-detail message:

```bash
node bin/governance.cjs rule-detail require-mfa
```

```text
All privileged access requires multi-factor authentication.

(no separate detail file for require-mfa — the summary above is the full rule)
```

### 6. Run the selection-quality eval

```bash
node bin/governance.cjs eval 12 --json
```

```json
{
  "phase": "12",
  "capturedAt": "2026-07-09T00:00:00.000Z",
  "aggregate": {
    "microRecall": 1,
    "microPrecision": 0.6666666666666666
  },
  "cases": [],
  "criticalMisses": [],
  "precisionOffenders": [],
  "corpusHash": "..."
}
```

`eval 12 --json` loads the **packaged** corpus from `@opengsd/gsd-aidlc-overlay/test/fixtures/eval/` (not the consumer tree) and persists evidence under the consumer project: `.planning/governance/eval/12.json` and `.planning/governance/eval/12-report.md`. Exit `0` means pass. Exit `2` means critical-recall regression with evidence still persisted. Exit `3` means parse/load error.

## Gate Chain (Audit + Ship)

### Audit gate

The `aidlc-governance-audit` skill fires at `verify:post` when `governance.enabled` is true. It writes `GOVERNANCE.md` into the phase directory:

```text
.planning/phases/{NN}-*/GOVERNANCE.md
```

The audit writer reads:

- `.planning/governance/selection-state.json`
- `CONTEXT.md`

It produces a machine-derived audit artifact from persisted selection state, not hand-written governance prose.

### capture-test-evidence

```text
governance capture-test-evidence <phaseNumber>
```

Runs `node --test --test-reporter=tap dist-test/**/*.test.js` from the **consumer cwd** and writes `.planning/governance/tests/{NN}.json`.

Consumer contract:

- Produce compiled tests under `dist-test/**/*.test.js` (or an equivalent layout that matches this glob).
- Runner output must include TAP `# tests N` with **N > 0**.
- Zero tests / empty glob / malformed output hard-fail and write **no** evidence file.

### Ship gate

The `aidlc-governance-ship` skill fires at `ship:pre` when `governance.enabled` is true. It blocks release on missing or failing plan/verify/eval evidence or unresolved approval.

Ship gate inputs:

| Evidence | Path |
| --- | --- |
| Plan gate evidence | `.planning/governance/gates/{NN}-plan.json` |
| Verify gate evidence | `.planning/governance/gates/{NN}-verify.json` |
| Eval evidence | `.planning/governance/eval/{NN}.json` |
| Audit artifact | `.planning/phases/{NN}-*/GOVERNANCE.md` |
| Approval state | `.planning/governance/approvals/{NN}.json` |

Ship gate outputs after required prior gates pass or waive:

- `.planning/governance/gates/{NN}-ship.json`
- `.planning/governance/approvals/{NN}.json`

The gate fails closed. Missing, malformed, or failed evidence blocks shipping.

For binding Java/Spring coverage report setup and verify evidence behavior, see [Java/Spring Coverage Gate](java-spring-coverage.md).

Next: [Rule Authoring Guide](rule-authoring.md)
