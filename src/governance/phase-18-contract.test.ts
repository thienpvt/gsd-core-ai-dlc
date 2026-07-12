import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
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
test("isolated GSD capability install activates six skills and hooks", () => {
  const candidates = [
    path.join(process.env.APPDATA ?? "", "npm", "node_modules", "@opengsd", "gsd-core", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(process.env.APPDATA ?? "", "npm", "node_modules", "@opengsd", "gsd-core", "bin", "gsd-tools.cjs"),
  ];
  let gsdTools: string | null = null;
  for (const c of candidates) {
    if (c && existsSync(c)) {
      gsdTools = c;
      break;
    }
  }
  if (gsdTools === null) {
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
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
});

