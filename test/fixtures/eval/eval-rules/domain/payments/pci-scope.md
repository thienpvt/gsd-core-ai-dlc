---
id: pci-scope
scope: domain
triggers:
  keywords:
    - payment
    - card
    - pci
phases:
  - construction
severity: critical
summary: Code touching cardholder data must stay within the documented PCI scope.
classification: advisory
---

## Rule DOM-PAY-01: Keep Within PCI Scope

Any code path handling cardholder data must remain inside the documented PCI
scope boundary. This critical rule sits in the `payments` domain and is a
candidate only when that domain is subscribed.

### Verification

Confirm cardholder-data flows stay within the segmented PCI scope and never leak
into out-of-scope services.
