# Threat model

| Threat | Severity | Prevent | Detect | Respond | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Auth bypass | High | Server session/MFA | 401/403 audit | Revoke sessions | Negative session test | OPEN — evidence required |
| IDOR/BOLA | High | Server scope checks | 403/audit | Revoke grant | Cross-scope test | OPEN — evidence required |
| XSS | High | Encoding/CSP | CSP reports | Disable/patch | XSS test | OPEN — evidence required |
| CSRF | High | SameSite/origin token | Rejections | Invalidate session | Cross-origin test | OPEN — evidence required |
| SQLi | High | Parameterized ORM/validation | Anomaly alerts | Block/rotate | Injection test | OPEN — evidence required |
| File upload | High | Private scan/quarantine | Scan events | Keep blocked | Malware/expiry test | OPEN — evidence required |
| Mass assignment | High | DTO allow-list | Unexpected fields | Reject/review | Forbidden-field test | OPEN — evidence required |
| Escalation | High | Deny default/maker-checker | Grant audit | Revoke/review | Self-approval/403 | OPEN — evidence required |
| Leakage | High | Public projection/private objects | Privacy audit | Withdraw release | Projection privacy | OPEN — evidence required |
| DDoS | High | WAF/rate/backpressure | 429/latency | Throttle/scale | Load test | OPEN — evidence required |
| Secrets | High | Secret manager/redaction | Secret scan | Rotate/revoke | CI scan | OPEN — evidence required |
| Supply chain | High | Lockfile/pinned CI | SCA alerts | Pin/forward fix | SCA CI | OPEN — evidence required |

- **Confirmed:** Server-side authorization, append-only audit, public projection, private documents, rate limiting and import controls are architecture controls; UI is not a security boundary.
- **Proposal:** CSP details, CSRF pattern, WAF thresholds, SCA tooling and incident runbooks require implementation approval.
- **Needs Legal Review:** Breach notification, retention, real-data incident handling and disclosure require owner/DPO/legal review. No compliance determination is made.

Failure/recovery: security control failure must fail closed, create a minimal auth-risk audit event, preserve evidence without secrets/PII, and use revocation/forward-fix rather than overwriting history. No Critical/High item is marked resolved without executed evidence.
