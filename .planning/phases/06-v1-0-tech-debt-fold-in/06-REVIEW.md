---
phase: 06-v1-0-tech-debt-fold-in
reviewed: 2026-07-06T00:00:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/governance/atomic-write.ts
  - src/governance/atomic-write.test.ts
  - src/governance/audit-artifact.ts
  - src/governance/audit-artifact.test.ts
  - src/governance/audit-hook-contract.test.ts
  - src/governance/config-no-warnings.test.ts
  - src/governance/consent-verify-post.test.ts
  - src/governance/state-store.ts
  - src/governance/state-store.test.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-06T00:00:00Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found

## Summary

v1.0 tech-debt fold-in across 9 governance-layer files. Deep review traced the
atomic-write race fix, ISO-8601 strictness, the `writeGovernanceAudit` return-
shape change through all callers, the TD-02 consent-gated `verify:post`
integration test into the real `gsd-tools` `loadRegistry`/consent modules, and
the TD-09 config-key warning test into the real `init plan-phase` config-load
path. No correctness or security blockers found. Three warnings are test-
hygiene and edge-case issues; four info items are minor.

The headline items hold up under adversarial tracing:
- **TD-03 atomic-write** — unique `.<pid>-<uuid>.tmp` suffix eliminates the
  concurrent-writer collision; `rmSync({force:true})` correctly cleans up on
  `renameSync` failure and swallows ENOENT; `mkdirSync` sits outside the try
  block (no temp to clean if it throws). Windows `renameSync` race is
  acknowledged in the test as a content-integrity (not all-success) invariant.
- **TD-01 ISO-8601** — regex `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`
  correctly rejects `"2026/07/06"`, `"2026-07-06"`, `"2026-07-06T00:00:00Z"`,
  `"2026-07-06T00:00:00.000"`, and accepts the canonical `toISOString()` shape.
  No over/under-rejection against the audit-trail contract (`Z`-suffixed, 3 ms
  digits — exactly what `new Date().toISOString()` emits).
- **TD-07 return shape** — returns `path.resolve(args.outputPath)`. All callers
  traced: `audit-artifact.test.ts:423` asserts
  `result.outputPath === path.resolve(outputPath)`; no external runtime caller
  destructures `outputPath` expecting the input string. The audit skill
  (`SKILL.md`) invokes the compiled runner and does not read the return shape.
- **TD-02 consent test** — drives the REAL consent path. `grantConsent` loads
  `capability-consent.cjs` / `capability-ledger.cjs` from the copied gsd-core
  via `createRequire(gsdTools)`; `recordProjectConsent` is called with the real
  `bundleContentHash(capDir)`. The `REGISTRY_SHIM` only replaces
  `gen-capability-registry.cjs`, which the real `capability-loader.cjs`
  `getGenerator()` uses solely for `loadCentralConfigKeys()` — and wraps that
  call in try/catch (`new Set()` fallback), so the shim cannot bypass consent.
  `cmdLoopRenderHooks` (loop-resolver.cjs:439) calls
  `loadRegistry({ includeInstalled: true, gsdHome: process.env.GSD_HOME })`,
  which applies the real `hasProjectConsent` content-hash binding. Asserts the
  hook fires with `onError=halt` (not just step registration).
- **TD-08 / TD-09** — `resolveGsdTools` returns `string | null` with explicit
  caller guard; `config-no-warnings` test's `query init.plan-phase 6` is a real
  command that routes to `init.cjs` `loadConfig(cwd)` (reads
  `.planning/config.json`), so the no-warning assertion exercises the config
  surface.

## Warnings

### WR-01: Dead test helper `auditFromUnsafeRecord` — defined, never called

**File:** `src/governance/audit-artifact.test.ts:139-143`
**Issue:** `auditFromUnsafeRecord(root, record)` is declared (writes state
unsafely then runs the public writer) but has zero callers in the test suite
(grep confirmed: only the definition site matches). The malformed-payload
tests (lines 336-351, 384-411) use `writeUnsafeState` + a direct
`writeGovernanceAudit` call inside `withTempRoot` instead of going through
this helper. This is dead code left from the TD-06 refactor that moved tests
off `buildAuditRecord` direct import — the helper was written but the
malformed-state tests were restructured to inline the pattern. A future reader
will assume the helper is the canonical malformed-state test path and either
duplicatively add callers or miss the actual inline pattern.

**Fix:**
```typescript
// Delete lines 137-143:
// // Variant that writes the state file unsafely (for malformed-payload tests)
// // then runs the public writer and returns its audit.
// function auditFromUnsafeRecord(root: string, record: unknown): GovernanceAudit {
//   writeUnsafeState(root, record);
//   const outputPath = path.join(root, ".planning", "phases", "05-audit", "GOVERNANCE.md");
//   return writeGovernanceAudit({ projectRoot: root, outputPath }).audit;
// }
```
Or, if the intent was to share the malformed-state pattern, refactor the four
inline malformed-state test sites (336, 384, 205, 227) to call it — but deletion
is the lower-diff fix since the inline form is already clear.

### WR-02: `consent-verify-post.test.ts` `grantConsent` fallback passes empty
`integrity` and `disclosureSignature` to `recordProjectConsent`

**File:** `src/governance/consent-verify-post.test.ts:256-263`
**Issue:** When `gsd capability install --yes` fails (the common path in the
shimmed runtime, since the install lifecycle may reject the shim), the test
falls back to directly calling `consent.recordProjectConsent` with
`integrity: ""` and `disclosureSignature: ""`. The real consent module
(`capability-consent.cjs:392-394`) only type-checks these are strings (not
non-empty), so the record is accepted. This is acceptable for a test fixture
because the security binding is the `contentHash` (recomputed via
`bundleContentHash(capDir)`), which IS correctly passed. However:

1. The `disclosureSignature` is the executable-surface re-consent key per the
   consent module's own docstring (line 22: "disclosureSignature remain on the
   record human disclosure + re-consent-on-executable-surface"). An empty
   signature means the tamper test (line 397) is asserting the content-hash
   binding only, NOT the disclosure-signature binding. If a future gsd-core
   release tightens `recordProjectConsent` to require a non-empty
   `disclosureSignature` (the docstring already says it's the re-consent key),
   this fallback throws and the test breaks with no signal that the contract
   shifted.
2. The install-vs-fallback split is silent — `grantConsent` returns the consent
   module either way, so a test author cannot tell from the test output which
   path ran. If the install path succeeds but records a different consent shape
   (e.g. with a real disclosure signature), the tamper/revoke tests exercise a
   different binding than the pre-consent test.

**Fix:** Either (a) always use the direct `recordProjectConsent` path and drop
the `spawnGsd(... 'install' ...)` attempt (the install lifecycle in the shimmed
runtime is not the contract under test — the consent store + loader binding is),
or (b) assert which path ran by logging `proc.status` when the install path is
taken, so a future contract tightening surfaces clearly. Option (a) is simpler:
```typescript
function grantConsent(
  gsdTools: string,
  projectRoot: string,
  configDir: string,
  capDir: string,
): ConsentModule {
  const consent = consentModule(gsdTools);
  consent.recordProjectConsent({
    gsdHome: configDir,
    projectRoot,
    id: CAP_ID,
    integrity: "",
    disclosureSignature: "",
    contentHash: consent.bundleContentHash(capDir),
  });
  return consent;
}
```

### WR-03: `consent-verify-post.test.ts` pre-consent test's `finally` block
references `consent` which is never assigned in that test

**File:** `src/governance/consent-verify-post.test.ts:305-332`
**Issue:** The first test (`consent gate keeps verify:post inactive pre-consent`)
declares `let consent: ConsentModule | undefined;` at line 307 but never
assigns it — the test body only asserts pre-consent inactivity and never calls
`grantConsent`. The `finally` block (lines 322-329) guards
`if (consent && projectRoot)` before calling `revokeProjectConsent`. Because
`consent` is always `undefined` in this test, the revoke is always skipped. This
is harmless (no consent was granted, so there's nothing to revoke) but it is
misleading scaffolding: the `finally` block implies a revoke might be needed,
and a reader will waste time tracing where `consent` gets assigned (it doesn't).
The revoke path is dead in this test.

**Fix:** Remove the `consent` declaration and the `if (consent && projectRoot)`
branch from this test's `finally`; keep only `rmSync(tmpRoot, ...)`:
```typescript
test("TD-02: consent gate keeps verify:post inactive pre-consent (fails closed)", () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "gsd-consent-vp-"));
  let projectRoot = "";
  try {
    const { configDir, gsdTools } = writeRuntimeShim(tmpRoot);
    const fixture = writeProjectFixture(tmpRoot);
    projectRoot = fixture.projectRoot;
    installProjectLedger(gsdTools, projectRoot);
    assert.equal(rowFor(capabilityRows(gsdTools, projectRoot, configDir)).status, "inactive");
    const preConsentEnvelope = renderHooks(gsdTools, projectRoot, configDir, "verify:post");
    assert.equal(verifyPostHook(preConsentEnvelope), undefined, "...");
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});
```

## Info

### IN-01: Duplicated `ConsentModule` / `LedgerModule` type definitions across two test files

**File:** `src/governance/consent-verify-post.test.ts:52-73`, `src/governance/consent.test.ts:45-66`
**Issue:** The `ConsentModule` and `LedgerModule` interface definitions
(`bundleContentHash`, `recordProjectConsent`, `revokeProjectConsent`,
`recordInstall` signatures) are copied verbatim between the two test files.
The phase context flagged this as a known 06-03 deviation ("consent helpers
copied, not extracted"). It is not a bug — the runtime modules are loaded for
real via `createRequire(gsdTools)`, only the TS type definitions are duplicated.
The maintenance hazard is that a future gsd-core release that changes
`recordProjectConsent`'s arg shape will require updating both copies in lock-
step; a stale copy produces a TS-compile error (caught) but a missed copy
produces a silent type-mismatch at runtime.

**Fix:** Extract a single `src/governance/consent-test-types.ts` (or
`test/governance/consent-test-types.ts` if the test-location deviation is
resolved) exporting `ConsentModule` and `LedgerModule`, and import from both
test files. Low priority — only worth doing if a third consent test appears.

### IN-02: `config-no-warnings.test.ts` inline `require("node:os")` / `require("node:fs")` inside `resolveGsdTools`

**File:** `src/governance/config-no-warnings.test.ts:16-29`
**Issue:** `resolveGsdTools` uses `require("node:os").homedir()` and
`require("node:fs").existsSync(c)` inline inside the function, while the file's
top already imports `readFileSync` from `node:fs` and could import `os`/`existsSync`
at the top. The inline `require` is a style inconsistency with the rest of the
file (and with `audit-hook-contract.test.ts` which imports `os`/`existsSync` at
the top). Not a bug — CJS `require` is idempotent and cached.

**Fix:** Hoist `import os from "node:os";` and add `existsSync` to the existing
`node:fs` import at the top of the file; replace the inline `require` calls.

### IN-03: `config-no-warnings.test.ts` resolves gsd-tools via a different
candidate list than `audit-hook-contract.test.ts`

**File:** `src/governance/config-no-warnings.test.ts:17-21` vs
`src/governance/audit-hook-contract.test.ts:64-75`
**Issue:** `config-no-warnings` builds candidates from
`[process.env.CODEX_HOME ?? "", ~/.codex, ~/.claude]` with a `.filter((c) => c)`
to drop the empty string when `CODEX_HOME` is unset; `audit-hook-contract` builds
from `[CODEX_CONFIG_DIR, ~/.codex, ~/.claude]` where `CODEX_CONFIG_DIR =
process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex")`. Both resolve to
the same effective set in practice, but the two files express the "CODEX_HOME
unset" fallback differently (empty-string-filter vs homedir-substitution). This
is a minor consistency issue that could bite if `CODEX_HOME` is set to a path
that doesn't contain `gsd-core` — `config-no-warnings` would fall through to
`~/.codex`, `audit-hook-contract` would only check `CODEX_HOME/gsd-core` then
`~/.codex`. Not a bug today.

**Fix:** Extract a shared `resolveGsdTools()` into a test-helper module
(`src/governance/test-gsd-tools.cjs` or similar) and import from both test
files, so the candidate-order and null-handling contract is defined once.

### IN-04: `atomic-write.test.ts` concurrent-writer test relies on a timing
race and may flake under heavy load

**File:** `src/governance/atomic-write.test.ts:38-84`
**Issue:** The concurrent-writer test spawns 6 children simultaneously and
asserts "at least one writer succeeded (exit 0)" and "the final file is exactly
one payload". Under heavy load or a single-core CI runner, the children may
serialize (one finishes and renames before the next starts), which still
satisfies the assertion — but if ALL children lose the rename race on Windows
(EPERM on a shared destination), the "at least one writer succeeded" assertion
fails. The test comment acknowledges this is a content-integrity invariant, not
an all-success one, but the `codes.some((c) => c === 0)` assertion can still
flake if every writer's `renameSync` loses to a sibling. In practice this is
unlikely (one writer must win), but it is a theoretical flake source.

**Fix:** No code change needed if the team accepts the rare-flake risk. If
determinism is required, run the concurrent-writer case in a loop (e.g. 5
iterations) and assert that AT LEAST one iteration has a winner — a single
iteration's all-EPERM outcome then doesn't fail the test.

---

_Reviewed: 2026-07-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_