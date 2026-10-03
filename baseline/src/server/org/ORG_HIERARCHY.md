# Organization hierarchy
- **Confirmed:** hierarchy checks and scope authorization are server-side; organisation history/audit/outbox are append-only.
- **Proposal:** address/contact are organisation-owned structured attributes; reparent requires reason and independent reviewer where configured.
- **Needs Legal Review:** real organisation naming, address/contact disclosure, retention and public directory release.

Failure/recovery: invalid parent/cycle fails before transaction; transaction failure rolls back current-parent pointer plus history/audit/outbox. Correct a reparent through a later reparent event, never by deleting history.
