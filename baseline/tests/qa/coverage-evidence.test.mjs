import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { qaMatrix, requiredCategories } from '../../src/server/qa/qa-matrix.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const covered = new Set(qaMatrix.map((row) => row.category));
for (const category of requiredCategories) assert.ok(covered.has(category), `missing QA category: ${category}`);

for (const row of qaMatrix) {
  assert.ok(row.id && row.requirement && row.evidence, `${row.id}: Requirement and evidence are mandatory`);
  if (row.state === 'RUNNABLE') {
    assert.ok(Array.isArray(row.command) && row.command.length > 0, `${row.id}: runnable row needs a command`);
    for (const testFile of row.command) {
      const run = spawnSync(process.execPath, [testFile], { cwd: root, encoding: 'utf8' });
      assert.equal(run.status, 0, `${row.id} failed: ${run.stderr || run.stdout}`);
      console.log(`PASS ${row.id} :: ${testFile} :: evidence=exit-0`);
    }
  } else {
    assert.equal(row.state, 'NOT_RUN', `${row.id}: unknown non-passing state`);
    assert.equal(row.command, null, `${row.id}: NOT_RUN must not be represented as passing execution`);
    console.log(`NOT RUN ${row.id} :: ${row.evidence}`);
  }
}
console.log(`QA coverage/evidence matrix verified: ${qaMatrix.length} requirements, ${requiredCategories.length} categories`);
