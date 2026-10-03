import { AuthError } from './errors.mjs';

export function createSession({ account, grants, now = new Date(), maxAgeMinutes = 60 }) {
  if (!account?.id || !account.active) throw new AuthError(401);
  const requiresMfa = grants.some((grant) => ['SYSTEM_ADMINISTRATOR', 'SECURITY_REVIEWER'].includes(grant.role));
  if (requiresMfa && !account.mfaVerifiedAt) throw new AuthError(403, 'MFA_REQUIRED');
  return Object.freeze({
    userId: account.id, active: true, grants,
    mfaVerifiedAt: account.mfaVerifiedAt ?? null,
    sessionExpiresAt: new Date(now.getTime() + maxAgeMinutes * 60_000).toISOString(),
  });
}

// Integration contract: Auth.js signs an encrypted, HttpOnly, Secure, SameSite=Lax session cookie.
// The App Router must resolve the server session and map it to this principal on every protected request.
