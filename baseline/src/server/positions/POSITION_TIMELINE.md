# Position timeline
- **Confirmed:** person and position remain separate; timeline/audit/outbox are append-only and authorization runs on the server before transaction.
- **Proposal:** ACTING/APPOINTED/ENDED map to owner-approved workflow states; one appointment-order document record is mandatory per assignment and secretary targets exactly one principal assignment.
- **Needs Legal Review:** real appointment orders, signatures, publication and document retention.

Failure/recovery: invalid date/overlap fails before write. A correction appends a later assignment/event; never overwrites prior history. Transaction failure rolls back assignment/event/audit/outbox together.
