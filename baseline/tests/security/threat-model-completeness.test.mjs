import assert from 'node:assert/strict';
import { THREATS, criticalHighResolved } from '../../src/server/security/threat-model.mjs';
const required = ['auth-bypass','idor-bola','xss','csrf','sqli','file-upload','mass-assignment','privilege-escalation','data-leakage','ddos','secrets','supply-chain'];
assert.deepEqual(THREATS.map((t) => t.id), required);
for (const threat of THREATS) for (const field of ['prevent','detect','respond','test','status']) assert.ok(threat[field]);
assert.equal(criticalHighResolved().length, 0);
console.log('threat-model completeness test passed (all required threats covered; no unsupported Critical/High resolution)');
