export function assertSyntheticTarget(environment = process.env) {
  const url = environment.DATABASE_URL ?? '';
  const local = /@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url);
  const syntheticName = /\/[^/?]*(?:_dev|_test|synthetic)(?:\?|$)/i.test(url);
  if (environment.ALLOW_SYNTHETIC_SEED !== 'true' || !local || !syntheticName) {
    throw new Error('Refusing seed: require ALLOW_SYNTHETIC_SEED=true and a local *_dev, *_test, or *synthetic PostgreSQL target.');
  }
}
