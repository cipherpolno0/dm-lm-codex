# Status events
- **Confirmed:** status/lineage/audit/outbox are append-only and current status rebuilds from the latest effective event.
- **Proposal:** transition table and restructure approval workflow require owner review.
- **Needs Legal Review:** real establishment, closure, merger, dissolution evidence, publication and retention.

Failure rolls back all restructure writes; correct accepted events with later events, never overwrite history.
