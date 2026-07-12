# Java/Spring Coverage Gate

Subscribe a consumer project to the Java/Spring domain pack and point the governance overlay at a coverage report produced by CI. The overlay reads reports only; it never invokes Maven, Gradle, or a JDK.

## Subscribe and configure

Set the capability-owned values in the consumer project's `.planning/config.json`:

```json
{
  "governance": {
    "enabled": true,
    "domains": "java-spring",
    "coverage_report_path": "build/reports/jacoco/test/jacocoTestReport.xml"
  }
}
```

`domains` is a comma-separated string because the host capability schema does not accept arrays. The example resolves to `SelectionConfig.domains: ["java-spring"]`. `coverage_report_path` must be relative to the consumer project root.

## When the binding rule is selected

`java-spring-unit-line-coverage` can be selected for a construction task that touches Java production paths. Documentation, test, and infrastructure tasks are excluded, as are test, generated, build, and target paths. Verify routes the selected binding rule to the real `coverage-report` adapter; it does not fall back to the generic CI adapter.

## Produce the report before verify

Report generation belongs to consumer CI. Run the appropriate producer before GSD verify, then configure its project-relative output path.

### Gradle JaCoCo

A typical Gradle pipeline runs:

```bash
./gradlew test jacocoTestReport
```

The common XML path is:

```text
build/reports/jacoco/test/jacocoTestReport.xml
```

### Maven JaCoCo

A Maven pipeline with the JaCoCo plugin commonly runs:

```bash
mvn test
```

Use the generated XML path, typically:

```text
target/site/jacoco/jacoco.xml
```

### LCOV

If an existing producer writes LCOV, set `coverage_report_path` to its project-relative `.info` or `.lcov` file. The overlay does not require or prescribe a Java LCOV generator.

## Format, threshold, and evidence

The adapter infers JaCoCo from `.xml` and LCOV from `.info` or `.lcov`. There is no format setting. Unit line coverage uses a fixed inclusive 70% threshold: 70% passes; anything below 70% fails.

Verify writes durable evidence to `.planning/governance/gates/{NN}-verify.json`. A missing, invalid, empty, or below-threshold report produces fail evidence. The ship gate reads that evidence and blocks while verify status is `fail`; it does not parse the report again.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Binding rule not selected | Confirm `"domains": "java-spring"`, a construction task, and a Java production path. Excluded docs/test/infra tasks and test/generated/build/target paths intentionally do not select it. |
| missing report | Generate the report in CI before verify and confirm `coverage_report_path` names the file relative to the project root. |
| unknown suffix | Use JaCoCo `.xml` or LCOV `.info`/`.lcov`; other suffixes fail closed. |
| Report has zero lines | Confirm the producer emitted aggregate unit line counters or complete LCOV records. Zero lines fail closed. |
| Coverage below 70% | Raise unit line coverage to the fixed inclusive 70% threshold or higher, regenerate, then rerun verify. |
| absolute or root escape | Use a project-relative path. Absolute, traversal, symlink, and out-of-root paths are rejected. |
