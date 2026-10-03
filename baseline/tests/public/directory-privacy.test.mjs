import assert from 'node:assert/strict';
import { PublicDirectoryStore, getPublicDirectoryResponse } from '../../src/server/public-directory/public-directory-service.mjs';

const release = { version: 'SYN-RELEASE-1', released: true, entries: [{
  publicEntryId: 'SYN-PUBLIC-1', organizationName: 'Synthetic Learning Office', organizationType: 'SYNTHETIC_OFFICE', positionTitle: 'Synthetic Head',
  personId: 'PRIVATE-PERSON-ID', privatePhone: '999-PRIVATE', internalStatusHistory: ['PRIVATE'],
  releasedAssignments: [
    { displayName: 'Synthetic Former Holder', effectiveFrom: '2025-01-01T00:00:00Z', effectiveTo: '2026-01-01T00:00:00Z', appointmentDocumentId: 'PRIVATE-DOC-1' },
    { displayName: 'Synthetic Current Holder', effectiveFrom: '2026-01-01T00:00:00Z', effectiveTo: null, privateEmail: 'private@example.test' },
  ],
}] };
const store = new PublicDirectoryStore({ activeRelease: release, rateLimit: { limit: 2, windowMs: 60_000 } });
const first = getPublicDirectoryResponse({ store, clientKey: 'synthetic-client-a', query: 'current', asOf: '2026-03-01T00:00:00Z', now: 1_000 });
assert.equal(first.status, 200); assert.equal(first.body.entries[0].currentHolder, 'Synthetic Current Holder');
assert.deepEqual(Object.keys(first.body.entries[0]).sort(), ['currentHolder', 'organizationName', 'organizationType', 'positionTitle', 'publicEntryId']);
assert.equal(JSON.stringify(first.body).includes('PRIVATE'), false);
const cached = getPublicDirectoryResponse({ store, clientKey: 'synthetic-client-a', query: 'current', asOf: '2026-03-01T00:00:00Z', now: 1_001 });
assert.equal(cached.body.cache, 'HIT');
const limited = getPublicDirectoryResponse({ store, clientKey: 'synthetic-client-a', query: 'current', asOf: '2026-03-01T00:00:00Z', now: 1_002 });
assert.equal(limited.status, 429); assert.ok(limited.headers['Retry-After']);
console.log('public directory privacy tests passed (allow-list projection, effective holder, cache, rate limit)');
