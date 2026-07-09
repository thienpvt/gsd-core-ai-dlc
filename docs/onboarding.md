# GSD Governance Overlay — Onboarding Guide

Install, consent-activate, and first-run the GSD Governance Overlay. The overlay extends GSD Core's Discuss → Plan → Execute → Verify → Ship loop with selected AI-DLC governance rule summaries and durable evidence.

## Prerequisites

- Node.js `>=22.0.0`
- npm `>=10.0.0`
- GSD Core installed (`@opengsd/gsd-core`), including `gsd-tools`

## Installation

Private/self-hosted install. Source of truth is your org git repo (or a local checkout), not the public npm registry.

> **Package name note:** in-repo name is `@opengsd/gsd-aidlc-overlay`. It is **not** published to the public npm registry under `@opengsd` (that scope is owned by open-gsd maintainers). Private git / local install does not require public npm ownership.

### 1. Get the overlay from private git or local checkout

```bash
# org-hosted private git
git clone <org-host>/<team>/gsd-core-ai-dlc.git
cd gsd-core-ai-dlc
```

Or use an existing local checkout of this repo.

### 2. Install deps and build

```bash
npm install
npm run build
```

`npm run build` compiles TypeScript to `dist/` with `tsc -p tsconfig.build.json`.

Optional consumer-project install (after the overlay is built):

```bash
# local path
npm install /path/to/gsd-core-ai-dlc
# or
npm install file:../gsd-core-ai-dlc

# private git (placeholder host — use your org remote)
npm install git+ssh://git@<org-host>/<team>/gsd-core-ai-dlc.git
```

### 3. Let GSD register capability and skills

The GSD Core installer registers the capability from `.gsd/capabilities/aidlc-governance/capability.json` and the skills from `.claude/skills/aidlc-governance-*/SKILL.md`. No manual copying from `agents/`, `commands/`, or skill directories is needed.

### Verify install

CLI signature:

```bash
governance build-index [--root <dir>] [--out <file>]
```

Local development command:

```bash
node bin/governance.cjs build-index
```

Expected output:

```text
build-index: wrote rule-index.json (1 rule) from aidlc-rules
```

## Consent Flow (CB-3)

Two distinct gates control activation:

1. **Capability consent grant** — loader-level CB-3 consent, bound to the content hash of `.gsd/capabilities/aidlc-governance`.
2. **Activation toggle** — project config switch `governance.enabled`, checked after consent.

Both must be satisfied before governance hooks fire.

### Step A — Capability consent grant

Run the loader consent grant:

```bash
gsd-tools capability install ./.gsd/capabilities/aidlc-governance --scope project --yes --raw
```

This writes the loader consent record using `consent.recordProjectConsent(...)` with the capability bundle content hash. It flips capability status from `inactive` to `active` when the hash matches.

Check capability status:

```bash
gsd-tools capability list --scope project --json
```

Expected status after grant: `active`.

Before this grant:

- `gsd-tools capability list --scope project --json` shows status `inactive`.
- No governance hook fires at `discuss:pre`, `plan:pre`, `execute:pre`, `verify:post`, or `ship:pre`.

After this grant:

- Status is `active`.
- All 6 governance steps can fire when `governance.enabled` is true.

If `.gsd/capabilities/aidlc-governance/capability.json` is tampered with after consent, the content hash no longer matches. Capability status returns to `inactive`, with reason `no user consent record`.

### Step B — Activation toggle

Set or omit `governance.enabled` in `.planning/config.json`. Default is `true` from `.gsd/capabilities/aidlc-governance/capability.json`.

```json
{
  "governance": {
    "enabled": true,
    "token_budget": 2000
  }
}
```

`governance.enabled: false` keeps the overlay dormant even after CB-3 consent is granted. `governance.token_budget` also lives in `.planning/config.json`; default is `2000`.

Consent is the loader-level grant. `governance.enabled` is the per-project on/off switch.

### Hook chain

| Loop point | Skill ref | When | Produces | Consumes | Error behavior |
| --- | --- | --- | --- | --- | --- |
| `discuss:pre` | `aidlc-governance-discuss` | `governance.enabled` | `CONTEXT.md`, `.planning/governance/selection-state.json` | none | `skip` |
| `plan:pre` | `aidlc-governance-plan` | `governance.enabled` | `planner-context`, `.planning/governance/gates/{NN}-plan.json` | `CONTEXT.md`, `RESEARCH.md`, `PATTERNS.md` | `skip` |
| `execute:pre` | `aidlc-governance-execute` | `governance.enabled` | `executor-context` | `.planning/governance/selection-state.json` | `skip` |
| `verify:post` | `aidlc-governance-verify` | `governance.enabled` | `.planning/governance/gates/{NN}-verify.json` | `.planning/governance/selection-state.json` | `halt` |
| `verify:post` | `aidlc-governance-audit` | `governance.enabled` | `GOVERNANCE.md` | `.planning/governance/selection-state.json`, `CONTEXT.md` | `halt` |
| `ship:pre` | `aidlc-governance-ship` | `governance.enabled` | `.planning/governance/gates/{NN}-ship.json`, `.planning/governance/approvals/{NN}.json` | `.planning/governance/gates/{NN}-plan.json`, `.planning/governance/gates/{NN}-verify.json`, `GOVERNANCE.md` | `halt` |

## First-Run Smoke Check

This chain proves the built CLI can index the shipped rule pack and select the `require-mfa` rule for an inception task.

### Step 1 — Build CLI

```bash
npm run build
```

### Step 2 — Build rule index

CLI signature:

```bash
governance build-index [--root <dir>] [--out <file>]
```

Command:

```bash
node bin/governance.cjs build-index
```

Expected output:

```text
build-index: wrote rule-index.json (1 rule) from aidlc-rules
```

### Step 3 — Create task signal

Create `task-signal.json`:

```json
{ "taskType": "feature", "keywords": ["auth"], "paths": ["src/auth/login.ts"] }
```

### Step 4 — Select governance rules

CLI signature:

```bash
governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json|text]
```

Command:

```bash
node bin/governance.cjs select --phase inception --input task-signal.json
```

Expected output includes a non-empty `selected` array containing `require-mfa`:

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
  ]
}
```

`require-mfa` appears because it has `triggers: {}` and `phases: [common]`. The selector treats `common` as applying to every phase, so `--phase inception` selects the rule.

### Step 5 — Assert non-empty selection

`selected[]` containing `require-mfa` proves:

- `rule-index.json` built correctly from `aidlc-rules/`.
- The selection engine matched a governance rule.
- Summary-only governance can now be injected into GSD loop context after consent and `governance.enabled` activation.

Next: [Governance Workflow Guide](governance-workflow.md)
