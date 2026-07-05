---
id: with-detail
scope: enterprise
triggers: {}
phases:
  - construction
severity: medium
summary: Has a detail pointer.
classification: advisory
detailPath: details/with-detail.md
---

## Rule ENT-WD: Advisory Rule That Declares A Detail Pointer

This advisory rule declares a `detailPath` pointer. Phase 1 carries the pointer
verbatim into the index and never resolves, opens, stats, or containment-checks the
target (D-06/D-07/D-08 are deferred to Phase 3). The target file
`details/with-detail.md` is intentionally NOT authored — its absence proves the
pointer is carried, not dereferenced.
