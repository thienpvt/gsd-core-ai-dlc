/**
 * AUDIT-04 producer-side capture (D-02, D-03, D-04).
 *
 * Thin orchestrator: spawn `node --test --test-reporter=tap`, feed stdout to
 * parseTapSummary (production wiring — previously orphaned), return a
 * TestEvidenceRecord. The CLI main (runDirect) persists via writeTestEvidence
 * under `.planning/governance/tests/{NN}.json`. parseTapSummary's missing-
 * `# tests N` guard fires BEFORE writeTestEvidence is called, so corrupted or
 * narration-shaped stdout cannot land on disk (D-03/D-04 trust boundary now
 * enforced in the production path).
 *
 * spawnRunner seam is injectable so tests do not spawn a real `node --test`
 * (slow + brittle + env-dependent). Production callers omit the seam; it
 * defaults to defaultSpawnRunner (child_process.spawnSync with hardcoded argv,
 * shell:false — no injection surface, T-09-05-01).
 *
 * Mirrors audit-artifact.ts isDirectRun/runDirect/exitCode=1 convention so the
 * verify:post skill invokes it the same way as the audit writer.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  parseTapSummary,
  writeTestEvidence,
  type TestEvidenceRecord,
} from "./test-evidence.js";

/** Injectable spawn seam — returns captured stdout. Tests substitute a fixture fn. */
export type SpawnRunner = () => string;

export interface CaptureTestEvidenceArgs {
  projectRoot: string;
  phaseNumber: string;
  /** Override the spawn (tests only). Production callers omit → defaultSpawnRunner. */
  spawnRunner?: SpawnRunner;
}

/**
 * Production spawn: `node --test --test-reporter=tap` with hardcoded argv,
 * shell:false (no interpolation surface — T-09-05-01). Uses process.execPath
 * (not bare "node") so a PATH-hijacked binary cannot substitute. Returns
 * stdout — even on test failures, the TAP summary block (`# tests N` / `# pass
 * N` / `# fail N`) is always emitted at the end. If stdout is empty or the
 * process was signal-killed, parseTapSummary will throw on the missing summary
 * line (D-04) — we do NOT pre-validate stdout shape; parseTapSummary owns the
 * trust boundary.
 */
export function defaultSpawnRunner(projectRoot: string): string {
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=tap", "dist-test/**/*.test.js"],
    { cwd: projectRoot, encoding: "utf8", shell: false },
  );
  return result.stdout ?? "";
}

/**
 * Orchestrator: spawn (or inject) → parseTapSummary → return TestEvidenceRecord.
 * Pure-ish: does NOT persist. The CLI main (runDirect) calls writeTestEvidence
 * to persist — this split keeps the function testable in isolation.
 *
 * D-03/D-04: parseTapSummary throws on missing `# tests N` summary line BEFORE
 * the caller persists. The trust boundary fires here, in the production path.
 */
export function captureTestEvidence(args: CaptureTestEvidenceArgs): TestEvidenceRecord {
  const runner = args.spawnRunner ?? (() => defaultSpawnRunner(args.projectRoot));
  const stdout = runner();
  const summary = parseTapSummary(stdout);
  return {
    phase: args.phaseNumber,
    capturedAt: new Date().toISOString(),
    runner: "node --test --test-reporter=tap",
    summary,
  };
}

// ---------------------------------------------------------------------------
// CLI main — mirrors audit-artifact.ts isDirectRun/runDirect/exitCode=1 pattern.
// ---------------------------------------------------------------------------

function runDirect(argv: string[]): void {
  if (argv.length !== 1) {
    throw new Error("usage: node dist/governance/capture-test-evidence.js <phaseNumber>");
  }
  const [phaseNumber] = argv;
  const projectRoot = process.cwd();
  const record = captureTestEvidence({ projectRoot, phaseNumber });
  writeTestEvidence(projectRoot, phaseNumber, record);
  const filePath = path.join(
    projectRoot,
    ".planning",
    "governance",
    "tests",
    `${phaseNumber}.json`,
  );
  process.stdout.write(`capture-test-evidence: persisted ${filePath}\n`);
}

// TD-05: match THIS compiled dist entry specifically, not any file named
// capture-test-evidence.js elsewhere on the PATH. __filename is the runtime
// path of this module under CJS.
function isDirectRun(): boolean {
  const invokedPath = process.argv[1];
  if (invokedPath === undefined) return false;
  return path.resolve(invokedPath) === __filename;
}

if (isDirectRun()) {
  try {
    runDirect(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(
      `capture-test-evidence: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}