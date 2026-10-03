# Public directory

- **Confirmed:** `/directory` uses `/api/public/directory` only. The server returns a release-gated allow-list projection, calculates the effective current holder from released assignment data and applies bounded pagination, cache and rate limiting. The UI never grants access.
- **Proposal:** Cache uses the released projection version for invalidation and has a 60-second shared-cache lifetime. The displayed organization type filter values and precise rate limit need owner approval.
- **Needs Legal Review:** Publication approval, name/title visibility, retention, takedown process, real-person release conditions and accessibility/legal content requirements require owner/DPO/legal review. No compliance determination is made.

Failure/recovery: absent/unreleased projections return a neutral 404; rate limits return 429 with retry guidance; client loading, empty and unavailable states remain accessible. A failed candidate release must not replace the active projection; publish the next version atomically and retain the previous approved release. Directory responses never contain private contacts, internal identifiers, documents or history.
