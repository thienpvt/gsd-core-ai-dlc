/**
 * Pure LCOV line-coverage parser (JAVA-COV-02/03).
 *
 * Aggregates record-level LF/LH across complete end_of_record records.
 * Rejects duplicate LF/LH, incomplete records, LH > LF, unsafe integers.
 */

import type { LineCounter } from "./parse-jacoco.js";

export type { LineCounter };

function parseNonNegSafeInt(raw: string, label: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`lcov: ${label} must be a non-negative integer, got '${raw}'`);
  }
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`lcov: ${label} is not a safe non-negative integer`);
  }
  return n;
}

export function parseLcov(text: string): LineCounter {
  if (typeof text !== "string") {
    throw new Error("lcov: non-string input");
  }
  if (text.length === 0) {
    return { covered: 0, total: 0 };
  }

  let inRecord = false;
  let recordLf: number | null = null;
  let recordLh: number | null = null;
  let total = 0;
  let covered = 0;

  // Normalize line endings; keep empty lines harmless.
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("SF:")) {
      if (inRecord) {
        throw new Error("lcov: nested/overlapping SF without end_of_record");
      }
      inRecord = true;
      recordLf = null;
      recordLh = null;
      continue;
    }
    if (line.startsWith("LF:")) {
      if (!inRecord) {
        throw new Error("lcov: LF outside of a record");
      }
      if (recordLf !== null) {
        throw new Error("lcov: duplicate LF in record");
      }
      recordLf = parseNonNegSafeInt(line.slice(3), "LF");
      continue;
    }
    if (line.startsWith("LH:")) {
      if (!inRecord) {
        throw new Error("lcov: LH outside of a record");
      }
      if (recordLh !== null) {
        throw new Error("lcov: duplicate LH in record");
      }
      recordLh = parseNonNegSafeInt(line.slice(3), "LH");
      continue;
    }
    if (line === "end_of_record") {
      if (!inRecord || recordLf === null || recordLh === null) {
        throw new Error("lcov: incomplete record (missing SF/LF/LH)");
      }
      if (recordLh > recordLf) {
        throw new Error("lcov: LH > LF inconsistent");
      }
      const nextTotal = total + recordLf;
      const nextCovered = covered + recordLh;
      if (!Number.isSafeInteger(nextTotal) || !Number.isSafeInteger(nextCovered)) {
        throw new Error("lcov: aggregate overflow");
      }
      total = nextTotal;
      covered = nextCovered;
      inRecord = false;
      recordLf = null;
      recordLh = null;
      continue;
    }
    // Other LCOV records (TN, DA, FN, …) ignored.
  }

  if (inRecord) {
    throw new Error("lcov: unterminated record (missing end_of_record)");
  }

  return { covered, total };
}
