import { createHash } from 'node:crypto';
import { authorize } from '../auth/authorize.mjs';
import { AuthError } from '../auth/errors.mjs';

const hash = (value) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
const mask = (value) => value.includes('@') ? `${value[0]}***@${value.split('@')[1]}` : `${value.slice(0, 2)}***${value.slice(-2)}`;
const validVisibility = new Set(['PUBLIC', 'INTERNAL', 'RESTRICTED', 'HIGHLY_RESTRICTED']);

export class PeopleStore {
  constructor() { this.people = new Map(); this.privateVersions = []; this.contacts = []; this.audit = []; this.outbox = []; }
  async transaction(fn) { return fn(this); }
}

function validate(input) {
  if (!input?.displayName || input.displayName.length > 240 || input.isSynthetic !== true) throw new Error('INVALID_PERSON');
  for (const contact of input.contacts ?? []) if (!contact.value || !validVisibility.has(contact.visibility)) throw new Error('INVALID_CONTACT');
}
function duplicate(store, contacts) {
  for (const contact of contacts ?? []) if (store.contacts.some((item) => item.channel === contact.channel && item.hash === hash(contact.value) && !item.retiredAt)) throw new Error('DUPLICATE_CONTACT');
}

export async function createPerson({ store, actor, resource, input, now = new Date() }) {
  authorize({ actor, action: 'people:create', resource, now }); validate(input); duplicate(store, input.contacts);
  return store.transaction(async (tx) => {
    const id = input.id; if (tx.people.has(id)) throw new Error('DUPLICATE_PERSON');
    tx.people.set(id, { id, displayName: input.displayName, isSynthetic: true, createdAt: now.toISOString() });
    if (input.privateProfile) tx.privateVersions.push({ personId: id, versionNo: 1, ...input.privateProfile, createdAt: now.toISOString() });
    for (const contact of input.contacts ?? []) tx.contacts.push({ id: contact.id, personId: id, channel: contact.channel, visibility: contact.visibility, value: contact.value, hash: hash(contact.value), createdAt: now.toISOString() });
    tx.audit.push({ action: 'people:create', entityId: id, actorId: actor.userId }); tx.outbox.push({ type: 'person.created', aggregateId: id });
    return tx.people.get(id);
  });
}

export async function appendPrivateProfile({ store, actor, resource, personId, privateProfile, now = new Date() }) {
  authorize({ actor, action: 'people:private:write', resource, now }); if (!store.people.has(personId)) throw new AuthError(403);
  return store.transaction(async (tx) => {
    const versionNo = tx.privateVersions.filter((v) => v.personId === personId).length + 1;
    const version = { personId, versionNo, ...privateProfile, createdAt: now.toISOString() }; tx.privateVersions.push(version);
    tx.audit.push({ action: 'people:private:append', entityId: personId, actorId: actor.userId }); tx.outbox.push({ type: 'person.private.appended', aggregateId: personId });
    return version;
  });
}

export function publicPersonDto(store, personId) {
  const person = store.people.get(personId); if (!person) return null;
  return { id: person.id, displayName: person.displayName, contacts: store.contacts.filter((c) => c.personId === personId && c.visibility === 'PUBLIC' && !c.retiredAt).map((c) => ({ channel: c.channel, value: mask(c.value) })) };
}
