/**
 * Pure LCOV parser contracts (Phase 17 Task 1 RED / Task 2 GREEN).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseLcov } from "./parse-lcov.js";

const FIX = path.resolve(process.cwd(), "test", "fixtures", "coverage", "lcov");

function load(name: string): string {
  return readFileSync(path.join(FIX, name), "utf8");
}

test("parseLcov(pass-70) aggregates LF/LH → covered=7 total=10", () => {
  const c = parseLcov(load("pass-70.info"));
  assert.deepEqual(c, { covered: 7, total: 10 });
});

test("parseLcov(fail-below-70) → covered=6 total=10", () => {
  const c = parseLcov(load("fail-below-70.info"));
  assert.deepEqual(c, { covered: 6, total: 10 });
});

test("parseLcov(zero-lines) → covered=0 total=0", () => {
  const c = parseLcov(load("zero-lines.info"));
  assert.deepEqual(c, { covered: 0, total: 0 });
});

test("parseLcov throws on incomplete/unterminated record (malformed)", () => {
  assert.throws(() => parseLcov(load("malformed.info")), /./);
});

test("parseLcov throws on duplicate LF in one record", () => {
  assert.throws(() => parseLcov(load("duplicate-lf.info")), /./);
});

test("parseLcov throws when LH > LF", () => {
  assert.throws(() => parseLcov(load("lh-gt-lf.info")), /./);
});

test("parseLcov empty file returns zero counters", () => {
  assert.deepEqual(parseLcov(""), { covered: 0, total: 0 });
});

test("parseLcov throws on duplicate LH in one record", () => {
  const text = "SF:a.java\nLF:3\nLH:1\nLH:2\nend_of_record\n";
  assert.throws(() => parseLcov(text), /./);
});

test("parseLcov throws on non-integer LF", () => {
  const text = "SF:a.java\nLF:abc\nLH:1\nend_of_record\n";
  assert.throws(() => parseLcov(text), /./);
});


test("parseLcov accepts CR-only line endings (WR-03)", () => {
  const text = "SF:a.java\rLF:10\rLH:7\rend_of_record\r";
  assert.deepEqual(parseLcov(text), { covered: 7, total: 10 });
});

test("parseLcov tolerates indented LF/LH fields (WR-03)", () => {
  const text = "SF:a.java\n  LF:10\n\tLH:7\nend_of_record\n";
  assert.deepEqual(parseLcov(text), { covered: 7, total: 10 });
});

test("parseLcov throws on non-empty non-LCOV text with zero complete records (WR-06)", () => {
  assert.throws(() => parseLcov("<report><counter type=\"LINE\" missed=\"0\" covered=\"100\"/></report>"), /no complete records/);
  assert.throws(() => parseLcov("this is not lcov at all"), /no complete records/);
});

test("parseLcov whitespace-only returns zero counters (WR-06)", () => {
  assert.deepEqual(parseLcov("   \n\t  \n"), { covered: 0, total: 0 });
});
