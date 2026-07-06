/**
 * Shared atomic-write helper (06-01, TD-03).
 *
 * Replaces the duplicated `atomicWriteText` / `atomicWriteJson` helpers that
 * both used a fixed `${finalPath}.tmp` suffix — a collision that lets
 * concurrent writers clobber each other's temp file. This helper uses a
 * unique temp suffix (`.<pid>-<uuid>.tmp`) so concurrent writers never share
 * a temp path, then atomically renames to the final path.
 *
 * Contract (preserved from the prior temp-then-rename semantics):
 *   - `mkdirSync(dirname, { recursive: true })` — parent dir created if missing
 *   - `writeFileSync(tmp, data, "utf8")` — payload lands in temp first
 *   - `renameSync(tmp, final)` — atomic on POSIX, near-atomic on Windows
 *   - a mid-write crash leaves either the old or the new file, never truncated
 *   - if `renameSync` throws, best-effort `rmSync(tmp, { force: true })` so
 *     repeated failures do not accumulate orphan temps
 *
 * Node stdlib only — no new runtime deps.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Atomically write `data` to `finalPath` via a unique temp file then rename.
 * The temp file uses a `.<pid>-<uuid>.tmp` suffix so concurrent writers cannot
 * clobber each other (TD-03). Parent directories are created if missing.
 */
export function atomicWriteFile(finalPath: string, data: string): void {
  mkdirSync(path.dirname(finalPath), { recursive: true });
  const tmpPath = `${finalPath}.${process.pid}-${randomUUID()}.tmp`;
  try {
    writeFileSync(tmpPath, data, "utf8");
    renameSync(tmpPath, finalPath);
  } catch (err) {
    // Best-effort cleanup so repeated failures don't accumulate orphan temps.
    // rmSync with force:true swallows ENOENT (temp already gone or never made).
    rmSync(tmpPath, { force: true });
    throw err;
  }
}