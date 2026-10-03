# Go-live, handover and PIR runbook — synthetic baseline

## Status labels

**Confirmed**

- The handover pack checker validates eight existing runbook assets, five named role responsibilities, staged-rollout definitions, daily-review and 7/30-day PIR templates.
- All templates request aggregates and safe evidence only; server authorization and append-only history remain required.
- A complete file pack is not a real go-live, owner decision or support acknowledgement.

**Proposal**

- Run daily early reviews for the owner-approved early-life period; this baseline supplies day templates, not a scheduled operational commitment.
- Owner approves rollout scope, pilot population, rollout/freeze thresholds, KPI targets and PIR dates before any production use.

**Needs Legal Review**

- Support records, KPI retention, incident/PIR distribution, change-freeze authority, data correction authority and any production-data processing require owner/DPO/legal review. No policy period or law is inferred.

## Ownership and handover

| Role | Owns |
|---|---|
| Service Owner | Go/no-go, exceptions and 7/30-day PIR decision. |
| Release Owner | Artifact, rollout/freeze/rollback evidence. |
| Support Lead | Daily review, support intake, escalation and acknowledgement. |
| Security/Privacy Owner | Authorization/privacy incident path and evidence access. |
| Data Owner | Data-quality KPIs, corrections, reconciliation and retention decisions. |

Required handover pack: release, backup/restore, monitoring, UAT, QA, legacy migration, training/SOP and audit/approval runbooks. Record owner/support acknowledgement separately; a blank acknowledgement remains `PENDING_OWNER_SUPPORT_ACK`.

## Staged rollout and freeze

| Stage | Entry gate | Action | Freeze / recovery |
|---|---|---|---|
| Prepare | Approved artifact, backup/restore, migration/UAT/support evidence. | Keep flags off. | Any missing evidence: no-go. |
| Pilot | Approved limited scope and smoke/monitoring evidence. | Enable one reversible flag. | Hold/disable flag for anomaly. |
| Hold | Daily review has no unresolved blocker. | Do not expand. | Freeze on incident, reconciliation or evidence gap. |
| Expand | Owner accepts pilot and support readiness. | Increase approved scope only. | Route back to prior artifact/flags; no history deletion. |
| Steady state | 7-day review accepted. | Operations owns runbooks and KPIs. | Continue rollback/freeze if new blocker appears. |

Freeze criteria: failed smoke or restore evidence; UAT/sign-off gap; unauthorized/privacy concern; failed migration/reconciliation; monitoring/queue/scan/backup alarm; missing support owner; or a condition declared by the owner’s approved SLO. Recovery is stop expansion, hold flags, use the release rollback plan, preserve minimum evidence and obtain a new decision.

## Daily early review

For each approved review day, record: rollout scope/flag state; smoke and monitoring signals (error, latency, DB, auth, rate limit, queue/DLQ, scan, backup); incidents; data quality/reconciliation/backlog KPI aggregates; support/training gaps; freeze/rollback decision and safe evidence references. Do not attach raw payload, secrets or protected content.

## 7- and 30-day PIR

| Review | Required output |
|---|---|
| Day 7 PIR | Rollout evidence, early KPI trend, incidents/changes, data-quality findings, backlog, runbook/training updates, owner decision. |
| Day 30 PIR | Sustained KPI trend, recurrent issues/root causes, data correction/reconciliation, security/privacy findings, backlog prioritization, operating-model and improvement decision. |

Both PIRs remain `PENDING_OWNER_REVIEW` until an owner records the decision and evidence.

## Backlog and data-quality KPI definitions

| KPI | Use |
|---|---|
| Open backlog / reopened requests | Workload, age and recurrence by safe category/status. |
| Validation rejection rate | Input/process quality; trend by entity/area without payload. |
| Quarantined duplicate count | Dedupe pressure and canonical-record review workload. |
| Reconciliation variance | Migration/import consistency by entity/status/area. |
| Correction request rate | Append-only correction volume and effective-date conflict trend. |

Targets, warning bands and owner actions are intentionally unset until approved baseline measurements exist.

## Current execution boundary

`npm run test:golive:handover` proves that the synthetic handover pack, templates and role definitions are internally complete. It does not prove production deployment, support staffing, backup/restore, monitoring integration, UAT sign-off, production KPI measurement, owner acknowledgement or go-live. Current production decision remains **NO-GO**.
