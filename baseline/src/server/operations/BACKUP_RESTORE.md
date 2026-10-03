# Backup and restore
- **Confirmed:** Restore drills are isolated synthetic targets and must verify counts, constraints, samples, schema and append-only audit before reopening service. Backup credentials, DB, buckets and queues are environment-separated; private object versions are protected.
- **Proposal:** HA replica/failover, encrypted PITR WAL archive, immutable daily snapshots, object versioning, independent KMS keys, monitoring and restore runbooks. Proposed RPO/RTO are **TO BE AGREED**; no production figures are asserted.
- **Needs Legal Review:** retention/disposal, legal hold, key custody, archival region and real-data restore access require owner/DPO/legal review.

Failure/recovery: on backup failure alert and retain last verified recovery point; on restore mismatch keep the isolated target offline, preserve evidence, correct forward and retry. Never restore into production directly; do not overwrite audit history. Required evidence: backup ID/time, target isolation, elapsed time, schema, counts, constraints, samples, audit/outbox checks, operator and approver.
