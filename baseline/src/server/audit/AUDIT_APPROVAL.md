# Audit and approval

- **Confirmed:** Change requests are server-authorized and include a privacy-safe diff. A different maker/checker is enforced server-side. Audit events append create, update, approve, reject, import, export and auth-risk actions with actor, target, request, outcome and time.
- **Proposal:** The hash chain is an application-level tamper-evidence control; production must also use immutable database/object retention and independent monitoring.
- **Needs Legal Review:** Audit retention, reviewer authority, export log visibility, legal hold and incident disclosure requirements need owner/DPO/legal review. No compliance determination is made.

Failure/recovery: invalid or self review fails before write; a transaction failure restores the request/audit/outbox set. Audit records do not retain secrets, tokens, raw payloads or unnecessary PII. Corrections append a later event; do not alter earlier audit history. Hash-chain verification detects tampering and must trigger investigation using immutable storage copies.
