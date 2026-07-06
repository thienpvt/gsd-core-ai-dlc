import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import type { SpawnSyncReturns } from "node:child_process";

// TD-02: Consent-gated verify:post integration test covering onError:halt.
// The existing consent.test.ts covers discuss:pre + execute:pre consent gating
// but NOT verify:post — the onError:halt silent-failure path is the TD-02 gap.
// This test closes that gap with four assertions: pre-consent (inactive),
// post-consent (audit hook fires with onError=halt), revoke (deactivates),
// tamper (deactivates).

const CAP_ID = "aidlc-governance";
const REPO_ROOT = process.cwd();
const MANIFEST_SOURCE = path.join(REPO_ROOT, ".gsd", "capabilities", CAP_ID, "capability.json");

type CapabilityRow = {
  id: string;
  scope: string;
  status: string;
  reason?: string | null;
};

type ActiveHook = {
  capId: string;
  kind: string;
  ref?: { skill?: string };
  produces?: string[];
  consumes?: string[];
  onError?: string;
};

type RenderHooksEnvelope = {
  point: string;
  activeHooks?: ActiveHook[];
};

type ConsentModule = {
  bundleContentHash(capDir: string): string;
  recordProjectConsent(args: {
    gsdHome: string;
    projectRoot: string;
    id: string;
    integrity: string;
    disclosureSignature: string;
    contentHash: string;
  }): void;
  revokeProjectConsent(args: { gsdHome: string; projectRoot: string; id: string }): void;
};

type LedgerModule = {
  recordInstall(runtimeDir: string, entry: {
    id: string;
    version: string;
    source: string;
    integrity: string;
    files: string[];
    sharedEdits: never[];
  }): void;
};

function resolveInstalledGsdCore(): string {
  const candidates = [
    path.join(os.homedir(), ".codex", "gsd-core"),
    path.join(os.homedir(), ".claude", "gsd-core"),
  ];
  const found = candidates.find((candidate) =>
    existsSync(path.join(candidate, "bin", "gsd-tools.cjs")),
  );
  assert.ok(found, "installed gsd-core runtime with bin/gsd-tools.cjs exists");
  return found;
}

function writeRuntimeShim(tmpRoot: string): { configDir: string; gsdTools: string } {
  const sourceGsdCore = resolveInstalledGsdCore();
  const configDir = path.join(tmpRoot, "runtime");
  const runtimeGsdCore = path.join(configDir, "gsd-core");
  cpSync(sourceGsdCore, runtimeGsdCore, { recursive: true });

  writeFileSync(
    path.join(configDir, "package.json"),
    JSON.stringify({ version: "1.6.1", type: "commonjs" }, null, 2) + "\n",
    "utf8",
  );

  const scriptsDir = path.join(configDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(path.join(scriptsDir, "gen-capability-registry.cjs"), REGISTRY_SHIM, "utf8");
  writeFileSync(
    path.join(scriptsDir, "fix-slash-commands.cjs"),
    "module.exports = {};\n",
    "utf8",
  );

  writeSkill(configDir, "gsd-aidlc-governance-discuss");
  writeSkill(configDir, "gsd-aidlc-governance-execute");
  writeSkill(configDir, "gsd-aidlc-governance-audit");

  return {
    configDir,
    gsdTools: path.join(runtimeGsdCore, "bin", "gsd-tools.cjs"),
  };
}

function writeSkill(configDir: string, dirName: string): void {
  const skillDir = path.join(configDir, "skills", dirName);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      `name: "${dirName}"`,
      'description: "Consent verify:post integration test fixture."',
      "---",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeProjectFixture(tmpRoot: string): { projectRoot: string; capDir: string } {
  const projectRoot = path.join(tmpRoot, "project");
  const capDir = path.join(projectRoot, ".gsd", "capabilities", CAP_ID);
  mkdirSync(capDir, { recursive: true });
  mkdirSync(path.join(projectRoot, ".planning"), { recursive: true });
  copyFileSync(MANIFEST_SOURCE, path.join(capDir, "capability.json"));
  writeFileSync(path.join(projectRoot, ".planning", "STATE.md"), "# State\n", "utf8");
  writeFileSync(path.join(projectRoot, ".planning", "config.json"), "{}\n", "utf8");
  return { projectRoot, capDir };
}

function spawnGsd(
  gsdTools: string,
  projectRoot: string,
  configDir: string,
  args: string[],
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [gsdTools, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      GSD_HOME: configDir,
      CODEX_HOME: configDir,
      GSD_RUNTIME: "codex",
    },
  });
}

function runGsd(
  gsdTools: string,
  projectRoot: string,
  configDir: string,
  args: string[],
): string {
  const proc = spawnGsd(gsdTools, projectRoot, configDir, args);
  assert.equal(
    proc.status,
    0,
    `gsd-tools ${args.join(" ")} failed\nstdout:\n${proc.stdout}\nstderr:\n${proc.stderr}`,
  );
  return proc.stdout;
}

function capabilityRows(gsdTools: string, projectRoot: string, configDir: string): CapabilityRow[] {
  return JSON.parse(
    runGsd(gsdTools, projectRoot, configDir, [
      "capability",
      "list",
      "--scope",
      "project",
      "--json",
    ]),
  ) as CapabilityRow[];
}

function renderHooks(
  gsdTools: string,
  projectRoot: string,
  configDir: string,
  point: string,
): RenderHooksEnvelope {
  return JSON.parse(
    runGsd(gsdTools, projectRoot, configDir, [
      "loop",
      "render-hooks",
      point,
      "--raw",
      "--config-dir",
      configDir,
    ]),
  ) as RenderHooksEnvelope;
}

function rowFor(rows: CapabilityRow[]): CapabilityRow {
  const row = rows.find((candidate) => candidate.id === CAP_ID && candidate.scope === "project");
  assert.ok(row, `${CAP_ID} row exists in project capability list`);
  return row;
}

function verifyPostHook(envelope: RenderHooksEnvelope): ActiveHook | undefined {
  return (envelope.activeHooks ?? []).find(
    (hook) =>
      hook.capId === CAP_ID && hook.ref?.skill === "aidlc-governance-audit",
  );
}

function installProjectLedger(gsdTools: string, projectRoot: string): void {
  const requireFromGsd = createRequire(gsdTools);
  const ledger = requireFromGsd("./lib/capability-ledger.cjs") as LedgerModule;
  ledger.recordInstall(projectRoot, {
    id: CAP_ID,
    version: "0.1.0",
    source: path.join(projectRoot, ".gsd", "capabilities", CAP_ID),
    integrity: "",
    files: [path.join(".gsd", "capabilities", CAP_ID, "capability.json")],
    sharedEdits: [],
  });
}

function consentModule(gsdTools: string): ConsentModule {
  return createRequire(gsdTools)("./lib/capability-consent.cjs") as ConsentModule;
}

function grantConsent(
  gsdTools: string,
  projectRoot: string,
  configDir: string,
  capDir: string,
): ConsentModule {
  const consent = consentModule(gsdTools);
  const proc = spawnGsd(gsdTools, projectRoot, configDir, [
    "capability",
    "install",
    "./.gsd/capabilities/aidlc-governance",
    "--scope",
    "project",
    "--yes",
    "--raw",
  ]);
  if (proc.status === 0) return consent;

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

const REGISTRY_SHIM = `
function ensure(out, point) {
  return out.byLoopPoint[point] || (out.byLoopPoint[point] = { steps: [], contributions: [], gates: [] });
}

function buildRegistry(caps) {
  const out = {
    capabilities: {},
    bySkill: {},
    byAgent: {},
    byLoopPoint: {},
    configKeys: {},
    configSchema: {},
    commandFamilies: {},
  };
  for (const [id, cap] of caps) {
    out.capabilities[id] = cap;
    for (const skill of cap.skills || []) out.bySkill[skill] = { capId: id, skill, skillId: 'gsd-' + skill };
    for (const agent of cap.agents || []) out.byAgent[agent] = { capId: id, agent };
    for (const [key, value] of Object.entries(cap.config || {})) {
      out.configKeys[key] = { capId: id, key };
      out.configSchema[key] = value;
    }
    for (const step of cap.steps || []) ensure(out, step.point).steps.push({ capId: id, ...step });
    for (const gate of cap.gates || []) ensure(out, gate.point).gates.push({ capId: id, ...gate });
    for (const contribution of cap.contributions || []) {
      ensure(out, contribution.point).contributions.push({ capId: id, ...contribution });
    }
  }
  return out;
}

module.exports = {
  loadCentralConfigKeys() { return new Set(); },
  buildRegistry,
};
`;

test("TD-02: consent gate keeps verify:post inactive pre-consent (fails closed)", () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "gsd-consent-vp-"));
  let consent: ConsentModule | undefined;
  let projectRoot = "";
  try {
    const { configDir, gsdTools } = writeRuntimeShim(tmpRoot);
    const fixture = writeProjectFixture(tmpRoot);
    projectRoot = fixture.projectRoot;
    installProjectLedger(gsdTools, projectRoot);

    assert.equal(rowFor(capabilityRows(gsdTools, projectRoot, configDir)).status, "inactive");
    const preConsentEnvelope = renderHooks(gsdTools, projectRoot, configDir, "verify:post");
    assert.equal(
      verifyPostHook(preConsentEnvelope),
      undefined,
      "verify:post must omit aidlc-governance-audit hook pre-consent (fail closed)",
    );
  } finally {
    if (consent && projectRoot) {
      try {
        consent.revokeProjectConsent({ gsdHome: path.join(tmpRoot, "runtime"), projectRoot, id: CAP_ID });
      } catch {
        // Best-effort cleanup.
      }
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("TD-02: post-consent verify:post fires aidlc-governance-audit hook with onError=halt", () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "gsd-consent-vp-"));
  let consent: ConsentModule | undefined;
  let projectRoot = "";
  try {
    const { configDir, gsdTools } = writeRuntimeShim(tmpRoot);
    const fixture = writeProjectFixture(tmpRoot);
    projectRoot = fixture.projectRoot;
    installProjectLedger(gsdTools, projectRoot);

    consent = grantConsent(gsdTools, projectRoot, configDir, fixture.capDir);
    assert.equal(rowFor(capabilityRows(gsdTools, projectRoot, configDir)).status, "active");

    const envelope = renderHooks(gsdTools, projectRoot, configDir, "verify:post");
    const hook = verifyPostHook(envelope);
    assert.ok(hook, "verify:post post-consent must include aidlc-governance-audit hook");
    assert.equal(hook.ref?.skill, "aidlc-governance-audit");
    assert.deepEqual(hook.produces ?? [], ["GOVERNANCE.md"]);
    assert.deepEqual(hook.consumes ?? [], [".planning/governance/selection-state.json"]);
    assert.equal(
      hook.onError,
      "halt",
      "verify:post audit hook must carry onError=halt (TD-02 silent-failure path)",
    );
  } finally {
    if (consent && projectRoot) {
      try {
        consent.revokeProjectConsent({ gsdHome: path.join(tmpRoot, "runtime"), projectRoot, id: CAP_ID });
      } catch {
        // Best-effort cleanup.
      }
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("TD-02: consent revocation deactivates verify:post (revert fails closed)", () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "gsd-consent-vp-"));
  let consent: ConsentModule | undefined;
  let projectRoot = "";
  try {
    const { configDir, gsdTools } = writeRuntimeShim(tmpRoot);
    const fixture = writeProjectFixture(tmpRoot);
    projectRoot = fixture.projectRoot;
    installProjectLedger(gsdTools, projectRoot);

    consent = grantConsent(gsdTools, projectRoot, configDir, fixture.capDir);
    assert.equal(rowFor(capabilityRows(gsdTools, projectRoot, configDir)).status, "active");
    assert.ok(verifyPostHook(renderHooks(gsdTools, projectRoot, configDir, "verify:post")));

    consent.revokeProjectConsent({ gsdHome: path.join(tmpRoot, "runtime"), projectRoot, id: CAP_ID });
    assert.equal(rowFor(capabilityRows(gsdTools, projectRoot, configDir)).status, "inactive");
    const postRevokeEnvelope = renderHooks(gsdTools, projectRoot, configDir, "verify:post");
    assert.equal(
      verifyPostHook(postRevokeEnvelope),
      undefined,
      "verify:post must omit aidlc-governance-audit after consent revocation",
    );
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("TD-02: tamper with capability manifest deactivates verify:post (fails closed on tamper)", () => {
  const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "gsd-consent-vp-"));
  let consent: ConsentModule | undefined;
  let projectRoot = "";
  try {
    const { configDir, gsdTools } = writeRuntimeShim(tmpRoot);
    const fixture = writeProjectFixture(tmpRoot);
    projectRoot = fixture.projectRoot;
    installProjectLedger(gsdTools, projectRoot);

    consent = grantConsent(gsdTools, projectRoot, configDir, fixture.capDir);
    assert.equal(rowFor(capabilityRows(gsdTools, projectRoot, configDir)).status, "active");
    assert.ok(verifyPostHook(renderHooks(gsdTools, projectRoot, configDir, "verify:post")));

    const manifestPath = path.join(fixture.capDir, "capability.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { description: string };
    manifest.description += " Tampered.";
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

    const tamperedRow = rowFor(capabilityRows(gsdTools, projectRoot, configDir));
    assert.equal(tamperedRow.status, "inactive");
    assert.match(tamperedRow.reason ?? "", /no user consent record/);
    const postTamperEnvelope = renderHooks(gsdTools, projectRoot, configDir, "verify:post");
    assert.equal(
      verifyPostHook(postTamperEnvelope),
      undefined,
      "verify:post must omit aidlc-governance-audit after tamper (fail closed)",
    );
  } finally {
    if (consent && projectRoot) {
      try {
        consent.revokeProjectConsent({ gsdHome: path.join(tmpRoot, "runtime"), projectRoot, id: CAP_ID });
      } catch {
        // Best-effort cleanup.
      }
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});