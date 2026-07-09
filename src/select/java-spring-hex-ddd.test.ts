/**
 * Phase 14 RED suite: java-spring hexagonal layering + tactical DDD selection.
 *
 * Locks JAVA-HEX-01 and JAVA-DDD-01 against the real `aidlc-rules` root via
 * buildIndex → select → renderInjection. Suite is RED until plan 02 lands the
 * two pack rules + details under aidlc-rules/domain/java-spring/.
 *
 * ---------------------------------------------------------------------------
 * Plan 02 handoff (author these to turn GREEN)
 * ---------------------------------------------------------------------------
 * HEX_DDD_IDS (frontmatter `id`, scope: domain, classification: advisory):
 *   - java-spring-hex-layering
 *   - java-spring-ddd-tactical
 *
 * Layout:
 *   aidlc-rules/domain/java-spring/<id>.md
 *   aidlc-rules/domain/java-spring/details/<id>-detail.md
 *
 * Body canary tokens (must appear in rule body and/or detail file; must NEVER
 * appear in rule-index.json or renderInjection output):
 *   - BODY_CANARY java-spring-hex-layering
 *   - BODY_CANARY java-spring-ddd-tactical
 *
 * Body headings (essay form — inject must not contain these):
 *   - ## Rule JS-HEX-01
 *   - ## Rule JS-DDD-01
 *
 * Locked Entity path glob (RESEARCH / CONTEXT discretion):
 *   double-star / domain / double-star / star Entity star
 *   (NOT bare double-star / star Entity star — infra Entity types must stay silent)
 *   Infra negatives that must stay silent for DDD:
 *     infrastructure/EntityManagerConfig.java
 *     config/JpaEntityScanner.java
 *
 * Frontmatter / triggers / one-sentence summaries: see
 * .planning/phases/14-hexagonal-tactical-ddd-rules/14-RESEARCH.md
 * section "Recommended Rule Specs".
 *
 * Overlap note: both rules match domain package paths — domain Aggregate/VO/Event
 * paths may select HEX and DDD together (expected, not mutual-exclude).
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

/** Two Phase 14 HEX/DDD rule ids (locked inventory). */
const HEX_DDD_IDS = [
  "java-spring-hex-layering",
  "java-spring-ddd-tactical",
] as const;

type HexDddId = (typeof HEX_DDD_IDS)[number];

/** Body-leak canaries plan 02 must place in rule bodies/details. */
const BODY_CANARIES: Record<HexDddId, string> = {
  "java-spring-hex-layering": "BODY_CANARY java-spring-hex-layering",
  "java-spring-ddd-tactical": "BODY_CANARY java-spring-ddd-tactical",
};

/** Essay headings that must never appear in inject fragments. */
const RULE_ESSAY_HEADINGS = [
  "## Rule JS-HEX-01",
  "## Rule JS-DDD-01",
] as const;

// Locked DDD Entity path glob for plan 02 frontmatter (RESEARCH A1).
// Domain-scoped only — bare Entity globs are rejected by infra negatives below.
// Built from parts so star-slash never appears as a contiguous block-comment closer.
const LOCKED_ENTITY_PATH_GLOB = ["**", "domain", "**", "*Entity*"].join("/");

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
  domainService:
    "src/main/java/com/bank/payments/domain/PaymentService.java",
  domainAggregate:
    "src/main/java/com/bank/payments/domain/PaymentAggregate.java",
  domainValueObject:
    "src/main/java/com/bank/payments/domain/MoneyValueObject.java",
  domainEvent:
    "src/main/java/com/bank/payments/domain/OrderPlacedDomainEvent.java",
  applicationHandler:
    "src/main/java/com/bank/payments/application/PlaceOrderHandler.java",
  adapterOut:
    "src/main/java/com/bank/payments/adapter/out/persistence/PaymentRepositoryAdapter.java",
  ports:
    "src/main/java/com/bank/payments/ports/PaymentPort.java",
  infraEntityManager:
    "src/main/java/com/bank/payments/infrastructure/EntityManagerConfig.java",
  configJpaScanner:
    "src/main/java/com/bank/payments/config/JpaEntityScanner.java",
  readme: "README.md",
  docsOnly: "docs/architecture/hexagonal-overview.md",
  testPath: "src/test/java/com/bank/payments/domain/PaymentServiceTest.java",
  testSrcTree:
    "src/test/java/com/bank/payments/domain/PaymentAggregateTests.java",
} as const;

function packIndex(): RuleIndex {
  return buildIndex(PACK_ROOT);
}

function hexDddRecords(index: RuleIndex): RuleIndexRecord[] {
  return index.rules.filter((r) =>
    (HEX_DDD_IDS as readonly string[]).includes(r.id),
  );
}

function recordById(index: RuleIndex, id: HexDddId): RuleIndexRecord {
  const rec = index.rules.find((r) => r.id === id);
  assert.ok(
    rec,
    `index must contain HEX/DDD rule ${id} (plan 02 content missing)`,
  );
  return rec;
}

function isSelected(
  result: ReturnType<typeof select>,
  id: string,
): boolean {
  return result.selected.some((s) => s.id === id);
}

function neitherSelected(result: ReturnType<typeof select>): void {
  for (const id of HEX_DDD_IDS) {
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

test("hygiene: JSON.stringify(index) lacks each HEX/DDD body canary", () => {
  const index = packIndex();
  const serialized = JSON.stringify(index);
  for (const id of HEX_DDD_IDS) {
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
// JAVA-HEX-01 / JAVA-DDD-01 — domain subscription gate
// ---------------------------------------------------------------------------

test("JAVA-HEX-01/JAVA-DDD-01: domains=[] selects neither HEX nor DDD (rich signal)", () => {
  const index = packIndex();
  for (const id of HEX_DDD_IDS) {
    assert.ok(
      index.rules.some((r) => r.id === id),
      `HEX/DDD rule ${id} must exist in aidlc-rules for subscription proof`,
    );
  }

  const signal: TaskSignal = {
    taskType: "feature",
    keywords: ["hexagonal", "aggregate-root", "ports-and-adapters"],
    paths: [
      PATHS.domainService,
      PATHS.domainAggregate,
      PATHS.applicationHandler,
      PATHS.adapterOut,
    ],
  };
  const result = select(index, signal, UNSUBSCRIBED);

  for (const id of HEX_DDD_IDS) {
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
// JAVA-HEX-01 — positive path-primary selection
// ---------------------------------------------------------------------------

test("JAVA-HEX-01: domain/PaymentService.java selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.domainService],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "**/domain/** path under construction must select java-spring-hex-layering",
  );
});

test("JAVA-HEX-01: application/PlaceOrderHandler.java selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.applicationHandler],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "**/application/** path under construction must select java-spring-hex-layering",
  );
});

test("JAVA-HEX-01: adapter/out persistence adapter selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.adapterOut],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "**/adapter/** path under construction must select java-spring-hex-layering",
  );
});

test("JAVA-HEX-01: ports/PaymentPort.java selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.ports],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "**/ports/** path under construction must select java-spring-hex-layering",
  );
});

// ---------------------------------------------------------------------------
// JAVA-DDD-01 — positive path-primary selection (+ HEX overlap on domain/**)
// ---------------------------------------------------------------------------

test("JAVA-DDD-01: domain/PaymentAggregate.java selects ddd-tactical (and hex)", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.domainAggregate],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "**/domain/**/*Aggregate* path must select java-spring-ddd-tactical",
  );
  // Overlap expected: domain package also selects hex-layering
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "domain Aggregate path may also select hex-layering (overlap expected)",
  );
});

test("JAVA-DDD-01: domain/MoneyValueObject.java selects ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.domainValueObject],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "**/domain/**/*ValueObject* path must select java-spring-ddd-tactical",
  );
});

test("JAVA-DDD-01: domain/OrderPlacedDomainEvent.java selects ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.domainEvent],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "**/domain/**/*DomainEvent* path must select java-spring-ddd-tactical",
  );
});

// ---------------------------------------------------------------------------
// Keyword positives (paths empty) — multi-token only
// ---------------------------------------------------------------------------

test("JAVA-HEX-01 keywords: hexagonal selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["hexagonal"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "keyword hexagonal must select java-spring-hex-layering",
  );
});

test("JAVA-HEX-01 keywords: ports-and-adapters selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["ports-and-adapters"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "keyword ports-and-adapters must select java-spring-hex-layering",
  );
});

test("JAVA-HEX-01 keywords: inbound-port selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["inbound-port"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "keyword inbound-port must select java-spring-hex-layering",
  );
});

test("JAVA-HEX-01 keywords: outbound-port selects hex-layering", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["outbound-port"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-hex-layering"),
    "keyword outbound-port must select java-spring-hex-layering",
  );
});

test("JAVA-DDD-01 keywords: aggregate-root selects ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["aggregate-root"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "keyword aggregate-root must select java-spring-ddd-tactical",
  );
});

test("JAVA-DDD-01 keywords: value-object selects ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["value-object"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "keyword value-object must select java-spring-ddd-tactical",
  );
});

test("JAVA-DDD-01 keywords: domain-event selects ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["domain-event"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "keyword domain-event must select java-spring-ddd-tactical",
  );
});

test("JAVA-DDD-01 keywords: tactical-ddd selects ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["tactical-ddd"], paths: [] },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-ddd-tactical"),
    "keyword tactical-ddd must select java-spring-ddd-tactical",
  );
});

// ---------------------------------------------------------------------------
// CR negatives — keyword-only bank traps (no bare entity/event/port needles)
// ---------------------------------------------------------------------------

test("CR negative: keyword identity alone selects neither HEX nor DDD", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["identity"], paths: [] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("CR negative: keyword prevent-duplicate alone selects neither", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["prevent-duplicate"], paths: [] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("CR negative: keyword eventual-consistency alone selects neither", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["eventual-consistency"], paths: [] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("CR negative: keywords report+support alone select neither (no bare port)", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["report", "support"], paths: [] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("CR negative: keyword interest-rate alone selects neither", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: ["interest-rate"], paths: [] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

// ---------------------------------------------------------------------------
// CR negatives — infra Entity* paths (tightened **/domain/**/*Entity* glob)
// ---------------------------------------------------------------------------

test("CR negative: infrastructure/EntityManagerConfig.java does not select ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.infraEntityManager],
    },
    SUBSCRIBED,
  );
  assert.ok(
    !isSelected(result, "java-spring-ddd-tactical"),
    "EntityManagerConfig outside domain must not select ddd-tactical (tight Entity glob)",
  );
});

test("CR negative: config/JpaEntityScanner.java does not select ddd-tactical", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.configJpaScanner],
    },
    SUBSCRIBED,
  );
  assert.ok(
    !isSelected(result, "java-spring-ddd-tactical"),
    "JpaEntityScanner outside domain must not select ddd-tactical (tight Entity glob)",
  );
});

// ---------------------------------------------------------------------------
// Unrelated / exclude / out-of-phase
// ---------------------------------------------------------------------------

test("unrelated: README.md only selects neither HEX nor DDD", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: [], paths: [PATHS.readme] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("unrelated: docs-only path selects neither HEX nor DDD", () => {
  const index = packIndex();
  const result = select(
    index,
    { taskType: "feature", keywords: [], paths: [PATHS.docsOnly] },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("exclude: taskType docs + domain path selects neither", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "docs",
      keywords: ["hexagonal", "aggregate-root"],
      paths: [PATHS.domainService],
    },
    SUBSCRIBED,
  );
  neitherSelected(result);
});

test("exclude: *Test* path selects neither", () => {
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
  neitherSelected(result);
});

test("exclude: **/src/test/** path selects neither", () => {
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
  neitherSelected(result);
});

test("out-of-phase: inception + domain path selects neither (out-of-phase)", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [PATHS.domainService],
    },
    { phase: "inception", domains: ["java-spring"] },
  );
  neitherSelected(result);
  for (const id of HEX_DDD_IDS) {
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

test("summary contract: each HEX/DDD record is domain advisory with one-line summary", () => {
  const index = packIndex();
  const records = hexDddRecords(index);
  assert.equal(
    records.length,
    HEX_DDD_IDS.length,
    `expected ${HEX_DDD_IDS.length} HEX/DDD rules in index, found ${records.length}`,
  );

  for (const id of HEX_DDD_IDS) {
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

test("summary contract: HEX encodes inward/domain purity language", () => {
  const index = packIndex();
  const rec = recordById(index, "java-spring-hex-layering");
  const summary = rec.summary.toLowerCase();
  const encodesPurity =
    /spring|jpa|framework|gateway|inward|port/.test(summary);
  assert.ok(
    encodesPurity,
    `HEX summary must encode inward/domain purity (spring|jpa|framework|gateway|inward|port); got: ${rec.summary}`,
  );
});

test("summary contract: DDD encodes aggregate + value object + past-tense event language", () => {
  const index = packIndex();
  const rec = recordById(index, "java-spring-ddd-tactical");
  const summary = rec.summary.toLowerCase();
  assert.ok(
    summary.includes("aggregate"),
    `DDD summary must mention aggregate; got: ${rec.summary}`,
  );
  assert.ok(
    summary.includes("value object") || summary.includes("value-object"),
    `DDD summary must mention value object; got: ${rec.summary}`,
  );
  const pastTenseEvent =
    summary.includes("past-tense") ||
    summary.includes("past tense") ||
    (summary.includes("domain event") &&
      (summary.includes("past") || summary.includes("tense")));
  assert.ok(
    pastTenseEvent,
    `DDD summary must encode past-tense domain event naming; got: ${rec.summary}`,
  );
});

// ---------------------------------------------------------------------------
// Inject quarantine — summary only, no BODY_CANARY / essay headings
// ---------------------------------------------------------------------------

test("inject quarantine: HEX/DDD selection carries summary only — no canary or essay heading", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["hexagonal", "aggregate-root"],
      paths: [
        PATHS.domainAggregate,
        PATHS.applicationHandler,
        PATHS.adapterOut,
      ],
    },
    SUBSCRIBED,
  );

  const selectedHexDdd = result.selected.filter((s) =>
    (HEX_DDD_IDS as readonly string[]).includes(s.id),
  );
  assert.ok(
    selectedHexDdd.length > 0,
    "at least one HEX/DDD rule must be selected for inject proof",
  );

  const fragment = renderInjection(result);

  for (const rule of selectedHexDdd) {
    assert.ok(
      fragment.includes(rule.summary),
      `inject fragment must contain summary for ${rule.id}`,
    );
    const canary = BODY_CANARIES[rule.id as HexDddId];
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
