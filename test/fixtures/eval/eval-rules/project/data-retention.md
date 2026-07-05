---
id: data-retention
scope: project
triggers:
  keywords:
    - retention
phases:
  - construction
severity: medium
summary: Project policy — purge personal data within thirty days of account closure.
classification: advisory
---

## Rule PROJ-DR-01: Project Data Retention

This project purges personal data within thirty days of account closure, a
stricter window than the enterprise baseline. Sharing the id `data-retention`, it
is the project WINNER that supersedes the enterprise rule under precedence (D-11).

### Verification

Confirm the retention job deletes personal data within thirty days of account
closure for this project.
