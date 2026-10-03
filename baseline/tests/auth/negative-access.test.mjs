import assert from 'node:assert/strict';
import { AuthError } from '../../src/server/auth/errors.mjs';
import { Actions, authorize } from '../../src/server/auth/authorize.mjs';
import { createSession } from '../../src/server/auth/session.mjs';
import { runAuthorizedMutation } from '../../src/server/auth/mutation.mjs';
import { login } from '../../src/server/auth/login.mjs';

const now = new Date('2026-09-23T00:00:00Z');
const resource = { id: '00000000-0000-0000-0000-000000000001', type: 'Application', scopePath: '/SYN-GLOBAL/SYN-EDU-01', requiresIndependentApprover: true, submittedByUserId: 'actor-maker' };
const validGrant = { role: 'APPLICANT_SERVICES_OFFICER', action: Actions.APPROVE_APPLICATION, scopePath: '/SYN-GLOBAL/SYN-EDU-01', validFrom: '2026-01-01T00:00:00Z' };
const actor = { userId: 'actor-checker', active: true, sessionExpiresAt: '2026-09-23T01:00:00Z', grants: [validGrant] };
const expect = (fn, status, code) => assert.throws(fn, (error) => error instanceof AuthError && error.status === status && (!code || error.code === code));

expect(() => authorize({ actor: null, action: Actions.APPROVE_APPLICATION, resource, now }), 401);
expect(() => authorize({ actor: { ...actor, sessionExpiresAt: '2026-09-22T23:59:59Z' }, action: Actions.APPROVE_APPLICATION, resource, now }), 401, 'SESSION_EXPIRED');
expect(() => authorize({ actor: { ...actor, grants: [{ ...validGrant, scopePath: '/SYN-GLOBAL/SYN-OTHER' }] }, action: Actions.APPROVE_APPLICATION, resource, now }), 403);
expect(() => authorize({ actor: { ...actor, userId: 'actor-maker' }, action: Actions.APPROVE_APPLICATION, resource, now }), 403, 'MAKER_CHECKER_DENIED');
expect(() => createSession({ account: { id: 'admin', active: true }, grants: [{ ...validGrant, role: 'SYSTEM_ADMINISTRATOR' }], now }), 403, 'MFA_REQUIRED');
await assert.rejects(() => login({ identifier: 'synthetic-user', credential: 'wrong', now,
  lookupAccount: async () => ({ id: 'synthetic-user', active: true }), verifyCredential: async () => false, loadGrants: async () => [] }),
  (error) => error instanceof AuthError && error.status === 401);

const order = [];
await runAuthorizedMutation({ actor, action: Actions.APPROVE_APPLICATION, resource, now,
  transaction: async (fn) => { order.push('transaction'); return fn({}); },
  write: async () => { order.push('write'); return { ok: true }; },
  audit: async () => { order.push('audit'); }, outbox: async () => { order.push('outbox'); },
});
assert.deepEqual(order, ['transaction', 'write', 'audit', 'outbox']);
console.log('auth negative tests passed (login 401, expiry, cross-scope 403, maker-checker 403, MFA 403, mutation order)');
