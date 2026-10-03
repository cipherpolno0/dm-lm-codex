# Candidate and application

## Field mapping register

| Logical field | Account-form field | Classification | Mapping state |
| --- | --- | --- | --- |
| `candidate.personId` | `PLACEHOLDER/TO MAP` | Confirmed core reference | TO MAP |
| `application.candidateId` | `PLACEHOLDER/TO MAP` | Confirmed core reference | TO MAP |
| `application.sessionId` | `PLACEHOLDER/TO MAP` | Confirmed core reference | TO MAP |
| `application.submittedAt` | System generated | Confirmed system metadata | Not a form field |

- **Confirmed:** Candidate reuses an existing synthetic person; one application per candidate and session; a submission requires an open registration window; application status, audit and outbox records are append-only and server-authorized.
- **Proposal:** The lifecycle status codes are configuration-backed master data. Any non-core account-form value requires an approved mapping with an evidence reference and approving role; no mapping is inferred from a label.
- **Needs Legal Review:** The supplied real account form, allowed uses of its fields, retention, evidence requirements, approval authority and publication rules need DPO/legal and owner review. This document asserts no legal compliance.

Failure modes: missing candidate, duplicate candidate/application, closed window, missing status master data and missing/incomplete mapping are rejected before the transaction. A transaction failure restores its local write set. Corrections append a status event or a later application/version; prior submitted snapshots are never overwritten.
