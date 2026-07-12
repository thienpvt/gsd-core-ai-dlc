---
phase: 18
fixed_at: 2026-07-13
review_path: .planning/phases/18-verify-ship-wire-consumer-docs/18-REVIEW.md
iteration: 6
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
final_head: 9b6786c
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-07-13
**Iterations:** 6
**Status:** all_fixed

## Summary

- Findings in scope: 15
- Fixed: 15
- Skipped: 0
- Final re-review: clean

## Fixed Areas

### Gate correlation and lifecycle integrity

- Removed full independently-derived TaskSignal/advisory-set equality.
- Correlated binding presence both ways and canonical binding metadata only.
- Accepted legitimate `matchedAxis`/`matchedValue` variance.
- Rejected duplicate binding IDs, metadata tampering, wrong producer/status/phase, and impossible timestamps.
- Invalidated stale verify evidence before any current verify failure.

Commits: `39c4121`, `9282494`, `b756cff`, `99d6e16`, `07bc495`, `64367fc`.

### Consumer capability installation and execution

- Shipped capability, six bundle-local skill bodies, checkout mirrors, docs, and compiled CLI surfaces.
- Removed unavailable plan inputs.
- Added package-owned governance hook subcommands, including a real discuss CLI.
- Proved isolated GSD install, surface activation, hook rendering, and consumer discuss/plan/verify execution.
- Replaced shell-specific package resolution with `npx --no-install governance`.

Commits: `7d8d7f3`, `735bf15`, `93e7c95`, `ca08e8e`, `f23994a`.

### Eval and test evidence integrity

- Shipped the standing eval corpus and resolved it from package root.
- Kept evidence writes under consumer project root.
- Removed the production fixture-root environment override.
- Made zero-test capture fail before evidence persistence.

Commits: `2ce2c74`, `021f14c`, `9b6786c`.

### Config and documentation correctness

- Mapped GSD phase 1 to inception and all later positive phases to construction while operations remains deferred.
- Made governance config the single domain source for hook CLIs.
- Corrected binding-correlation docs.
- Added exact capability surface JSON and verification commands.

Commits: `48f3080`, `13366a9`, `0dd1b83`, `2945317`, `5ae64e4`.

## Verification

- Focused final suite: 65 passed, 0 failed.
- Full suite: 667 total; 660 passed, 7 skipped, 0 failed.
- Final adversarial re-review at `9b6786c`: clean.
- Frozen production enforcement and ship hook unchanged.

---

_Fixed: 2026-07-13_
_Fixer: Claude (gsd-code-fixer)_
_Final iteration: 6_
