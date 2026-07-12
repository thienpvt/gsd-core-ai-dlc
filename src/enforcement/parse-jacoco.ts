/**
 * Pure JaCoCo XML line-coverage parser (JAVA-COV-02/03).
 *
 * Structure-aware scan for the sole direct-child report-root LINE counter.
 * No DOM/XML parser, no DTD/entity expansion (fail closed).
 */

export interface LineCounter {
  covered: number;
  total: number;
}

function parseNonNegSafeInt(raw: string, label: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`jacoco: ${label} must be a non-negative integer, got '${raw}'`);
  }
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`jacoco: ${label} is not a safe non-negative integer`);
  }
  return n;
}

/**
 * Reject DTD declarations, entity declarations, and entity references.
 * Fail closed — never expand entities.
 */
function rejectDtdAndEntities(xml: string): void {
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml) || /&#/.test(xml) || /&[A-Za-z_][\w.-]*;/.test(xml)) {
    throw new Error("jacoco: DTD/entity constructs are not allowed");
  }
}

/**
 * Scan tags with nesting depth. Capture the sole report-root direct-child
 * `<counter type="LINE" …/>` (depth === 1 under the report element).
 */
export function parseJacoco(xml: string): LineCounter {
  if (typeof xml !== "string" || xml.length === 0) {
    throw new Error("jacoco: empty or non-string input");
  }
  rejectDtdAndEntities(xml);

  // Match start tags, end tags, and self-closing tags. Attribute values may use " or '.
  const tagRe = /<\/?([A-Za-z_][\w:.-]*)\b([^>]*?)(\/?)>/g;
  let depth = 0;
  let inReport = false;
  let rootLine: { missed: number; covered: number } | null = null;
  let rootLineCount = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(xml)) !== null) {
    const full = m[0];
    const name = m[1].toLowerCase();
    const attrs = m[2] ?? "";
    const selfClose = m[3] === "/" || /\/\s*$/.test(full);
    const isEnd = full.startsWith("</");

    if (isEnd) {
      if (depth <= 0) {
        throw new Error(`jacoco: unexpected closing tag </${name}>`);
      }
      depth -= 1;
      if (name === "report" && depth === 0) {
        inReport = false;
      }
      continue;
    }

    // start or self-closing
    if (name === "report" && depth === 0) {
      inReport = true;
    }

    const currentDepth = depth; // depth of this element's parent

    if (
      inReport &&
      currentDepth === 1 &&
      name === "counter"
    ) {
      const typeMatch = /\btype\s*=\s*(["'])([^"']*)\1/i.exec(attrs);
      const type = typeMatch?.[2] ?? "";
      if (type.toUpperCase() === "LINE") {
        const missedMatch = /\bmissed\s*=\s*(["'])([^"']*)\1/i.exec(attrs);
        const coveredMatch = /\bcovered\s*=\s*(["'])([^"']*)\1/i.exec(attrs);
        if (!missedMatch || !coveredMatch) {
          throw new Error("jacoco: root LINE counter missing missed/covered attributes");
        }
        const missed = parseNonNegSafeInt(missedMatch[2], "missed");
        const covered = parseNonNegSafeInt(coveredMatch[2], "covered");
        rootLineCount += 1;
        if (rootLineCount > 1) {
          throw new Error("jacoco: duplicate root LINE counters");
        }
        rootLine = { missed, covered };
      }
    }

    if (!selfClose) {
      depth += 1;
    }
  }

  if (depth !== 0) {
    throw new Error("jacoco: malformed structure (unbalanced tags)");
  }
  if (rootLineCount !== 1 || rootLine === null) {
    throw new Error("jacoco: expected exactly one report-root LINE counter");
  }

  const total = rootLine.missed + rootLine.covered;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("jacoco: line total overflow or invalid");
  }
  return { covered: rootLine.covered, total };
}
