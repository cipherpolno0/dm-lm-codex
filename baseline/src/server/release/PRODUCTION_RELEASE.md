# Production release runbook — synthetic rehearsal baseline

## Status labels

**Confirmed**

- `test:release:rehearsal` checks a synthetic release gate, executes three local smoke regressions, and produces a non-destructive rollback plan.
- The gate refuses non-synthetic data/run types and always returns `NO_GO_PRODUCTION`.
- The CI workflow below runs release rehearsal only; it has no cloud credentials, deployment, migration, feature-flag or production-write step.

**Proposal**

- Production release follows: approved immutable artifact → verified backup/restore point → backward-compatible migration → deploy → smoke → incremental feature flags → cache/search rebuild → monitored handoff.
- Release owner defines the SLO thresholds, alert routes, freeze window and approval identities before any real production use.

**Needs Legal Review**

- Production-data authority, retention/deletion, approver/signatory authority, incident communication, export impact and audit-evidence retention require owner/DPO/legal review. No law or retention duration is assumed.

## Go / no-go gate

| Gate | Evidence required | No-go / recovery |
|---|---|---|
| Immutable artifact | Commit/build ID and immutable artifact digest; prior known-good digest. | Missing/mutable artifact: do not deploy; rebuild through CI. |
| Backup and restore | New recovery-point reference plus isolated restore evidence. | Missing/failed evidence: no-go; create/verify a new backup. Do not trust backup without restore evidence. |
| Migration | Approved, backward-compatible plan; schema-old/new job compatibility; source retention maintained. | Failed/unknown migration: no-go; restore traffic to prior artifact and use approved forward-fix—no untracked down migration. |
| Feature flags | All release flags initially off; owner for each flag and rollback behavior recorded. | Flag not controllable: no-go; disable/remove from release scope. |
| Deploy | Environment-specific credentials and immutable artifact match recorded; server authorization remains enabled. | Artifact/config mismatch: stop rollout; retain evidence; redeploy known-good artifact only. |
| Smoke | Health, authorized mutation, cross-scope 403, public privacy projection and critical synthetic migration checks pass with evidence. | Any failure: stop flags/rollout, preserve logs without excess PII, invoke rollback plan. |
| Cache/search rebuild | Job ID, input version, count/reconciliation and completion state recorded. | Failed/partial rebuild: keep stale-safe behavior or disable affected feature; rerun idempotently after diagnosis. |
| Monitoring | Dashboard and alert-route references; error, latency, queue/job, auth denial, DB health and backup signals visible. | Missing signal/alert route: no-go; restore observability before rollout. |

## Release sequence

1. Freeze the approved artifact and configuration diff; obtain release-owner approval.
2. Create a recovery point and verify an isolated restore. Record both references.
3. Run only backward-compatible approved migrations from CI; keep old/new readers and jobs compatible.
4. Set release feature flags off. Deploy the immutable artifact using environment-specific credentials.
5. Run smoke checks; record command/output/correlation IDs. Do not treat UI visibility as authorization evidence.
6. Enable one approved flag at a time and observe the agreed monitoring window. Rebuild cache/search through idempotent jobs; reconcile counts.
7. Record monitoring handoff and final go/no-go. Contract migrations and source deletion are later, separately approved work.

## Rollback criteria and recovery

Rollback/stop-rollout criteria are: failed smoke, failed authorization/privacy check, failed migration/reconciliation, monitoring breach under the owner-approved SLO, unsafe queue/job behavior, or unavailable backup/restore evidence.

1. Set release flags off and stop further rollout.
2. Route to the prior immutable artifact; keep backward-compatible schema in place.
3. Do not delete source, history or audit. Use an approved forward-fix/compensation for data issues.
4. Preserve minimal incident/audit evidence; rebuild cache/search only after consistency is understood.
5. Re-run smoke and obtain a new owner decision before any re-release.

## Reproducible CI/CD boundary

`.github/workflows/release-rehearsal.yml` pins the Node version and runs the release rehearsal, QA coverage, migration rehearsal and UAT-script check. It intentionally cannot perform a production deployment. A real production pipeline must additionally use protected environments, independent approvals, immutable artifacts, isolated credentials and evidence retention approved by the owner.

## Current execution boundary

This repository has no completed production backup, restore, migration, deploy, cache/search rebuild, monitoring handoff, UAT owner sign-off or release approval. Therefore the only valid current production decision is **NO-GO**. `SMOKE_AND_ROLLBACK_READY_SYNTHETIC` means the local rehearsal passed, not that production is ready.
