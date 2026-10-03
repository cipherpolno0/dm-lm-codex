# Education units
- **Confirmed:** สำนักเรียน/สำนักศาสนศึกษา reuse organisation/person/assignment identifiers; role/contact history, audit and outbox are append only and server authorized.
- **Proposal:** unit kind values and contact visibility defaults require owner approval.
- **Needs Legal Review:** real unit publication, contacts, appointment evidence and retention.

Failures validate before transaction; transaction failure rolls back unit role event/audit/outbox. Correct with a later role period, never overwrite history.
