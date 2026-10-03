# Monitoring and incident runbook — synthetic baseline

## Status labels

**Confirmed**

- The observability helper defines eight required metrics and allowlists safe log/trace attributes.
- Sensitive-shaped fields (for example payload, body, token, authorization, email and contact fields) are excluded from the helper output.
- The local alert drill evaluates all eight synthetic rules and stores incident updates as append-only events.

**Proposal**

- Connect the metric names and structured events to the approved metrics/logs/traces back end; use dashboard and alert-route references controlled by the owner.
- Synthetic thresholds below are starting points only. The service owner must approve production SLOs, windows, severity mappings and escalation recipients.
- Propagate a generated request/correlation ID across web, API, queue/job, database audit and object-scan events; store only pseudonymous/approved dimensions.

**Needs Legal Review**

- Log/trace retention, incident evidence retention, access to observability data, external notification, and postmortem distribution require owner/DPO/legal review. No compliance or retention period is asserted.

## Metrics, telemetry and proposed alerts

| Signal | Metric / safe dimensions | Proposed drill condition | Initial response |
|---|---|---|---|
| Error rate | `http_request_error_ratio`; route template/status class/area code | ≥ 0.05 | Stop rollout; inspect safe traces/logs. |
| Latency | `http_request_duration_p95_ms`; route template/area code | ≥ 1000 ms | Inspect dependency/query latency. |
| Database | `db_connection_saturation_ratio`; DB role | ≥ 0.85 | Protect DB; pause non-critical jobs. |
| Authorization | `auth_denial_total`; reason code/area code | ≥ 20 | Investigate policy regression or abuse; never log credentials. |
| Rate limit | `rate_limit_rejection_total`; route template | ≥ 50 | Inspect traffic/WAF/rate-limit policy. |
| Dead letter queue | `queue_dead_letter_depth`; queue name | ≥ 1 | Pause unsafe consumer; diagnose/replay idempotently. |
| Object scan | `document_scan_failure_total`; reason code | ≥ 1 | Quarantine object; keep access denied. |
| Backup | `backup_verification_state`; backup class | verification false | Release no-go; investigate restore evidence. |

Thresholds are **Proposal**, expressed only for the synthetic drill. They are not measured production baselines or approved SLOs.

## Logging and tracing contract

Allowed logs/traces contain only: timestamp, level, event, request/trace ID, route template, method, status code, duration, area code, actor pseudonym, error code, component and count. Use error codes and correlation IDs instead of a raw request/response, SQL value, object name, document metadata, authorization header, session, contact value or user identifier.

Logs are operational telemetry, not a replacement for append-only audit. Audit continues to record the minimum authorized change evidence; monitoring links through correlation IDs.

## Alert drill and incident handling

1. Inject the synthetic observations in `tests/observability/alert-drill.test.mjs`; do not send a live alert from this baseline.
2. Verify all expected alert rule IDs, severity and safe response appear.
3. Open an append-only incident event with the alert IDs and correlation ID; hold release flags where appropriate.
4. Validate escalation ownership from the approved on-call roster—this repository stores no personal roster.
5. Create a postmortem record with impact, timeline, root cause, recovery, follow-up and evidence-retention review. It begins `PENDING_OWNER_REVIEW`.

| Severity | Trigger examples | Escalation / recovery |
|---|---|---|
| SEV1 | Backup verification absent; confirmed critical availability/security-control impact. | Incident commander + security/release owner; stop rollout, protect data, preserve minimal evidence. |
| SEV2 | Error/DB/auth spike, DLQ or scan failure affecting a critical workflow. | Service owner + on-call; isolate queue/upload/feature, use idempotent retry or rollback plan. |
| SEV3 | Latency/rate-limit deterioration without confirmed critical loss. | Service owner during approved response window; diagnose and tune with change control. |
| SEV4 | Informational anomaly. | Record/triage; promote only if impact changes. |

## Failure modes and recovery

- Telemetry backend unavailable: fail safely without blocking authorized business transaction unless policy requires; buffer only non-sensitive bounded telemetry, drop safely on limit and expose a health metric.
- Alert route unavailable: record delivery failure, page via approved alternate process and do not mark drill complete.
- DLQ/scan failure: quarantine and preserve minimal audit; no automatic unsafe replay or document release.
- Backup alert: no-go for release; create new evidence and run isolated restore verification.
- Monitoring data suggests privacy leakage: restrict access, stop offending export, preserve minimal forensic reference, rotate/revoke only under approved incident procedure.

## Current execution boundary

`npm run test:monitoring:drill` is an in-memory synthetic alert drill. No real metrics backend, trace exporter, alert delivery, pager escalation, production dashboard, DB telemetry, queue, scan service or backup system was contacted. It is therefore not evidence of operational alert delivery or incident response readiness.
