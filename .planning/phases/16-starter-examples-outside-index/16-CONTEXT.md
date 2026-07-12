# Phase 16: Starter Examples Outside Index - Context

**Gathered:** 2026-07-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a thin Java/Spring reference skeleton under `examples/java-spring/` that an LLM can mirror for Hexagonal ports, handlers, REST, Kafka, and persistence adapters. The examples stay outside `aidlc-rules/`, remain intentionally partial rather than becoming a runnable sample application, and add zero selectable governance rules. Coverage enforcement remains Phase 17; consumer setup documentation remains Phase 18.

</domain>

<decisions>
## Implementation Decisions

### Starter Shape & Scope
- Ship a reference skeleton, not a runnable Spring/Maven application or a pseudocode-only document.
- Model one thin Hexagonal slice: `domain`, `application/{port,handler}`, and `adapter/{in,out}`.
- Include REST and Kafka inbound adapters plus one persistence outbound adapter.
- Use a neutral order-processing example under `com.example.orders`; avoid bank/vendor coupling.

### Snippet Depth & Contracts
- Use small compile-shaped Java files with package/import/type signatures and core delegation; omit full infrastructure deliberately.
- Keep domain and application port contracts plain Java. Spring/JPA/framework annotations belong only in adapter classes, consistent with JS-HEX-01.
- REST validates/maps and calls an input port. Kafka maps and calls the port while visibly identifying idempotency, retry, and DLQ responsibilities.
- Persistence adapter implements an output port; the concrete persistence mechanism stays intentionally omitted to avoid adding JPA/toolchain dependencies.

### Discoverability & LLM Guidance
- Anchor the tree with one concise `examples/java-spring/README.md` covering purpose, non-runnable ceiling, layout, mirroring guidance, and governing rule IDs.
- Do not edit the existing nine detail files merely to add example links; the stable example tree and README are sufficient for this phase.
- Mark intentional omissions with `ponytail:` comments that name the ceiling and upgrade path.
- Prefer descriptive ports, handlers, and adapters optimized for conceptual clarity rather than generic copy-ready scaffolding.

### Non-Index Guarantee & Proof
- Do not change production loader code: `buildIndex(aidlc-rules/)` already makes the sibling `examples/` tree unreachable.
- Add a focused automated proof against the real `aidlc-rules/` corpus: no indexed `sourceFile` may start with `examples/`, and example canaries/IDs must never appear.
- Keep example Markdown ordinary, without rule-like YAML frontmatter.
- Preserve the production index inventory at ten winners; examples add zero selectable rules.

### Claude's Discretion
- Exact filenames and package depth within the locked Hexagonal tree.
- Exact order command/event names and compact field choices.
- Whether the non-index proof is a new focused test or a small addition to the closest existing index/pack suite.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `aidlc-rules/domain/java-spring/` contains ten selectable Java/Spring rules with lazy details and BODY_CANARY quarantine tests.
- `buildIndex(rootDir)` indexes only the caller-supplied root; production callers pass `aidlc-rules/`.
- Existing Java/Spring suites build the real production corpus and lock its exact inventory.

### Established Patterns
- Content examples and fixtures outside `aidlc-rules/` do not participate in selection.
- Tests use `node:test` + `node:assert/strict`, co-locate under `src/`, and exercise public APIs.
- Deliberate simplifications use `ponytail:` comments naming the ceiling and upgrade path.
- Java pack content keeps framework/vendor concerns out of domain code and production TypeScript identifiers.

### Integration Points
- Add the starter tree at repository root `examples/java-spring/`, as a sibling of `aidlc-rules/`.
- Exercise `buildIndex(path.resolve(process.cwd(), "aidlc-rules"))` for the non-index regression proof.
- Phase 17 may add one binding coverage rule to the Java pack; Phase 18 will link consumer documentation to the examples and coverage setup.

</code_context>

<specifics>
## Specific Ideas

- Neutral order flow: command/input port → handler → output repository port; REST and Kafka adapters call the same use case.
- README explicitly says the tree is a reference mirror, not a generated application or production-ready framework.
- `examples/` must not alter the ten-rule production inventory.

</specifics>

<deferred>
## Deferred Ideas

- Runnable Maven/Gradle application and full multi-module sample — out of scope.
- Concrete JPA repository, database, Kafka broker, retry/DLQ infrastructure, and generated OpenAPI — consumer-owned implementation.
- Coverage rule and real report parser → Phase 17.
- Consumer subscription/report-path documentation and verify/ship wiring → Phase 18.

</deferred>
