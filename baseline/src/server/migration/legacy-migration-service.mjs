import { authorize } from '../auth/authorize.mjs';

const keyFor = (row) => `${row.entity}|${row.status}|${row.area}`;
const countBy = (rows) => Object.fromEntries([...rows.reduce((map, row) => map.set(keyFor(row), (map.get(keyFor(row)) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const clone = (value) => structuredClone(value);

/** An inventory is a read-only manifest. It never contains actual source file contents. */
export function buildInventory(sourceRows) {
  if (!Array.isArray(sourceRows) || sourceRows.some((row) => row.isSynthetic !== true || !row.sourceId || !row.entity || !row.status || !row.area)) throw Error('INVALID_SYNTHETIC_INVENTORY');
  return Object.freeze({ totalRecords: sourceRows.length, countsByEntityStatusArea: countBy(sourceRows), sourceIds: sourceRows.map((row) => row.sourceId).sort() });
}

function mapAndCleanse(row, fieldMap) {
  const target = fieldMap[row.entity];
  if (!target) return { sourceId: row.sourceId, code: 'UNMAPPED_ENTITY', field: 'entity' };
  const externalId = String(row.externalId ?? '').trim().toUpperCase();
  const status = String(row.status ?? '').trim().toUpperCase();
  const area = String(row.area ?? '').trim().toUpperCase();
  if (!externalId || !status || !area) return { sourceId: row.sourceId, code: 'REQUIRED_VALUE_MISSING', field: !externalId ? 'externalId' : !status ? 'status' : 'area' };
  return { sourceId: row.sourceId, entity: target.entity, targetTable: target.table, targetId: `MIG-${target.entity}-${externalId}`, externalId, status, area, dedupeKey: row.dedupeKey ? String(row.dedupeKey).trim().toUpperCase() : null, sourceVersion: row.sourceVersion, isSynthetic: true };
}

/** Pure dry-run: the returned dbWrites field is intentionally always zero. */
export function dryRunLegacyMigration({ sourceRows, fieldMap, samplePlan }) {
  const inventory = buildInventory(sourceRows);
  const mapped = sourceRows.map((row) => mapAndCleanse(row, fieldMap));
  const errors = mapped.filter((row) => row.code);
  const valid = mapped.filter((row) => !row.code);
  const seen = new Map(); const accepted = []; const duplicates = [];
  for (const row of valid) {
    const signature = row.dedupeKey ? `${row.entity}|${row.dedupeKey}` : `${row.entity}|${row.externalId}`;
    const canonical = seen.get(signature);
    if (canonical) duplicates.push({ sourceId: row.sourceId, canonicalSourceId: canonical.sourceId, signature, code: 'DUPLICATE_QUARANTINED' });
    else { seen.set(signature, row); accepted.push(row); }
  }
  const samples = samplePlan.map((sample) => {
    const target = accepted.find((row) => row.sourceId === sample.sourceId);
    return { ...sample, passed: Boolean(target && target.targetId === sample.expectedTargetId) };
  });
  return Object.freeze({ mode: 'DRY_RUN', dbWrites: 0, inventory, fieldMapVersion: 'SYN-MAP-1', sourceRetention: 'RETAINED_PENDING_POLICY', accepted, duplicates, errors, samples, targetCountsByEntityStatusArea: countBy(accepted) });
}

export function reconcileDryRun(dryRun) {
  if (!dryRun || dryRun.mode !== 'DRY_RUN' || dryRun.dbWrites !== 0) throw Error('INVALID_DRY_RUN');
  const expectedCount = dryRun.inventory.totalRecords - dryRun.duplicates.length - dryRun.errors.length;
  const actualCount = dryRun.accepted.length;
  return Object.freeze({
    sourceCount: dryRun.inventory.totalRecords, acceptedCount: actualCount, duplicateQuarantinedCount: dryRun.duplicates.length, invalidCount: dryRun.errors.length,
    targetCount: actualCount, expectedTargetCount: expectedCount, countVariance: actualCount - expectedCount,
    sourceCountsByEntityStatusArea: dryRun.inventory.countsByEntityStatusArea,
    targetCountsByEntityStatusArea: dryRun.targetCountsByEntityStatusArea,
    samplePassed: dryRun.samples.filter((sample) => sample.passed).length, sampleRequired: dryRun.samples.length,
    sourceRetention: dryRun.sourceRetention,
  });
}

export function assertThresholdPass(reconciliation, thresholds) {
  const failures = [];
  if (reconciliation.countVariance !== 0) failures.push('TARGET_COUNT_VARIANCE');
  if (reconciliation.invalidCount > thresholds.maxInvalidRecords) failures.push('INVALID_RECORD_THRESHOLD');
  if (reconciliation.duplicateQuarantinedCount > thresholds.maxQuarantinedDuplicates) failures.push('DUPLICATE_THRESHOLD');
  if (reconciliation.samplePassed < reconciliation.sampleRequired) failures.push('SAMPLE_VERIFICATION_FAILED');
  if (reconciliation.sourceRetention !== 'RETAINED_PENDING_POLICY' && reconciliation.sourceRetention !== 'RETAINED_CONFIRMED') failures.push('SOURCE_RETENTION_MISSING');
  return Object.freeze({ passed: failures.length === 0, failures, thresholds: clone(thresholds) });
}

export async function approveMigration({ actor, resource, reconciliation, thresholdResult, now = new Date() }) {
  authorize({ actor, action: 'migration:approve', resource, now });
  if (!thresholdResult?.passed || reconciliation.sourceRetention !== 'RETAINED_CONFIRMED') throw Error('MIGRATION_NOT_APPROVABLE');
  return Object.freeze({ status: 'APPROVED_SYNTHETIC', approvedBy: actor.userId, approvedAt: now.toISOString(), reconciliation });
}

export async function cutoverMigration({ actor, resource, approval, dryRun, now = new Date() }) {
  authorize({ actor, action: 'migration:cutover', resource, now });
  if (approval?.status !== 'APPROVED_SYNTHETIC' || dryRun?.mode !== 'DRY_RUN' || dryRun.dbWrites !== 0) throw Error('CUTOVER_NOT_APPROVED');
  return Object.freeze({ status: 'CUTOVER_SYNTHETIC', cutoverAt: now.toISOString(), migratedRecords: clone(dryRun.accepted), audit: [{ action: 'migration.cutover', at: now.toISOString(), recordCount: dryRun.accepted.length }], sourceRetention: 'RETAINED_CONFIRMED' });
}

/** Rollback is traffic/activation rollback only: it appends evidence and never deletes source or history. */
export async function rollbackMigration({ actor, resource, cutover, reasonCode, now = new Date() }) {
  authorize({ actor, action: 'migration:rollback', resource, now });
  if (cutover?.status !== 'CUTOVER_SYNTHETIC' || !reasonCode) throw Error('INVALID_ROLLBACK');
  return Object.freeze({ status: 'ROLLED_BACK_SYNTHETIC', reasonCode, rolledBackAt: now.toISOString(), sourceRetention: cutover.sourceRetention, preservedMigratedRecordCount: cutover.migratedRecords.length, audit: [...cutover.audit, { action: 'migration.rollback', reasonCode, at: now.toISOString() }] });
}
