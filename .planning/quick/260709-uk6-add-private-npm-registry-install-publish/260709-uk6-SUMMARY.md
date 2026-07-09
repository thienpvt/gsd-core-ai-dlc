---
phase: 260709-uk6-add-private-npm-registry-install-publish
plan: 01
subsystem: distribution
tags: [npm, private-registry, publishConfig, npmrc, docs, install]

requires:
  - phase: 260709-ucq-assess-private-org-install
    provides: private-git/local install docs; no public npm ownership claim
provides:
  - package.json publishConfig.registry placeholder for org private registry
  - .npmrc.example scope map + auth token placeholder
  - .npmrc gitignored (secrets stay out of git)
  - README + onboarding primary private-registry install path
  - maintainer publish section (npm run build && npm publish to private registry only)
affects:
  - org install/onboarding
  - maintainer release process

tech-stack:
  added: []
  patterns:
    - "publishConfig.registry + .npmrc.example share one placeholder host"
    - "Primary install = private registry; git/file/git+ssh demoted to Fallback"
    - "Explicit disclaimer: org private registry only, not public npmjs.com"

key-files:
  created:
    - .npmrc.example
  modified:
    - package.json
    - .gitignore
    - README.md
    - docs/onboarding.md

key-decisions:
  - "Kept package name @opengsd/gsd-aidlc-overlay; private registry owns @opengsd scope locally"
  - "Placeholder host npm.example-org.local shared by publishConfig and .npmrc.example"
  - "Auth placeholder pattern: static REPLACE_WITH_ORG_TOKEN (not env interpolation)"
  - "Docs lead with private-registry install; git/file/git+ssh remain as Fallback"
  - "Maintainer publish instructs private registry only — never public npmjs.com"

patterns-established:
  - "Secret-bearing .npmrc gitignored; committed template is .npmrc.example only"
  - "Scope disclaimer blockquote in both README and onboarding"

requirements-completed: [DIST-01, DIST-02, DIST-03]

coverage:
  - id: D1
    description: package.json keeps @opengsd/gsd-aidlc-overlay and publishConfig.registry placeholder
    requirement: DIST-01
    verification:
      - kind: other
        ref: "node -e package.json name + publishConfig.registry check"
        status: pass
    human_judgment: false
  - id: D2
    description: .npmrc.example maps @opengsd + auth placeholder; .npmrc gitignored
    requirement: DIST-02
    verification:
      - kind: other
        ref: "grep @opengsd:registry / _authToken / .gitignore .npmrc"
        status: pass
    human_judgment: false
  - id: D3
    description: README + onboarding lead with private-registry install, disclaimer, fallbacks, maintainer publish
    requirement: DIST-03
    verification:
      - kind: other
        ref: "grep npm install @opengsd/gsd-aidlc-overlay + private registry + npm publish + file:/git+ssh"
        status: pass
    human_judgment: false

duration: 1min
completed: 2026-07-09
status: complete
---

# Phase 260709-uk6: Private npm Registry Install/Publish Summary

**Org private-registry primary path: publishConfig + .npmrc.example + docs; package stays @opengsd/gsd-aidlc-overlay; public npmjs.com ownership never claimed.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-09T15:01:35Z
- **Completed:** 2026-07-09T15:02:53Z
- **Tasks:** 2/2
- **Files modified:** 5

## Accomplishments

- `package.json` gains `publishConfig.registry` placeholder; name unchanged.
- `.npmrc.example` maps `@opengsd` scope + `_authToken=REPLACE_WITH_ORG_TOKEN`; `.npmrc` gitignored.
- README + onboarding lead with private-registry install; disclaimer; git/file/git+ssh fallbacks; maintainer `npm run build && npm publish`.

## Task Commits

Each task was committed atomically:

1. **Task 1: publishConfig + .npmrc.example + gitignore** - `91228d8` (chore)
2. **Task 2: Lead docs with private-registry install + maintainer publish** - `a03880d` (docs)

_Plan docs artifacts (SUMMARY/STATE) left uncommitted per quick-task orchestrator Step 8._

## Files Created/Modified

- `package.json` — `publishConfig.registry` placeholder for org private registry
- `.npmrc.example` — committed scope map + auth placeholder (no secrets)
- `.gitignore` — ignore secret-bearing `.npmrc`
- `README.md` — primary private-registry install, disclaimer, fallbacks, maintainer publish
- `docs/onboarding.md` — same facts, more step-by-step

## Decisions Made

- Keep package name `@opengsd/gsd-aidlc-overlay` — private registry owns scope locally.
- Single placeholder host `https://npm.example-org.local/repository/npm-private/` shared by `publishConfig` and `.npmrc.example`.
- Static `REPLACE_WITH_ORG_TOKEN` auth placeholder (document copy-replace in comments).
- Private registry = primary install; demote prior private-git/local path to Fallback.
- Maintainer publish only against org private registry — never public npmjs.com.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|------------|
| T-uk6-01 Information Disclosure | `.npmrc` gitignored; only `.npmrc.example` with fake placeholders committed |
| T-uk6-02 Spoofing public vs private | Bold disclaimer in both docs; publish section forbids public npmjs.com |
| T-uk6-03 publishConfig mis-point | Same placeholder URL in package.json and `.npmrc.example` |

## Known Stubs

None — placeholders intentional for registry URL/token (org fills real values).

## Issues Encountered

None.

## User Setup Required

None for this repo. Org members must:

1. Copy `.npmrc.example` → `.npmrc`
2. Replace registry URL + token with org values
3. `npm install @opengsd/gsd-aidlc-overlay` (after gsd-core)

## Next Phase Readiness

- Install/publish docs ready for org private registry consumers and maintainers.
- No registry-server scaffolding (by design).
- Ready for operator to wire real org registry URL/token outside this repo.

## Self-Check: PASSED

- FOUND: package.json
- FOUND: .npmrc.example
- FOUND: .gitignore (.npmrc entry)
- FOUND: README.md
- FOUND: docs/onboarding.md
- FOUND: commit 91228d8
- FOUND: commit a03880d
