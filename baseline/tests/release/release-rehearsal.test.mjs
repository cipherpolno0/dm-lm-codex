import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateReleasePreflight, prepareRollback, simulateRelease } from '../../src/server/release/release-gate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const input = {
  runType: 'SYNTHETIC_REHEARSAL', dataClass: 'SYNTHETIC', artifact: { immutableDigest: 'sha256:SYN-RELEASE-001', previousImmutableDigest: 'sha256:SYN-RELEASE-000' },
  backup: { recoveryPointRef: 'SYN-BACKUP-001', restoreEvidenceRef: 'SYN-RESTORE-001' }, migration: { backwardCompatible: true, approvalRef: 'SYN-MIGRATION-APPROVAL-001' },
  featureFlags: [{ name: 'synthetic-new-directory', enabled: false }, { name: 'synthetic-import-commit', enabled: false }], rollback: { ownerRef: 'SYN-RELEASE-OWNER-001' }, monitoring: { dashboardRef: 'SYN-DASHBOARD-001', alertRouteRef: 'SYN-ALERT-001' },
};
const preflight = evaluateReleasePreflight(input); assert.equal(preflight.readyForSyntheticRehearsal, true); assert.equal(preflight.productionDecision, 'NO_GO_PRODUCTION');
assert.equal(evaluateReleasePreflight({ ...input, dataClass: 'PRODUCTION' }).readyForSyntheticRehearsal, false);
const smoke = [
  ['server authorization smoke', 'tests/auth/negative-access.test.mjs'],
  ['public projection privacy smoke', 'tests/public/directory-privacy.test.mjs'],
  ['synthetic migration threshold smoke', 'tests/migration/legacy-migration.test.mjs'],
].map(([name, testFile]) => {
  const run = spawnSync(process.execPath, [testFile], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `${name} failed: ${run.stderr || run.stdout}`);
  console.log(`PASS release smoke rehearsal :: ${name} :: ${testFile} :: evidence=exit-0`);
  return { name, passed: true, evidenceRef: `LOCAL-${testFile}` };
});
const release = simulateRelease({ preflight, smokeEvidence: smoke }); assert.equal(release.status, 'SMOKE_AND_ROLLBACK_READY_SYNTHETIC');
const rollback = prepareRollback({ release, reasonCode: 'SYNTHETIC_SMOKE_FAILURE', priorArtifactDigest: input.artifact.previousImmutableDigest });
assert.equal(rollback.status, 'SIMULATED_ROLLBACK_READY'); assert.equal(rollback.productionDecision, 'NO_GO_PRODUCTION');
console.log('release rehearsal passed (preflight, backup/migration/flag gates, smoke evidence, rollback plan); production decision remains NO_GO.');
