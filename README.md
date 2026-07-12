# GSD Governance Overlay (AI-DLC × GSD Core)

AI-DLC governance overlay for GSD Core — indexed, on-demand rule packs. It layers enterprise SDLC governance onto GSD's long-running development runtime without polluting the context window.

## Overview

GSD Core stays the runtime brain: `.planning/`, roadmap, state, phase execution, verification, and shipping. This overlay adds AI-DLC-style governance through rule packs selected per task and phase. The rule selection engine injects only relevant rule summaries into context, with full rule detail loaded on demand through `governance rule-detail`. Binding enforcement stays tool-neutral through gate contracts and adapter stubs, not hard-coded scanner or CI vendors.

## Installation

Requirements: Node.js `>=22.0.0`, npm `>=10.0.0`, and GSD Core (`@opengsd/gsd-core` / `gsd-tools`) already installed.

### Primary: org private registry

```bash
# 1. Configure scope + auth (project, user, or org-managed)
cp .npmrc.example .npmrc
# replace registry URL + REPLACE_WITH_ORG_TOKEN with org values

# 2. Install (requires gsd-core first)
npm install @opengsd/gsd-aidlc-overlay

# 3. Register self-contained capability via GSD (manifest + six skills under the capability dir)
gsd-tools capability install ./node_modules/@opengsd/gsd-aidlc-overlay/.gsd/capabilities/aidlc-governance --scope project --yes --raw
# 4. Surface the six skill stems (GSD 1.6.x third-party surface)
# Write ~/.claude/.gsd-surface.json (or $CLAUDE_CONFIG_DIR/.gsd-surface.json) with:
# {
#   "baseProfile": "full",
#   "disabledClusters": [],
#   "explicitAdds": [
#     "aidlc-governance-discuss",
#     "aidlc-governance-plan",
#     "aidlc-governance-execute",
#     "aidlc-governance-verify",
#     "aidlc-governance-ship",
#     "aidlc-governance-audit"
#   ],
#   "explicitRemoves": []
# }
# 5. Confirm activation (requires governance.enabled: true in .planning/config.json):
gsd-tools capability state --raw
# expect aidlc-governance: installed=true, surfaced=true, active=true
gsd-tools loop render-hooks discuss:pre --raw
# expect activeHooks non-empty (repeat for plan:pre, execute:pre, verify:post, ship:pre)

> **Org private registry only — not public npmjs.com.** Package name `@opengsd/gsd-aidlc-overlay` uses `@opengsd` because the **org private registry** owns that scope locally. This is **not** a public-registry package and does **not** claim public npmjs.com ownership of `@opengsd`.

### Fallback: git / local path

```bash
# clone + build in repo
git clone <org-host>/<team>/gsd-core-ai-dlc.git
cd gsd-core-ai-dlc
npm install
npm run build

# consumer project — local path
npm install file:../gsd-core-ai-dlc

# consumer project — private git
npm install git+ssh://git@<org-host>/<team>/gsd-core-ai-dlc.git
```

### For maintainers (publish)

Publish to the **org private registry** only (`publishConfig.registry` in `package.json`). Never publish to public npmjs.com.

```bash
# auth + registry via .npmrc (see .npmrc.example)
npm run build && npm publish
```

Full setup, consent, and first-run smoke checks: [Onboarding Guide](docs/onboarding.md).

## Documentation

- [Onboarding Guide](docs/onboarding.md) — install, consent, first-run smoke check.
- [Governance Workflow Guide](docs/governance-workflow.md) — all 5 CLI commands plus gate chain.
- [Java/Spring Coverage Gate](docs/java-spring-coverage.md) — subscribe the domain and configure JaCoCo or LCOV evidence.
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
| `governance discuss <projectRoot> <taskSignalJsonFile> [...]` | Discuss gate: select + persist selection-state. |
| `governance plan <projectRoot> <phaseNumber> <inputsJson>` | Plan gate: select + write plan evidence. |
| `governance execute <projectRoot>` | Execute gate: reload selection + render fragment. |
| `governance verify <projectRoot> <phaseNumber>` | Verify gate: correlate + run adapter + write evidence. |
| `governance ship <projectRoot> <phaseNumber>` | Ship gate: require prior plan/verify evidence. |
| `governance audit <projectRoot> <outputPath>` | Write GOVERNANCE.md audit artifact. |
| `governance capture-test-evidence <phaseNumber>` | Run `node --test --test-reporter=tap dist-test/**/*.test.js` at cwd; fail closed if zero tests; write `.planning/governance/tests/{NN}.json`. |

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
