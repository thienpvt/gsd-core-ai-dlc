---
phase: 17-coverage-parser-binding-gateadapter
reviewed: 2026-07-12T18:40:00Z
depth: deep
files_reviewed: 25
files_reviewed_list:
  - .gitignore
  - src/enforcement/parse-jacoco.ts
  - src/enforcement/parse-lcov.ts
  - src/enforcement/coverage-report.ts
  - src/enforcement/parse-jacoco.test.ts
  - src/enforcement/parse-lcov.test.ts
  - src/enforcement/coverage-report.test.ts
  - aidlc-rules/domain/java-spring/java-spring-unit-line-coverage.md
  - aidlc-rules/domain/java-spring/details/java-spring-unit-line-coverage-detail.md
  - src/select/java-spring-coverage.test.ts
  - src/index/precedence.test.ts
  - src/select/starter-examples.test.ts
  - test/fixtures/coverage/jacoco/pass-70.xml
  - test/fixtures/coverage/jacoco/fail-below-70.xml
  - test/fixtures/coverage/jacoco/zero-lines.xml
  - test/fixtures/coverage/jacoco/malformed-structure.xml
  - test/fixtures/coverage/jacoco/malformed-dtd.xml
  - test/fixtures/coverage/jacoco/duplicate-root-line.xml
  - test/fixtures/coverage/jacoco/negative-counter.xml
  - test/fixtures/coverage/lcov/pass-70.info
  - test/fixtures/coverage/lcov/fail-below-70.info
  - test/fixtures/coverage/lcov/zero-lines.info
  - test/fixtures/coverage/lcov/malformed.info
  - test/fixtures/coverage/lcov/duplicate-lf.info
  - test/fixtures/coverage/lcov/lh-gt-lf.info
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-07-12T18:40:00Z
**Depth:** deep
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Phase 17 ships pure JaCoCo/LCOV parsers, a factory-only `coverage-report` GateAdapter, binding rule `java-spring-unit-line-coverage`, fixtures, and inventory 10→11 locks. Threshold math, DTD/entity hard-reject, path absolute/traversal lexical checks, size ceiling, `runAdapter` identity, finding-id token, and STUB_NAMES=7 are largely sound.

**Primary defect:** `parseJacoco` tag scanner does not ignore XML comments or CDATA. Adversarial inputs achieve fail-open 100% coverage from non-element text, and legitimate root counters paired with commented samples false-reject as duplicates. That breaks the binding measurement contract and T-17-06 fail-closed disposition.

Cross-file path containment mirrors `detail-path.ts` closely; symlink realpath branch exists but suite did not execute symlink cases on this Windows host (EPERM). Phase 18 wiring absence not scored.

## Narrative Findings (AI reviewer)

### Critical Issues

### CR-01: parseJacoco treats comment/CDATA text as real tags (fail-open coverage)

**File:** `src/enforcement/parse-jacoco.ts:45-103`
**Issue:** Tag regex `tagRe` scans the entire string with no comment/CDATA lexer. `<!-- … -->` and `<![CDATA[…]]>` bodies that contain `<counter type="LINE" …/>` are parsed as real elements at whatever depth the unclosed comment text implies.

**Failure scenarios (reproduced against `dist/enforcement/parse-jacoco.js`):**

1. **Fail-open pass:** comment-only or CDATA-only fake root counter accepted as measurable coverage:
   ```xml
   <report><!-- <counter type="LINE" missed="0" covered="100"/> --></report>
   ```
   and
   ```xml
   <report><![CDATA[<counter type="LINE" missed="0" covered="100"/>]]></report>
   ```
   both return `{ covered: 100, total: 100 }` → adapter `meetsThreshold` → **status pass** with no real report evidence.

2. **False fail on valid-shaped report + annotation:** real root LINE plus a comment that mentions a counter throws `duplicate root LINE counters`:
   ```xml
   <report>
     <counter type="LINE" missed="30" covered="70"/>
     <!-- note <counter type="LINE" missed="0" covered="0"/> -->
   </report>
   ```

3. **Depth corruption:** `<!-- </package> -->` is treated as a real close, elevating nested counters / unbalancing the stack (throws or mis-attributes depth).

This is not fixture-only: any producer/tooling that embeds sample counters in comments, or an adversary who can write the report path, spoofs ≥70% line coverage. Conflicts with 17-CONTEXT measurement boundary, T-17-06, and JAVA-COV-03 fail-closed intent. Current suite (pass-70 / nested counters only) never exercises comments/CDATA → green tests do not catch it.

**Fix:** Before tag scan (or inside the scanner), strip or skip:
- `<!-- … -->` (non-nested comments)
- `<![CDATA[…]]>`
- optionally `<?…?>` PIs already mostly harmless

Do not feed those regions to `tagRe`. Add fixtures/tests:
- comment-only counter → throw missing root LINE
- CDATA-only counter → throw missing root LINE
- real root + comment containing counter text → `{covered,total}` from real root only
- comment false `</package>` must not elevate nested counters

```ts
function stripIgnoredXmlRegions(xml: string): string {
  return xml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
}
// parseJacoco: rejectDtdAndEntities(xml); xml = stripIgnoredXmlRegions(xml); …
```

---

### Warnings

### WR-01: Non-regular files not rejected (only directories)

**File:** `src/enforcement/coverage-report.ts:159-175`
**Issue:** After `statSync`, code rejects `st.isDirectory()` and oversized files, then reads. No `st.isFile()` (or reject `isFIFO`/`isSocket`/`isCharacterDevice`). A FIFO/device under `projectRoot` can block `readFileSync` or create DoS (T-17-03 residual).

**Fix:**
```ts
if (!st.isFile()) {
  return failResult(request, "coverage report path is not a regular file", evidencePath);
}
```

### WR-02: Size check TOCTOU before read

**File:** `src/enforcement/coverage-report.ts:176-225`
**Issue:** `st.size > MAX` then later `readFileSync(realTarget)`. Between stat and read the file can grow past 8 MiB (or shrink/replace). Classic TOCTOU; threat model lists oversized read as high.

**Fix:** Open with `openSync`/`readSync` capped at `MAX_COVERAGE_REPORT_BYTES + 1` bytes; if more bytes available, fail oversized. Or `fs.readFileSync` into buffer with manual length guard after read (`if (buf.length > MAX) fail`) as defense-in-depth (still races on replace, but bounds memory).

### WR-03: LCOV line ending / indentation brittleness

**File:** `src/enforcement/parse-lcov.ts:38-58`
**Issue:** Split is `text.split(/\r?\n/)` only. Pure `\r` (old Mac) records never terminate → throw unterminated. Lines with leading space/tab before `LF:`/`LH:` fail incomplete (`startsWith` after `trimEnd` only). Still fail-closed, but rejects plausible producer variants and differs from “tolerate trailing `\r`” plan wording for full CR-only files.

**Fix:** Normalize `text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")` then split; `const line = rawLine.trim()` (or trimStart) for record keywords.

### WR-04: Adapter ignores `request.rules` selection set

**File:** `src/enforcement/coverage-report.ts:119-260`
**Issue:** `evaluate` always runs filesystem parse and always emits finding id `java-spring-unit-line-coverage:coverage-report`, even when `request.rules` is empty or only contains other rules (reproduced: `other-rules-only` / `empty-rules` still fail with coverage finding). Phase 18 is expected to choose the adapter, but a mis-wire marks `deriveRuleGateStatuses` for a rule not in the request (or none). Not fail-open, but incorrect gate attribution.

**Fix:** If binding rule id absent from `request.rules`, either no-op pass with no findings, or fail with explicit “coverage adapter invoked without selected binding rule” message; do not invent a rule-token finding for unselected rules.

### WR-05: Symlink escape mitigation untested in suite

**File:** `src/enforcement/coverage-report.ts:184-203`, `src/enforcement/coverage-report.test.ts` (no symlink cases)
**Issue:** realpath containment implements T-17-01, but tests never create leaf/parent symlinks. On this review host symlink creation returned EPERM. A regression in `canonicalize`/`escapesRoot` would not be caught by the 580-test suite.

**Fix:** Add temp-dir tests (skip if `symlinkSync` unsupported) for: file symlink out of root → fail; parent dir symlink out → fail; projectRoot itself symlinked to real tree + in-tree report → pass; dangling symlink → fail closed.

### WR-06: Forced wrong format maps non-LCOV to zero-line, not malformed

**File:** `src/enforcement/coverage-report.ts:229-249`, `src/enforcement/parse-lcov.ts:24-30`
**Issue:** `format: "lcov"` on JaCoCo XML (or arbitrary text without SF records) → `parseLcov` returns `{0,0}` (empty aggregate) → adapter message “zero measurable lines” instead of “malformed”. Still fail-closed, but weakens diagnostics and conflates empty coverage with wrong bytes. Content-sniffing is intentionally out of scope; forced format should still treat “zero records after non-empty input” as malformed or keep zero-line only for truly empty files.

**Fix:** In `parseLcov`, if `text.trim().length > 0` and no complete records contributed, throw `lcov: no complete records`; keep empty-string → `{0,0}`.

---

### Info

### IN-01: Trailing markup after `</report>` ignored when no second root LINE

**File:** `src/enforcement/parse-jacoco.ts:64-103`
**Issue:** After report closes, `inReport=false`; trailing tags do not contribute. Acceptable fail-soft; optional harden: reject non-whitespace after final report close.

### IN-02: Entity rejection also bans predefined entities in attributes

**File:** `src/enforcement/parse-jacoco.ts:28-31`
**Issue:** `/&[A-Za-z_]/` rejects `&amp;`/`&lt;` in report names. Intentional T-17-04 harden; may reject rare real JaCoCo XML with encoded names. Fail-closed — document as supported subset.

### IN-03: Test gap — comment/CDATA/adversarial XML absent from 580 suite

**File:** `src/enforcement/parse-jacoco.test.ts` (entire)
**Issue:** Fixtures cover nested counters, DTD, duplicate root, negative — not comments/CDATA/PI/trailing. CR-01 survives full green suite. Add adversarial cases with CR-01 fix.

### IN-04: `.gitignore` `/coverage/` correctly scopes root c8 output

**File:** `.gitignore:14-15`
**Issue:** None — `/coverage/` keeps `test/fixtures/coverage/**` tracked (`git ls-files` confirms). Intentional Phase 17 hygiene; no defect.

---

## Cross-file / deep-trace notes

| Area | Result |
|------|--------|
| `runAdapter` identity/schema | Factory returns `evaluatedBy: "coverage-report"`, `gateId` echo; tests cover pass/fail via `runAdapter`. OK. |
| `STUB_NAMES` / `ADAPTERS` | Remain 7; `coverage-report` factory-only. OK. |
| Finding id → `deriveRuleGateStatuses` | `java-spring-unit-line-coverage:coverage-report` token-matches rule id. OK when rule selected. |
| Threshold | Integer `covered*100 >= total*70`; exact 70% pass; 69/100 fail; BigInt path for large products. OK (stricter/safer than plan “fail if product overflows”). |
| Rule selection | Paths-only positives; exclude docs/test/infra + test/generated/build/target; BODY_CANARY quarantine; inventory 11. OK. |
| Phase 18 wiring | Deferred by design — not scored. |
| Windows path | Absolute `reportPath` rejected; `..\` traversal rejected; drive-absolute rejected via `path.isAbsolute`. `C:foo` relative quirk resolves under root as `foo` — not an escape. |
| projectRoot trusted | Broad `projectRoot` (e.g. `C:\`) can read any relative file under it then fail parse — config trust boundary, not reportPath escape. |

## Tests run / inspection

- Static read of all 25 scoped sources + 17-CONTEXT/01-PLAN threat model.
- Runtime probes via `dist/enforcement/{parse-jacoco,parse-lcov,coverage-report,run-adapter}.js`:
  - comment/CDATA fail-open and false-duplicate (**CR-01**).
  - LCOV CRLF OK; CR-only / leading-space fail (**WR-03**).
  - Threshold exact 70 / 69/100 / zero covered.
  - Absolute, `..`, unknown suffix, empty path, directory, oversized boundary, forced lcov-on-xml, empty rules.
  - Symlink probes skipped (EPERM).
- Full `npm test` not re-run in this review agent (pre-stated 580/580); defects above are outside current assertions.

## Counts

| Severity | Count |
|----------|------:|
| Critical | 1 |
| Warning  | 6 |
| Info     | 4 |
| **Total**| **11** |

---

_Reviewed: 2026-07-12T18:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
