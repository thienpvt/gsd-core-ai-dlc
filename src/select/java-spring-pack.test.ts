/**
 * Phase 13 RED suite: java-spring domain pack selection + inject proofs.
 *
 * Locks JAVA-PACK-01/02, JAVA-SVC-01/02/03, JAVA-IN-01/02 against the real
 * `aidlc-rules` root via buildIndex → select → renderInjection. Suite is RED
 * until plan 02 lands the four pack rules + details under
 * aidlc-rules/domain/java-spring/.
 *
 * ---------------------------------------------------------------------------
 * Plan 02 handoff (author these to turn GREEN)
 * ---------------------------------------------------------------------------
 * PACK_IDS (frontmatter `id`, scope: domain, classification: advisory):
 *   - java-spring-svc-internal-outbound
 *   - java-spring-svc-internet-outbound
 *   - java-spring-inbound-rest
 *   - java-spring-inbound-kafka
 *
 * Layout:
 *   aidlc-rules/domain/java-spring/<id>.md
 *   aidlc-rules/domain/java-spring/details/<id>-detail.md
 *
 * Body canary tokens (must appear in rule body and/or detail file; must NEVER
 * appear in rule-index.json or renderInjection output):
 *   - BODY_CANARY java-spring-svc-internal-outbound
 *   - BODY_CANARY java-spring-svc-internet-outbound
 *   - BODY_CANARY java-spring-inbound-rest
 *   - BODY_CANARY java-spring-inbound-kafka
 *
 * Body headings (essay form — inject must not contain these):
 *   - ## Rule JS-SVC-01
 *   - ## Rule JS-SVC-02
 *   - ## Rule JS-IN-01
 *   - ## Rule JS-IN-02
 *
 * Frontmatter / triggers / one-sentence summaries: see
 * .planning/phases/13-domain-pack-service-classification-integrations/13-RESEARCH.md
 * section "Recommended Rule Specs".
 *
 * Vendor product names (wso2, tibco, smartvista) may appear ONLY in rule
 * Markdown content under aidlc-rules/ — never in production src/ identifiers.
 * ---------------------------------------------------------------------------
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
} from "node:fs";
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

/** Production rule store — prefer real aidlc-rules (RESEARCH A2 / plan 01). */
const PACK_ROOT = path.resolve(process.cwd(), "aidlc-rules");

/** Four Phase 13 pack rule ids (locked inventory). */
const PACK_IDS = [
  "java-spring-svc-internal-outbound",
  "java-spring-svc-internet-outbound",
  "java-spring-inbound-rest",
  "java-spring-inbound-kafka",
] as const;

type PackId = (typeof PACK_IDS)[number];

/** Body-leak canaries plan 02 must place in rule bodies/details. */
const BODY_CANARIES: Record<PackId, string> = {
  "java-spring-svc-internal-outbound":
    "BODY_CANARY java-spring-svc-internal-outbound",
  "java-spring-svc-internet-outbound":
    "BODY_CANARY java-spring-svc-internet-outbound",
  "java-spring-inbound-rest": "BODY_CANARY java-spring-inbound-rest",
  "java-spring-inbound-kafka": "BODY_CANARY java-spring-inbound-kafka",
};

/** Essay headings that must never appear in inject fragments. */
const RULE_ESSAY_HEADINGS = [
  "## Rule JS-SVC-01",
  "## Rule JS-SVC-02",
  "## Rule JS-IN-01",
  "## Rule JS-IN-02",
] as const;

/** Vendor tokens forbidden in production src/ (case-insensitive). */
const VENDOR_TOKENS = ["wso2", "tibco", "smartvista"] as const;

const SUBSCRIBED: SelectionConfig = {
  phase: "construction",
  domains: ["java-spring"],
};

const UNSUBSCRIBED: SelectionConfig = {
  phase: "construction",
  domains: [],
};

function packIndex(): RuleIndex {
  return buildIndex(PACK_ROOT);
}

function packRecords(index: RuleIndex): RuleIndexRecord[] {
  return index.rules.filter((r) =>
    (PACK_IDS as readonly string[]).includes(r.id),
  );
}

function recordById(index: RuleIndex, id: PackId): RuleIndexRecord {
  const rec = index.rules.find((r) => r.id === id);
  assert.ok(rec, `index must contain pack rule ${id} (plan 02 content missing)`);
  return rec;
}

function isSelected(
  result: ReturnType<typeof select>,
  id: string,
): boolean {
  return result.selected.some((s) => s.id === id);
}

/**
 * Walk production TypeScript under src/, excluding test files, collecting
 * absolute paths for the vendor-token gate (JAVA-SVC-03).
 */
function walkProductionSrcTs(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkProductionSrcTs(full, out);
      continue;
    }
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".test.ts")) continue;
    if (name.endsWith(".property.test.ts")) continue;
    out.push(full);
  }
  return out;
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

test("hygiene: JSON.stringify(index) lacks each pack body canary", () => {
  const index = packIndex();
  const serialized = JSON.stringify(index);
  for (const id of PACK_IDS) {
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
// JAVA-PACK-01 — domain subscription gate
// ---------------------------------------------------------------------------

test("JAVA-PACK-01: domains=[] selects zero java-spring pack rules (rich signal)", () => {
  const index = packIndex();
  // Ensure pack rules are present in the store (fails RED until plan 02).
  for (const id of PACK_IDS) {
    assert.ok(
      index.rules.some((r) => r.id === id),
      `pack rule ${id} must exist in aidlc-rules for subscription proof`,
    );
  }

  const signal: TaskSignal = {
    taskType: "feature",
    keywords: ["internet-facing", "controller", "kafka", "internal-service"],
    paths: [
      "src/main/java/com/acme/api/PaymentController.java",
      "src/main/java/com/acme/messaging/OrderListener.java",
    ],
  };
  const result = select(index, signal, UNSUBSCRIBED);

  for (const id of PACK_IDS) {
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

test("JAVA-PACK-01 positive: domains=['java-spring'] can select matching pack ids", () => {
  const index = packIndex();
  const cfg = SUBSCRIBED;

  const internal = select(
    index,
    {
      taskType: "feature",
      keywords: ["internal-service"],
      paths: [],
    },
    cfg,
  );
  assert.ok(
    isSelected(internal, "java-spring-svc-internal-outbound"),
    "subscribed + internal-service must select java-spring-svc-internal-outbound",
  );

  const internet = select(
    index,
    {
      taskType: "feature",
      keywords: ["internet-facing"],
      paths: [],
    },
    cfg,
  );
  assert.ok(
    isSelected(internet, "java-spring-svc-internet-outbound"),
    "subscribed + internet-facing must select java-spring-svc-internet-outbound",
  );

  const rest = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/api/PaymentController.java"],
    },
    cfg,
  );
  assert.ok(
    isSelected(rest, "java-spring-inbound-rest"),
    "subscribed + *Controller* path must select java-spring-inbound-rest",
  );

  const kafka = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/messaging/OrderListener.java"],
    },
    cfg,
  );
  assert.ok(
    isSelected(kafka, "java-spring-inbound-kafka"),
    "subscribed + *Listener* path must select java-spring-inbound-kafka",
  );
});

// ---------------------------------------------------------------------------
// JAVA-PACK-02 — one-sentence summary + detailPath + inject quarantine
// ---------------------------------------------------------------------------

test("JAVA-PACK-02: each pack rule summary is one sentence; detailPath set; advisory domain", () => {
  const index = packIndex();
  const records = packRecords(index);
  assert.equal(
    records.length,
    PACK_IDS.length,
    `expected ${PACK_IDS.length} pack rules in index, found ${records.length}`,
  );

  for (const id of PACK_IDS) {
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
    // One-sentence: ends with sentence punctuation or is single prose without multi-clause dump
    const trimmed = rec.summary.trim();
    assert.ok(
      /[.!?]$/.test(trimmed) || !trimmed.includes(". "),
      `${id} summary should be one sentence (end with .!? or lack multi-sentence breaks)`,
    );
  }
});

test("JAVA-PACK-02 inject: fragment carries summary only — no body canary or Rule JS essay heading", () => {
  const index = packIndex();
  // Rich construction signal that should select multiple pack rules when content exists.
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["internet-facing", "controller", "kafka"],
      paths: [
        "src/main/java/com/acme/api/PaymentController.java",
        "src/main/java/com/acme/kafka/OrderListener.java",
      ],
    },
    SUBSCRIBED,
  );

  const selectedPack = result.selected.filter((s) =>
    (PACK_IDS as readonly string[]).includes(s.id),
  );
  assert.ok(
    selectedPack.length > 0,
    "at least one pack rule must be selected for inject proof",
  );

  const fragment = renderInjection(result);

  for (const rule of selectedPack) {
    assert.ok(
      fragment.includes(rule.summary),
      `inject fragment must contain summary for ${rule.id}`,
    );
    const canary = BODY_CANARIES[rule.id as PackId];
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

// ---------------------------------------------------------------------------
// JAVA-SVC-01 — Internal XOR internet-facing outbound
// ---------------------------------------------------------------------------

test("JAVA-SVC-01: internal-service selects internal-outbound only", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["internal-service"],
      paths: [],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-svc-internal-outbound"),
    "internal-service must select java-spring-svc-internal-outbound",
  );
  assert.ok(
    !isSelected(result, "java-spring-svc-internet-outbound"),
    "internal-service must NOT select internet-outbound",
  );
});

test("JAVA-SVC-01: internet-facing selects internet-outbound only", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["internet-facing"],
      paths: [],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-svc-internet-outbound"),
    "internet-facing must select java-spring-svc-internet-outbound",
  );
  assert.ok(
    !isSelected(result, "java-spring-svc-internal-outbound"),
    "internet-facing must NOT select internal-outbound",
  );
});

test("JAVA-SVC-01: both class markers select neither outbound (exclude XOR)", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["internal-service", "internet-facing"],
      paths: [],
    },
    SUBSCRIBED,
  );
  assert.ok(
    !isSelected(result, "java-spring-svc-internal-outbound"),
    "dual markers must not select internal-outbound",
  );
  assert.ok(
    !isSelected(result, "java-spring-svc-internet-outbound"),
    "dual markers must not select internet-outbound",
  );
});

test("JAVA-SVC-01: ambiguous (no class marker) selects neither outbound", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: [],
    },
    SUBSCRIBED,
  );
  assert.ok(
    !isSelected(result, "java-spring-svc-internal-outbound"),
    "unnamed class must not select internal-outbound (fail-open)",
  );
  assert.ok(
    !isSelected(result, "java-spring-svc-internet-outbound"),
    "unnamed class must not select internet-outbound (fail-open)",
  );
});

// ---------------------------------------------------------------------------
// JAVA-SVC-02 — Internal summary language
// ---------------------------------------------------------------------------

test("JAVA-SVC-02: internal-outbound summary encodes JDBC/ORM allowed and no forced gateway", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["internal-service"],
      paths: [],
    },
    SUBSCRIBED,
  );
  const hit = result.selected.find(
    (s) => s.id === "java-spring-svc-internal-outbound",
  );
  assert.ok(hit, "internal-outbound must be selected for summary checks");

  const summary = hit.summary.toLowerCase();
  // JDBC/ORM-or-direct-DB allowed language
  const allowsDb =
    summary.includes("jdbc") ||
    summary.includes("orm") ||
    summary.includes("direct db") ||
    summary.includes("direct database") ||
    (summary.includes("db") && summary.includes("access"));
  assert.ok(
    allowsDb,
    `internal-outbound summary must mention JDBC/ORM/direct DB allowance; got: ${hit.summary}`,
  );

  // No-forced-gateway language
  const noForcedGateway =
    summary.includes("do not force") ||
    summary.includes("no forced") ||
    summary.includes("without forcing") ||
    (summary.includes("gateway") &&
      (summary.includes("not") || summary.includes("don't") || summary.includes("do not")));
  assert.ok(
    noForcedGateway,
    `internal-outbound summary must encode no-forced-gateway; got: ${hit.summary}`,
  );
});

// ---------------------------------------------------------------------------
// JAVA-SVC-03 — Internet summary language + vendor gate on production src
// ---------------------------------------------------------------------------

test("JAVA-SVC-03: internet-outbound summary encodes approved gateway / no raw client from domain", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: ["internet-facing"],
      paths: [],
    },
    SUBSCRIBED,
  );
  const hit = result.selected.find(
    (s) => s.id === "java-spring-svc-internet-outbound",
  );
  assert.ok(hit, "internet-outbound must be selected for summary checks");

  const summary = hit.summary.toLowerCase();
  assert.ok(
    summary.includes("gateway") || summary.includes("api gateway"),
    `internet-outbound summary must mention approved API gateway; got: ${hit.summary}`,
  );

  const bansRawClient =
    summary.includes("webclient") ||
    summary.includes("resttemplate") ||
    summary.includes("sdk") ||
    summary.includes("raw");
  assert.ok(
    bansRawClient,
    `internet-outbound summary must ban raw WebClient/RestTemplate/SDK-from-domain; got: ${hit.summary}`,
  );
});

test("JAVA-SVC-03: production src/ (excluding tests) has no vendor product tokens", () => {
  const srcRoot = path.resolve(process.cwd(), "src");
  assert.ok(existsSync(srcRoot), "src/ must exist");

  const files = walkProductionSrcTs(srcRoot);
  assert.ok(files.length > 0, "expected production .ts files under src/");

  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const lower = text.toLowerCase();
    for (const token of VENDOR_TOKENS) {
      if (lower.includes(token)) {
        offenders.push(`${path.relative(process.cwd(), file)} contains ${token}`);
      }
    }
  }
  assert.equal(
    offenders.length,
    0,
    `vendor tokens forbidden in production src/: ${offenders.join("; ")}`,
  );
});

test("JAVA-SVC-03: internet detail file MAY contain bank gateway product name (wso2)", () => {
  const index = packIndex();
  const rec = recordById(index, "java-spring-svc-internet-outbound");
  assert.ok(rec.detailPath, "internet-outbound must have detailPath");

  // detailPath is relative to the rule file directory
  const ruleDir = path.dirname(
    path.resolve(process.cwd(), rec.sourceFile),
  );
  // sourceFile may be repo-relative; also try relative to PACK_ROOT
  const candidates = [
    path.resolve(ruleDir, rec.detailPath),
    path.resolve(PACK_ROOT, path.dirname(rec.sourceFile), rec.detailPath),
    path.resolve(
      PACK_ROOT,
      "domain",
      "java-spring",
      rec.detailPath,
    ),
  ];
  const detailAbs = candidates.find((p) => existsSync(p));
  assert.ok(
    detailAbs,
    `internet-outbound detail file must exist at detailPath=${rec.detailPath}; tried ${candidates.join(", ")}`,
  );

  const detailBody = readFileSync(detailAbs, "utf8");
  // Capability proof: detail is allowed to name the gateway product (WSO2).
  // Soft-assert presence is optional in prose ("MAY"); we only require the file
  // is readable and non-empty here, and that the canary lives in detail/body.
  assert.ok(
    detailBody.trim().length > 0,
    "internet-outbound detail must be non-empty",
  );
  assert.ok(
    detailBody.includes(BODY_CANARIES["java-spring-svc-internet-outbound"]) ||
      detailBody.toLowerCase().includes("wso2") ||
      detailBody.toLowerCase().includes("gateway"),
    "internet detail should carry canary and/or gateway product guidance",
  );
});

// ---------------------------------------------------------------------------
// JAVA-IN-01 — Inbound REST path-primary, construction-only
// ---------------------------------------------------------------------------

test("JAVA-IN-01: construction + PaymentController path selects inbound-rest", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/api/PaymentController.java"],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-inbound-rest"),
    "PaymentController.java under construction must select java-spring-inbound-rest",
  );
});

test("JAVA-IN-01: construction + **/api/** path selects inbound-rest", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/api/payments/PayResource.java"],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-inbound-rest"),
    "**/api/** path under construction must select java-spring-inbound-rest",
  );
});

test("JAVA-IN-01: inception phase with controller path does not select inbound-rest", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/api/PaymentController.java"],
    },
    { phase: "inception", domains: ["java-spring"] },
  );
  assert.ok(
    !isSelected(result, "java-spring-inbound-rest"),
    "inception must not select construction-only inbound-rest",
  );
  const skip = result.skipped.find((s) => s.id === "java-spring-inbound-rest");
  assert.ok(skip, "inbound-rest must be skipped in inception");
  assert.equal(skip.reason, "out-of-phase");
});

test("JAVA-IN-01: taskType docs excluded when exclude configured", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "docs",
      keywords: ["controller", "rest", "endpoint"],
      paths: ["src/main/java/com/acme/api/PaymentController.java"],
    },
    SUBSCRIBED,
  );
  assert.ok(
    !isSelected(result, "java-spring-inbound-rest"),
    "docs taskType must not select inbound-rest when exclude.taskType includes docs",
  );
});

// ---------------------------------------------------------------------------
// JAVA-IN-02 — Inbound Kafka path-primary, construction-only
// ---------------------------------------------------------------------------

test("JAVA-IN-02: construction + OrderListener path selects inbound-kafka", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/messaging/OrderListener.java"],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-inbound-kafka"),
    "OrderListener.java under construction must select java-spring-inbound-kafka",
  );
});

test("JAVA-IN-02: construction + **/kafka/** path selects inbound-kafka", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/kafka/OrderHandler.java"],
    },
    SUBSCRIBED,
  );
  assert.ok(
    isSelected(result, "java-spring-inbound-kafka"),
    "**/kafka/** path under construction must select java-spring-inbound-kafka",
  );
});

test("JAVA-IN-02: REST-only controller path does not select inbound-kafka", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/api/PaymentController.java"],
    },
    SUBSCRIBED,
  );
  assert.ok(
    !isSelected(result, "java-spring-inbound-kafka"),
    "REST controller path must not select inbound-kafka",
  );
});

test("JAVA-IN-02: inception phase does not select inbound-kafka", () => {
  const index = packIndex();
  const result = select(
    index,
    {
      taskType: "feature",
      keywords: [],
      paths: ["src/main/java/com/acme/messaging/OrderListener.java"],
    },
    { phase: "inception", domains: ["java-spring"] },
  );
  assert.ok(
    !isSelected(result, "java-spring-inbound-kafka"),
    "inception must not select construction-only inbound-kafka",
  );
  const skip = result.skipped.find((s) => s.id === "java-spring-inbound-kafka");
  assert.ok(skip, "inbound-kafka must be skipped in inception");
  assert.equal(skip.reason, "out-of-phase");
});
