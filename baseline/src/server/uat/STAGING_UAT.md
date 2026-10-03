# Scripted staging UAT — synthetic baseline

## UAT control and entry gate

| Item | Required value |
|---|---|
| Environment | Isolated staging only; record deployment build ID in the sign-off table. |
| Data | `UAT-*` synthetic records only. Do not load a real person, document, legal source or production export. |
| Authorization | Test actors receive only their action plus geographic/org scope. The server authorizes before each transaction. Test one cross-scope negative control per runnable change workflow. |
| History/audit | Verify dated assignments/statuses/snapshots/audit events are appended. A UI edit is never proof that history was preserved. |
| Evidence | Store request/correlation IDs, redacted record/event/audit IDs and safe error codes. Do not attach secrets or unnecessary PII. |
| Entry decision | The owner must record deployment build ID, scope and a decision. Blank sign-off means **not accepted**. |

## Status labels

**Confirmed**

- UAT-01, UAT-02, UAT-03, UAT-05 and UAT-06 have synthetic service-level rehearsal coverage in this baseline.
- The scripted preflight additionally checks server authorization and public privacy projection.
- The owner-sign-off record starts as `PENDING_OWNER_SIGNATURE`; no acceptance is pre-filled.

**Proposal**

- Run each runnable scenario against the deployed staging build using the actor/scope and fixtures in the registry. Attach the specified evidence to the UAT run.
- Require an independent checker for appointment, secretary, lifecycle and import approval workflows.

**Needs Legal Review**

- Retention of UAT evidence, export eligibility, signatory authority, document handling and any official education/exam form mapping require owner/DPO/legal review. This document names no law and does not claim compliance.

## Role-based execution script

Use the associated registry (`uat-scenario-registry.mjs`) as the machine-checkable source of actor, scope, fixtures, steps, expected results, evidence and recovery. The following is the owner-facing execution order.

| Order | Scenario | Actor / scope | Owner records pass only when |
|---:|---|---|---|
| 1 | UAT-01 Acting → appointed | Position maker + independent checker / `SYN-REGION-ALPHA` | Two dated immutable assignments, correct effective holder, audit events and cross-scope 403 are evidenced. |
| 2 | UAT-02 Secretary change | Education maker + independent checker / `SYN-EDU-001` | Old/new secretary records are linked to the principal by non-overlapping dates; overlap rejection is evidenced. |
| 3 | UAT-03 Establish → move → dissolve education unit | Org-status maker + independent checker / `SYN-REGION-ALPHA` | Append-only lifecycle, rebuilt current status and failed-transaction rollback evidence are attached. |
| 4 | UAT-04 Exam center/session | Exam admin + checker / `SYN-REGION-ALPHA` | Active-host/window positive and inactive/closed negative results exist. **NOT RUN** in this baseline. |
| 5 | UAT-05 Candidate/application | Registrar + checker / `SYN-REGION-ALPHA` | Core-only or approved mapped submission, duplicate/window rejection, status event and audit evidence exist. |
| 6 | UAT-06 Import error → commit | Import maker + checker / `SYN-REGION-ALPHA` | Bad dry-run has zero writes; clean approved commit and same-key replay prove no duplicate. |
| 7 | UAT-07 Export | Export officer + auditor / `SYN-REGION-ALPHA` | Allowed projection/minimal audit and denied cross-scope/private-field results exist. **NOT RUN** in this baseline. |
| 8 | UAT-08 Owner decision | UAT owner / global | All evidence and exceptions are reviewed and the following record is completed. |

## Owner sign-off record

| Field | Value |
|---|---|
| UAT run ID | `________________` |
| Deployment build ID | `________________` |
| Staging environment reference | `________________` |
| Evidence bundle reference | `________________` |
| Owner name / role | `________________` |
| Decision | `ACCEPT` / `REJECT` / `ACCEPT WITH EXCEPTIONS` |
| Exception IDs and expiry | `________________` |
| Signature or approved e-signature reference | `________________` |
| Signed at (UTC) | `________________` |

Attestation: I reviewed the synthetic staging evidence and exceptions for this UAT scope. I understand that an unsigned or evidence-less record is not acceptance.

## Failure handling

1. Mark the scenario failed; preserve its correlation ID and minimal audit evidence.
2. Do not alter historical records or silently retry a transaction.
3. Use the scenario-specific recovery: new dated corrective event, approved retry, idempotent replay, or forward-only compensation.
4. Rerun only the affected scenario on the same or a newly recorded staging build and attach the new evidence.
5. Obtain a new owner decision; earlier unsigned/failed results remain part of the history.

## Current execution boundary

`npm run test:uat:script` is an in-memory synthetic rehearsal and script-completeness check, not a staging UAT execution or an owner signature. It deliberately reports UAT-04 and UAT-07 as `NOT RUN`; it cannot prove a deployed exam-center service, export service, browser workflow, real backup/PITR, HA failover, legal compliance, or owner acceptance.
