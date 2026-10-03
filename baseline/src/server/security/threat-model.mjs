const open = 'OPEN — evidence required';
export const THREATS = Object.freeze([
  ['auth-bypass','High','Server session validation, MFA for admin','401/403 and auth-risk audit','Revoke sessions; investigate','Session-bypass negative test'],
  ['idor-bola','High','Server action/resource/scope authorization','403 metrics and audit','Revoke grant; review access','Cross-scope/foreign-ID test'],
  ['xss','High','Output encoding, CSP, sanitize rich text','CSP reports','Disable rendering path; patch','Stored/reflected XSS test'],
  ['csrf','High','SameSite cookies, origin/CSRF validation','Rejected-request telemetry','Invalidate session; rotate token','Cross-origin mutation test'],
  ['sqli','High','Prisma parameterization, schema validation','DB error anomaly alerts','Block route; rotate credentials','Injection payload test'],
  ['file-upload','High','Private allowlist/size/checksum/scan/quarantine','Scan/quarantine events','Keep blocked; re-scan','Malware/expiry test'],
  ['mass-assignment','High','DTO allow-lists, server mapping','Unexpected-field audit','Reject request; assess impact','Forbidden-field test'],
  ['privilege-escalation','High','Deny default, scope, maker-checker','Grant/review audit','Revoke grant; review history','Self-approval/403 test'],
  ['data-leakage','High','Public projection allow-list, private storage','Privacy-test and download audit','Withdraw release/URL','Projection privacy test'],
  ['ddos','High','WAF, rate limit, queue backpressure','429/WAF/latency alerts','Throttle; scale; incident response','Rate-limit/load test'],
  ['secrets','High','Secret manager, no client exposure/log redaction','Secret scan and auth-risk audit','Rotate/revoke; investigate','Secret-scan CI test'],
  ['supply-chain','High','Lockfiles, pinned CI, dependency review','SCA alerts','Pin/rollback/forward fix','SCA/lockfile CI test'],
].map(([id,severity,prevent,detect,respond,test]) => Object.freeze({ id,severity,prevent,detect,respond,test,status:open })));
export const criticalHighResolved = () => THREATS.filter((threat) => ['Critical','High'].includes(threat.severity) && threat.status === 'RESOLVED');
