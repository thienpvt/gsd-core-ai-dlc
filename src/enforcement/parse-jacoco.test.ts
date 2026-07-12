/**
 * Pure JaCoCo parser contracts (Phase 17 Task 1 RED / Task 2 GREEN).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseJacoco } from "./parse-jacoco.js";

const FIX = path.resolve(process.cwd(), "test", "fixtures", "coverage", "jacoco");

function load(name: string): string {
  return readFileSync(path.join(FIX, name), "utf8");
}

test("parseJacoco(pass-70) returns covered=7 total=10 (ignores nested counters)", () => {
  const c = parseJacoco(load("pass-70.xml"));
  assert.deepEqual(c, { covered: 7, total: 10 });
});

test("parseJacoco(fail-below-70) returns covered=6 total=10", () => {
  const c = parseJacoco(load("fail-below-70.xml"));
  assert.deepEqual(c, { covered: 6, total: 10 });
});

test("parseJacoco(zero-lines) returns covered=0 total=0", () => {
  const c = parseJacoco(load("zero-lines.xml"));
  assert.deepEqual(c, { covered: 0, total: 0 });
});

test("parseJacoco throws on malformed-structure (independent of DTD)", () => {
  assert.throws(() => parseJacoco(load("malformed-structure.xml")), /./);
});

test("parseJacoco throws on malformed-dtd (DTD/entity rejection)", () => {
  assert.throws(() => parseJacoco(load("malformed-dtd.xml")), /./);
});

test("parseJacoco throws on duplicate root LINE counters", () => {
  assert.throws(() => parseJacoco(load("duplicate-root-line.xml")), /./);
});

test("parseJacoco throws on negative counter attributes", () => {
  assert.throws(() => parseJacoco(load("negative-counter.xml")), /./);
});

test("parseJacoco throws when root LINE counter is missing", () => {
  const xml = `<?xml version="1.0"?><report name="x"><package name="p"><counter type="LINE" missed="1" covered="1"/></package></report>`;
  assert.throws(() => parseJacoco(xml), /./);
});


test("parseJacoco ignores comment-only fake root LINE counter (CR-01 fail-open)", () => {
  const xml = `<?xml version="1.0"?><report><!-- <counter type="LINE" missed="0" covered="100"/> --></report>`;
  assert.throws(() => parseJacoco(xml), /./);
});

test("parseJacoco ignores CDATA-only fake root LINE counter (CR-01 fail-open)", () => {
  const xml = `<?xml version="1.0"?><report><![CDATA[<counter type="LINE" missed="0" covered="100"/>]]></report>`;
  assert.throws(() => parseJacoco(xml), /./);
});

test("parseJacoco accepts real root LINE and ignores commented sample counter (CR-01 false-duplicate)", () => {
  const xml = `<?xml version="1.0"?>
<report name="x">
  <counter type="LINE" missed="30" covered="70"/>
  <!-- sample: <counter type="LINE" missed="0" covered="100"/> -->
</report>`;
  assert.deepEqual(parseJacoco(xml), { covered: 70, total: 100 });
});

test("parseJacoco ignores commented false close around nested counters (CR-01 depth)", () => {
  const xml = `<?xml version="1.0"?>
<report name="x">
  <package name="p">
    <!-- </package> -->
    <counter type="LINE" missed="1" covered="1"/>
  </package>
  <counter type="LINE" missed="3" covered="7"/>
</report>`;
  assert.deepEqual(parseJacoco(xml), { covered: 7, total: 10 });
});

test("parseJacoco throws on unterminated XML comment", () => {
  const xml = `<?xml version="1.0"?><report><!-- <counter type="LINE" missed="0" covered="1"/></report>`;
  assert.throws(() => parseJacoco(xml), /unterminated XML comment/);
});

test("parseJacoco throws on unterminated CDATA", () => {
  const xml = `<?xml version="1.0"?><report><![CDATA[<counter type="LINE" missed="0" covered="1"/></report>`;
  assert.throws(() => parseJacoco(xml), /unterminated CDATA/);
});

test("parseJacoco ignores PI-only fake root LINE counter (CR-02 fail-open)", () => {
  const xml = `<report><?pi <counter type="LINE" missed="0" covered="100"/> ?></report>`;
  assert.throws(() => parseJacoco(xml), /expected exactly one report-root LINE counter/);
});

test("parseJacoco accepts real root LINE and ignores PI sample counter (CR-02)", () => {
  const xml = `<report name="x">
  <counter type="LINE" missed="30" covered="70"/>
  <?sample <counter type="LINE" missed="0" covered="100"/> ?>
</report>`;
  assert.deepEqual(parseJacoco(xml), { covered: 70, total: 100 });
});

test("parseJacoco throws on unterminated processing instruction (CR-02)", () => {
  const xml = `<report><?pi <counter type="LINE" missed="0" covered="1"/></report>`;
  assert.throws(() => parseJacoco(xml), /unterminated processing instruction/);
});

test("parseJacoco ignores PI false close around nested counters (CR-02 depth)", () => {
  const xml = `<report name="x">
  <package name="p">
    <?x </package> ?>
    <counter type="LINE" missed="1" covered="1"/>
  </package>
  <counter type="LINE" missed="3" covered="7"/>
</report>`;
  assert.deepEqual(parseJacoco(xml), { covered: 7, total: 10 });
});

test("parseJacoco throws on nested comment marker (CR-02)", () => {
  const xml = `<report><!-- outer <!-- inner --> <counter type="LINE" missed="0" covered="100"/> --></report>`;
  assert.throws(() => parseJacoco(xml), /nested comment marker/);
});
