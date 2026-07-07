# Deferred Items

## 2026-07-07 — 07-03 verification

- `npm test` failed in `src/governance/audit-hook-contract.test.ts`:
  `local render-hooks verify:post output references aidlc-governance-audit when runtime exists`.
  Direct `gsd-tools loop render-hooks verify:post --raw --config-dir C:/Users/thienpv/.codex`
  returned `validate-phase` and `secure-phase` hooks only, not `aidlc-governance-audit`.
  This is outside 07-03 adapter scope (`src/enforcement/adapters.ts`,
  `src/enforcement/adapters.test.ts`) and was not auto-fixed.
