import { AuthError } from './errors.mjs';
import { createSession } from './session.mjs';

// Server-only boundary. `lookupAccount` and `verifyCredential` are supplied by the approved Auth.js/IdP adapter.
export async function login({ identifier, credential, lookupAccount, verifyCredential, loadGrants, now }) {
  const account = await lookupAccount(identifier);
  if (!account || !account.active) throw new AuthError(401);
  const valid = await verifyCredential(account, credential);
  if (!valid) throw new AuthError(401);
  return createSession({ account, grants: await loadGrants(account.id), now });
}
