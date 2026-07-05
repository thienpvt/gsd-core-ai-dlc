/**
 * Rule loader: scan the store, parse frontmatter, validate, quarantine bodies.
 *
 * The gray-matter `content` (Markdown body) is read but deliberately NOT carried
 * onto {@link ParsedRule} — the code-level half of the D-05 / PACK-04 body-leak
 * guarantee (the no-body index schema is the other half, hardened in 01-04).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Frontmatter, ParsedRule } from "../types.js";
import { validateFrontmatter, formatErrors } from "../schema/validate.js";

/** List directory entries as Dirents, treating a genuinely-absent dir as empty. */
function readDirSafe(dir: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    // Only a genuinely-absent path yields an empty listing (a missing root must
    // not crash the build). A directory that exists but cannot be read
    // (permissions, I/O) must fail loud — silently dropping rules can flip a
    // precedence winner, i.e. a governance bypass (CR-01).
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error(
      `${dir}: cannot read rule directory: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Recursively collect `*.md` files under `dir`, skipping any `details/` subtree. */
function findRuleFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readDirSafe(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Detail files live under details/ and are NEVER indexed (D-05).
      if (entry.name === "details") continue;
      out.push(...findRuleFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Normalize an absolute path to a POSIX path relative to the process cwd
 * (the repo root when `build-index` is run from there — Pitfall 5). Splits on
 * both `/` and `\` so the result is POSIX on Windows too, matching deriveScope.
 */
function toRepoRelativePosix(absPath: string): string {
  const rel = path.relative(process.cwd(), absPath);
  return rel.split(/[\\/]/).join("/");
}

/** Parse + validate a single rule file. Throws with the file path on any failure. */
export function loadRuleFile(absPath: string): ParsedRule {
  const raw = readFileSync(absPath, "utf8");

  let data: Record<string, unknown>;
  try {
    // gray-matter defaults to js-yaml safe-load — do NOT enable an unsafe engine.
    ({ data } = matter(raw));
  } catch (err) {
    // T-1-02 mitigation: attach the file path to opaque YAML errors.
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${absPath}: malformed frontmatter: ${msg}`);
  }

  if (!validateFrontmatter(data)) {
    throw new Error(formatErrors(absPath, validateFrontmatter.errors));
  }

  return {
    frontmatter: data as unknown as Frontmatter,
    sourceFile: toRepoRelativePosix(absPath),
    absPath,
  };
}

/**
 * Load every rule under `rootDir`. Bodies are quarantined (never returned).
 * Scope/precedence/detailPath resolution is layered on in 01-03.
 */
export function loadRules(rootDir: string): ParsedRule[] {
  const absRoot = path.resolve(rootDir);
  return findRuleFiles(absRoot)
    .sort() // deterministic order — no reliance on filesystem enumeration order
    .map((abs) => loadRuleFile(abs));
}
