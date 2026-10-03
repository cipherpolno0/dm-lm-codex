export const roleSops = Object.freeze([
  { role: 'DATA_ENTRY', scope: 'assigned geographic/org scope only', workflow: 'Search synthetic duplicate → enter confirmed core fields → classify contact visibility → submit change.', privacy: 'Use TRAIN-* fixtures only; never copy protected values into notes/logs.', approval: 'Cannot self-approve; submit for reviewer.', recovery: 'Validation/duplicate error: correct staged input or link canonical record; do not overwrite history.' },
  { role: 'REGISTRAR', scope: 'assigned registrar scope only', workflow: 'Create synthetic candidate → submit core-only or approved-mapped application within window → review status event.', privacy: 'Use minimum necessary fields and restricted views only.', approval: 'Escalate mapping/exception to independent reviewer.', recovery: 'Duplicate/window error: retain existing snapshot, correct/submit new allowed event—no overwrite.' },
  { role: 'REVIEWER', scope: 'review queue in assigned scope', workflow: 'Inspect diff, evidence and effective dates → approve or reject independently.', privacy: 'Review only fields needed for decision; do not export or paste payload.', approval: 'Maker-checker separation required; maker cannot approve own request.', recovery: 'Reject with safe reason code; return to maker for an append-only correction.' },
  { role: 'ADMIN', scope: 'explicit administrative scope only', workflow: 'Manage synthetic role/scope grants and verify MFA/session controls.', privacy: 'Do not view protected payload unless specifically authorized and necessary.', approval: 'No self-elevation or untracked direct data change.', recovery: '401: reauthenticate; 403: stop and request authorized scope—never bypass through UI/client.' },
  { role: 'AUDITOR', scope: 'approved read/audit scope only', workflow: 'Trace correlation ID across change/import/auth events and inspect completeness.', privacy: 'Use minimal audit metadata; no secrets, raw protected content or excessive PII.', approval: 'Record findings independently; do not modify business history.', recovery: 'Suspected real/sensitive data: stop, quarantine access/evidence and notify owner/DPO/legal route.' },
]);

export const roleExercises = Object.freeze([
  { id: 'EX-DATA-01', role: 'DATA_ENTRY', fixture: 'TRAIN-PERSON-001', objective: 'Create/validate a synthetic core entry and classify contact visibility.', evidence: ['safe result/correlation ID', 'validation result'], relatedTests: ['tests/people/people-privacy.test.mjs'] },
  { id: 'EX-REG-01', role: 'REGISTRAR', fixture: 'TRAIN-CANDIDATE-001', objective: 'Submit a core-only application; demonstrate duplicate/window rejection.', evidence: ['application/status event ID', 'duplicate/window safe error'], relatedTests: ['tests/registrar/approved-mapping.test.mjs'] },
  { id: 'EX-REV-01', role: 'REVIEWER', fixture: 'TRAIN-CHANGE-001', objective: 'Review maker diff and reject an attempted self-approval.', evidence: ['review decision ID', 'maker-checker denial'], relatedTests: ['tests/audit/tamper-completeness.test.mjs', 'tests/auth/negative-access.test.mjs'] },
  { id: 'EX-ADM-01', role: 'ADMIN', fixture: 'TRAIN-SCOPE-ALPHA', objective: 'Verify expired/cross-scope request is denied by server.', evidence: ['401/403 safe result', 'minimal audit reference'], relatedTests: ['tests/auth/negative-access.test.mjs'] },
  { id: 'EX-AUD-01', role: 'AUDITOR', fixture: 'TRAIN-AUDIT-001', objective: 'Verify append-only audit completeness without viewing sensitive payload.', evidence: ['audit correlation ID', 'redaction check'], relatedTests: ['tests/audit/tamper-completeness.test.mjs'] },
  { id: 'EX-IMPORT-01', role: 'DATA_ENTRY', fixture: 'TRAIN-IMPORT-BAD-001.xlsx', objective: 'Run bad-file dry-run, read row/column/code/fix and prove zero DB writes.', evidence: ['dry-run report ID', 'zero-write result'], relatedTests: ['tests/imports/bad-file.test.mjs'] },
  { id: 'EX-CORRECT-01', role: 'REVIEWER', fixture: 'TRAIN-ASSIGNMENT-001', objective: 'Correct a dated appointment by appending event; demonstrate overlap rejection.', evidence: ['new event ID', 'effective-date result', 'overlap error'], relatedTests: ['tests/positions/timeline.test.mjs'] },
]);

export function validateExercisePack() {
  const failures = [];
  for (const role of ['DATA_ENTRY', 'REGISTRAR', 'REVIEWER', 'ADMIN', 'AUDITOR']) if (!roleSops.some((item) => item.role === role)) failures.push(`MISSING_ROLE_SOP:${role}`);
  for (const exercise of roleExercises) {
    if (!exercise.fixture.startsWith('TRAIN-')) failures.push(`NON_SYNTHETIC_FIXTURE:${exercise.id}`);
    if (!roleSops.some((item) => item.role === exercise.role)) failures.push(`UNKNOWN_ROLE:${exercise.id}`);
    if (!exercise.evidence.length || !exercise.relatedTests.length) failures.push(`MISSING_EVIDENCE_OR_TEST:${exercise.id}`);
  }
  return Object.freeze({ passed: failures.length === 0, failures, roleCount: roleSops.length, exerciseCount: roleExercises.length, traineeCertification: 'PENDING_TRAINER_SIGN_OFF' });
}
