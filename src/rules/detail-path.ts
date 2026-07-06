/**
 * Single-sourced detailPath resolver + traversal guard (D-08 + IN-05).
 *
 * ONE function, called by BOTH sites that turn a rule's author-controlled
 * `detailPath` into a filesystem path, so the guard cannot drift (Pitfall 8):
 *   - build-time (D-07): {@link buildIndex} validates every declared detailPath
 *     resolves in-pack AND exists on disk — the primary, authoritative guard,
 *     scoped to the STORE root.
 *   - fetch-time (IN-05 backstop): `governance rule-detail` re-guards before
 *     opening, scoped to the coarser repo/cwd root.
 *
 * The resolver is PURE path math — it reads NO file. Existence checks live in the
 * callers so it stays reusable at both sites. D-08: a relative detailPath resolves
 * against the DECLARING RULE FILE'S DIRECTORY (so relocating a whole pack subtree
 * keeps the pointer valid). IN-05: BEFORE returning any path it rejects an
 * absolute detailPath and any `..`-escape that leaves `packRoot`, throwing a loud
 * error naming the offending path (scope.ts error-message style).
 */
import path from "node:path";

/**
 * Resolve `detailPath` (declared in the rule at `sourceFile`) to an absolute path,
 * enforcing the IN-05 traversal guard against `packRoot` BEFORE returning.
 *
 * @param sourceFile - path to the declaring rule file (absolute or repo-relative).
 * @param detailPath - the author-controlled `detailPath` frontmatter value.
 * @param packRoot   - the containment boundary the resolved target must stay within.
 * @returns the absolute, in-pack path to the detail file (never opened here).
 * @throws if `detailPath` is absolute, or the resolved target escapes `packRoot`.
 */
export function resolveDetailPath(
  sourceFile: string,
  detailPath: string,
  packRoot: string,
): string {
  // IN-05 (part 1): an absolute detailPath is rejected outright — it ignores the
  // rule-file base entirely and could name any file on disk (e.g. /etc/passwd).
  if (path.isAbsolute(detailPath)) {
    throw new Error(
      `detailPath '${detailPath}' must be relative to its rule file, not absolute ` +
        `(IN-05 — an absolute detailPath could point outside the rule pack)`,
    );
  }

  // D-08: resolve relative to the declaring rule file's DIRECTORY, not the pack
  // root or the cwd — so a pack subtree can be relocated wholesale.
  const resolved = path.resolve(path.dirname(path.resolve(sourceFile)), detailPath);

  // IN-05 (part 2): the resolved target must stay inside packRoot. A `..`-escape
  // yields a relative path that is `..`, starts with `../` (or `..\` on Windows),
  // or is itself absolute (different drive) — reject any of those loudly.
  const rel = path.relative(path.resolve(packRoot), resolved);
  if (
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    rel.startsWith("../") ||
    path.isAbsolute(rel)
  ) {
    throw new Error(
      `detailPath '${detailPath}' escapes the rule pack root ` +
        `(IN-05 — a detailPath must not resolve outside its pack via '..')`,
    );
  }

  return resolved;
}
