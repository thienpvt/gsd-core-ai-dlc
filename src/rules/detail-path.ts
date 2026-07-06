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
import { realpathSync } from "node:fs";
import path from "node:path";

/**
 * True when `rel` (a `path.relative` result) points OUTSIDE its base — the shared
 * IN-05 containment predicate. Single-sourced so the lexical check and the
 * realpath-canonicalized check below apply IDENTICAL logic and cannot drift
 * (Pitfall 8). A relative path escapes when it is `..`, starts with `..<sep>` (or
 * a literal `../` on any OS), or is itself absolute (a different Windows drive).
 */
function escapesRoot(rel: string): boolean {
  return (
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    rel.startsWith("../") ||
    path.isAbsolute(rel)
  );
}

/**
 * Canonicalize `p` by following every symlink to its true on-disk path
 * (realpathSync). This is the CR-01 anti-symlink-bypass primitive: the lexical
 * containment check operates on the path STRING and does NOT follow links, but the
 * callers' existsSync/readFileSync DO — so a symlinked target (or symlinked parent
 * dir) that is textually in-pack yet points on disk at an arbitrary file must be
 * caught here. Falls back to the input path when it does not resolve yet (a
 * fetch-time missing target, or a synthetic/not-yet-created root) so the resolver
 * stays usable before the file exists — the caller's own existsSync/readFileSync
 * then fails loud on the genuinely-missing file rather than reading anything.
 * realpathSync reads filesystem link METADATA only, never file CONTENTS, so the
 * no-body guarantee (D-05) is untouched.
 */
function canonicalize(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

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

  // IN-05 (part 2 — LEXICAL first line of defense): the resolved target must stay
  // inside packRoot. A `..`-escape yields a relative path that is `..`, starts with
  // `../` (or `..\` on Windows), or is itself absolute (different drive) — reject
  // any of those loudly. This is textual only; the realpath check below closes the
  // symlink gap it cannot see.
  const rel = path.relative(path.resolve(packRoot), resolved);
  if (escapesRoot(rel)) {
    throw new Error(
      `detailPath '${detailPath}' escapes the rule pack root ` +
        `(IN-05 — a detailPath must not resolve outside its pack via '..')`,
    );
  }

  // IN-05 (part 3 — SYMLINK canonicalization, CR-01): the lexical check above is
  // string math and does NOT follow symlinks, but the callers' existsSync (build,
  // D-07) and readFileSync (fetch) BOTH follow them. So a symlink planted inside a
  // portable/third-party pack (e.g. details/leak.md -> /etc/passwd, or a symlinked
  // parent dir) is textually in-pack yet points on disk at an arbitrary file —
  // defeating the whole IN-05 guarantee. Re-run the SAME containment predicate on
  // the realpath-canonicalized target vs the canonicalized packRoot so a link that
  // escapes on disk is rejected at BOTH build and fetch time. canonicalize() reads
  // only link metadata (never file contents), so the no-body guarantee (D-05) holds.
  // CR-01 symlink guard (cont.): only run the realpath containment check when the
  // target actually resolves. If it doesn't (ENOENT — a not-yet-existing or dangling
  // leaf), fall through with the LEXICAL path the lexical guard above already proved
  // in-pack, and let the caller's existsSync/readFileSync fail loud with the true
  // "missing" cause. Canonicalizing packRoot but not a missing target would otherwise
  // diverge under a symlinked packRoot prefix (e.g. macOS /var -> /private/var) and
  // mislabel a benign missing file as a symlink escape.
  let realTarget: string;
  try {
    realTarget = realpathSync(resolved);
  } catch {
    // Target missing: lexical guard above already proved in-pack. Caller's
    // existsSync/readFileSync fails loud on existence. No symlink hole here —
    // a dangling symlink that resolved ENOENT-on-the-link-target cannot carry
    // an arbitrary-read payload because the caller never opens it.
    return resolved;
  }
  const realRoot = canonicalize(path.resolve(packRoot));
  const realRel = path.relative(realRoot, realTarget);
  if (escapesRoot(realRel)) {
    throw new Error(
      `detailPath '${detailPath}' escapes the rule pack root via a symlink ` +
        `(IN-05 — a detailPath's real on-disk target must stay inside its pack; ` +
        `resolved through links to '${realTarget}')`,
    );
  }

  return resolved;
}
