/**
 * Phase 15 RED suite: java-spring logging-audit, api-contract, saga-outbox.
 *
 * Locks JAVA-LOG-01, JAVA-API-01, and JAVA-EVT-01 against the real `aidlc-rules`
 * root via buildIndex → select → renderInjection. Suite is RED until plan 02
 * lands the three pack rules + details under aidlc-rules/domain/java-spring/.
 *
 * ---------------------------------------------------------------------------
 * Plan 02 handoff (author these to turn GREEN)
 * ---------------------------------------------------------------------------
 * LOG_API_EVT_IDS (frontmatter `id`, scope: domain, classification: advisory):
 *   - java-spring-logging-audit
 *   - java-spring-api-contract
 *   - java-spring-saga-outbox
 *
 * Layout:
 *   aidlc-rules/domain/java-spring/<id>.md
 *   aidlc-rules/domain/java-spring/details/<id>-detail.md
 *
 * Body canary tokens (must appear in rule body and/or detail file; must NEVER
 * appear in rule-index.json or renderInjection output):
 *   - BODY_CANARY java-spring-logging-audit
 *   - BODY_CANARY java-spring-api-contract
 *   - BODY_CANARY java-spring-saga-outbox
 *
 * Body headings (essay form — inject must not contain these):
 *   - ## Rule JS-LOG-01
 *   - ## Rule JS-API-01
 *   - ## Rule JS-EVT-01
 *
 * Locked keywords (CONTEXT / RESEARCH — multi-token only; NO bare log/logger/rest):
 *   LOG: correlation-id, trace-id, mdc, audit-log, structured-logging
 *   API: openapi, api-version, error-envelope, swagger-spec
 *   EVT: saga, outbox, transactional-outbox, choreography, orchestration,
 *        distributed-transaction
 *
 * Locked path globs (CONTEXT seeds; do NOT ship bare ** / filter / **):
 *   LOG: ** / logging / **, ** / config / *Log*, ** / aop / **
 *        (optional tight: ** / *Correlation*Filter*, ** / *Mdc*Filter* — plan 02)
 *   API: ** / api / **, ** / openapi / **, ** / *Resource.java, ** / web / **
 *   EVT: ** / outbox / **, ** / saga / **, ** / messaging / **
 *
 * Shared frontmatter defaults (all three):
 *   scope: domain
 *   classification: advisory
 *   severity: medium
 *   phases: [construction] only
 *   detailPath: details/<id>-detail.md
 *   exclude.taskType: [docs]
 *   exclude.paths: ** / *Test*, ** / *Tests*, ** / src / test / **
 *   summary: one sentence, <=160 chars, no newline
 *
 * Summary language contracts (suite-assertable):
 *   LOG — correlation|trace + PII|secret + audit
 *   API — openapi + version + error envelope|correlationId
 *   EVT — saga|outbox + when-not|ACID|plain
 *
 * Saga when-NOT decision table (detail must encode):
 *   single-service ACID          → plain call (no saga cargo-cult)
 *   same-TX DB + message         → transactional outbox
 *   multi-service business TX    → saga (orchestration or choreography)
 *
 * Inventory note: plan 02 grows precedence.test.ts winners 7 → 10
 * (require-mfa + nine java-spring rules including these three).
 *
 * Frontmatter / triggers / one-sentence summaries: see
 * .planning/phases/15-logging-api-contract-saga-decision-rules/15-RESEARCH.md
 * section "Recommended Rule Specs".
 * ---------------------------------------------------------------------------
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildIndex } from "../index/build.js";
import { select } from "./select.js";
import { renderInjection } from "../inject/inject.js";
import type {
  RuleIndex,
  RuleIndexRecord,
  TaskSignal,
  SelectionConfig,
} from "../types.js";

/** Production rule store — prefer real aidlc-rules (plan 01 / RESEARCH). */
const PACK_ROOT = path.resolve(process.cwd(), "aidlc-rules");

/** Three Phase 15 LOG/API/EVT rule ids (locked inventory). */
const LOG_API_EVT_IDS = [
  "java-spring-logging-audit",
  "java-spring-api-contract",
  "java-spring-saga-outbox",
] as const;

type LogApiEvtId = (typeof LOG_API_EVT_IDS)[number];

/** Body-leak canaries plan 02 must place in rule bodies/details. */
const BODY_CANARIES: Record<LogApiEvtId, string> = {
  "java-spring-logging-audit": "BODY_CANARY java-spring-logging-audit",
  "java-spring-api-contract": "BODY_CANARY java-spring-api-contract",
  "java-spring-saga-outbox": "BODY_CANARY java-spring-saga-outbox",
};

/** Essay headings that must never appear in inject fragments. */
const RULE_ESSAY_HEADINGS = [
  "## Rule JS-LOG-01",
  "## Rule JS-API-01",
  "## Rule JS-EVT-01",
] as const;

const SUBSCRIBED: SelectionConfig = {
  phase: "construction",
  domains: ["java-spring"],
};

const UNSUBSCRIBED: SelectionConfig = {
  phase: "construction",
  domains: [],
};

/** Bank-realistic Java module paths under a fictional payments module. */
const PATHS = {
  loggingFilter:
    "src/main/java/com/bank/payments/logging/CorrelationMdcFilter.java",
  logbackConfig:
    "src/main/java/com/bank/payments/config/LogbackConfig.java",
  auditAspect:
    "src/main/java/com/bank/payments/aop/AuditLoggingAspect.java",
  paymentResource:
    "src/main/java/com/bank/payments/api/v1/PaymentResource.java",
  openApiConfig:
    "src/main/java/com/bank/payments/openapi/OpenApiConfig.java",
  webAdvice:
    "src/main/java/com/bank/payments/web/PaymentWebAdvice.java",
  outboxPublisher:
    "src/main/java/com/bank/payments/outbox/OutboxPublisher.java",
  paymentSaga:
    "src/main/java/com/bank/payments/saga/PaymentSagaOrchestrator.java",
  messagingListener:
    "src/main/java/com/bank/payments/messaging/PaymentOutboxListener.java",
  readme: "README.md",
  docsOnly: "docs/architecture/logging-and-api-overview.md",
  testPath:
    "src/test/java/com/bank/payments/logging/CorrelationMdcFilterTest.java",
  testSrcTree:
    "src/test/java/com/bank/payments/api/v1/PaymentResourceTests.java",
} as const;

function packIndex(): RuleIndex {
  return buildIndex(PACK_ROOT);
}

function logApiEvtRecords(index: RuleIndex): RuleIndexRecord[] {
  return index.rules.filter((r) =>
    (LOG_API_EVT_IDS as readonly string[]).includes(r.id),
  );
}

function recordById(index: RuleIndex, id: LogApiEvtId): RuleIndexRecord {
  const rec = index.rules.find((r) => r.id === id);
  assert.ok(
    rec,
    `index must contain LOG/API/EVT rule ${id} (plan 02 content missing)`,
  );
  return rec;
}

function isSelected(
  result: ReturnType<typeof select>,
  id: string,
): boolean {
  return result.selected.some((s) => s.id === id);
}

function noneOfThreeSelected(result: ReturnType<typeof select>): void {
  for (const id of LOG_API_EVT_IDS) {
    assert.ok(
      !isSelected(result, id),
      `${id} must NOT be selected for this signal`,
    );
  }
}

// ---------------------------------------------------------------------------
// Hygiene — index builds; canaries / detail files never become index records
// ---------------------------------------------------------------------------

test("hygiene: buildIndex(aidlc-rules) succeeds", () => {
  assert.doesNotThrow(() => packIndex());
  const index = packIndex();
  assert.equal(index.schemaVersion, 1);
  assert.ok(Array.isArray(index.rules));
});

test("hygiene: JSON.stringify(index) lacks each LOG/API/EVT body canary", () => {
  const index = packIndex();
  const serialized = JSON.stringify(index);
  for (const id of LOG_API_EVT_IDS) {
    assert.ok(
      !serialized.includes(BODY_CANARIES[id]),
      `index must not contain body canary for ${id}`,
    );
  }
});

test("hygiene: details/ files are not separate index rules (no id from detail filenames)", () => {
  const index = packIndex();
  const detailishIds = index.rules.filter(
    (r) =>
      r.id.includes("detail") ||
      r.sourceFile.replace(/\\/g, "/").includes("/details/"),
  );
  assert.equal(
    detailishIds.length,
    0,
    `details/ must not be indexed as rules; found: ${detailishIds.map((r) => r.id).join(", ")}`,
  );
});

// ---------------------------------------------------------------------------
// Domain subscription gate
// ---------------------------------------------------------------------------

test("JAVA-LOG-01/JAVA-API-01/JAVA-EVT-01: domains=[] selects none of three (rich signal)", () => {
  const index = packIndex();
  for (const id of LOG_API_EVT_IDS) {
    assert.ok(
      index.rules.some((r) => r.id === id),
      `LOG/API/EVT rule ${id} must exist in aidlc-rules for subscription proof`,
    );
  }

  const signal: TaskSignal = {
    taskType: "feature",
    keywords: [
      "correlation-id",
      "openapi",
      "saga",
      "outbox",
      "structured-logging",
    ],
    paths: [
      PATHS.loggingFilter,
      PATHS.paymentResource,
      PATHS.openApiConfig,
      PATHS.outboxPublisher,
      PATHS.paymentSaga,
    ],
  };
  const result = select(index, signal, UNSUBSCRIBED);

  for (const id of LOG_API_EVT_IDS) {
    assert.ok(
      !isSelected(result, id),
      `${id} must NOT be selected when domains=[]`,
    );
    const skip = result.skipped.find((s) => s.id === id);
    assert.ok(skip, `${id} must appear in skipped when domains=[]`);
    assert.equal(
      skip.reason,
      "out-of-scope",
      `${id} skip reason must be out-of-scope (domain gate), got ${skip.reason}`,
    );
  }
});

// ---------------------------------------------------------------------------
// JAVA-LOG-01 — positive path-primary selection
// ---------------------------------------------------------------------------

test("JAVA-LOG-01: logging/CorrelationMdcFilter.java selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.loggingFilter],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "**/logging/** path under construction must select java-spring-logging-audit",
  );
});

test("JAVA-LOG-01: config/LogbackConfig.java selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.logbackConfig],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "**/config/*Log* path under construction must select java-spring-logging-audit",
  );
});

test("JAVA-LOG-01: aop/AuditLoggingAspect.java selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.auditAspect],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "**/aop/** path under construction must select java-spring-logging-audit",
  );
});

// ---------------------------------------------------------------------------
// JAVA-LOG-01 — keyword positives (paths empty)
// ---------------------------------------------------------------------------

test("JAVA-LOG-01 keywords: correlation-id selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["correlation-id"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "keyword correlation-id must select java-spring-logging-audit",
  );
});

test("JAVA-LOG-01 keywords: trace-id selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["trace-id"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "keyword trace-id must select java-spring-logging-audit",
  );
});

test("JAVA-LOG-01 keywords: mdc selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["mdc"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "keyword mdc must select java-spring-logging-audit",
  );
});

test("JAVA-LOG-01 keywords: audit-log selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["audit-log"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "keyword audit-log must select java-spring-logging-audit",
  );
});

test("JAVA-LOG-01 keywords: structured-logging selects logging-audit", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["structured-logging"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-logging-audit"),
    "keyword structured-logging must select java-spring-logging-audit",
  );
});

// ---------------------------------------------------------------------------
// JAVA-API-01 — positive path-primary selection
// ---------------------------------------------------------------------------

test("JAVA-API-01: api/v1/PaymentResource.java selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.paymentResource],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "**/api/** or *Resource.java path must select java-spring-api-contract",
  );
});

test("JAVA-API-01: openapi/OpenApiConfig.java selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.openApiConfig],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "**/openapi/** path under construction must select java-spring-api-contract",
  );
});

test("JAVA-API-01: web/PaymentWebAdvice.java selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.webAdvice],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "**/web/** path under construction must select java-spring-api-contract",
  );
});

// ---------------------------------------------------------------------------
// JAVA-API-01 — keyword positives (paths empty)
// ---------------------------------------------------------------------------

test("JAVA-API-01 keywords: openapi selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["openapi"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "keyword openapi must select java-spring-api-contract",
  );
});

test("JAVA-API-01 keywords: api-version selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["api-version"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "keyword api-version must select java-spring-api-contract",
  );
});

test("JAVA-API-01 keywords: error-envelope selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["error-envelope"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "keyword error-envelope must select java-spring-api-contract",
  );
});

test("JAVA-API-01 keywords: swagger-spec selects api-contract", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["swagger-spec"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-api-contract"),
    "keyword swagger-spec must select java-spring-api-contract",
  );
});

// ---------------------------------------------------------------------------
// JAVA-EVT-01 — positive path-primary selection
// ---------------------------------------------------------------------------

test("JAVA-EVT-01: outbox/OutboxPublisher.java selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.outboxPublisher],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "**/outbox/** path under construction must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01: saga/PaymentSagaOrchestrator.java selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.paymentSaga],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "**/saga/** path under construction must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01: messaging/PaymentOutboxListener.java selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.messagingListener],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "**/messaging/** path under construction must select java-spring-saga-outbox",
  );
});

// ---------------------------------------------------------------------------
// JAVA-EVT-01 — keyword positives (paths empty)
// ---------------------------------------------------------------------------

test("JAVA-EVT-01 keywords: saga selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["saga"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "keyword saga must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01 keywords: outbox selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["outbox"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "keyword outbox must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01 keywords: transactional-outbox selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["transactional-outbox"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "keyword transactional-outbox must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01 keywords: choreography selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["choreography"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "keyword choreography must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01 keywords: orchestration selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["orchestration"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "keyword orchestration must select java-spring-saga-outbox",
  );
});

test("JAVA-EVT-01 keywords: distributed-transaction selects saga-outbox", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["distributed-transaction"],
      paths: [],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-saga-outbox"),
    "keyword distributed-transaction must select java-spring-saga-outbox",
  );
});

// ---------------------------------------------------------------------------
// Bare-needle negatives — no bare log / logger / rest
// ---------------------------------------------------------------------------

test("bare-needle negative: keyword log alone selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["log"], paths: [] },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("bare-needle negative: keyword logger alone selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["logger"], paths: [] },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("bare-needle negative: keyword rest alone selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["rest"], paths: [] },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
  assert.ok(
    !isSelected(result, "java-spring-api-contract"),
    "api-contract must not fire on bare rest",
  );
});

// ---------------------------------------------------------------------------
// Unrelated / exclude / out-of-phase
// ---------------------------------------------------------------------------

test("unrelated: README.md only selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: [], paths: [PATHS.readme] },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("unrelated: docs-only path selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: [], paths: [PATHS.docsOnly] },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("exclude: taskType docs + matching log/api/saga paths selects none", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "docs",
      keywords: ["correlation-id", "openapi", "saga"],
      paths: [
        PATHS.loggingFilter,
        PATHS.paymentResource,
        PATHS.outboxPublisher,
      ],
    },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("exclude: *Test* path selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.testPath],
    },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("exclude: **/src/test/** path selects none of three", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.testSrcTree],
    },
    SUBSCRIBED,
  );
  noneOfThreeSelected(result);
});

test("out-of-phase: inception + matching paths selects none (out-of-phase)", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [
        PATHS.loggingFilter,
        PATHS.paymentResource,
        PATHS.outboxPublisher,
      ],
    },
    { phase: "inception", domains: ["java-spring"] },
  );
  noneOfThreeSelected(result);
  for (const id of LOG_API_EVT_IDS) {
    const skip = result.skipped.find((s) => s.id === id);
    assert.ok(skip, `${id} must be skipped in inception`);
    assert.equal(
      skip.reason,
      "out-of-phase",
      `${id} skip reason must be out-of-phase, got ${skip.reason}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Summary contract (once records exist)
// ---------------------------------------------------------------------------

test("summary contract: each LOG/API/EVT record is domain advisory with one-line summary", () => {
  const index = packIndex();
  const records = logApiEvtRecords(index);
  assert.equal(
    records.length,
    LOG_API_EVT_IDS.length,
    `expected ${LOG_API_EVT_IDS.length} LOG/API/EVT rules in index, found ${records.length}`,
  );

  for (const id of LOG_API_EVT_IDS) {
    const rec = recordById(index, id);
    assert.equal(rec.scope, "domain", `${id} scope must be domain`);
    assert.equal(
      rec.classification,
      "advisory",
      `${id} classification must be advisory`,
    );
    assert.ok(
      rec.detailPath && rec.detailPath.length > 0,
      `${id} must declare non-empty detailPath`,
    );
    assert.ok(
      !rec.summary.includes("\n"),
      `${id} summary must be a single line (no newline)`,
    );
    assert.ok(
      rec.summary.length <= 160,
      `${id} summary length ${rec.summary.length} exceeds 160 chars`,
    );
    assert.ok(
      rec.summary.trim().length > 0,
      `${id} summary must be non-empty prose`,
    );
    const trimmed = rec.summary.trim();
    assert.ok(
      /[.!?]$/.test(trimmed) || !trimmed.includes(". "),
      `${id} summary should be one sentence (end with .!? or lack multi-sentence breaks)`,
    );
  }
});

test("summary contract: LOG encodes correlation|trace + PII|secret + audit language", () => {
  const index = packIndex();
  const rec = recordById(index, "java-spring-logging-audit");
  const summary = rec.summary.toLowerCase();
  const hasCorrelationOrTrace =
    summary.includes("correlation") || summary.includes("trace");
  const hasPiiOrSecret =
    summary.includes("pii") ||
    summary.includes("secret") ||
    summary.includes("secrets");
  const hasAudit = summary.includes("audit");
  assert.ok(
    hasCorrelationOrTrace,
    `LOG summary must encode correlation|trace language; got: ${rec.summary}`,
  );
  assert.ok(
    hasPiiOrSecret,
    `LOG summary must encode PII|secret language; got: ${rec.summary}`,
  );
  assert.ok(
    hasAudit,
    `LOG summary must encode audit language; got: ${rec.summary}`,
  );
});

test("summary contract: API encodes openapi|version|error envelope|correlationId language", () => {
  const index = packIndex();
  const rec = recordById(index, "java-spring-api-contract");
  const summary = rec.summary.toLowerCase();
  const hasOpenapi = summary.includes("openapi");
  const hasVersion =
    summary.includes("version") || summary.includes("versioning");
  const hasEnvelope =
    summary.includes("error envelope") ||
    summary.includes("error-envelope") ||
    (summary.includes("error") && summary.includes("envelope")) ||
    summary.includes("correlationid") ||
    summary.includes("correlation id");
  assert.ok(
    hasOpenapi,
    `API summary must encode openapi language; got: ${rec.summary}`,
  );
  assert.ok(
    hasVersion,
    `API summary must encode version language; got: ${rec.summary}`,
  );
  assert.ok(
    hasEnvelope,
    `API summary must encode error envelope|correlationId language; got: ${rec.summary}`,
  );
});

test("summary contract: EVT encodes saga|outbox + when-not|ACID|plain language", () => {
  const index = packIndex();
  const rec = recordById(index, "java-spring-saga-outbox");
  const summary = rec.summary.toLowerCase();
  const hasSagaOrOutbox =
    summary.includes("saga") || summary.includes("outbox");
  const hasWhenNotOrAcidOrPlain =
    summary.includes("when-not") ||
    summary.includes("when not") ||
    summary.includes("acid") ||
    summary.includes("plain") ||
    summary.includes("cargo-cult") ||
    summary.includes("cargo cult") ||
    summary.includes("single-service") ||
    summary.includes("single service");
  assert.ok(
    hasSagaOrOutbox,
    `EVT summary must encode saga|outbox language; got: ${rec.summary}`,
  );
  assert.ok(
    hasWhenNotOrAcidOrPlain,
    `EVT summary must encode when-not|ACID|plain language; got: ${rec.summary}`,
  );
});

// ---------------------------------------------------------------------------
// Inject quarantine — summary only, no BODY_CANARY / essay headings
// ---------------------------------------------------------------------------

test("inject quarantine: LOG/API/EVT selection carries summary only — no canary or essay heading", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["correlation-id", "openapi", "saga", "outbox"],
      paths: [
        PATHS.loggingFilter,
        PATHS.paymentResource,
        PATHS.openApiConfig,
        PATHS.outboxPublisher,
        PATHS.paymentSaga,
      ],
    },
    SUBSCRIBED,
  );

  const selectedLogApiEvt = result.selected.filter((s) =>
    (LOG_API_EVT_IDS as readonly string[]).includes(s.id),
  );
  assert.ok(
    selectedLogApiEvt.length > 0,
    "at least one LOG/API/EVT rule must be selected for inject proof",
  );

  const fragment = renderInjection(result);

  for (const rule of selectedLogApiEvt) {
    assert.ok(
      fragment.includes(rule.summary),
      `inject fragment must contain summary for ${rule.id}`,
    );
    const canary = BODY_CANARIES[rule.id as LogApiEvtId];
    assert.ok(
      !fragment.includes(canary),
      `inject fragment must not contain body canary for ${rule.id}`,
    );
  }

  for (const heading of RULE_ESSAY_HEADINGS) {
    assert.ok(
      !fragment.includes(heading),
      `inject fragment must not contain essay heading ${heading}`,
    );
  }
});
