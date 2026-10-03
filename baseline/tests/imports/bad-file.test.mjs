import assert from 'node:assert/strict';
import { DryRunStore, dryRunImport } from '../../src/server/imports/dry-run-importer.mjs';
import { SYNTHETIC_IMPORT_TEMPLATE_REGISTRY as registry } from '../../src/server/imports/template-registry.mjs';

const actor = { userId: 'synthetic-import-editor', active: true, sessionExpiresAt: '2027-01-01T00:00:00Z', grants: [{ role: 'DATA_STEWARD', action: 'import:preview:write', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' }] };
const resource = { id: 'SYN-IMPORT-RESOURCE', scopePath: '/SYN-GLOBAL' };
const references = { people: new Set(['SYN-PERSON-1']), candidateExternalRefs: new Set(['C-001']), sessions: new Set(['SYN-SESSION-1']) };
const clean = { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', sizeBytes: 1024, scanStatus: 'CLEAN' };

const store = new DryRunStore();
const invalidType = await dryRunImport({ store, actor, resource, registry, references, upload: { ...clean, mimeType: 'text/csv' }, now: new Date('2026-02-01T00:00:00Z') });
assert.equal(invalidType.errors[0].code, 'FILE_TYPE_INVALID');
assert.equal(invalidType.dbWrites, 0);

const badRows = await dryRunImport({ store, actor, resource, registry, references, upload: { ...clean, parsedSheets: [
  { name: 'Candidates', headers: ['templateVersion', 'candidateExternalRef', 'personReference', 'isSynthetic'], rows: [
    { templateVersion: '0.1.0', candidateExternalRef: 'C-001', personReference: 'MISSING-PERSON', isSynthetic: 'true' },
    { templateVersion: '0.1.0', candidateExternalRef: 'C-001', personReference: 'SYN-PERSON-1', isSynthetic: 'true' },
  ] },
  { name: 'Applications', headers: ['templateVersion', 'applicationExternalRef', 'candidateExternalRef', 'sessionReference'], rows: [
    { templateVersion: '0.1.0', applicationExternalRef: 'A-001', candidateExternalRef: 'C-001', sessionReference: 'MISSING-SESSION' },
  ] },
] }, now: new Date('2026-02-01T00:00:00Z') });
assert.ok(badRows.errors.some((item) => item.row === 2 && item.column === 'personReference' && item.code === 'REFERENCE_NOT_FOUND'));
assert.ok(badRows.errors.some((item) => item.row === 3 && item.code === 'DUPLICATE_IN_FILE'));
assert.ok(badRows.errors.some((item) => item.row === 2 && item.column === 'sessionReference' && item.code === 'REFERENCE_NOT_FOUND'));
assert.equal(store.dbWriteCount, 0);
assert.equal(store.previewHistory.length, 2);
console.log('dry-run bad-file tests passed (scan, schema, reference, duplicate, row/column error report, zero DB writes)');
