import { AuthError } from './errors.mjs';

export const Actions = Object.freeze({
  READ_DIRECTORY: 'directory:read',
  UPDATE_APPLICATION: 'application:update',
  APPROVE_APPLICATION: 'application:approve',
  MANAGE_ACCESS: 'access:manage',
});

const ADMIN_ROLES = new Set(['SYSTEM_ADMINISTRATOR', 'SECURITY_REVIEWER']);

function validGrant(grant, now) {
  return !grant.revokedAt && new Date(grant.validFrom) <= now && (!grant.validUntil || new Date(grant.validUntil) > now);
}
function scopeContains(grantPath, resourcePath) {
  return grantPath === '/SYN-GLOBAL' || resourcePath === grantPath || resourcePath.startsWith(`${grantPath}/`);
}

/** Trusted server-side policy; do not accept actor/action/scope values from the client. */
export function authorize({ actor, action, resource, now = new Date() }) {
  if (!actor || !actor.userId) throw new AuthError(401);
  if (!actor.active || !actor.sessionExpiresAt || new Date(actor.sessionExpiresAt) <= now) throw new AuthError(401, 'SESSION_EXPIRED');
  const grants = (actor.grants ?? []).filter((grant) => validGrant(grant, now));
  const matching = grants.filter((grant) => grant.action === action && scopeContains(grant.scopePath, resource.scopePath));
  if (!matching.length) throw new AuthError(403);
  if (matching.some((grant) => ADMIN_ROLES.has(grant.role)) && !actor.mfaVerifiedAt) throw new AuthError(403, 'MFA_REQUIRED');
  if (resource.requiresIndependentApprover && actor.userId === resource.submittedByUserId) throw new AuthError(403, 'MAKER_CHECKER_DENIED');
  return { actorId: actor.userId, grant: matching[0], action, resourceId: resource.id };
}
