export function verifyRestoreEvidence({ source, restored, expectedSchemaVersion, auditVerifier }) {
  const counts = Object.fromEntries(Object.keys(source.counts).map((table) => [table, source.counts[table] === restored.counts[table]]));
  const samples = source.samples.every((sample) => restored.samples.includes(sample));
  const constraints = restored.constraints.every((item) => item.valid === true);
  const audit = auditVerifier(restored.auditEvents);
  return { isolated: restored.environment === 'ISOLATED_SYNTHETIC', schema: restored.schemaVersion === expectedSchemaVersion, counts, samples, constraints, audit, passed: Object.values(counts).every(Boolean) && samples && constraints && audit && restored.environment === 'ISOLATED_SYNTHETIC' && restored.schemaVersion === expectedSchemaVersion };
}
