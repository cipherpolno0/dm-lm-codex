import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const seed = readFileSync(resolve(root, 'prisma/seed.ts'), 'utf8');
const target = readFileSync(resolve(root, 'prisma/seed-target.mjs'), 'utf8');
const test = readFileSync(resolve(root, 'tests/seed/stable-rerun.ts'), 'utf8');
const required = [
  'assertSyntheticTarget', 'syntheticId', 'skipDuplicates: true',
  'organisationStatusEvent.createMany', 'positionAssignmentEvent.createMany',
  'applicationStatusEvent.createMany', 'auditEvent.createMany', 'outboxEvent.createMany',
  'Synthetic acting assignment', 'Synthetic appointed assignment ended', 'stableSeedCounts',
];
for (const term of required) if (!seed.includes(term)) throw new Error(`seed control missing: ${term}`);
for (const term of ['ALLOW_SYNTHETIC_SEED', 'localhost', 'syntheticName']) if (!target.includes(term)) throw new Error(`target guard missing: ${term}`);
if (!test.includes('afterFirst') || !test.includes('afterSecond')) throw new Error('rerun count comparison missing');
if (/deleteMany|delete\s+from/i.test(seed)) throw new Error('seed must not delete data');
console.log(`synthetic seed contract passed (${required.length} controls)`);
