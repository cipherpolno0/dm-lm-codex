import assert from 'node:assert/strict';
import { approveMigration, assertThresholdPass, buildInventory, cutoverMigration, dryRunLegacyMigration, reconcileDryRun, rollbackMigration } from '../../src/server/migration/legacy-migration-service.mjs';

const now = new Date('2030-06-01T00:00:00Z');
const maker = { userId: 'UAT-MIGRATION-MAKER', active: true, sessionExpiresAt: '2031-01-01T00:00:00Z', grants: [{ role: 'DATA_STEWARD', action: 'migration:approve', scopePath: '/SYN-GLOBAL', validFrom: '2030-01-01T00:00:00Z' }, { role: 'DATA_STEWARD', action: 'migration:cutover', scopePath: '/SYN-GLOBAL', validFrom: '2030-01-01T00:00:00Z' }, { role: 'DATA_STEWARD', action: 'migration:rollback', scopePath: '/SYN-GLOBAL', validFrom: '2030-01-01T00:00:00Z' }] };
const approver = { ...maker, userId: 'UAT-MIGRATION-APPROVER' };
const resource = { id: 'UAT-MIGRATION-001', type: 'MigrationRun', scopePath: '/SYN-GLOBAL/SYN-REGION-ALPHA', requiresIndependentApprover: true, submittedByUserId: maker.userId };
const rows = [
  ['L-P-001', 'PERSON', 'PX-001', 'ACTIVE', 'ALPHA', 'PERSON:ALPHA:001'], ['L-P-002', 'PERSON', 'PX-002', 'ACTIVE', 'ALPHA', 'PERSON:ALPHA:001'], ['L-P-003', 'PERSON', 'PX-003', 'ACTIVE', 'BETA', 'PERSON:BETA:003'],
  ['L-O-001', 'ORGANIZATION', 'OA-001', 'OPENED', 'ALPHA'], ['L-O-002', 'ORGANIZATION', 'OB-002', 'CLOSED', 'BETA'], ['L-A-001', 'POSITION', 'PA-001', 'ACTING', 'ALPHA'], ['L-A-002', 'POSITION', 'PA-002', 'APPOINTED', 'ALPHA'],
  ['L-E-001', 'EDUCATION_UNIT', 'EA-001', 'ESTABLISHED', 'ALPHA'], ['L-E-002', 'EDUCATION_UNIT', 'EB-002', 'DISSOLVED', 'BETA'], ['L-APP-001', 'APPLICATION', 'AA-001', 'SUBMITTED', 'ALPHA'],
].map(([sourceId, entity, externalId, status, area, dedupeKey]) => ({ sourceId, entity, externalId, status, area, dedupeKey, sourceVersion: 'SYN-LEGACY-v1', isSynthetic: true }));
const fieldMap = Object.fromEntries(['PERSON', 'ORGANIZATION', 'POSITION', 'EDUCATION_UNIT', 'APPLICATION'].map((entity) => [entity, { entity, table: entity.toLowerCase() }]));
assert.equal(buildInventory(rows).totalRecords, 10);
const dryRun = dryRunLegacyMigration({ sourceRows: rows, fieldMap, samplePlan: [
  { sourceId: 'L-P-001', expectedTargetId: 'MIG-PERSON-PX-001' }, { sourceId: 'L-O-001', expectedTargetId: 'MIG-ORGANIZATION-OA-001' }, { sourceId: 'L-E-002', expectedTargetId: 'MIG-EDUCATION_UNIT-EB-002' },
] });
assert.equal(dryRun.dbWrites, 0); assert.equal(dryRun.accepted.length, 9); assert.equal(dryRun.duplicates.length, 1); assert.equal(dryRun.errors.length, 0);
const reconciliation = reconcileDryRun(dryRun); const threshold = assertThresholdPass(reconciliation, { maxInvalidRecords: 0, maxQuarantinedDuplicates: 1 });
assert.equal(threshold.passed, true); assert.equal(reconciliation.countVariance, 0); assert.equal(reconciliation.samplePassed, 3);
const confirmed = { ...dryRun, sourceRetention: 'RETAINED_CONFIRMED' }; const confirmedReconciliation = { ...reconciliation, sourceRetention: 'RETAINED_CONFIRMED' };
await assert.rejects(() => approveMigration({ actor: maker, resource, reconciliation: confirmedReconciliation, thresholdResult: threshold, now }), (error) => error.status === 403 && error.code === 'MAKER_CHECKER_DENIED');
const approval = await approveMigration({ actor: approver, resource, reconciliation: confirmedReconciliation, thresholdResult: threshold, now });
const cutover = await cutoverMigration({ actor: maker, resource: { ...resource, requiresIndependentApprover: false }, approval, dryRun: confirmed, now });
const rollback = await rollbackMigration({ actor: maker, resource: { ...resource, requiresIndependentApprover: false }, cutover, reasonCode: 'SYNTHETIC_VALIDATION', now });
assert.equal(cutover.migratedRecords.length, 9); assert.equal(rollback.preservedMigratedRecordCount, 9); assert.equal(rollback.sourceRetention, 'RETAINED_CONFIRMED');
console.log('legacy migration test passed (inventory, map/cleanse, dedupe, zero-write dry-run, entity/status/area reconciliation, samples, approval separation, cutover, non-destructive rollback)');
