# Pitfalls Research

**Domain:** Adding developer coding-convention rule packs + Java starters + consumer coverage GateAdapter onto existing AI-DLC × GSD governance overlay
**Researched:** 2026-07-09
**Confidence:** HIGH for integration risks grounded in shipped code (`load.ts`, `select.ts`, `adapters.ts`, `runAdapter`, frontmatter schema, `capture-test-evidence.ts`); MEDIUM for bank/Java convention authoring failure modes (inferred from project constraints + corpus-growth patterns)

> **Scope note:** Prior PITFALLS (2026-07-05) covered building the overlay. This file replaces that research for **v4.0** — common mistakes when *adding* coding-convention packs, starter Java examples, and a real consumer-side coverage adapter to the *already-shipped* selection engine + gate contracts. Foundational overlay risks (under-injection, theater, lost state) still apply; they are referenced, not re-derived.

## Critical Pitfalls

### Pitfall 1: Essay rules defeat the engine (summary bloat + detail-as-summary)

**What goes wrong:**
Authors write long Hexagonal/CQRS/DDD essays and paste them into `summary`, or treat the rule body as "the thing that must land in context." Selection engine still injects summaries only — but each summary becomes a paragraph. Token budget (default 2000, `estimateTokens = ceil(len/4)`, `PER_RULE_OVERHEAD = 6`) overflows on a handful of architecture rules. Loud overflow fires; or worse, authors lower severity / widen budget instead of rewriting. Core Value ("summaries only, little enough") dies while the engine "works."

**Why it happens:**
Architecture conventions feel like they need explanation. Schema has `summary` minLength 1 and **no maxLength** (frontmatter.schema.json: "NO maxLength — token-budget cap is… not a Phase 1 constraint"). Authoring guide says "one-line" but nothing hard-fails multi-line essays. Bank teams copy internal wiki pages into rule files.

**How to avoid:**
- Hard authoring contract: summary ≤ ~120 chars / one sentence; body = full guidance under `detailPath` (lazy via `governance rule-detail`).
- Lint at `build-index`: reject summary over N tokens or containing newlines; fail CI.
- One concern per rule ID (ports vs adapters vs aggregates ≠ one mega-rule).
- Measure injected tokens on a "typical construction feature" fixture; treat budget regression as ship-blocker (existing SEL-05 path).

**Warning signs:**
- Summaries with "e.g.", multi-clause "and/or", or pasted package names.
- `governance inject` near/over budget after adding the pack alone.
- Authors open full bodies "because summary is useless."

**Phase to address:**
Coding-convention rule-pack authoring phase (first content phase) + keep budget check in verify.

---

### Pitfall 2: Architecture rules fire on every trivial task

**What goes wrong:**
Hexagonal/CQRS/DDD rules use broad keywords (`service`, `api`, `domain`, `java`, `spring`) or `triggers: {}` (always-in-phase — documented escape hatch). Every bugfix/docs tweak injects the full architecture stack. Precision collapses; teams disable the domain pack; governance theater returns as "noise."

**Why it happens:**
Recall-first habit from critical security rules gets copied onto medium architecture guidance. Keyword matching is **case-insensitive substring** (`select.ts` `matchKeywords`) — `port` hits `report`, `domain` hits every sentence. Empty triggers mean always-in-phase after phase/scope pass. No task-size or "structural change" axis exists in the schema.

**How to avoid:**
- Never `triggers: {}` for architecture style rules. Reserve empty triggers for true non-negotiables (rare).
- Prefer **paths** (`**/domain/**`, `**/application/**`, `**/*Command*.java`) + narrow **taskType** (`feature`, `refactor`) over vague keywords.
- Use `exclude` for tests/docs (`**/*Test.java`, `**/docs/**`, taskType `docs`).
- Severity `medium`/`low` + advisory for style; binding only where a gate can check something real.
- Extend Phase 10 eval corpus with negative cases: "typo fix in README" / "log line change" must **not** select CQRS/DDD rules. Precision regressions block ship for this pack.

**Warning signs:**
- Same 8 architecture rules in every construction inject.
- Eval precision drops after pack lands.
- Devs say "rules always fire, I ignore them."

**Phase to address:**
Architecture-pattern rules phase + selection-eval extension (same milestone wave as pack authoring).

---

### Pitfall 3: Full CQRS/DDD mandated for small/internal services

**What goes wrong:**
Rules say every service needs commands, queries, aggregates, outbox, sagas. LLM scaffolds 12 packages for a 3-endpoint CRUD internal tool. Delivery slows; team blames "governance." Real target (bank microservices that need the complexity) drowns in cargo-cult structure.

**Why it happens:**
Pattern books and bank reference architectures describe the *upper* bound. Rule authors encode the happy-path large service, not the decision tree. No "when NOT to use" in summary; no service-size/risk trigger.

**How to avoid:**
- Split rules: (a) **when to apply** (complexity/risk triggers), (b) **how to structure** when applied.
- Explicit anti-requirements in rule bodies: "CRUD + single DB transaction → layered hexagonal ports OK; skip CQRS/saga."
- Service classification (Internal vs internet-facing) gates *integration* rules, not full DDD.
- Starter examples include a **minimal** service layout *and* a **complex** one; summaries point to the right example ID.
- Advisory for pattern selection; binding only for enforceable boundaries (e.g. no domain→framework imports if a static check exists later).

**Warning signs:**
- Generated PRs with empty `command`/`query` packages and no behavior.
- Rules lack "Do not apply when…".
- Internal batch jobs forced through saga/outbox prose.

**Phase to address:**
Architecture-pattern rules phase (content design) before mass example generation.

---

### Pitfall 4: Bank vendor names baked into engine or every rule

**What goes wrong:**
WSO2, Tibco, SmartVista (or local bank product names) hard-coded in TypeScript selection/adapters, or copy-pasted into every rule summary. Overlay becomes one-bank fork; upgrades and other domains break. PROJECT.md already defers deep SmartVista/legacy protocols — creep reintroduces them via "just one more keyword."

**Why it happens:**
Authors write from the only environment they know. Fastest trigger is the product name. Engine "helpers" grow `if (wso2)` branches instead of data-driven rule content.

**How to avoid:**
- **Engine stays vendor-neutral.** No WSO2/Tibco/SmartVista strings in `src/`. Vendor names live only in rule Markdown / domain pack content.
- Domain pack (`aidlc-rules/domain/banking-java/` or similar) holds bank integration rules; enterprise pack stays generic (ports/adapters, coverage, logging).
- Prefer capability language in summaries: "internet-facing outbound via approved API gateway only" — detail may name WSO2.
- PROJECT out-of-scope still holds: deep SmartVista/DB Configuration protocol ≠ first-class rules this milestone.

**Warning signs:**
- `rg -i 'wso2|tibco|smartvista' src` hits production TS.
- Enterprise-scope rules mention one bank's stack.
- Other domains cannot reuse the pack without edit.

**Phase to address:**
Service-classification + integration-boundary rules phase; enforce with a CI grep on `src/` during that phase.

---

### Pitfall 5: Internal vs External (internet-facing) classification is ambiguous

**What goes wrong:**
Hybrid services (internal domain API that also calls out, or "internal" service exposed via gateway) mis-classified. Rule says JDBC OK; service actually egresses to partner APIs without WSO2. Or reverse: pure internal service blocked from ORM by over-broad "external" triggers. Audit shows rule "applied" while architecture violates intent.

**Why it happens:**
Binary labels without decision procedure. Classification lives only in prose the LLM interprets. No project-level machine signal (path, module tag, config flag) feeds `TaskSignal`.

**How to avoid:**
- Define a **written decision table** in rule detail: internet-facing = accepts traffic from outside trust zone OR initiates outbound to third parties; internal = neither. Hybrids = internet-facing for *outbound* rules.
- Prefer path/module conventions as triggers (`**/adapter/out/http/**`, `**/infrastructure/gateway/**`) over hoping keywords like `external` appear in task text.
- Project config may declare default classification; do not invent new selector axes in engine unless schema phase explicitly adds them — prefer conventions + paths first (lazy).
- Binding enforcement for outbound boundary should eventually be a real gate (dependency/archunit-style or CI policy), not summary-only. This milestone can ship advisory + coverage-style adapter pattern; do not pretend markdown classifies runtime topology.

**Warning signs:**
- Rules use only keywords `internal`/`external` with no path convention.
- Same service matches both rule sets.
- No hybrid example in starters/eval cases.

**Phase to address:**
Service-classification rules phase; eval cases must include hybrid fixtures.

---

### Pitfall 6: Starter examples get indexed and injected as rules

**What goes wrong:**
Java/Spring reference snippets live under `aidlc-rules/**` as `.md` (or examples folder without exclusion). `findRuleFiles` in `load.ts` recursively indexes every `*.md` **except** `details/` directories. Example frontmatter fails validation (build breaks) or passes and injects "Example: PaymentCommandHandler" as governance. LLM treats sample code as mandatory policy.

**Why it happens:**
Natural place for "docs next to rules." Loader only skips directory name `details` — not `examples`, `samples`, `starters`. Any valid frontmatter `.md` becomes a rule.

**How to avoid:**
- Keep starters **outside** the rule store scan roots, e.g. `examples/java-spring-hexagonal/` at repo root or under `docs/examples/`.
- If colocated, put prose under `details/` only (not indexed) and reference via `detailPath`; never give examples standalone rule frontmatter.
- Add build guard: fail if path matches `**/examples/**` or `**/*starter*` under rule roots.
- Starters are **mirrors for the LLM when detail is loaded**, not selected rules. Summaries may say "see example layout X" without embedding the code.

**Warning signs:**
- `rule-index.json` IDs like `sample-order-service`.
- Inject output contains package-private demo code.
- `build-index` starts failing on half-written sample files.

**Phase to address:**
Starter-examples phase — define layout *before* writing samples; add loader/CI guard in same phase.

---

### Pitfall 7: Coverage adapter is theater for *this* monorepo, not consumer Java CI

**What goes wrong:**
"Coverage >70%" ships as binding rule + adapter that shells into this overlay's `node --test` / c8 path (mirrors `capture-test-evidence.ts` → `dist-test/**/*.test.js`) or always `pass` like current `noopAdapter` stubs. Demo green on the TS repo; consumer Java/Spring services never measured. Binding rule + stub pass = classic governance theater (prior Pitfall 3), now with a coverage label.

**Why it happens:**
Existing evidence path is Node-centric. Real JaCoCo/XML/LCOV parsing is more work. `STUB_NAMES` has no coverage entry; `verifyGateHook` defaults to `generic-exit-ci` noop. Pressure to show a "real" adapter without a consumer fixture.

**How to avoid:**
- Adapter contract: **parse consumer-produced coverage artifact** (JaCoCo XML and/or LCOV), compare to threshold (default 0.70), emit schema-valid `GateResult` via `runAdapter` (malformed = hard-fail — keep that).
- Adapter must **not** assume this repo's layout, Node, or c8. Inputs = file path(s) from gate request / env / explicit config on the consumer project.
- Ship with **fixture reports** (pass <70, pass ≥70, malformed XML) and unit tests; optional golden sample Java module is nice-to-have, not the only proof.
- Binding rule `enforcement` id names the coverage adapter explicitly; CI lint: binding coverage rule must not resolve to `noopAdapter` in production wiring.
- Document measurement boundary in the same change (Pitfall 8).

**Warning signs:**
- Adapter imports `capture-test-evidence` or runs `node --test`.
- Always-pass with empty findings.
- No test with a JaCoCo XML fixture below threshold → `fail`.

**Phase to address:**
Coverage GateAdapter phase (after or parallel with coverage *rule* content; rule without adapter = advisory only).

---

### Pitfall 8: ">70%" without a measurement boundary

**What goes wrong:**
Rule says "unit-test coverage >70%" but does not define: unit only vs unit+integration; generated code; `*Application` main; package exclusions; line vs branch. Teams game the number (count integration tests, exclude hard packages). Gate becomes argument, not control. Cross-team audits incomparable.

**Why it happens:**
JaCoCo defaults and bank CI templates differ. Authors copy a number from a slide. Adapter implements "ratio ≥ 0.7" on whatever XML it gets.

**How to avoid:**
- Lock boundary in rule **and** adapter docs: **unit tests only**; report type; metric (line instruction vs branch — pick one, document); standard excludes (e.g. config/main DTOs only if listed).
- Threshold + includes/excludes as adapter config with defaults; do not hard-code bank-specific packages in engine.
- Audit/evidence must record: threshold, metric, files parsed, computed ratio — machine fields, not LLM prose.
- If integration coverage desired later, separate rule/adapter mode — do not overload one number.

**Warning signs:**
- Rule body says "coverage" with no unit/integration sentence.
- Adapter has no exclude configuration.
- Pass/fail flips when someone adds a smoke test suite into the same report.

**Phase to address:**
Coverage GateAdapter phase (contract + docs); rule-pack text must match adapter semantics same PR.

---

### Pitfall 9: Mixing integration-product detail into every coding rule

**What goes wrong:**
Logging, API shape, Hexagonal naming, and saga rules each embed WSO2 endpoint patterns, Tibco payload quirks, SmartVista field maps. Pack becomes unreadable; selection injects irrelevant integration trivia on pure domain refactors; updates to middleware versions require editing dozens of rules.

**Why it happens:**
Same root as Pitfall 4, at content granularity. "Helpful" authors overload every rule with local context.

**How to avoid:**
- Layer content: (1) generic coding conventions, (2) integration-boundary rules (outbound via gateway / ACL), (3) optional deep protocol pack **out of scope** this milestone.
- Summaries stay product-agnostic; product names only in lazy detail of integration rules.
- Saga/outbox rules describe **when** and **pattern**, not SmartVista message IDs.

**Warning signs:**
- `rg` product names across majority of new rule files.
- Inject noise on tasks with no integration paths.

**Phase to address:**
Rule-pack information architecture at start of coding-convention pack phase; enforce in review checklist.

---

### Pitfall 10: Frontend / BA scope creep into "developer conventions"

**What goes wrong:**
Milestone expands to Next.js, React forms, BA acceptance templates, PM RACI. Focus leaves Java backend; selection corpus and eval set explode; deferred items in PROJECT.md get "just a few rules."

**Why it happens:**
Stakeholders ask; markdown is cheap; no hard milestone filter in PRs.

**How to avoid:**
- PROJECT.md Out of Scope is the gate: BA/PM packs, SPA conventions, deep SmartVista — reject or park in future milestone backlog.
- Domain pack name and triggers mention Java/Spring/backend paths only.
- Eval corpus only construction/backend tasks this milestone.

**Warning signs:**
- PRs adding `*.tsx` path triggers or "user story" rules.
- Roadmap phase titled "full stack conventions."

**Phase to address:**
Milestone framing / every content phase review; not a build phase — process control.

---

### Pitfall 11: Binding coding rules without enforceable contracts (theater reprise)

**What goes wrong:**
Hexagonal layering, "no PII in logs," API error shape marked `classification: binding` with `enforcement: semgrep:…` or free-text ids that still map to **noop** stubs. `runAdapter` validates shape, not that a real tool ran. Audit shows pass; code violates layering.

**Why it happens:**
Schema requires `enforcement` string for binding but **does not resolve it against a registry** (frontmatter description: "v1 does NOT resolve it against any registry"). Easy to satisfy schema without a working adapter. Coverage is the one place v4.0 can ship a *real* consumer parser — other conventions may still be advisory.

**How to avoid:**
- Default coding-style/architecture rules to **advisory** unless a real adapter or CI check exists.
- Only coverage (and later real SAST) get binding this milestone if wired through non-noop adapter.
- Ship-time or verify-time check: binding rule's `enforcement` adapter name ∈ production map and not noop for that gate (extend prior stub-detection intent).
- Honest language: "guides structure" vs "verified by coverage-report adapter."

**Warning signs:**
- Dozens of new `classification: binding` with no new adapter code.
- All verify evidence `evaluatedBy: generic-exit-ci` with empty findings.

**Phase to address:**
Per rule-pack PR + Coverage adapter phase for the one binding metric in scope.

---

### Pitfall 12: New corpus skips the selection-quality harness

**What goes wrong:**
v2.0 Phase 10 harness exists (`governance eval`, critical-recall floor) but new Java/banking rules never enter `eval-cases.json` / fixtures. Pack ships with unknown recall/precision; Pitfalls 1–2 become invisible until production noise or gaps.

**Why it happens:**
Content work feels separate from harness. Fixtures still cover old MFA-style rules only.

**How to avoid:**
- Every new rule ID appears in ≥1 positive and (for non-critical) ≥1 negative eval case before merge.
- Critical binding rules (coverage threshold, outbound boundary if critical) must keep critical-recall === 1.0 on expanded corpus.
- Domain pack subscription cases: select with `--domains banking-java` vs without.

**Warning signs:**
- Pack merged, eval fixtures unchanged.
- Only happy-path cases, no "trivial task must not match."

**Phase to address:**
Final content hardening phase / each pack phase Definition of Done — wire into existing Phase 10 tooling, do not rebuild harness.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Multi-paragraph summaries "until we split rules" | Fast authoring | Token budget death (Pitfall 1); inject noise | Never for shipped pack — split first |
| `triggers: {}` on architecture rules | Perfect recall | Permanent over-injection (Pitfall 2) | Only true org non-negotiables, rare |
| Binding + noop coverage adapter | Green demo | Theater (Pitfall 7/11); false audit | Never for binding coverage |
| Examples under `aidlc-rules/` without guard | One tree for all docs | Index pollution (Pitfall 6) | Never — separate tree or `details/` only |
| Vendor strings in `src/` | Quick keyword helper | Overlay becomes one-bank fork (Pitfall 4) | Never in engine; content-only |
| One mega "DDD+CQRS+Hex+Saga" rule | Fewer files | Cannot trigger/select/eval precisely; essay risk | Never — split by concern |
| Count integration tests toward 70% | Easier pass | Incomparable metric (Pitfall 8) | Only if separate named rule/mode |
| Skip eval cases for new rules | Faster merge | Silent under/over injection | Never for this milestone DoD |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Rule loader (`load.ts` / `findRuleFiles`) | Drop starter `.md` under `aidlc-rules/` | Starters outside scan roots; only `details/` skipped today — do not rely on undocumented skips |
| Selection keywords | Broad English words as triggers | Paths + taskType + exclude; test substring false friends |
| `runAdapter` + new coverage adapter | Return partial objects / wrong `evaluatedBy` | Always full `GateResult`; `evaluatedBy === adapter.name`; let Ajv hard-fail catch bugs in tests |
| `verifyGateHook` default `generic-exit-ci` | Leave default noop while claiming coverage enforced | Wire coverage adapter by name for coverage binding rules; evidence must show `evaluatedBy: coverage-report` (or chosen name) |
| `capture-test-evidence` (Node TAP) | Reuse as "coverage" for Java consumers | Keep for *this* repo's tests; coverage adapter parses **consumer** JaCoCo/LCOV only |
| `ADAPTERS` map / `STUB_NAMES` | Replace stubs in place without clear real vs stub | Add real coverage adapter beside stubs; never silently swap noop for real under old scanner names |
| Domain scope subscription | Put bank rules in `enterprise/` | `domain/<banking-…>/` + select `--domains`; enterprise stays generic |
| Token budget (SEL-05) | Raise default 2000 to fit essays | Fix content; budget is product constraint |
| Eval harness (Phase 10) | New pack without cases | Extend fixtures; ship-gate still owns critical-recall |
| Enforcement string on binding rules | Free-text that matches nothing real | Use real adapter name; prefer advisory until adapter exists |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Architecture pack always selected | Inject size ↑ every construction task | Tight triggers + eval precision | Immediately after pack enable on busy repos |
| Unbounded summary growth across 30+ rules | Budget overflow loud fail or silent quality drop | Summary lint + per-pack token budget fixture | ~10–15 essay summaries under default 2000 |
| Loading many `detailPath` files "to be safe" in hooks | Defeats lazy design | Hooks inject summaries only; detail CLI on demand | Any hook that prefetches bodies |
| Parsing huge JaCoCo XML on every verify without cache | Slow verify gate | Stream/parse once; threshold check only; don't embed XML in audit | Monorepos with multi-MB reports |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Log-convention rules advisory-only while claiming PII protection | PII in logs ships "governed" | Real log scanning later; this milestone: clear advisory + examples; don't mark binding without tool |
| Coverage/report paths from untrusted input without validation | Path traversal when reading XML/LCOV | Resolve under project root; reject `..`; same discipline as `detail-path` guards |
| Embedding secrets/tokens in Java starter examples | Credential leak via repo + inject if mis-indexed | Fake values only; secret-scan starters in CI |
| Vendor ACL exceptions as model-waivable | Silent outbound to third parties | Outbound boundary: human waive only for critical; prefer gate |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 15 architecture summaries on a one-line fix | Devs ignore all governance | Precision triggers + severity ordering already in inject; fix triggers |
| ">70%" fail with no file/metric in message | Cannot fix | Findings include ratio, threshold, report path |
| Examples only for complex saga service | LLM over-builds | Ship minimal + complex starters |
| Classification jargon without decision table | Wrong Internal/External choice | Decision table in detail + path conventions |
| Rule IDs opaque (`conv-07`) | Hard to discuss in review | Stable kebab ids: `java-hexagonal-ports`, `coverage-unit-70` |

## "Looks Done But Isn't" Checklist

- [ ] **Summaries:** Still one line / under token lint — not wiki paste
- [ ] **Triggers:** Architecture rules have paths/taskType/exclude — not `{}` or bare `service`
- [ ] **When-not-to-apply:** CQRS/DDD/saga rules document skip conditions
- [ ] **Vendor neutrality:** `src/` free of bank product names; vendors only in domain rule content
- [ ] **Classification:** Internal/External/hybrid decision table + eval fixtures
- [ ] **Starters:** Outside rule index roots; not present in `rule-index.json`
- [ ] **Coverage adapter:** Parses JaCoCo and/or LCOV fixtures; fails <70%; not Node TAP of this repo
- [ ] **Measurement boundary:** Unit-only (or documented), metric named, excludes documented, evidence records ratio
- [ ] **Binding set:** Only rules with non-noop enforcement; rest advisory
- [ ] **Eval corpus:** Positive + negative cases for every new rule; critical-recall still 1.0
- [ ] **Scope:** No FE/BA packs; PROJECT.md out-of-scope honored
- [ ] **Budget:** Typical-task inject still under governance token budget after pack enable

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Essay / over-injection | MEDIUM | Cap summaries; split rules; retune triggers; re-run eval precision; restore budget |
| Under-injection of coverage/outbound | HIGH | Broaden with measured precision; add always-on only if critical; re-verify affected services |
| Examples in index | LOW–MEDIUM | Move files; rebuild index; add loader guard; purge bad IDs from state |
| Coverage theater | HIGH | Replace noop path with report parser; invalidate prior "pass" evidence; re-run consumer CI |
| Ambiguous classification | MEDIUM | Publish decision table; fix triggers; re-audit hybrid services |
| Vendor lock in engine | MEDIUM | Extract strings to domain rules; delete TS branches; add CI grep |
| Scope creep FE/BA | LOW | Revert files; backlog future milestone; no engine change |

## Pitfall-to-Phase Mapping

Suggested v4.0 phase placement (names illustrative until roadmap locks). Use for risk placement in roadmap.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Essay summaries / budget death | Coding-convention rule-pack authoring | Summary lint in `build-index`; inject fixture under budget |
| 2. Architecture always-on triggers | Architecture-pattern rules + eval extension | Negative eval cases; precision report |
| 3. CQRS/DDD cargo-cult | Architecture-pattern rules (content) | "When not to apply" present; minimal starter exists |
| 4. Vendor names in engine | Service-classification / integration rules | CI: no vendor strings under `src/` |
| 5. Internal vs External ambiguity | Service-classification rules | Decision table + hybrid eval fixtures |
| 6. Starters indexed as rules | Starter-examples phase | Starters absent from `rule-index.json`; loader/CI guard |
| 7. Coverage adapter theater | Coverage GateAdapter phase | JaCoCo/LCOV fixtures fail/pass; not Node TAP |
| 8. Fuzzy >70% boundary | Coverage GateAdapter + rule text | Metric/excludes documented; evidence has ratio |
| 9. Integration detail in every rule | Pack IA at coding-convention start | Review checklist; limited product-name blast radius |
| 10. FE/BA scope creep | Milestone governance (all phases) | Out-of-scope review on each PR |
| 11. Binding without real gate | Each pack PR + coverage phase | Binding count matches non-noop adapters |
| 12. Eval harness not extended | Pack DoD / hardening phase | New rule IDs in eval cases; critical-recall 1.0 |

**Phase ordering rationale (pitfall-driven):**
1. **Authoring standards + pack IA** first — prevents essay/vendor/scope rot before volume lands.
2. **Architecture + classification rules** next — content with triggers/eval, not dumps.
3. **Coverage adapter** before marking coverage binding — avoids theater.
4. **Starters last or parallel but isolated** — after loader guard exists so samples cannot enter the index.
5. **Eval extension continuous** — every content phase exits through harness.

## Sources

- **Shipped code (HIGH):** `src/rules/load.ts` (indexes all `*.md`, skips only `details/`); `src/select/select.ts` + `tokens.ts` (substring keywords, default budget 2000, char/4); `src/inject/inject.ts` (summaries only); `src/enforcement/adapters.ts` / `run-adapter.ts` (7 stubs, Ajv hard-fail); `src/governance/verify-gate-hook.ts` (default `generic-exit-ci`); `src/governance/capture-test-evidence.ts` (Node TAP only); `src/schema/frontmatter.schema.json` (no summary maxLength; binding requires `enforcement` string, no registry resolve).
- **Project constraints (HIGH):** `.planning/PROJECT.md` v4.0 goals, deferred FE/BA/SmartVista, context budget, markdown advisory, overlay-not-fork, deterministic selection.
- **Prior research (MEDIUM, foundational):** `.planning/research/PITFALLS.md` 2026-07-05 under-injection / over-injection / theater / audit trust — still valid underneath content expansion.
- **Docs (HIGH):** `docs/rule-authoring.md` — empty triggers = always-in-phase; scope layout; summary intent.

---
*Pitfalls research for: v4.0 developer coding-convention packs + Java starters + consumer coverage GateAdapter on existing GSD governance overlay*
*Researched: 2026-07-09*
