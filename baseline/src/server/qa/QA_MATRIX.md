# Full QA Matrix — synthetic baseline

## Status rules

**Confirmed**

- The runnable rows below map a synthetic requirement to an executable Node test in this baseline.
- `test:qa:coverage` emits `PASS` only after the mapped command exits `0`; its console output is the execution evidence for that run.
- Authorization is evaluated on the server in the mapped negative-access test. UI visibility is not accepted as authorization evidence.
- Existing historical/event tests use append-only records; they are not an authorization to overwrite history.

**Proposal**

- CI retains the QA command output as a build artifact and blocks promotion on a runnable-row failure or an evidence-less claimed pass.
- Browser accessibility and responsive viewport checks should be added to the same runner after agreed route/viewport/browser coverage is available.

**Needs Legal Review**

- Retention periods, audit-evidence retention, privacy classification and any regulated accessibility obligation need DPO/legal/owner review. This matrix does not certify compliance or identify any real law.

## Requirement → test traceability

| Requirement | Test category | Test / evidence command | Passing evidence | Current QA-run status | Failure mode / recovery |
|---|---|---|---|---|---|
| QA-FUNC-01: person/org/education role/timeline history and audit | Functional | `node tests/education/role-date.test.mjs`; `node tests/audit/tamper-completeness.test.mjs` | Both exit `0` in QA runner | Runnable | Stop promotion; investigate fixture/service regression; correct with a new historical event, then rerun. |
| QA-VAL-01: invalid dates/links/cycles/transitions | Validation | `node tests/positions/timeline.test.mjs`; `node tests/org/cycle.test.mjs` | Both exit `0` in QA runner | Runnable | Reject before transaction; preserve audit; correct input and retry. |
| QA-DUP-01: candidate/import duplicate prevention | Duplicate | `node tests/registrar/approved-mapping.test.mjs`; `node tests/imports/commit-reliability.test.mjs` | Both exit `0` | Runnable | Do not commit duplicate; retain report/idempotency record; resolve canonical record and retry safely. |
| QA-PERM-01: deny-by-default/cross-scope | Permission | `node tests/auth/negative-access.test.mjs` | Exit `0`, including negative 401/403 cases | Runnable | Return safe 401/403, log minimally, revoke risky session/role and investigate. |
| QA-PRIV-01: public projection/masking | Privacy | `node tests/public/directory-privacy.test.mjs`; `node tests/people/people-privacy.test.mjs` | Both exit `0` | Runnable | Remove leaking projection/cache, invalidate affected cache, review access/audit evidence. |
| QA-IMP-01: dry-run malformed file | Import | `node tests/imports/bad-file.test.mjs` | Exit `0` | Runnable | Keep zero DB writes; return row/column/code/fix report; correct source and rerun dry-run. |
| QA-TXN-01: retry/crash/status rollback | Transaction | `node tests/imports/commit-reliability.test.mjs`; `node tests/status/rollback.test.mjs` | Both exit `0` | Runnable | Roll back atomic work or forward-fix through a new event; retain import/audit evidence. |
| QA-A11Y-01: keyboard/automated accessibility | Accessibility | Browser + assistive-tech/automation execution | Required browser artifact | **NOT RUN** | Do not claim conformance; triage keyboard/semantic failures, fix, rerun with artifact. |
| QA-RESP-01: handset/tablet/desktop layout | Responsive | Browser viewport execution | Required screenshots/results | **NOT RUN** | Do not claim responsive pass; fix overflow/layout regression and rerun documented viewport set. |
| QA-SEC-01: threat controls/document handling | Security | `node tests/security/threat-model-completeness.test.mjs`; `node tests/documents/malware-expiry.test.mjs` | Both exit `0` | Runnable | Quarantine upload/deny unsafe access; preserve minimal audit evidence; patch and retest. |
| QA-PERF-01: synthetic scale smoke | Performance smoke | `node tests/perf/scale.test.mjs` | Exit `0` and synthetic measurement output | Runnable | Hold release; inspect plan/index/cache; tune then rerun with same synthetic profile. |
| QA-RESTORE-01: isolated synthetic restore evidence | Restore | `node tests/operations/restore-evidence.test.mjs` | Exit `0` | Runnable | Declare restore evidence failed; keep source immutable, rebuild isolated target, investigate and rerun. |

## Execution boundary

This is a synthetic/in-memory baseline. A `PASS` from the QA runner evidences only the listed command in the current workspace run; it is not production deployment, PostgreSQL migration, real-data import, browser accessibility, responsive validation, live backup, PITR, HA failover, or legal-compliance evidence. The two `NOT RUN` rows intentionally remain non-passing until their artifacts exist.
