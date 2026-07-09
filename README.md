# GSD Governance Overlay (AI-DLC × GSD Core)

AI-DLC governance overlay for GSD Core — indexed, on-demand rule packs. It layers enterprise SDLC governance onto GSD's long-running development runtime without polluting the context window.

## Overview

GSD Core stays the runtime brain: `.planning/`, roadmap, state, phase execution, verification, and shipping. This overlay adds AI-DLC-style governance through rule packs selected per task and phase. The rule selection engine injects only relevant rule summaries into context, with full rule detail loaded on demand through `governance rule-detail`. Binding enforcement stays tool-neutral through gate contracts and adapter stubs, not hard-coded scanner or CI vendors.

## Installation

Requirements: Node.js `>=22.0.0`, npm `>=10.0.0`, and GSD Core (`@opengsd/gsd-core` / `gsd-tools`) already installed.

This overlay is private/self-hosted. Obtain it from your org git host or a local checkout — not the public npm registry.

```bash
# 1. Clone (org-hosted private git) or use a local checkout
git clone <org-host>/<team>/gsd-core-ai-dlc.git
cd gsd-core-ai-dlc

# 2. Install deps and build
npm install
npm run build
```

Optional: install into a consumer project via local path or private git URL:

```bash
# local path
npm install /path/to/gsd-core-ai-dlc
# or
npm install file:../gsd-core-ai-dlc

# private git (placeholder host — use your org remote)
npm install git+ssh://git@<org-host>/<team>/gsd-core-ai-dlc.git
```

> **Package name note:** in-repo name is `@opengsd/gsd-aidlc-overlay`. It is **not** published to the public npm registry under `@opengsd` (that scope is owned by open-gsd maintainers). Private git / local install does not require public npm ownership.

Full setup, consent, and first-run smoke checks: [Onboarding Guide](docs/onboarding.md).

## Documentation

- [Onboarding Guide](docs/onboarding.md) — install, consent, first-run smoke check.
- [Governance Workflow Guide](docs/governance-workflow.md) — all 5 CLI commands plus gate chain.
- [Rule Authoring Guide](docs/rule-authoring.md) — write, integrate, and verify governance rules.

## CLI

The package exposes the `governance` binary.

| Command | Purpose |
| --- | --- |
| `governance build-index [--root <dir>] [--out <file>]` | Build `rule-index.json` from rule packs. |
| `governance select --phase <p> [--index <f>] [--input <f>] [--domains a,b] [--budget <n>] [--format json\|text]` | Select matching rule summaries for one task signal. |
| `governance inject [--input <file>]` | Render selected summaries as a governance context fragment. |
| `governance rule-detail <id> [--index <f>]` | Lazy-load one rule's detail body, or print summary-only fallback. |
| `governance eval <phaseNumber> [--json]` | Run selection recall/precision corpus regression. |

Full command examples: [Governance Workflow Guide](docs/governance-workflow.md).

## Development

```bash
npm install
npm run build
npm test
```

Useful scripts:

- `npm run build` — compile production TypeScript.
- `npm run build:test` — compile tests.
- `npm test` — run compiled Node tests.
- `npm run eval` — run selection eval CLI.
