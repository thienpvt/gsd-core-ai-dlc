---
id: data-retention
scope: enterprise
triggers:
  keywords:
    - retention
phases:
  - construction
severity: medium
summary: Enterprise default — retain personal data no longer than the baseline window.
classification: advisory
---

## Rule ENT-DR-01: Baseline Data Retention

Personal data is retained no longer than the enterprise baseline window unless a
narrower policy applies. This enterprise rule shares the id `data-retention` with
a project rule and is the superseded loser of that precedence collision (D-11).

### Verification

Confirm retention jobs enforce the baseline window where no stricter project
policy overrides it.
