import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const REPO_ROOT = process.cwd();
const CONFIG_PATH = path.join(REPO_ROOT, ".planning", "config.json");

// TD-09: gsd-tools must not emit "unknown config key" warnings for the five
// previously-top-level keys. Either they are removed or namespaced under an
// existing block (git / research.tools). The warning masks real config drift
// and erodes trust in the governance overlay's config surface.
const WARNED_KEYS = ["tavily_search", "ref_search", "perplexity", "jina", "quick_branch_template"];

function resolveGsdTools(): string {
  const candidates = [
    path.join(process.env.CODEX_HOME ?? "", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(require("node:os").homedir(), ".codex", "gsd-core", "bin", "gsd-tools.cjs"),
    path.join(require("node:os").homedir(), ".claude", "gsd-core", "bin", "gsd-tools.cjs"),
  ].filter((c) => c);
  return candidates.find((c) => {
    try {
      return require("node:fs").existsSync(c);
    } catch {
      return false;
    }
  }) ?? "";
}

test("TD-09: .planning/config.json is valid JSON", () => {
  const raw = readFileSync(CONFIG_PATH, "utf8");
  assert.doesNotThrow(() => JSON.parse(raw), "config.json must parse");
});

test("TD-09: config.json has no top-level warned keys (removed or namespaced)", () => {
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const cfg = JSON.parse(raw) as Record<string, unknown>;
  for (const key of ["tavily_search", "ref_search", "perplexity", "jina"]) {
    assert.equal(
      cfg[key],
      undefined,
      `top-level "${key}" must be removed from config.json (TD-09)`,
    );
  }
  // quick_branch_template may exist under git.* but not at top level
  assert.equal(
    cfg["quick_branch_template"],
    undefined,
    'top-level "quick_branch_template" must be removed (git.quick_branch_template is the namespaced form)',
  );
});

test("TD-09: gsd-tools emits no unknown-config-key warning for the five keys", (t) => {
  const gsdTools = resolveGsdTools();
  if (!gsdTools) {
    t.skip("gsd-tools.cjs not found in candidate locations");
    return;
  }

  const proc = spawnSync(
    process.execPath,
    [gsdTools, "query", "init.plan-phase", "6"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env },
    },
  );

  const combined = `${proc.stdout}\n${proc.stderr}`;
  for (const key of WARNED_KEYS) {
    assert.doesNotMatch(
      combined,
      new RegExp(`unknown config key[^\\n]*${key}`),
      `gsd-tools must not warn about "${key}" (TD-09)`,
    );
  }
});