# People module data controls

- **Confirmed:** public DTO is an allow-list; it excludes private versions, raw contacts, identifiers, audit and relationship keys. All protected writes authorize on the server before opening a transaction and append audit/outbox records.
- **Proposal:** use encrypted-at-rest private values and keyed duplicate hashes managed by the approved secret service. Contact visibility defaults to Restricted in production integration.
- **Needs Legal Review:** real-person identity, contact consent, retention, public release and erasure/disposition policy need DPO/nิติกร review. No real data is included here.

Failure/recovery: validation or duplicate failures write nothing; transaction failure rolls back person/private-version/contact/audit/outbox together. Corrections append a later private version; never overwrite prior versions.
