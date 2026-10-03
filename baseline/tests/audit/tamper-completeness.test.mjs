import assert from 'node:assert/strict';
import { AuditApprovalStore, createChangeRequest, recordAuditAction, reviewChangeRequest, verifyAuditTrail } from '../../src/server/audit/audit-approval-service.mjs';

const grant = (userId, action) => ({ userId, active: true, sessionExpiresAt: '2027-01-01T00:00:00Z', grants: [{ role: 'DATA_STEWARD', action, scopePath: '/SYN-GLOBAL', validFrom: '2026-01-01T00:00:00Z' }] });
const maker = grant('synthetic-maker', 'change:request:write'); const checker = grant('synthetic-checker', 'change:request:review'); const auditor = grant('synthetic-auditor', 'audit:write'); const resource = { id: 'SYN-AUDIT-RESOURCE', scopePath: '/SYN-GLOBAL' };
const store = new AuditApprovalStore();
const request = await createChangeRequest({ store, actor: maker, resource, input: { id: 'SYN-CR-1', targetType: 'Organization', targetId: 'SYN-ORG-1', before: { title: 'Old', privateEmail: 'private@example.test' }, after: { title: 'New', privateEmail: 'changed@example.test', apiToken: 'never-log' } } });
assert.deepEqual(request.diff, [{ field: 'title', change: 'CHANGED' }, { field: '[REDACTED]', change: 'SENSITIVE_FIELD_CHANGED' }, { field: '[REDACTED]', change: 'SENSITIVE_FIELD_CHANGED' }]);
await assert.rejects(() => reviewChangeRequest({ store, actor: { ...maker, grants: [{ ...maker.grants[0], action: 'change:request:review' }] }, resource, requestId: request.id, decision: 'APPROVE' }), (error) => error.code === 'MAKER_CHECKER_DENIED');
await reviewChangeRequest({ store, actor: checker, resource, requestId: request.id, decision: 'APPROVE' });
for (const action of ['UPDATE', 'IMPORT', 'EXPORT', 'AUTH_RISK']) await recordAuditAction({ store, actor: auditor, resource, action, targetType: 'Synthetic', targetId: `SYN-${action}` });
assert.equal(verifyAuditTrail(store.auditEvents), true);
const tampered = structuredClone(store.auditEvents); tampered[1].outcome = 'TAMPERED';
assert.equal(verifyAuditTrail(tampered), false);
assert.equal(store.auditEvents.length, 6);
console.log('audit tamper/completeness tests passed (maker-checker, redaction, required actions, hash-chain detection)');
