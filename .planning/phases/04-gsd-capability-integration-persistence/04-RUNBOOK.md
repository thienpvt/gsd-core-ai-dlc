# Phase 04 Capability Consent Runbook

## 1. Pre-Consent Verification

Run from project root:

```sh
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" capability list --scope project --json
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" loop render-hooks discuss:pre --raw --config-dir "$HOME/.codex"
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" loop render-hooks execute:pre --raw --config-dir "$HOME/.codex"
```

Expected before consent: `aidlc-governance` is absent or `inactive`; both render-hooks envelopes omit `aidlc-governance`. This is CB-3 fail-closed behavior: repo content under `.gsd/capabilities/aidlc-governance/` cannot activate by clone alone.

`test/fixtures/governance-render-hooks.sh . "$HOME/.codex"` runs the same checks when a POSIX shell is available.

## 2. Grant Consent

Preferred command:

```sh
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" capability install ./.gsd/capabilities/aidlc-governance --scope project --yes
```

Verified fallback for the current installed Codex runtime, where the install verb can report host version `0.0.0` because packaging metadata is missing:

```sh
node - <<'JS'
const path = require('node:path');
const projectRoot = process.cwd();
const gsdTools = path.join(process.env.HOME || process.env.USERPROFILE, '.codex', 'gsd-core', 'bin', 'gsd-tools.cjs');
const req = require('node:module').createRequire(gsdTools);
const ledger = req('./lib/capability-ledger.cjs');
const consent = req('./lib/capability-consent.cjs');
const id = 'aidlc-governance';
const capDir = path.join(projectRoot, '.gsd', 'capabilities', id);
ledger.recordInstall(projectRoot, {
  id,
  version: '0.1.0',
  source: './.gsd/capabilities/aidlc-governance',
  integrity: '',
  files: ['.gsd/capabilities/aidlc-governance/capability.json'],
  sharedEdits: [],
});
consent.recordProjectConsent({
  gsdHome: process.env.GSD_HOME || require('node:os').homedir(),
  projectRoot,
  id,
  integrity: '',
  disclosureSignature: '',
  contentHash: consent.bundleContentHash(capDir),
});
JS
```

Both paths use GSD loader modules, not a hand-edited `consent.json`. Consent is user-owned and machine-local at `GSD_HOME/.gsd/consent.json` or `$HOME/.gsd/consent.json`, bound to `(realpath(projectRoot), id, bundleContentHash)`.

## 3. Post-Consent Verification

Run:

```sh
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" capability list --scope project --json
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" loop render-hooks discuss:pre --raw --config-dir "$HOME/.codex"
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" loop render-hooks execute:pre --raw --config-dir "$HOME/.codex"
```

Expected:

- `capability list` shows `aidlc-governance` with `scope: "project"` and `status: "active"`.
- `discuss:pre` lists `ref.skill: "aidlc-governance-discuss"` and produces `CONTEXT.md`, `.planning/governance/selection-state.json`.
- `execute:pre` lists `ref.skill: "aidlc-governance-execute"` and produces `executor-context`, consumes `.planning/governance/selection-state.json`.

## 4. Tamper Rotation

Any edit to `capability.json` or another bundled artifact changes `bundleContentHash`. Next loader read reports `aidlc-governance` inactive until consent is granted again.

Rotation flow:

```sh
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" capability list --scope project --json
# observe inactive after bundle change
# review changed bundle
# re-run the Grant Consent command
```

Security invariant: project-scope overlay is inactive until user-owned consent matches current bundle content; tamper flips inactive; loader never silently re-activates changed repo content.

## 5. Revocation

Remove consent:

```sh
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" capability trust revoke aidlc-governance --project .
```

After revocation, render-hooks omit `aidlc-governance` again. The project ledger may still list the capability, but CB-3 keeps surfaces inactive without matching user consent.

## 6. Auditing

List consent records:

```sh
node "$HOME/.codex/gsd-core/bin/gsd-tools.cjs" capability trust list --scope project --json
```

Audit fields: `id`, `projectRoot`, `integrity`, `disclosureSignature`, `contentHash`, `consentedAt`. `contentHash` is the security binding.

Automated proof lives in `src/governance/consent.test.ts`: pre-consent inactive, no active hooks; loader-consent active, both hooks rendered; tamper returns inactive.
