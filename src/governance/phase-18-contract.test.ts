import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir, homedir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const ROOT = process.cwd();
const read = (file: string): string => readFileSync(path.join(ROOT, file), "utf8");

interface ConfigSlice {
  type?: unknown;
  default?: unknown;
}

interface CapabilityManifest {
  config?: Record<string, ConfigSlice>;
}

const manifest = JSON.parse(
  read(".gsd/capabilities/aidlc-governance/capability.json"),
) as CapabilityManifest;

function assertIncludesAll(text: string, canaries: readonly string[]): void {
  for (const canary of canaries) {
    assert.ok(text.includes(canary), `missing content canary: ${canary}`);
  }
}

test("phase 18 capability declares additive string settings", () => {
  assert.deepEqual(manifest.config?.["governance.domains"], {
    type: "string",
    default: "",
    description: "Comma-separated domain subscriptions, for example java-spring.",
  });
  assert.deepEqual(manifest.config?.["governance.coverage_report_path"], {
    type: "string",
    default: "",
    description: "Project-relative path to a consumer-produced JaCoCo XML or LCOV report.",
  });
  assert.equal(manifest.config?.["governance.enabled"]?.type, "boolean");
  assert.equal(manifest.config?.["governance.token_budget"]?.type, "number");
});

test("Java Spring coverage guide documents the complete consumer contract", () => {
  const guidePath = path.join(ROOT, "docs", "java-spring-coverage.md");
  assert.ok(existsSync(guidePath), "docs/java-spring-coverage.md must exist");
  const guide = readFileSync(guidePath, "utf8");

  assertIncludesAll(guide, [
    '"domains": "java-spring"',
    '"coverage_report_path": "build/reports/jacoco/test/jacocoTestReport.xml"',
    'SelectionConfig.domains: ["java-spring"]',
    "./gradlew test jacocoTestReport",
    "build/reports/jacoco/test/jacocoTestReport.xml",
    "mvn test",
    "target/site/jacoco/jacoco.xml",
    ".info",
    ".lcov",
    ".planning/governance/gates/{NN}-verify.json",
    "ship",
    "never invokes Maven, Gradle, or a JDK",
    "rule not selected",
    "missing report",
    "unknown suffix",
    "zero lines",
    "below 70%",
    "absolute",
    "out-of-root",
    "fixed inclusive 70%",
    "current_phase: 1",
    "phase 18",
    "operations-phase governance remains deferred",
    "never overwrites that state",
    "fails closed on disagreement",
    "Missing plan evidence fails closed",
    "onError: halt",
  ]);
  assert.doesNotMatch(guide, /configurable (?:coverage )?threshold/i);
  assert.doesNotMatch(guide, /(?:configure|setting for) (?:the )?format/i);
});

test("all documentation entrypoints link the focused guide", () => {
  assert.match(read("README.md"), /docs\/java-spring-coverage\.md/);
  assert.match(read("docs/onboarding.md"), /java-spring-coverage\.md/);
  assert.match(read("docs/governance-workflow.md"), /java-spring-coverage\.md/);
});

test("package.json ships capability, skills, and docs surfaces", () => {
  const pkg = JSON.parse(read("package.json")) as { files?: string[] };
  assert.ok(Array.isArray(pkg.files), "package.json files must be an array");
  for (const required of [".gsd", ".claude/skills", "docs", "aidlc-rules", "dist", "bin", "examples"]) {
    assert.ok(pkg.files!.includes(required), `package.json files must include ${required}`);
  }
});

test("plan:pre consumes only host-available CONTEXT.md and onError is halt", () => {
  const full = JSON.parse(
    read(".gsd/capabilities/aidlc-governance/capability.json"),
  ) as {
    steps?: Array<{
      point?: string;
      onError?: string;
      ref?: { skill?: string };
      consumes?: string[];
    }>;
  };
  const plan = full.steps?.find(
    (s) => s.point === "plan:pre" && s.ref?.skill === "aidlc-governance-plan",
  );
  assert.ok(plan, "plan:pre step must exist");
  assert.equal(plan!.onError, "halt");
  assert.deepEqual(plan!.consumes, ["CONTEXT.md"]);
  assert.ok(!(plan!.consumes ?? []).includes("RESEARCH.md"));
  assert.ok(!(plan!.consumes ?? []).includes("PATTERNS.md"));
  const verify = full.steps?.find(
    (s) => s.point === "verify:post" && s.ref?.skill === "aidlc-governance-verify",
  );
  assert.ok(verify, "verify:post step must exist");
  assert.ok(
    (verify!.consumes ?? []).some((c) => c.includes("-plan.json")),
    "verify must consume plan evidence",
  );
});


test("capability bundle is self-contained with six skill bodies", () => {
  const stems = [
    "aidlc-governance-audit",
    "aidlc-governance-discuss",
    "aidlc-governance-execute",
    "aidlc-governance-plan",
    "aidlc-governance-ship",
    "aidlc-governance-verify",
  ];
  for (const stem of stems) {
    const skillPath = path.join(
      ROOT,
      ".gsd",
      "capabilities",
      "aidlc-governance",
      "skills",
      stem,
      "SKILL.md",
    );
    assert.ok(existsSync(skillPath), "missing bundled skill " + stem);
  }
});

test("onboarding documents installed package capability install path", () => {
  const onboarding = read("docs/onboarding.md");
  assertIncludesAll(onboarding, [
    "node_modules/@opengsd/gsd-aidlc-overlay/.gsd/capabilities/aidlc-governance",
    "gsd-tools capability install",
    "no auto-registration, postinstall, or manual copy",
    "self-contained",
    "explicitAdds",
  ]);
});


test("npm pack tarball includes capability, six skills, and docs", () => {
  // Shell-free: invoke npm-cli.js via node (Windows rejects spawn of .cmd without shell).
  const npmCliCandidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  const npmCli = npmCliCandidates.find((c) => existsSync(c));
  assert.ok(npmCli, "npm-cli.js not found next to node executable");
  const pack = spawnSync(
    process.execPath,
    [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
    },
  );
  assert.equal(pack.status, 0, `npm pack failed: ${pack.stderr || pack.stdout}`);
  const payload = JSON.parse(pack.stdout.trim()) as Array<{
    files?: Array<{ path?: string }>;
    filename?: string;
  }>;
  const entry = Array.isArray(payload) ? payload[0] : payload;
  const paths = new Set(
    (entry.files ?? [])
      .map((f) => f.path ?? "")
      .filter((p) => p.length > 0)
      .map((p) => p.replace(/\\/g, "/")),
  );
  const required = [
    ".gsd/capabilities/aidlc-governance/capability.json",
    ".gsd/capabilities/aidlc-governance/skills/aidlc-governance-discuss/SKILL.md",
    ".gsd/capabilities/aidlc-governance/skills/aidlc-governance-plan/SKILL.md",
    ".gsd/capabilities/aidlc-governance/skills/aidlc-governance-execute/SKILL.md",
    ".gsd/capabilities/aidlc-governance/skills/aidlc-governance-verify/SKILL.md",
    ".gsd/capabilities/aidlc-governance/skills/aidlc-governance-ship/SKILL.md",
    ".gsd/capabilities/aidlc-governance/skills/aidlc-governance-audit/SKILL.md",
    ".claude/skills/aidlc-governance-discuss/SKILL.md",
    ".claude/skills/aidlc-governance-plan/SKILL.md",
    ".claude/skills/aidlc-governance-execute/SKILL.md",
    ".claude/skills/aidlc-governance-verify/SKILL.md",
    ".claude/skills/aidlc-governance-ship/SKILL.md",
    ".claude/skills/aidlc-governance-audit/SKILL.md",
    "docs/onboarding.md",
    "docs/java-spring-coverage.md",
    "docs/governance-workflow.md",
  ];
  for (const rel of required) {
    assert.ok(paths.has(rel), `tarball missing ${rel}`);
  }
  // Supported install path remains gsd-tools capability install on packaged capability dir
  const manifest = JSON.parse(
    read(".gsd/capabilities/aidlc-governance/capability.json"),
  ) as { skills?: string[] };
  assert.deepEqual(
    (manifest.skills ?? []).slice().sort(),
    [
      "aidlc-governance-audit",
      "aidlc-governance-discuss",
      "aidlc-governance-execute",
      "aidlc-governance-plan",
      "aidlc-governance-ship",
      "aidlc-governance-verify",
    ].sort(),
  );
  // document the supported consumer path in package contract
  assert.ok(
    read("docs/onboarding.md").includes(
      "node_modules/@opengsd/gsd-aidlc-overlay/.gsd/capabilities/aidlc-governance",
    ),
  );
});
function resolveGsdTools(): string | null {
  const candidates = [
    path.join(process.env.APPDATA ?? "", "npm", "node_modules", "@opengsd", "gsd-core", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(process.env.APPDATA ?? "", "npm", "node_modules", "@opengsd", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(homedir(), ".claude", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(homedir(), ".codex", "gsd-core", "bin", "gsd-tools.cjs"),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

test("isolated GSD capability install activates six skills and hooks", () => {
  const gsdTools = resolveGsdTools();
  if (gsdTools === null) {
    if (process.env.REQUIRE_GSD_INSTALL === "1") {
      assert.fail(
        "gsd-tools.cjs not found under APPDATA npm or ~/.claude|~/.codex gsd-core (REQUIRE_GSD_INSTALL=1)",
      );
    }
    // Keep Windows/CI hosts green when GSD Core is not installed locally.
    // Mirrors consent tests' broad candidate set; do not silently pass without a note.
    console.log(
      "skip: isolated GSD capability install — gsd-tools.cjs not found in APPDATA npm / ~/.claude / ~/.codex",
    );
    return;
  }
  const tools = gsdTools;

  const stems = [
    "aidlc-governance-audit",
    "aidlc-governance-discuss",
    "aidlc-governance-execute",
    "aidlc-governance-plan",
    "aidlc-governance-ship",
    "aidlc-governance-verify",
  ];
  const probe = mkdtempSync(path.join(tmpdir(), "aidlc-install-"));
  const home = path.join(probe, "home");
  const proj = path.join(probe, "proj");
  const claude = path.join(probe, "claude");
  const capSrc = path.join(ROOT, ".gsd", "capabilities", "aidlc-governance");

  try {
    mkdirSync(home, { recursive: true });
    mkdirSync(path.join(proj, ".planning"), { recursive: true });
    mkdirSync(path.join(claude, "skills"), { recursive: true });
    writeFileSync(
      path.join(proj, ".planning", "config.json"),
      JSON.stringify({ governance: { enabled: true } }, null, 2),
    );

    const install = spawnSync(
      process.execPath,
      [tools, "capability", "install", capSrc, "--scope", "project", "--yes", "--raw", "--cwd", proj],
      {
        encoding: "utf8",
        shell: false,
        env: { ...process.env, GSD_HOME: home, CLAUDE_CONFIG_DIR: claude },
      },
    );
    assert.equal(install.status, 0, "capability install failed: " + (install.stderr || install.stdout));
    const installOut = JSON.parse(install.stdout.trim()) as { status?: string; id?: string };
    assert.equal(installOut.status, "installed");
    assert.equal(installOut.id, "aidlc-governance");

    const installedCap = path.join(proj, ".gsd", "capabilities", "aidlc-governance");
    for (const stem of stems) {
      assert.ok(
        existsSync(path.join(installedCap, "skills", stem, "SKILL.md")),
        "installed bundle missing skill " + stem,
      );
    }

    writeFileSync(
      path.join(claude, ".gsd-surface.json"),
      JSON.stringify(
        {
          baseProfile: "full",
          disabledClusters: [],
          explicitAdds: stems,
          explicitRemoves: [],
        },
        null,
        2,
      ),
    );

    const state = spawnSync(
      process.execPath,
      [tools, "capability", "state", "--raw", "--cwd", proj],
      {
        encoding: "utf8",
        shell: false,
        env: { ...process.env, GSD_HOME: home, CLAUDE_CONFIG_DIR: claude },
      },
    );
    assert.equal(state.status, 0, "capability state failed: " + (state.stderr || state.stdout));
    const envelope = JSON.parse(state.stdout.trim()) as {
      capabilities?: Array<{
        id?: string;
        installed?: boolean;
        surfaced?: boolean;
        active?: boolean;
        skills?: string[];
      }>;
    };
    const cap = (envelope.capabilities ?? []).find((c) => c.id === "aidlc-governance");
    assert.ok(cap, "aidlc-governance missing from capability state");
    assert.equal(cap!.installed, true);
    assert.equal(cap!.surfaced, true);
    assert.equal(cap!.active, true);
    assert.deepEqual((cap!.skills ?? []).slice().sort(), stems.slice().sort());

    for (const point of ["discuss:pre", "plan:pre", "execute:pre", "verify:post", "ship:pre"] as const) {
      const hookRun = spawnSync(
        process.execPath,
        [tools, "loop", "render-hooks", point, "--raw", "--cwd", proj],
        {
          encoding: "utf8",
          shell: false,
          env: { ...process.env, GSD_HOME: home, CLAUDE_CONFIG_DIR: claude },
        },
      );
      assert.equal(
        hookRun.status,
        0,
        "render-hooks " + point + " failed: " + (hookRun.stderr || hookRun.stdout),
      );
      const hook = JSON.parse(hookRun.stdout.trim()) as {
        activeHooks?: unknown[];
        rendered?: string;
      };
      assert.ok(
        Array.isArray(hook.activeHooks) && hook.activeHooks.length > 0,
        "no active hooks at " + point,
      );
      assert.ok(
        typeof hook.rendered === "string" && !hook.rendered.includes("No active hooks"),
        "render-hooks " + point + " reported no active hooks",
      );
    }

    // Real package-layout install: pack + npm install into consumer node_modules,
    // then execute discuss/plan/verify through the package governance binary
    // (not bare node dist/...). Skills resolve via require.resolve of the package.
    const packDir = path.join(probe, "pack");
    mkdirSync(packDir, { recursive: true });
    const npmCliCandidates = [
      path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
      path.join(path.dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    ];
    const npmCli = npmCliCandidates.find((c) => existsSync(c));
    assert.ok(npmCli, "npm-cli.js not found next to node executable");
    const pack = spawnSync(
      process.execPath,
      [npmCli, "pack", "--pack-destination", packDir, "--ignore-scripts"],
      { cwd: ROOT, encoding: "utf8", shell: false },
    );
    assert.equal(pack.status, 0, "npm pack failed: " + (pack.stderr || pack.stdout));
    const tgz = readdirSync(packDir).find((f) => f.endsWith(".tgz"));
    assert.ok(tgz, "pack produced no tgz");
    const consumer = path.join(probe, "consumer");
    mkdirSync(path.join(consumer, ".planning"), { recursive: true });
    writeFileSync(
      path.join(consumer, "package.json"),
      JSON.stringify({ name: "consumer-app", private: true }, null, 2),
    );
    writeFileSync(
      path.join(consumer, ".planning", "config.json"),
      JSON.stringify(
        {
          governance: {
            enabled: true,
            domains: "java-spring",
            coverage_report_path: "build/reports/jacoco/test/jacocoTestReport.xml",
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      path.join(consumer, ".planning", "STATE.md"),
      [
        "---",
        "gsd_state_version: 1.0",
        "current_phase: 18",
        "status: executing",
        "---",
        "",
      ].join("\n"),
    );
    const installPkg = spawnSync(
      process.execPath,
      [npmCli, "install", path.join(packDir, tgz), "--ignore-scripts", "--no-save"],
      { cwd: consumer, encoding: "utf8", shell: false },
    );
    assert.equal(
      installPkg.status,
      0,
      "consumer npm install failed: " + (installPkg.stderr || installPkg.stdout),
    );
    const overlayRoot = path.join(
      consumer,
      "node_modules",
      "@opengsd",
      "gsd-aidlc-overlay",
    );
    assert.ok(existsSync(overlayRoot), "overlay missing under consumer node_modules");
    const bin = path.join(overlayRoot, "bin", "governance.cjs");
    assert.ok(existsSync(bin), "governance binary missing in installed package");

    const indexBuild = spawnSync(
      process.execPath,
      [
        bin,
        "build-index",
        "--root",
        path.join(overlayRoot, "aidlc-rules"),
        "--out",
        path.join(consumer, "rule-index.json"),
      ],
      { cwd: consumer, encoding: "utf8", shell: false },
    );
    assert.equal(
      indexBuild.status,
      0,
      "build-index failed: " + (indexBuild.stderr || indexBuild.stdout),
    );

    const signalPath = path.join(consumer, "signal.json");
    writeFileSync(
      signalPath,
      JSON.stringify({
        taskType: "feature",
        keywords: ["java", "coverage"],
        paths: ["service/src/main/java/com/example/Service.java"],
      }),
    );
    const discuss = spawnSync(
      process.execPath,
      [bin, "discuss", consumer, signalPath, "--domains", "java-spring"],
      { cwd: consumer, encoding: "utf8", shell: false },
    );
    assert.equal(discuss.status, 0, "discuss failed: " + (discuss.stderr || discuss.stdout));
    assert.ok(discuss.stdout.length > 0, "discuss produced no fragment");
    assert.ok(
      existsSync(path.join(consumer, ".planning", "governance", "selection-state.json")),
      "discuss must persist selection-state",
    );

    const planInputs = path.join(consumer, "plan-inputs.json");
    writeFileSync(
      planInputs,
      JSON.stringify({
        phaseGoal: "Implement Java coverage gate",
        requirementIds: ["GATE-04"],
        riskThreatModel: ["Threat: forged coverage evidence."],
        acceptanceCriteria: ["Coverage adapter blocks below threshold."],
        impactedFiles: ["orders/src/main/java/com/example/OrderService.java"],
        impactedModules: ["orders/src/main/java"],
      }),
    );
    const plan = spawnSync(
      process.execPath,
      [bin, "plan", consumer, "18", planInputs],
      { cwd: consumer, encoding: "utf8", shell: false },
    );
    assert.equal(plan.status, 0, "plan failed: " + (plan.stderr || plan.stdout));
    assert.ok(
      existsSync(path.join(consumer, ".planning", "governance", "gates", "18-plan.json")),
      "plan must write 18-plan.json",
    );

    const reportRel = "build/reports/jacoco/test/jacocoTestReport.xml";
    const reportAbs = path.join(consumer, reportRel);
    mkdirSync(path.dirname(reportAbs), { recursive: true });
    const fixture = path.join(ROOT, "test", "fixtures", "coverage", "jacoco", "pass-70.xml");
    writeFileSync(reportAbs, readFileSync(fixture));

    const verify = spawnSync(
      process.execPath,
      [bin, "verify", consumer, "18"],
      { cwd: consumer, encoding: "utf8", shell: false },
    );
    assert.equal(verify.status, 0, "verify failed: " + (verify.stderr || verify.stdout));
    const verifyPath = path.join(consumer, ".planning", "governance", "gates", "18-verify.json");
    assert.ok(existsSync(verifyPath), "verify must write 18-verify.json");
    const verifyEv = JSON.parse(readFileSync(verifyPath, "utf8"));
    assert.equal(verifyEv.result && verifyEv.result.status, "pass");
    assert.equal(verifyEv.result && verifyEv.result.evaluatedBy, "coverage-report");
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
});
