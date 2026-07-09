---
phase: 13-domain-pack-service-classification-integrations
reviewed: 2026-07-10T00:15:00Z
depth: deep
files_reviewed: 10
files_reviewed_list:
  - src/select/java-spring-pack.test.ts
  - src/index/precedence.test.ts
  - aidlc-rules/domain/java-spring/java-spring-svc-internal-outbound.md
  - aidlc-rules/domain/java-spring/java-spring-svc-internet-outbound.md
  - aidlc-rules/domain/java-spring/java-spring-inbound-rest.md
  - aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md
  - aidlc-rules/domain/java-spring/details/java-spring-svc-internal-outbound-detail.md
  - aidlc-rules/domain/java-spring/details/java-spring-svc-internet-outbound-detail.md
  - aidlc-rules/domain/java-spring/details/java-spring-inbound-rest-detail.md
  - aidlc-rules/domain/java-spring/details/java-spring-inbound-kafka-detail.md
findings:
  critical: 3
  warning: 3
  info: 3
  total: 9
status: fixed
fixed_at: 2026-07-09
fixes:
  - CR-01: removed bare `rest` keyword; multi-token rest-* needles + path-primary
  - CR-02: removed bare `consumer`/`listener`; kafka-* keywords only
  - CR-03: narrowed paths to messaging/kafka-shaped globs
  - WR-01: internet outbound class markers only (dropped webclient/resttemplate/etc.)
  - WR-02: hard-assert WSO2 + BODY_CANARY in internet detail
  - WR-03: real-corpus inventory exact 5 ids (mfa + 4 pack)
---

# Phase 13: Code Review Report

**Reviewed:** 2026-07-10T00:15:00Z
**Depth:** deep
**Files Reviewed:** 10
**Status:** fixed (post-review remediation; suite 444 pass / 0 fail)

## Summary

Deep adversarial review of the Phase 13 java-spring domain pack (4 rules + 4 details), the pack matrix suite, and the precedence-test corpus-size change (6dfc073). Engine production modules were traced for cross-file behavior (`select` keyword/path matching, `resolveDetailPath`, `buildIndex` body quarantine) but not modified this phase.

The pack layout, domain subscription gate, summary-only inject, detailPath relative targets, BODY_CANARY quarantine, and vendor-token absence from production `src/` all hold. Empty-trigger always-on rules are correctly avoided. detailPath values are relative and pass the existing IN-05 / D-07 guards.

However, **selection correctness has material false positives** against bank-realistic signals because trigger needles are short substrings and path globs are over-broad. The pack suite is a **happy-path matrix**: it does not lock those failure modes, so verification can pass while the pack mis-injects. The precedence real-corpus assertion was also weakened from exact size to `>= 1`.

## Critical Issues

### CR-01: Keyword needle `rest` selects inbound-REST on bank terms like `interest` / `interest-rate`

**File:** `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md:6`
**Issue:** `matchKeywords` treats each signal keyword as haystack and each trigger as needle (case-insensitive substring; `src/select/select.ts:70-81`). The positive keyword `rest` is a substring of common bank/task tokens (`interest`, `interest-rate`, `restore`, `forest`, `unrest`). Live probe on production index:

```
keywords: ["interest-rate","pricing"] + InterestService path
  → selected: java-spring-inbound-rest
```

A construction task about interest-rate pricing therefore injects thin-controller REST guidance with no REST surface present. That is incorrect selection for JAVA-IN-01 / path-primary intent and is invisible to the current suite (only `PaymentController` / `**/api/**` positives are locked).

**Fix:** Replace bare `rest` with multi-token needles that cannot substring-collide, and/or rely on path-primary only for REST:

```yaml
triggers:
  keywords:
    - rest-controller
    - rest-api
    - rest-endpoint
    - restcontroller
    - controller   # keep if desired; still prefer path-primary
    - endpoint
  paths:
    - "**/*Controller.java"
    - "**/api/**"
    - "**/web/**"
    - "**/rest/**"
    - "**/adapter/in/web/**"
```

Add a regression case in `java-spring-pack.test.ts`:

```ts
// must NOT select inbound-rest
select(index, { taskType: "feature", keywords: ["interest-rate"], paths: [] }, SUBSCRIBED)
```

### CR-02: Keyword needle `consumer` selects inbound-Kafka on non-messaging bank work

**File:** `aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md:7`
**Issue:** Same substring semantics. Trigger `consumer` matches `consumer-banking`, `consumer-loan`, `data-consumer`, `customer-consumer`, etc. Live probe:

```
keywords: ["consumer-banking","loan"] + ConsumerLoanService path
  → selected: java-spring-inbound-kafka
```

Kafka idempotency / DLQ guidance is injected for ordinary consumer-banking domain work with no listener/messaging path. Violates JAVA-IN-02 path-primary intent and bank-domain realism.

**Fix:** Drop bare `consumer` (and consider tightening `listener`). Prefer:

```yaml
triggers:
  keywords:
    - kafka
    - kafka-consumer
    - kafka-listener
    - message-listener
  paths:
    - "**/*KafkaListener*"
    - "**/*MessageListener*"
    - "**/*Consumer.java"   # still broad — see CR-03
    - "**/messaging/**"
    - "**/kafka/**"
    - "**/adapter/in/messaging/**"
```

Add suite negatives for `consumer-banking` / `consumer-loan` with no kafka path.

### CR-03: Path glob `**/*Listener*` (and friends) select Kafka on non-Kafka Spring types

**File:** `aidlc-rules/domain/java-spring/java-spring-inbound-kafka.md:10-11`
**Issue:** picomatch `**/*Listener*` matches any path segment containing `Listener`, including JPA `*EntityListener*` and Spring `*ApplicationListener*`. Live probe:

```
paths: [".../PaymentEntityListener.java"] → java-spring-inbound-kafka
paths: [".../AppApplicationListener.java"] → java-spring-inbound-kafka
```

These are not Kafka consumers; selecting JS-IN-02 is incorrect behavior. `**/*Consumer*` has the same shape risk for non-messaging `*Consumer` types.

**Fix:** Narrow path positives to messaging-shaped names/packages:

```yaml
paths:
  - "**/*KafkaListener*"
  - "**/*MessageListener*"
  - "**/messaging/**/*Listener*"
  - "**/kafka/**"
  - "**/adapter/in/messaging/**"
```

Add suite negatives for `EntityListener` / `ApplicationListener` paths.

## Warnings

### WR-01: Internet outbound fires without class markers (violates fail-open lock)

**File:** `aidlc-rules/domain/java-spring/java-spring-svc-internet-outbound.md:12-15`
**Issue:** CONTEXT locked: ambiguous signals (neither Internal nor internet-facing class named) must select **neither** outbound rule. Internet rule positives include library/capability needles `webclient`, `resttemplate`, `feign`, `outbound-http`, `api-gateway`, `wso2` with **no** class-marker requirement. Live probe:

```
keywords: ["webclient"] → java-spring-svc-internet-outbound
```

That is a guessed class from a client library name, not an explicit internet-facing classification. Internal rule correctly omitted bare `jdbc`/`jpa`/`orm` for fail-open (13-02 SUMMARY decision); internet rule did not apply the same discipline to client libraries.

Mutual-exclude still prevents dual-class selection when both class markers appear, but the **ambiguous → neither** contract is broken for library-only signals.

**Fix:** Keep class markers + class paths as the only positives; move client libraries to **detail prose** (or to positive keywords only when paired with class vocabulary — engine cannot AND axes, so prefer drop):

```yaml
triggers:
  keywords:
    - internet-facing
    - external-facing
    - public-edge
    - edge-service
  paths:
    - "**/internet-facing/**"
    - "**/external-facing/**"
    - "**/edge/**"
    - "**/adapter/out/http/**"
    - "**/infrastructure/gateway/**"
  exclude:
    keywords: [internal-service, internal-only]
    paths: ["**/internal/**", "**/services/internal/**", "**/module-internal/**"]
```

Add suite case: `keywords: ["webclient"]` alone → neither outbound.

### WR-02: JAVA-SVC-03 WSO2 presence is soft-asserted (false green)

**File:** `src/select/java-spring-pack.test.ts:583-622`
**Issue:** Test title claims the internet detail MAY contain WSO2, but the assertion accepts any of:

- body canary, **or**
- `"wso2"`, **or**
- `"gateway"`

A detail that only has the canary (or only the word "gateway") passes. JAVA-SVC-03 / roadmap language requires the detail to name the gateway product (WSO2) while keeping vendor strings out of engine `src/`. Current content does name WSO2, but the suite does not lock it — verification can stay green after a rewrite that drops the product name.

**Fix:**

```ts
assert.ok(
  detailBody.toLowerCase().includes("wso2"),
  "internet detail must name approved gateway product WSO2 (content-only vendor string)",
);
assert.ok(
  detailBody.includes(BODY_CANARIES["java-spring-svc-internet-outbound"]),
  "internet detail must carry body canary",
);
```

### WR-03: Precedence real-corpus assertion weakened (`6dfc073`) — lost exact inventory lock

**File:** `src/index/precedence.test.ts:120-135`
**Issue:** Pre-change intent (file header L13-14 still states it): real corpus emits **exactly one** non-superseded record (`require-mfa`). Phase 13 pack forced a widen; the fix correctly stopped assuming `length === 1`, but replaced it with:

```ts
assert.ok(index.rules.length >= 1, ...);
assert.ok(mfa, "require-mfa must remain a real-corpus winner");
// every record lacks superseded
```

`>= 1` never fails as long as require-mfa remains. Accidental extra rules, dropped pack rules, or a future always-on essay under `aidlc-rules/` will not break this smoke. Header comment is now stale (still says "exactly one").

**Fix:** Assert the known multi-winner inventory explicitly (or at least lower+upper bounds + required ids):

```ts
const ids = new Set(index.rules.map((r) => r.id));
assert.equal(index.rules.length, 5, "require-mfa + 4 java-spring pack winners");
for (const id of [
  "require-mfa",
  "java-spring-svc-internal-outbound",
  "java-spring-svc-internet-outbound",
  "java-spring-inbound-rest",
  "java-spring-inbound-kafka",
]) {
  assert.ok(ids.has(id), `missing real-corpus winner ${id}`);
}
for (const record of index.rules) {
  assert.equal("superseded" in record, false, ...);
}
```

Update the file header bullet 4 to match.

## Info

### IN-01: Inbound rules exclude `taskType: docs` but not `taskType: test`

**File:** `aidlc-rules/domain/java-spring/java-spring-inbound-rest.md:15-21` (same pattern in inbound-kafka)
**Issue:** Path excludes cover `*Test*` / `**/src/test/**`, but `taskType: "test"` with a production `*Controller*` path still selects inbound-rest (live probe). CONTEXT only required docs exclusion; this is optional hygiene for test-only tasks that name production paths in the signal.

**Fix:** Optionally add `taskType: [docs, test]` under `exclude` if product wants zero convention noise on pure test tasks.

### IN-02: Pack suite is happy-path only — no false-positive locks

**File:** `src/select/java-spring-pack.test.ts` (JAVA-IN / JAVA-SVC blocks)
**Issue:** 23 tests cover subscription, XOR class markers, path positives, phase, and docs exclude. None assert the CR-01/02/03 or WR-01 negatives. Suite can stay 23/23 green while bank-realistic signals mis-select. Treat new negative cases as required companions to the trigger fixes above.

**Fix:** Add named tests for interest-rate, consumer-banking, EntityListener, webclient-only, dual path internal+edge (path dual currently works but is unlocked).

### IN-03: Stale precedence test header still documents single-rule corpus

**File:** `src/index/precedence.test.ts:13-14`
**Issue:** Comment still says "only enterprise/require-mfa.md" / "exactly one record" after 6dfc073 widened the assertion. Misleading for the next author.

**Fix:** Rewrite bullet 4 to describe multi-winner non-superseded inventory (require-mfa + domain pack).

---

## Out-of-scope checks (clean)

| Check | Result |
| --- | --- |
| Empty triggers / always-on pack essays | None of the four rules use empty positives |
| Vendor tokens in production non-test `src/` | Clean (only test needles + rule Markdown) |
| detailPath traversal (`..`, absolute) | All four use `details/<id>-detail.md`; buildIndex D-07 + resolveDetailPath IN-05 OK |
| Index body leak / BODY_CANARY in index/inject | Canaries present in rule+detail; absent from serialized index and inject fragment |
| Engine freeze / no vendor in production select/types | No production engine edits required for content path |
| Mutual exclude dual **keyword** markers | Correct neither; suite locks this |
| Domain subscription gate | Correct out-of-scope when `domains=[]` |

---

_Reviewed: 2026-07-10T00:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
