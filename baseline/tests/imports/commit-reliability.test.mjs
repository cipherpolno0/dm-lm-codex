import assert from 'node:assert/strict';
import { ImportCommitStore, commitImport, compensateImport } from '../../src/server/imports/import-commit-service.mjs';

const actor = { userId: 'synthetic-import-committer', active: true, sessionExpiresAt: '2027-01-01T00:00:00Z', grants: [
  { role: 'DATA_STEWARD', action: 'import:commit:write', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' },
  { role: 'DATA_STEWARD', action: 'import:compensate', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' },
] };
const resource = { id: 'SYN-IMPORT-COMMIT', scopePath: '/SYN-GLOBAL' };
const preview = { previewId: 'SYN-PREVIEW-1', createdAt: '2026-02-01T00:00:00Z', mode: 'DRY_RUN', dbWrites: 0, errors: [], validRows: [
  { sheet: 'Candidates', row: 2, values: { candidateExternalRef: 'SYN-C-1' } },
  { sheet: 'Applications', row: 2, values: { applicationExternalRef: 'SYN-A-1' } },
] };

const store = new ImportCommitStore();
await assert.rejects(() => commitImport({ store, actor, resource, preview, idempotencyKey: 'SYN-KEY-CRASH', faultInjection: { crashAfterRecord: 1 } }), /INJECTED_IMPORT_CRASH/);
assert.equal(store.batches.length, 0); assert.equal(store.importedRecords.length, 0); assert.equal(store.idempotencyReceipts.length, 0);

const first = await commitImport({ store, actor, resource, preview, idempotencyKey: 'SYN-KEY-CRASH' });
const retried = await commitImport({ store, actor, resource, preview, idempotencyKey: 'SYN-KEY-CRASH' });
assert.equal(first.replayed, false); assert.equal(retried.replayed, true); assert.equal(store.batches.length, 1); assert.equal(store.importedRecords.length, 2); assert.equal(store.audit.filter((item) => item.action === 'import.commit').length, 1);

await assert.rejects(() => commitImport({ store, actor, resource, preview: { ...preview, previewId: 'SYN-PREVIEW-2' }, idempotencyKey: 'SYN-KEY-CRASH' }), /IDEMPOTENCY_KEY_REUSED/);
await assert.rejects(() => commitImport({ store, actor, resource, preview: { ...preview, previewId: 'SYN-PREVIEW-ERROR', errors: [{ code: 'REFERENCE_NOT_FOUND' }] }, idempotencyKey: 'SYN-KEY-PARTIAL' }), /PREVIEW_HAS_ROW_ERRORS/);
assert.equal(store.batches.length, 1);

const compensated = await compensateImport({ store, actor, resource, batchId: first.batchId, compensationKey: 'SYN-COMP-1', reasonCode: 'SYNTHETIC_CORRECTION' });
assert.equal(compensated.replayed, false); assert.equal(store.importedRecords.length, 2); assert.equal(store.batchEvents.at(-1).type, 'IMPORT_COMPENSATION_REQUESTED');
console.log('import commit reliability tests passed (crash rollback, duplicate delivery replay, partial error block, append-only compensation)');
