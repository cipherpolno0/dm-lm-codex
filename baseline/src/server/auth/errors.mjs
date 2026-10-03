export class AuthError extends Error {
  constructor(status, code = status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN') {
    super(status === 401 ? 'Authentication required.' : 'Access denied.');
    this.name = 'AuthError'; this.status = status; this.code = code;
  }
}
