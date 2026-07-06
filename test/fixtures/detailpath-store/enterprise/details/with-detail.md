## Rule ENT-WD Detail: Advisory Rule Full Body

This is the full detail body for the `with-detail` rule. It lives under
`details/`, which `findRuleFiles` skips, so it is NEVER parsed as an indexed rule
and needs no frontmatter.

`governance rule-detail with-detail` resolves the declaring rule's `detailPath`
(`details/with-detail.md`, relative to the rule file's directory per D-08) and
prints exactly this body — the ONE sanctioned place a rule body surfaces.

DETAIL_BODY_CANARY: the lazy loader fetched the full with-detail rule body.
