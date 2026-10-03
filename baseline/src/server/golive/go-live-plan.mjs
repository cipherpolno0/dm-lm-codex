export const rolloutStages = Object.freeze([
  { id: 'PREPARE', gate: 'Owner approves immutable artifact, backup/restore evidence, approved migration, UAT and support roster.', action: 'Keep all release flags off.' },
  { id: 'PILOT', gate: 'Approved synthetic pilot scope and smoke/monitoring evidence.', action: 'Enable one reversible approved flag; hold on anomaly.' },
  { id: 'HOLD', gate: 'Daily early review confirms no unresolved release blocker.', action: 'Do not expand while incident, reconciliation or evidence gap remains.' },
  { id: 'EXPAND', gate: 'Owner accepts pilot evidence and support confirms readiness.', action: 'Increase only approved scope; preserve rollback path.' },
  { id: 'STEADY_STATE', gate: '7-day review accepted; operations owns runbooks.', action: 'Continue KPI/PIR cadence; do not remove historical records.' },
]);

export const handoverAssets = Object.freeze([
  'src/server/release/PRODUCTION_RELEASE.md', 'src/server/operations/BACKUP_RESTORE.md', 'src/server/observability/MONITORING.md',
  'src/server/uat/STAGING_UAT.md', 'src/server/qa/QA_MATRIX.md', 'src/server/migration/LEGACY_MIGRATION.md',
  'src/server/training/TRAINING_SOP.md', 'src/server/audit/AUDIT_APPROVAL.md',
]);

export const accountability = Object.freeze([
  { role: 'SERVICE_OWNER', responsibility: 'Go/no-go, exception acceptance, 7/30-day PIR decision.' },
  { role: 'RELEASE_OWNER', responsibility: 'Immutable artifact, rollout/freeze/rollback decision and evidence bundle.' },
  { role: 'SUPPORT_LEAD', responsibility: 'Daily review, incident intake, escalation and handover acknowledgement.' },
  { role: 'SECURITY_PRIVACY_OWNER', responsibility: 'Authorization/privacy incidents, evidence access and legal/DPO escalation.' },
  { role: 'DATA_OWNER', responsibility: 'Data-quality KPI, correction approval, reconciliation and source retention decision.' },
]);

export const kpiDefinitions = Object.freeze([
  { id: 'KPI-BACKLOG-OPEN', area: 'backlog', definition: 'Open work items by priority/status/age band; exclude personal payload.' },
  { id: 'KPI-BACKLOG-REOPEN', area: 'backlog', definition: 'Reopened support/change requests divided by completed requests.' },
  { id: 'KPI-DQ-VALIDATION', area: 'data-quality', definition: 'Validation-rejected records divided by attempted records.' },
  { id: 'KPI-DQ-DUPLICATE', area: 'data-quality', definition: 'Quarantined duplicate candidates/import rows by entity/area.' },
  { id: 'KPI-DQ-RECONCILIATION', area: 'data-quality', definition: 'Reconciliation variance by entity/status/area.' },
  { id: 'KPI-DQ-CORRECTION', area: 'data-quality', definition: 'Append-only correction requests by status and effective-date conflict.' },
]);

export function evaluateHandover({ existingAssets, acknowledgements }) {
  const missingAssets = handoverAssets.filter((asset) => !existingAssets.includes(asset));
  const missingRoles = accountability.map((item) => item.role).filter((role) => !acknowledgements.some((item) => item.role === role && item.acknowledged === true));
  return Object.freeze({ packComplete: missingAssets.length === 0, missingAssets, operationalHandover: missingRoles.length === 0 ? 'OWNER_SUPPORT_ACKNOWLEDGED' : 'PENDING_OWNER_SUPPORT_ACK', missingRoles, productionDecision: 'NO_GO_PRODUCTION' });
}

export function dailyReviewTemplate(day) {
  if (!Number.isInteger(day) || day < 1) throw Error('INVALID_REVIEW_DAY');
  return Object.freeze({ day, status: 'PENDING_OWNER_SUPPORT_REVIEW', checks: ['release flags and rollout scope', 'smoke/error/latency/auth/queue/scan/backup signals', 'incidents and escalation', 'data-quality/reconciliation/backlog KPIs', 'support cases and training gaps', 'freeze/rollback decision'], safeEvidenceOnly: true });
}

export function pirTemplate(day) {
  if (![7, 30].includes(day)) throw Error('UNSUPPORTED_PIR_DAY');
  return Object.freeze({ day, status: 'PENDING_OWNER_REVIEW', sections: ['scope and rollout evidence', 'KPI trends with approved definitions', 'incidents/changes and root causes', 'data-quality/reconciliation findings', 'privacy/security/authorization findings', 'backlog prioritization', 'runbook/training improvements', 'owner decision and follow-up'], dataRule: 'Use aggregates and safe references only; never copy sensitive payload.' });
}
