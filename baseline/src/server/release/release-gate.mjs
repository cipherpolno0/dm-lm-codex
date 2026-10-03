const required = (value, code, failures) => { if (!value) failures.push(code); };

/** Evaluates evidence only. It has no cloud, deployment, DB, or feature-flag side effect. */
export function evaluateReleasePreflight(input) {
  const failures = [];
  if (input?.runType !== 'SYNTHETIC_REHEARSAL') failures.push('NON_SYNTHETIC_RUN_FORBIDDEN');
  if (input?.dataClass !== 'SYNTHETIC') failures.push('NON_SYNTHETIC_DATA_FORBIDDEN');
  required(input?.artifact?.immutableDigest, 'ARTIFACT_DIGEST_MISSING', failures);
  required(input?.artifact?.previousImmutableDigest, 'PREVIOUS_ARTIFACT_MISSING', failures);
  required(input?.backup?.recoveryPointRef, 'BACKUP_RECOVERY_POINT_MISSING', failures);
  required(input?.backup?.restoreEvidenceRef, 'RESTORE_EVIDENCE_MISSING', failures);
  if (input?.migration?.backwardCompatible !== true) failures.push('MIGRATION_NOT_BACKWARD_COMPATIBLE');
  required(input?.migration?.approvalRef, 'MIGRATION_APPROVAL_MISSING', failures);
  if (!Array.isArray(input?.featureFlags) || input.featureFlags.some((flag) => flag.enabled !== false || !flag.name)) failures.push('FEATURE_FLAGS_NOT_SAFE_DEFAULT');
  required(input?.rollback?.ownerRef, 'ROLLBACK_OWNER_MISSING', failures);
  required(input?.monitoring?.dashboardRef, 'MONITORING_DASHBOARD_MISSING', failures);
  required(input?.monitoring?.alertRouteRef, 'ALERT_ROUTE_MISSING', failures);
  return Object.freeze({ readyForSyntheticRehearsal: failures.length === 0, failures, productionDecision: 'NO_GO_PRODUCTION' });
}

export function simulateRelease({ preflight, smokeEvidence }) {
  if (!preflight?.readyForSyntheticRehearsal) throw Error('PREFLIGHT_NOT_READY');
  if (!Array.isArray(smokeEvidence) || smokeEvidence.length === 0 || smokeEvidence.some((item) => item.passed !== true || !item.evidenceRef)) throw Error('SMOKE_EVIDENCE_INCOMPLETE');
  return Object.freeze({
    status: 'SMOKE_AND_ROLLBACK_READY_SYNTHETIC',
    productionDecision: 'NO_GO_PRODUCTION',
    phases: ['preflight', 'backup-restore-evidence', 'backward-compatible-migration-plan', 'feature-flags-off', 'simulated-deploy', 'smoke', 'cache-search-rebuild-plan', 'monitoring-handoff'],
    smokeEvidence, cacheSearchRebuild: 'PLANNED_NOT_EXECUTED', monitoring: 'PLANNED_NOT_EXECUTED',
  });
}

/** A reversible plan only: it never changes traffic, schema, cache, search, or data. */
export function prepareRollback({ release, reasonCode, priorArtifactDigest }) {
  if (release?.status !== 'SMOKE_AND_ROLLBACK_READY_SYNTHETIC' || !reasonCode || !priorArtifactDigest) throw Error('ROLLBACK_NOT_READY');
  return Object.freeze({ status: 'SIMULATED_ROLLBACK_READY', reasonCode, priorArtifactDigest, featureFlags: 'SET_ALL_RELEASE_FLAGS_OFF', migrationRule: 'NO_DOWN_MIGRATION; use approved forward-fix or preserve compatible schema', dataRule: 'No source/history/audit deletion', productionDecision: 'NO_GO_PRODUCTION' });
}
