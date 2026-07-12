# JS-COV-01 Detail: Unit Line Coverage

## Rule restatement

New or changed Java production behavior under construction requires aggregate **unit-test line coverage ≥ 70%**, verified by a real coverage report. Binding enforcement contract id: `coverage-report`.

## Measurement contract

- Metric: **line coverage only** (branch/instruction/method/class out of scope).
- Threshold (integer cross-multiplication): `covered * 100 >= total * 70`. Exactly 70% passes.
- Formats: JaCoCo report-root LINE counter; LCOV LF/LH aggregates.

### JaCoCo XML

- Use the sole report-root direct-child `<counter type="LINE" missed="…" covered="…"/>`.
- Do **not** sum package/class/method/sourcefile counters — hierarchy repeats and summing double-counts.
- `total = missed + covered`; reject missing/duplicate/negative/non-integer root LINE counters.

### LCOV

- Aggregate record-level `LF` (lines found) and `LH` (lines hit) across all complete `end_of_record` blocks.
- Reject duplicate `LF`/`LH` within a record, incomplete records, and inconsistent totals (`LH > LF`).
- Do not mix `DA` per-line rows with summary counters.

## Fail-closed list

- Missing / unreadable / out-of-project-root report
- Unsupported or unknown format
- Oversized report
- Malformed structure / invalid counters
- Zero total lines (no measurable production-line evidence)
- Below-threshold coverage (`covered * 100 < total * 70`)

## When to apply

- Construction phase with domain subscription `java-spring`.
- Paths matching `**/src/main/java/**` or `**/src/main/**/*.java`.
- Path-driven selection only (no positive taskType/keywords — engine OR-combines axes).

## When not

- taskType `docs`, `test`, or `infra` (even with a matching Java production path).
- Paths under `**/src/test/**`, `**/generated/**`, `**/build/**`, `**/target/**`.
- Non-Java production work (TypeScript/Python/docs/package manifests) even for feature/bugfix/refactor.
- Report-file-only edits without a Java production path signal.

## Verification checklist

1. Report present and readable under configured project-relative path.
2. Aggregate line coverage meets `covered * 100 >= total * 70`.
3. Zero-line and malformed reports fail closed.
4. Finding ids on fail contain token `java-spring-unit-line-coverage` for gate status mapping.
5. Injected summary stays one sentence; measurement detail stays behind this detailPath.

BODY_CANARY java-spring-unit-line-coverage
