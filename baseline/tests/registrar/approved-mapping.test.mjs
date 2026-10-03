import assert from 'node:assert/strict';
import { RegistrarStore, createCandidate, requireApprovedMapping, submitApplication } from '../../src/server/registrar/candidate-application-service.mjs';

const actor = { userId: 'synthetic-registrar', active: true, sessionExpiresAt: '2027-01-01T00:00:00Z', grants: [
  { role: 'DATA_STEWARD', action: 'candidate:write', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' },
  { role: 'DATA_STEWARD', action: 'application:submit', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' },
] };
const resource = { id: 'SYN-REGISTRAR-RESOURCE', scopePath: '/SYN-GLOBAL' };
const store = new RegistrarStore({
  people: [{ id: 'SYN-PERSON-1', isSynthetic: true }],
  registrationWindows: [{ sessionId: 'SYN-SESSION-1', opensAt: '2026-02-01T00:00:00Z', closesAt: '2026-02-28T23:59:59Z' }],
  masterData: { applicationStatuses: ['SYNTHETIC_SUBMITTED', 'SYNTHETIC_REVIEWED'], initialApplicationStatus: 'SYNTHETIC_SUBMITTED' },
});

await createCandidate({ store, actor, resource, input: { id: 'SYN-CANDIDATE-1', personId: 'SYN-PERSON-1', isSynthetic: true }, now: new Date('2026-02-10T10:00:00Z') });
await submitApplication({ store, actor, resource, input: { id: 'SYN-APPLICATION-1', candidateId: 'SYN-CANDIDATE-1', sessionId: 'SYN-SESSION-1' }, now: new Date('2026-02-10T10:00:00Z') });
assert.equal(store.applicationStatusEvents.length, 1);
assert.equal(store.audit.filter((event) => event.action === 'application.submit').length, 1);
await assert.rejects(() => submitApplication({ store, actor, resource, input: { id: 'SYN-APPLICATION-DUP', candidateId: 'SYN-CANDIDATE-1', sessionId: 'SYN-SESSION-1' }, now: new Date('2026-02-10T10:00:00Z') }), /DUPLICATE_APPLICATION/);
await assert.rejects(() => submitApplication({ store, actor, resource, input: { id: 'SYN-APPLICATION-CLOSED', candidateId: 'SYN-CANDIDATE-1', sessionId: 'SYN-SESSION-2' }, now: new Date('2026-03-01T10:00:00Z') }), /REGISTRATION_WINDOW_CLOSED/);
assert.throws(() => requireApprovedMapping({ status: 'TO MAP', entries: [] }), /NOT_APPROVED/);
assert.equal(requireApprovedMapping({ status: 'APPROVED', evidenceRef: 'SYNTHETIC-OWNER-REVIEW-1', approvedByRole: 'OWNER', entries: [{ sourceField: 'syntheticReference', targetField: 'application.syntheticReference' }] }).status, 'APPROVED');
console.log('approved mapping test passed (core-only intake, duplicate/window blocking, status and audit append-only)');
