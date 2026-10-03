import assert from 'node:assert/strict';
import { PeopleStore, appendPrivateProfile, createPerson, publicPersonDto } from '../../src/server/people/people-service.mjs';

const actor = { userId: 'checker', active: true, sessionExpiresAt: '2026-10-01T00:00:00Z', grants: [
  { role: 'DATA_STEWARD', action: 'people:create', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' },
  { role: 'DATA_STEWARD', action: 'people:private:write', scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' },
] };
const resource = { id: 'person-resource', type: 'Person', scopePath: '/SYN-GLOBAL/SYN-EDU-01' };
const store = new PeopleStore();
await createPerson({ store, actor, resource, input: { id: 'SYN-PERSON-01', displayName: 'Synthetic Person One', isSynthetic: true, privateProfile: { legalNameCiphertext: 'cipher-v1', identifierHash: 'synthetic-hash-v1' }, contacts: [{ id: 'SYN-CONTACT-01', channel: 'EMAIL', value: 'synthetic.one@example.test', visibility: 'PUBLIC' }, { id: 'SYN-CONTACT-02', channel: 'PHONE', value: '0810000000', visibility: 'HIGHLY_RESTRICTED' }] } });
await appendPrivateProfile({ store, actor, resource, personId: 'SYN-PERSON-01', privateProfile: { legalNameCiphertext: 'cipher-v2', identifierHash: 'synthetic-hash-v2' } });
assert.equal(store.privateVersions.length, 2);
await assert.rejects(() => createPerson({ store, actor, resource, input: { id: 'SYN-PERSON-02', displayName: 'Synthetic Person Two', isSynthetic: true, contacts: [{ id: 'SYN-CONTACT-03', channel: 'EMAIL', value: 'synthetic.one@example.test', visibility: 'PUBLIC' }] } }), /DUPLICATE_CONTACT/);
const dto = publicPersonDto(store, 'SYN-PERSON-01');
assert.deepEqual(dto, { id: 'SYN-PERSON-01', displayName: 'Synthetic Person One', contacts: [{ channel: 'EMAIL', value: 's***@example.test' }] });
assert.equal(JSON.stringify(dto).includes('cipher'), false); assert.equal(JSON.stringify(dto).includes('0810000000'), false);
assert.equal(store.audit.length, 2); assert.equal(store.outbox.length, 2);
console.log('people CRUD/privacy snapshot passed (append version, duplicate guard, masking, public projection, audit/outbox)');
