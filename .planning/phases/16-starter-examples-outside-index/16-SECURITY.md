---
phase: 16
slug: starter-examples-outside-index
status: verified
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-07-13
---

# Phase 16 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Repository content → rule index | Only `aidlc-rules/` content may become selectable | Rule metadata/source paths |
| `examples/` → consumers | Static reference snippets, never overlay runtime code | Java source text |
| Package tarball → consumers | `files[]` controls published starter content | Packaged files |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-16-01 | Elevation / Tampering | Examples entering rule index | high | mitigate | Sibling layout; root-scoped loader; source-path/inventory tests; D-10 backstop; no rule frontmatter | closed |
| T-16-02 | Information Disclosure | Starter snippets | low | accept | No credentials, secrets, vendor IDs, or connection strings; static examples only | closed |
| T-16-03 | Tampering | Package omission | medium | mitigate | `files[]` includes `examples`; suite and pack dry-run prove contents | closed |
| T-16-04 | Denial of Service | Accidental full application | low | mitigate | Thin non-runnable stubs; no build/runtime config; documented `ponytail:` ceilings | closed |
| T-16-SC | Supply chain / Tampering | Package installs | high | mitigate | Zero new dependencies or install tasks | closed |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-16-01 | T-16-02 | Public starter shapes intentionally ship for mirroring; content is vendor-free and secret-free, explicitly non-production | Phase 16 Plan 16-01 | 2026-07-12 |

## Verification Evidence

- `src/select/starter-examples.test.ts`: layout, source-path exclusion, D-10 scope backstop, frontmatter rejection, inventory, and package contract.
- `examples/java-spring/README.md`: non-selectable/non-runnable contract.
- `package.json`: publishes `examples`.
- `npm pack --dry-run`: includes the complete Java/Spring starter tree.
- Secret/vendor/build-config scans: clean.
- Focused suite: 13 passed; full regression green.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-13 | 5 | 5 | 0 | GSD security auditor, ASVS L1 |

## Sign-Off

- [x] All threats have dispositions.
- [x] Accepted risk documented.
- [x] `threats_open: 0`.
- [x] `status: verified`.

**Approval:** verified 2026-07-13
