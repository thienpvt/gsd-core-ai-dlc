---
phase: 15
slug: logging-api-contract-saga-decision-rules
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-11
---

# Phase 15 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Rule authors → rule-index.json → select/inject | Authored LOG/API/EVT metadata enters selection and model context | Rule metadata and summaries |
| Domain subscription boundary | Unsubscribed consumers must not receive LOG/API/EVT guidance | Domain subscription configuration |
| Content store vs engine src | Guidance stays in Markdown; engine remains frozen | Rule prose and trigger metadata |
| Advisory guidance vs enforcement | Markdown must not claim binding no-PII or API drift controls | Governance classification and claims |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-15-01 | Elevation of Privilege | Unsubscribed domain injection | high | mitigate | Automated `domains=[]` exclusion plus subscribed positives for all three rules | closed |
| T-15-02 | Spoofing | False-positive selection | high | mitigate | Multi-token keywords; bare `log`, `logger`, and `rest` negatives; tight path globs | closed |
| T-15-03 | Information Disclosure | Body leak or PII guidance failure | high | mitigate | Detail quarantine, body-canary/heading absence checks, summary-only injection; advisory rule forbids PII/secrets | closed |
| T-15-04 | Denial of Service | Essay summaries or always-on guidance | medium | mitigate | Specific triggers, construction-only scope, docs/test exclusions, one-line summaries | closed |
| T-15-05 | Spoofing | Binding theater or saga cargo-cult | medium | mitigate | Advisory classification; no enforcement field; when-NOT single-service ACID/plain-call guidance | closed |
| T-15-SC | Tampering | Package installs | low | accept | Zero packages added in Phase 15; no new supply-chain surface | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted implementation risks. T-15-SC records absence of added dependency exposure. No claim that advisory Markdown alone enforces no-PII logging or API drift prevention.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-11 | 6 | 6 | 0 | GSD secure-phase, ASVS L1 |

Evidence: `npm run build:test && node --test dist-test/select/java-spring-log-api-evt.test.js && node --test dist-test/index/precedence.test.js` passed 46/46 on 2026-07-11. Coverage verifies subscription isolation, bare-needle negatives, body quarantine, summary limits, advisory classification, and saga when-NOT guidance.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-11
