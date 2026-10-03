# Auth and server authorization

- **Confirmed:** Auth.js/Next.js resolves session on the server; policy is deny-by-default and evaluates actor, active grant, action, trusted resource scope, workflow/maker-checker and session expiry. UI never grants access.
- **Proposal:** admin and security-reviewer roles require enrolled MFA before a session is created. Session cookie options and identity-provider configuration must be set only through environment-injected secrets.
- **Needs Legal Review:** production identity proofing, MFA recovery/retention, real user account lifecycle and access-log retention require DPO/nิติกร evidence review.

Failure/recovery: expired or missing session returns safe 401; all authorization failures return safe 403 without resource enumeration; MFA recovery revokes existing sessions and requires a separately approved recovery workflow. A transaction error rolls back business/history/audit/outbox together; retry only with an idempotency key.
