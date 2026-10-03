import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ownerSignOff, requiredUatScenarios, uatScenarios } from '../../src/server/uat/uat-scenario-registry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
for (const key of requiredUatScenarios) assert.ok(uatScenarios.some((scenario) => scenario.key === key), `missing UAT scenario: ${key}`);
for (const scenario of uatScenarios) {
  for (const field of ['id', 'actor', 'scope', 'fixture', 'actions', 'expected', 'evidence', 'recovery', 'dataRule', 'authorizationRule', 'historyRule']) {
    assert.ok(scenario[field] && (Array.isArray(scenario[field]) ? scenario[field].length : true), `${scenario.id} missing ${field}`);
  }
}
assert.equal(ownerSignOff.status, 'PENDING_OWNER_SIGNATURE');
assert.equal(ownerSignOff.ownerName, '');

const rehearsal = [
  ['acting-appointed and secretary change', 'tests/positions/timeline.test.mjs'],
  ['establish/move/dissolve and rollback', 'tests/status/rollback.test.mjs'],
  ['candidate/application duplicate and window', 'tests/registrar/approved-mapping.test.mjs'],
  ['import error and idempotent commit', 'tests/imports/bad-file.test.mjs'],
  ['import idempotent commit', 'tests/imports/commit-reliability.test.mjs'],
  ['server cross-scope authorization', 'tests/auth/negative-access.test.mjs'],
  ['public projection privacy control', 'tests/public/directory-privacy.test.mjs'],
];
for (const [name, testFile] of rehearsal) {
  const run = spawnSync(process.execPath, [testFile], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `${name} failed: ${run.stderr || run.stdout}`);
  console.log(`PASS UAT rehearsal :: ${name} :: ${testFile} :: evidence=exit-0`);
}
for (const scenario of uatScenarios.filter((item) => item.state === 'NOT_RUN')) console.log(`NOT RUN ${scenario.id} :: ${scenario.blockedBy}`);
console.log('UAT script preflight passed; owner sign-off remains PENDING_OWNER_SIGNATURE.');
