import assert from 'node:assert/strict';
import { assertSyntheticTarget } from '../../prisma/seed-target.mjs';

assert.doesNotThrow(() => assertSyntheticTarget({
  DATABASE_URL: 'postgresql://synthetic:only@localhost:5432/sangha_synthetic',
  ALLOW_SYNTHETIC_SEED: 'true',
}));
for (const environment of [
  { DATABASE_URL: 'postgresql://synthetic:only@localhost:5432/sangha_production', ALLOW_SYNTHETIC_SEED: 'true' },
  { DATABASE_URL: 'postgresql://synthetic:only@db.example:5432/sangha_synthetic', ALLOW_SYNTHETIC_SEED: 'true' },
  { DATABASE_URL: 'postgresql://synthetic:only@localhost:5432/sangha_synthetic', ALLOW_SYNTHETIC_SEED: 'false' },
]) {
  assert.throws(() => assertSyntheticTarget(environment), /Refusing seed/);
}
console.log('seed target guard passed (1 allowed, 3 denied)');
