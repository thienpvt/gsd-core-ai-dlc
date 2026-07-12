---
phase: 13
slug: domain-pack-service-classification-integrations
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-11
---

# Phase 13 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Rule authors → rule-index.json → select/inject | Authored metadata enters deterministic selection and summary injection | Rule metadata and summaries |
| Domain subscription boundary | Only subscribed consumers may receive Java-Spring conventions | Domain subscription configuration |
| Markdown content vs engine src | Vendor-specific guidance stays in content, outside production engine code | Rule prose and trigger metadata |
| Selected summaries → model context | Injection must exclude full detail bodies | Summary text and detail references |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-13-01 | Spoofing | Outbound class rules | high | mitigate | Symmetric exclusions plus automated XOR, dual-marker, ambiguous, and bare-WebClient fail-open tests | closed |
| T-13-02 | Tampering | Vendor strings in engine | medium | mitigate | Production `src/` vendor-token walk; product name confined to Markdown detail/trigger content | closed |
| T-13-03 | Information Disclosure | Index/inject body leak | high | mitigate | `details/` quarantine, one-sentence summaries, body-canary absence checks against index and injection | closed |
| T-13-04 | Elevation of Privilege | Unsubscribed domain injection | high | mitigate | Domain scope plus automated `domains=[]` exclusion and `domains=["java-spring"]` inclusion tests | closed |
| T-13-05 | Denial of Service | Essay summaries or always-on triggers | medium | mitigate | Specific non-empty triggers, construction-only inbound rules, one-sentence summary assertions | closed |
| T-13-06 | Spoofing | Binding theater without adapter | medium | mitigate | All four rules remain explicitly advisory; no enforcement field | closed |
| T-13-SC | Tampering | Package installs | low | accept | Zero packages added in Phase 13; no new supply-chain surface | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted implementation risks. T-13-SC records absence of added dependency exposure.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-11 | 7 | 7 | 0 | GSD secure-phase, ASVS L1 |

Evidence: `npm run build:test && node --test dist-test/select/java-spring-pack.test.js` passed 27/27 on 2026-07-11. The suite verifies subscription isolation, classification fail-open behavior, vendor boundary, summary-only injection, detail quarantine, and negative trigger regressions.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-11
