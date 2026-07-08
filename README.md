# GSD Governance Overlay (AI-DLC × GSD Core)

AI-DLC governance overlay for GSD Core — indexed, on-demand rule packs. It layers enterprise SDLC governance onto GSD's long-running development runtime without polluting the context window.

## Overview

GSD Core stays the runtime brain: `.planning/`, roadmap, state, phase execution, verification, and shipping. This overlay adds AI-DLC-style governance through rule packs selected per task and phase. The rule selection engine injects only relevant rule summaries into context, with full rule detail loaded on demand through `governance rule-detail`. Binding enforcement stays tool-neutral through gate contracts and adapter stubs, not hard-coded scanner or CI vendors.

## Installation

Requirements: Node.js `>=22.0.0` and npm `>=10.0.0`.

```bash
npm install @opengsd/gsd-aidlc-overlay
```

For in-repo development:

```bash
npm install
npm run build
```

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
