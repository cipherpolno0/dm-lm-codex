# Private documents

- **Confirmed:** Object bytes use private storage only; public buckets are rejected. Server authorization precedes upload, scan recording and signed-download issuance. Metadata stores object key, MIME, size, checksum and retention; document versions, events, audit and outbox are append-only.
- **Proposal:** MIME allowlist, size limit, signed-URL TTL and storage scan adapter are deployment configuration. Scan worker retries/dead-letter handling must be provided by the approved queue platform.
- **Needs Legal Review:** Retention/disposal period, legal hold, document classification, scanner evidence, upload/download authority, recovery, and real-document release rules need owner/DPO/legal review. No compliance determination is made.

Failure/recovery: policy failure rejects before metadata write; malware produces a quarantine event and blocks signed download; expired URLs fail closed. A new clean object is a new document version; do not replace the quarantined or prior version. If scan infrastructure fails, retain `PENDING`, block download and retry through the queue rather than promoting the object.
