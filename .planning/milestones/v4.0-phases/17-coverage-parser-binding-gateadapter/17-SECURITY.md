---
phase: 17
slug: coverage-parser-binding-gateadapter
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-12
---

# Phase 17 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Consumer report path → filesystem | Untrusted relative path enters Node filesystem APIs | Project root, report path, file metadata |
| Coverage report → parser | Untrusted JaCoCo XML or LCOV text enters structural parsers | Report bytes and numeric counters |
| GateAdapter → `runAdapter` | Adapter output crosses the schema and identity boundary | `GateResult` status, findings, evidence |
| Rule Markdown → `buildIndex` | Authored binding metadata becomes selectable governance | Classification, enforcement, triggers, summary |
| Rule body/detail → injection | Full prose must remain lazy while summaries enter model context | Summary text, detail reference, body canary |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-17-01 | Information Disclosure | Coverage report path resolution | high | mitigate | Reject absolute paths; lexical and canonical containment; post-open containment and descriptor/path identity checks | closed |
| T-17-02 | Tampering | Report path traversal | high | mitigate | Reject root escapes before read; re-resolve and bind the opened file identity before consuming bytes | closed |
| T-17-03 | Denial of Service | Oversized report read | high | mitigate | Open regular files only; bounded read of at most 8 MiB plus one sentinel byte; oversize fails closed | closed |
| T-17-04 | Denial of Service | XML DTD/entity or ignored-region spoofing | high | mitigate | No DOM parser; reject DTD/entity input; ignore only complete comments, CDATA, and processing instructions; malformed regions fail closed | closed |
| T-17-05 | Tampering | Malformed counters and integer overflow | medium | mitigate | Require non-negative safe integers, validate LCOV consistency, detect aggregate overflow, and compare the 70% threshold with overflow-safe integer arithmetic | closed |
| T-17-06 | Elevation of Privilege | Silent pass on report error | high | mitigate | Missing, malformed, zero-line, low, unsafe-path, oversize, and unknown-format cases emit schema-valid fail results through `runAdapter` | closed |
| T-17-07 | Tampering | Format ambiguity | medium | mitigate | Infer only from `.xml`, `.info`, or `.lcov`; explicit wrong format and unknown suffix fail closed | closed |
| T-17-08 | Information Disclosure | Evidence path leakage | medium | mitigate | Attach evidence paths only when they are safe project-relative paths | closed |
| T-17-09 | Tampering | Nested JaCoCo counter spoofing | medium | mitigate | Accept exactly one direct child report-root `LINE` counter; ignore nested counters; reject missing or duplicate roots | closed |
| T-17-10 | Tampering | Binding rule without enforcement | high | mitigate | Rule is `classification: binding` with `enforcement: coverage-report`; existing schema/index guards reject missing enforcement | closed |
| T-17-11 | Information Disclosure | Full rule body in injection | medium | mitigate | One-sentence summary plus lazy `detailPath`; BODY_CANARY tests prove index and injection quarantine | closed |
| T-17-12 | Elevation of Privilege | Circular coverage obligation on non-production work | medium | mitigate | Exclude docs/test/infra tasks and test/generated/build/target paths | closed |
| T-17-13 | Spoofing | Incorrect rule-to-finding attribution | high | mitigate | Stable `java-spring-unit-line-coverage:coverage-report` token; absent-rule failure uses a non-matching ID | closed |
| T-17-14 | Tampering | Selector overreach from OR-combined axes | medium | mitigate | Paths-only positive triggers; no positive task type or keywords; non-Java feature/bugfix/refactor negatives | closed |
| T-17-SC | Tampering | Package installation surface | high | accept | Zero new packages; parsers and filesystem controls use Node stdlib; seven stub registries remain unchanged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-17-01 | T-17-SC | No dependency was added; the accepted disposition records absence of new supply-chain exposure | Phase 17 plan | 2026-07-12 |
| R-17-02 | T-17-01, T-17-02 | A hostile concurrent swap after the post-open identity check remains a Node stdlib ceiling. The implementation closes practical lexical, canonical, symlink, post-open containment, and identity paths; `ponytail:` names `openat2` or handle-based resolution as the upgrade path. | Phase 17 clean review IN-01 | 2026-07-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-12 | 15 | 15 | 0 | GSD secure-phase, ASVS L1 |

Evidence: focused Phase 17 validation passed 84 tests with 4 Windows symlink-permission skips and 0 failures; deterministic post-open containment and identity tests remained active. Full suite passed 602 tests with 7 platform skips and 0 failures. Deep review closed all critical and warning findings; three residual items remain documented informational ceilings.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-12
