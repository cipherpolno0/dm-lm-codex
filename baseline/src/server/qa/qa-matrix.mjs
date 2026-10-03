/**
 * Full QA traceability baseline.  These identifiers are internal, synthetic
 * requirements; they do not assert regulatory compliance or real-world data.
 */
export const qaMatrix = [
  { id: 'QA-FUNC-01', category: 'functional', requirement: 'Person, organization, education role and timeline flows preserve append-only history and auditable change records.', command: ['tests/education/role-date.test.mjs', 'tests/audit/tamper-completeness.test.mjs'], evidence: 'Each Node test exits 0 and has a named console result', state: 'RUNNABLE' },
  { id: 'QA-VAL-01', category: 'validation', requirement: 'Invalid dates, invalid role links, hierarchy cycles and invalid transitions are rejected before write.', command: ['tests/positions/timeline.test.mjs', 'tests/org/cycle.test.mjs'], evidence: 'Each Node test exits 0 and has a named console result', state: 'RUNNABLE' },
  { id: 'QA-DUP-01', category: 'duplicate', requirement: 'Candidate and import duplicates are detected without duplicate committed records.', command: ['tests/registrar/approved-mapping.test.mjs', 'tests/imports/commit-reliability.test.mjs'], evidence: 'Each Node test exits 0', state: 'RUNNABLE' },
  { id: 'QA-PERM-01', category: 'permission', requirement: 'Server authorization is deny-by-default and cross-scope mutation is forbidden.', command: ['tests/auth/negative-access.test.mjs'], evidence: 'Node test exit 0; includes 401/403 negative cases', state: 'RUNNABLE' },
  { id: 'QA-PRIV-01', category: 'privacy', requirement: 'Public directory projection excludes private and restricted fields.', command: ['tests/public/directory-privacy.test.mjs', 'tests/people/people-privacy.test.mjs'], evidence: 'Each Node test exits 0', state: 'RUNNABLE' },
  { id: 'QA-IMP-01', category: 'import', requirement: 'Malformed input remains dry-run only and row errors are actionable.', command: ['tests/imports/bad-file.test.mjs'], evidence: 'Node test exit 0', state: 'RUNNABLE' },
  { id: 'QA-TXN-01', category: 'transaction', requirement: 'Commit retry/crash and organizational status rollback do not leave partial changes.', command: ['tests/imports/commit-reliability.test.mjs', 'tests/status/rollback.test.mjs'], evidence: 'Each Node test exits 0', state: 'RUNNABLE' },
  { id: 'QA-A11Y-01', category: 'accessibility', requirement: 'Public and private views are keyboard-operable and meet agreed automated accessibility checks.', command: null, evidence: 'No browser/assistive-technology execution supplied', state: 'NOT_RUN' },
  { id: 'QA-RESP-01', category: 'responsive', requirement: 'Public and private routes render at agreed handset, tablet and desktop viewports.', command: null, evidence: 'No browser viewport execution supplied', state: 'NOT_RUN' },
  { id: 'QA-SEC-01', category: 'security', requirement: 'Threat-model controls and private document malware/expiry handling reject unsafe cases.', command: ['tests/security/threat-model-completeness.test.mjs', 'tests/documents/malware-expiry.test.mjs'], evidence: 'Each Node test exits 0', state: 'RUNNABLE' },
  { id: 'QA-PERF-01', category: 'performance-smoke', requirement: 'Synthetic keyset search/import performance smoke remains within the baseline guardrails.', command: ['tests/perf/scale.test.mjs'], evidence: 'Node test exit 0 with synthetic measurements', state: 'RUNNABLE' },
  { id: 'QA-RESTORE-01', category: 'restore', requirement: 'Isolated synthetic restore evidence verifies counts, constraints, samples and audit records.', command: ['tests/operations/restore-evidence.test.mjs'], evidence: 'Node test exit 0', state: 'RUNNABLE' }
];

export const requiredCategories = ['functional', 'validation', 'duplicate', 'permission', 'privacy', 'import', 'transaction', 'accessibility', 'responsive', 'security', 'performance-smoke', 'restore'];
