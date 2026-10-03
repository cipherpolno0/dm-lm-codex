import { createHash } from 'node:crypto';
import { authorize } from '../auth/authorize.mjs';

const sensitive = /secret|token|password|email|phone|address|national|identity/i;
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class AuditApprovalStore {
  constructor() { this.changeRequests = []; this.auditEvents = []; this.outbox = []; }
  async transaction(fn) { const snapshot = structuredClone({ changeRequests: this.changeRequests, auditEvents: this.auditEvents, outbox: this.outbox }); try { return await fn(this); } catch (cause) { Object.assign(this, snapshot); throw cause; } }
}

export function privacySafeDiff(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => sensitive.test(key) ? { field: '[REDACTED]', change: 'SENSITIVE_FIELD_CHANGED' } : { field: key, change: 'CHANGED' });
}

function appendAudit(store, event) {
  const previousHash = store.auditEvents.at(-1)?.hash ?? 'GENESIS';
  const base = { sequence: store.auditEvents.length + 1, previousHash, ...event };
  const record = Object.freeze({ ...base, hash: digest(base) });
  store.auditEvents.push(record); return record;
}

export async function createChangeRequest({ store, actor, resource, input, now = new Date() }) {
  authorize({ actor, action: 'change:request:write', resource, now });
  if (!input.id || !input.targetType || !input.targetId || !input.after) throw new Error('INVALID_CHANGE_REQUEST');
  return store.transaction(async (tx) => {
    const request = Object.freeze({ id: input.id, targetType: input.targetType, targetId: input.targetId, makerId: actor.userId, diff: privacySafeDiff(input.before, input.after), createdAt: now.toISOString() });
    tx.changeRequests.push(request); appendAudit(tx, { actorId: actor.userId, action: 'CREATE', targetType: request.targetType, targetId: request.targetId, requestId: request.id, outcome: 'SUCCESS', diff: request.diff, at: now.toISOString() });
    tx.outbox.push(Object.freeze({ type: 'change-request.created', aggregateId: request.id, at: now.toISOString() })); return request;
  });
}

export async function reviewChangeRequest({ store, actor, resource, requestId, decision, now = new Date() }) {
  authorize({ actor, action: 'change:request:review', resource: { ...resource, requiresIndependentApprover: true, submittedByUserId: store.changeRequests.find((item) => item.id === requestId)?.makerId }, now });
  const request = store.changeRequests.find((item) => item.id === requestId);
  if (!request || !['APPROVE', 'REJECT'].includes(decision)) throw new Error('INVALID_REVIEW_REQUEST');
  return store.transaction(async (tx) => {
    const action = decision === 'APPROVE' ? 'APPROVE' : 'REJECT';
    appendAudit(tx, { actorId: actor.userId, action, targetType: request.targetType, targetId: request.targetId, requestId, outcome: 'SUCCESS', diff: request.diff, at: now.toISOString() });
    tx.outbox.push(Object.freeze({ type: decision === 'APPROVE' ? 'change-request.approved' : 'change-request.rejected', aggregateId: requestId, at: now.toISOString() }));
    return { requestId, decision, reviewerId: actor.userId };
  });
}

export async function recordAuditAction({ store, actor, resource, action, targetType, targetId, requestId = null, outcome = 'SUCCESS', now = new Date() }) {
  authorize({ actor, action: 'audit:write', resource, now });
  if (!['UPDATE', 'IMPORT', 'EXPORT', 'AUTH_RISK'].includes(action)) throw new Error('INVALID_AUDIT_ACTION');
  return store.transaction(async (tx) => appendAudit(tx, { actorId: actor.userId, action, targetType, targetId, requestId, outcome, diff: [], at: now.toISOString() }));
}

export function verifyAuditTrail(events) {
  let previousHash = 'GENESIS';
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]; const { hash, ...base } = event;
    if (event.sequence !== index + 1 || event.previousHash !== previousHash || !event.actorId || !event.action || !event.targetType || !event.targetId || !event.at || hash !== digest(base) || JSON.stringify(event).match(/secret|token|password|private@example/i)) return false;
    previousHash = hash;
  }
  return true;
}
