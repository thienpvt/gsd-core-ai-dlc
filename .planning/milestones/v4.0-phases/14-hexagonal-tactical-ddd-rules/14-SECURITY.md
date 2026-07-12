---
phase: 14
slug: hexagonal-tactical-ddd-rules
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-11
---

# Phase 14 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Rule authors → rule-index.json → select/inject | Authored architecture metadata enters selection and model context | Rule metadata and summaries |
| Domain subscription boundary | Unsubscribed consumers must not receive HEX/DDD guidance | Domain subscription configuration |
| Content store vs engine src | Architecture guidance stays in Markdown; engine remains frozen | Rule prose and trigger metadata |
| Selected summaries → model context | Injection must exclude full detail bodies and essays | Summary text and detail references |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-14-01 | Elevation of Privilege | Unsubscribed domain injection | high | mitigate | Automated `domains=[]` exclusion plus subscribed positive coverage for both rules | closed |
| T-14-02 | Spoofing | False-positive selection | high | mitigate | Multi-token keywords, domain-scoped Entity glob, bank-keyword and infrastructure-Entity negatives | closed |
| T-14-03 | Information Disclosure | Body leak into index/inject | high | mitigate | `details/` quarantine and body-canary/essay-heading absence checks | closed |
| T-14-04 | Denial of Service | Essay summaries or always-on architecture | medium | mitigate | Specific triggers, construction-only scope, docs/test exclusions, one-line summary contract | closed |
| T-14-05 | Spoofing | Binding theater without adapter | medium | mitigate | Both rules explicitly advisory; no enforcement or ArchUnit claim | closed |
| T-14-SC | Tampering | Package installs | low | accept | Zero packages added in Phase 14; no new supply-chain surface | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted implementation risks. T-14-SC records absence of added dependency exposure.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-11 | 6 | 6 | 0 | GSD secure-phase, ASVS L1 |

Evidence: `npm run build:test && node --test dist-test/select/java-spring-hex-ddd.test.js` passed 36/36 on 2026-07-11. Coverage verifies subscription isolation, false-positive negatives, body quarantine, summary limits, and advisory classification.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-11
