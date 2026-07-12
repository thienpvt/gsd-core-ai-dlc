/**
 * Pure JaCoCo XML line-coverage parser (JAVA-COV-02/03).
 *
 * RED stub — Task 1. Real structure-aware root LINE counter lands in Task 2.
 */

export interface LineCounter {
  covered: number;
  total: number;
}

export function parseJacoco(_xml: string): LineCounter {
  throw new Error("not implemented");
}
