import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { roleExercises, validateExercisePack } from '../../src/server/training/training-program.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pack = validateExercisePack(); assert.equal(pack.passed, true); assert.equal(pack.roleCount, 5); assert.equal(pack.exerciseCount, 7); assert.equal(pack.traineeCertification, 'PENDING_TRAINER_SIGN_OFF');
const seen = new Set();
for (const exercise of roleExercises) for (const testFile of exercise.relatedTests) {
  if (seen.has(testFile)) continue; seen.add(testFile);
  const run = spawnSync(process.execPath, [testFile], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `${exercise.id} failed: ${run.stderr || run.stdout}`);
  console.log(`PASS training exercise script :: ${exercise.id} :: ${testFile} :: evidence=exit-0`);
}
console.log('training exercise pack passed (5 role SOPs, 7 synthetic exercises); trainee certification remains PENDING_TRAINER_SIGN_OFF.');
