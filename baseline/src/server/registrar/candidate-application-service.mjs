import { authorize } from '../auth/authorize.mjs';

const time = (value) => new Date(value).getTime();

export class RegistrarStore {
  constructor({ people = [], registrationWindows = [], masterData = {} } = {}) {
    this.people = people;
    this.registrationWindows = registrationWindows;
    this.masterData = masterData;
    this.candidates = [];
    this.applications = [];
    this.applicationSnapshots = [];
    this.applicationStatusEvents = [];
    this.audit = [];
    this.outbox = [];
  }

  async transaction(fn) {
    const snapshot = structuredClone({
      candidates: this.candidates, applications: this.applications, applicationSnapshots: this.applicationSnapshots,
      applicationStatusEvents: this.applicationStatusEvents, audit: this.audit, outbox: this.outbox,
    });
    try { return await fn(this); } catch (error) { Object.assign(this, snapshot); throw error; }
  }
}

/** Explicit approval gate for future account-form fields; never infer a mapping from labels. */
export function requireApprovedMapping(mapping) {
  if (!mapping || mapping.status !== 'APPROVED' || !mapping.evidenceRef || !mapping.approvedByRole) {
    throw new Error('APPLICATION_MAPPING_NOT_APPROVED');
  }
  if (!Array.isArray(mapping.entries) || mapping.entries.some((entry) => !entry.sourceField || !entry.targetField || /PLACEHOLDER|TO MAP/i.test(entry.sourceField))) {
    throw new Error('APPLICATION_MAPPING_INCOMPLETE');
  }
  return mapping;
}

function windowFor(store, sessionId, at) {
  return store.registrationWindows.find((window) => window.sessionId === sessionId && time(window.opensAt) <= time(at) && time(at) < time(window.closesAt));
}

export async function createCandidate({ store, actor, resource, input, now = new Date() }) {
  authorize({ actor, action: 'candidate:write', resource, now });
  if (!input.id || !input.personId || input.isSynthetic !== true) throw new Error('INVALID_CANDIDATE_CORE');
  if (!store.people.some((person) => person.id === input.personId && person.isSynthetic === true)) throw new Error('UNKNOWN_SYNTHETIC_PERSON');
  if (store.candidates.some((candidate) => candidate.personId === input.personId)) throw new Error('DUPLICATE_CANDIDATE_PERSON');
  return store.transaction(async (tx) => {
    const candidate = { id: input.id, personId: input.personId, isSynthetic: true, createdAt: now.toISOString() };
    tx.candidates.push(candidate);
    tx.audit.push({ action: 'candidate.create', entityId: candidate.id, actorId: actor.userId, at: now.toISOString() });
    tx.outbox.push({ type: 'candidate.created', aggregateId: candidate.id, at: now.toISOString() });
    return candidate;
  });
}

export async function submitApplication({ store, actor, resource, input, now = new Date() }) {
  authorize({ actor, action: 'application:submit', resource, now });
  const candidate = store.candidates.find((item) => item.id === input.candidateId);
  if (!candidate || !input.id || !input.sessionId) throw new Error('INVALID_APPLICATION_CORE');
  if (!windowFor(store, input.sessionId, now)) throw new Error('REGISTRATION_WINDOW_CLOSED');
  if (store.applications.some((application) => application.candidateId === input.candidateId && application.sessionId === input.sessionId)) throw new Error('DUPLICATE_APPLICATION');
  const formValues = input.formValues ?? {};
  if (Object.keys(formValues).length > 0) requireApprovedMapping(input.mapping);
  const initialStatus = store.masterData.initialApplicationStatus;
  if (!initialStatus || !store.masterData.applicationStatuses?.includes(initialStatus)) throw new Error('MISSING_APPLICATION_STATUS_MASTER_DATA');
  return store.transaction(async (tx) => {
    const application = { id: input.id, candidateId: candidate.id, sessionId: input.sessionId, submittedAt: now.toISOString() };
    tx.applications.push(application);
    tx.applicationSnapshots.push({ applicationId: application.id, mappingEvidenceRef: input.mapping?.evidenceRef ?? 'CORE_ONLY', values: structuredClone(formValues), createdAt: now.toISOString() });
    tx.applicationStatusEvents.push({ applicationId: application.id, status: initialStatus, effectiveAt: now.toISOString(), createdAt: now.toISOString() });
    tx.audit.push({ action: 'application.submit', entityId: application.id, actorId: actor.userId, at: now.toISOString() });
    tx.outbox.push({ type: 'application.submitted', aggregateId: application.id, at: now.toISOString() });
    return application;
  });
}

export async function appendApplicationStatus({ store, actor, resource, input, now = new Date() }) {
  authorize({ actor, action: 'application:status:write', resource, now });
  if (!store.applications.some((application) => application.id === input.applicationId) || !store.masterData.applicationStatuses?.includes(input.status)) throw new Error('INVALID_APPLICATION_STATUS');
  return store.transaction(async (tx) => {
    const event = { applicationId: input.applicationId, status: input.status, effectiveAt: now.toISOString(), createdAt: now.toISOString() };
    tx.applicationStatusEvents.push(event);
    tx.audit.push({ action: 'application.status.append', entityId: input.applicationId, actorId: actor.userId, at: now.toISOString() });
    tx.outbox.push({ type: 'application.status.appended', aggregateId: input.applicationId, at: now.toISOString() });
    return event;
  });
}
