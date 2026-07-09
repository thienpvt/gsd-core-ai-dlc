# Phase 14: Hexagonal + Tactical DDD Rules - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two advisory coding-convention rules to the existing subscribe-able `java-spring` domain pack so construction tasks touching domain/application/adapter or aggregate/entity/event paths receive Hexagonal layering and tactical DDD summaries only — never always-on architecture essays. Full prose lives behind `detailPath`. Engine remains frozen (content + tests only). No CQRS (JAVA-CQRS-01 deferred). No logging/API/saga (Phase 15). No examples (Phase 16). No binding coverage (Phase 17).

</domain>

<decisions>
## Implementation Decisions

### Rule Inventory & IDs
- Ship **exactly two** rules matching REQUIREMENTS: `java-spring-hex-layering` (heading `## Rule JS-HEX-01`) and `java-spring-ddd-tactical` (heading `## Rule JS-DDD-01`).
- Both **`classification: advisory`** — ArchUnit/consumer binding is out of scope; no binding-without-adapter theater.
- Live under existing pack root **`aidlc-rules/domain/java-spring/`** (same subscription name as Phase 13).
- **CQRS out of phase** — JAVA-CQRS-01 deferred from v4.0; do not author a cqrs rule here.

### Triggers & Phase Scope
- **Hexagonal (path-primary):** paths `**/domain/**`, `**/application/**`, `**/adapter/**`, `**/adapters/**`, `**/port/**`, `**/ports/**`; multi-token keywords `hexagonal`, `ports-and-adapters`, `inbound-port`, `outbound-port`.
- **DDD tactical (path-primary):** paths `**/domain/**`, `**/*Aggregate*`, `**/*Entity*`, `**/*ValueObject*`, `**/*DomainEvent*`; multi-token keywords `aggregate-root`, `value-object`, `domain-event`, `tactical-ddd` — **no bare** `entity` / `event` / `rest`-style short needles (Phase 13 CR lessons).
- **`phases: [construction]` only** for both rules.
- **Excludes:** `taskType: [docs]` plus test path excludes (`**/*Test*`, `**/*Tests*`, `**/src/test/**`) so README/typo and test-only work do not select HEX/DDD.

### Content, Proof & Engine Freeze
- **One-sentence summaries** (≤ ~160 chars, no newline); essays only under `details/<id>-detail.md` via `detailPath`.
- Prove with **fixture/unit suite** extending pack proofs (extend `java-spring-pack.test.ts` or sibling hex-ddd suite): `domains=[]` → neither HEX/DDD; subscribed + matching paths → select; unrelated non-Java/README → no select; inject has summary only (no body canaries / `## Rule JS-` essays).
- **Zero production `src/` engine edits** — content + tests only.
- Frontmatter ids kebab `java-spring-hex-layering` / `java-spring-ddd-tactical`; body headings JS-HEX-01 / JS-DDD-01.

### Claude's Discretion
- Exact multi-token keyword lists beyond the seeds above (must avoid substring false positives).
- Whether to co-locate tests in existing pack suite vs new `java-spring-hex-ddd.test.ts`.
- Detail prose depth (package maps, example package trees) as long as inject stays summary-only.
- Whether `**/*Entity*` path is too broad in monorepos — may tighten to `**/domain/**/*Entity*` if suite/false-positive probes require it.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 13 pack under `aidlc-rules/domain/java-spring/` (4 rules + details) + `SelectionConfig.domains: ["java-spring"]`
- `loadRules` skips `details/`; `buildIndex` / `select` / `renderInjection` frozen and proven
- Pack suite pattern: `src/select/java-spring-pack.test.ts` (subscription, XOR, path-primary, canaries, CR regression negatives)
- Authoring template: Phase 13 rules (one-sentence summary, advisory, construction, exclude docs/tests)

### Established Patterns
- Domain pack opt-in only when subscribed
- Path-primary + multi-token keywords; no empty always-on style triggers
- Mutual-exclude / fail-open lessons from Phase 13 review (do not use bare short needles)
- Vendor names only in Markdown if any; HEX/DDD content should stay vendor-neutral

### Integration Points
- Same `domains: ["java-spring"]` subscribe path as Phase 13
- Rebuild `rule-index.json` via `governance build-index` after authoring (gitignored)
- Phase 15+ rules continue in same pack directory

</code_context>

<specifics>
## Specific Ideas

- Roadmap success criteria: inward dependencies; domain free of Spring/JPA/framework/gateway types; aggregate root per consistency boundary; immutable VOs; past-tense domain event names; unrelated tasks do not select.
- Phase 13 review CR-01/02/03: never reintroduce bare substring needles that match bank vocabulary.
- Prefer path globs that match common Hexagonal layouts without requiring a specific package naming religion beyond domain/application/adapter.

</specifics>

<deferred>
## Deferred Ideas

- CQRS command/query split (JAVA-CQRS-01) — out of v4.0
- Logging / API / saga rules → Phase 15
- Starter examples under `examples/java-spring/` → Phase 16
- Binding coverage GateAdapter → Phase 17
- Consumer docs → Phase 18
- Strategic DDD / context maps — essay-scale, out of tactical pack
- ArchUnit as binding enforcement — consumer-side future, not this overlay

</deferred>
