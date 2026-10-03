/** Synthetic staging-UAT contract.  It is deliberately not an owner signature. */
export const requiredUatScenarios = [
  'acting-appointed', 'secretary-change', 'education-status-lifecycle', 'exam-center',
  'application', 'import-error-commit', 'export', 'owner-sign-off',
];

const shared = {
  dataRule: 'Synthetic UAT identifiers only; do not use a real person, legal source, or production record.',
  authorizationRule: 'Server authorizes actor + action + resource + geographic/org scope before the transaction.',
  historyRule: 'Append a dated event/assignment; never overwrite an earlier appointment, status, application, import, or audit event.',
};

export const uatScenarios = [
  {
    id: 'UAT-01', key: 'acting-appointed', state: 'RUNNABLE', title: 'Acting to appointed holder',
    actor: 'UAT_POSITION_MAKER', checker: 'UAT_POSITION_CHECKER', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA',
    fixture: ['UAT-POS-REG-001', 'UAT-PERSON-ACTING-001', 'UAT-PERSON-APPOINTED-001', 'UAT-DOC-APPOINTMENT-001'],
    actions: ['Append ACTING assignment ending 2030-04-01T00:00:00Z.', 'Append APPOINTED assignment beginning at that exact instant after independent approval.', 'Query holder at 2030-03-31 and 2030-04-02; attempt a cross-scope write as a negative control.'],
    expected: ['Two immutable dated assignments and two audit events exist.', 'Effective holder changes only at the boundary; overlapping assignment is rejected.', 'Cross-scope attempt returns 403 before transaction.'],
    evidence: ['Request/correlation IDs', 'redacted event/audit IDs', 'effective-date result', '403 result'],
    recovery: 'Do not edit prior assignment. Reject overlap; submit a correcting dated event/change request and have an independent checker approve it.', ...shared,
  },
  {
    id: 'UAT-02', key: 'secretary-change', state: 'RUNNABLE', title: 'Secretary change linked to principal assignment',
    actor: 'UAT_EDUCATION_MAKER', checker: 'UAT_EDUCATION_CHECKER', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA/SYN-EDU-001',
    fixture: ['UAT-PRINCIPAL-ASSIGNMENT-001', 'UAT-PERSON-SECRETARY-A', 'UAT-PERSON-SECRETARY-B'],
    actions: ['Keep Secretary A assignment through 2030-05-01T00:00:00Z.', 'Append Secretary B with secretaryForAssignmentId=UAT-PRINCIPAL-ASSIGNMENT-001 from that boundary.', 'Query the principal link before and after the boundary; attempt an overlapping secretary assignment.'],
    expected: ['Both secretary records remain in history and link to the same principal assignment.', 'Date query returns the correct secretary.', 'Overlap is rejected before write and audit contains no false success.'],
    evidence: ['redacted assignment IDs', 'principal-link query results', 'validation error/correlation ID'],
    recovery: 'Preserve both records; append a correcting effective-date record only after maker-checker review.', ...shared,
  },
  {
    id: 'UAT-03', key: 'education-status-lifecycle', state: 'RUNNABLE', title: 'Establish, move and dissolve an education unit',
    actor: 'UAT_ORG_STATUS_MAKER', checker: 'UAT_ORG_STATUS_CHECKER', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA',
    fixture: ['UAT-EDU-UNIT-001', 'UAT-ORG-EDU-001', 'UAT-LOCATION-A', 'UAT-LOCATION-B'],
    actions: ['Create synthetic education unit and append ESTABLISHED then OPENED events.', 'Append MOVED with the approved synthetic location reference and verify rebuilt current status.', 'Append DISSOLVED as a new event; inject a failed restructure in a separate test transaction.'],
    expected: ['ESTABLISHED, OPENED, MOVED and DISSOLVED events stay append-only.', 'Current status rebuild returns DISSOLVED after the final event.', 'A failed restructure leaves no partial event, lineage, audit or outbox record.'],
    evidence: ['redacted event/lineage IDs', 'current-status result', 'transaction rollback result'],
    recovery: 'Rollback failed atomic work; after a committed mistake create a forward-only correction event, never delete history.', ...shared,
  },
  {
    id: 'UAT-04', key: 'exam-center', state: 'NOT_RUN', title: 'Exam center and registration window',
    actor: 'UAT_EXAM_ADMIN', checker: 'UAT_EXAM_CHECKER', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA',
    fixture: ['UAT-EXAM-CENTER-001', 'UAT-EXAM-SESSION-001', 'UAT-ORG-EDU-001'],
    actions: ['Create a center hosted by an effective active synthetic organization.', 'Open a dated registration window and attempt registration at the boundary.', 'Attempt creation/registration using inactive host organization or closed window.'],
    expected: ['Active host and window are required; inactive/closed cases are blocked with an actionable safe error.', 'Master data is read, not hard-coded; audit is appended.'],
    evidence: ['staging route/API result', 'active-status query', 'window-boundary result', 'audit ID'],
    recovery: 'Do not publish an invalid center/session. Correct host status/master data or window as a new approved record, then retry.', blockedBy: 'No exam-center/session implementation or staging evidence exists in this baseline.', ...shared,
  },
  {
    id: 'UAT-05', key: 'application', state: 'RUNNABLE', title: 'Candidate and application submission',
    actor: 'UAT_REGISTRAR', checker: 'UAT_REGISTRAR_CHECKER', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA',
    fixture: ['UAT-PERSON-CANDIDATE-001', 'UAT-CANDIDATE-001', 'UAT-EXAM-SESSION-001'],
    actions: ['Create one synthetic candidate and submit a core-only application during the configured window.', 'Attempt a second application for the same candidate/session and an out-of-window submission.', 'If mapped form values are used, attach an APPROVED synthetic mapping evidence reference; otherwise retain CORE_ONLY.'],
    expected: ['Candidate/application/status/audit events are appended.', 'Duplicate and closed-window submissions are rejected before write.', 'Placeholder or unapproved form mapping is rejected.'],
    evidence: ['redacted candidate/application IDs', 'status/audit event IDs', 'duplicate/window error results'],
    recovery: 'Retain first submission; resolve source issue and submit a new allowed record/status event. Do not overwrite snapshot history.', ...shared,
  },
  {
    id: 'UAT-06', key: 'import-error-commit', state: 'RUNNABLE', title: 'Import error, then idempotent commit',
    actor: 'UAT_IMPORT_MAKER', checker: 'UAT_IMPORT_CHECKER', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA',
    fixture: ['UAT-IMPORT-BAD-001.xlsx', 'UAT-IMPORT-CLEAN-001.xlsx', 'UAT-IDEMPOTENCY-001'],
    actions: ['Upload synthetic malformed XLSX and run dry-run only.', 'Verify row/column/code/message/fix result and zero DB writes.', 'Correct the file, obtain independent approval, commit with idempotency key, then replay the same delivery once.'],
    expected: ['Bad file has no committed records.', 'Clean approved preview commits once; replay returns the same receipt without duplicates.', 'Import/audit/outbox evidence is append-only.'],
    evidence: ['dry-run report ID', 'zero-write proof', 'batch/receipt/audit IDs', 'replay result'],
    recovery: 'Keep invalid preview for traceability; correct source and re-preview. For a committed error create forward-only compensation, never delete batch history.', ...shared,
  },
  {
    id: 'UAT-07', key: 'export', state: 'NOT_RUN', title: 'Authorized export with privacy projection',
    actor: 'UAT_EXPORT_OFFICER', checker: 'UAT_AUDITOR', scope: '/SYN-GLOBAL/SYN-REGION-ALPHA',
    fixture: ['UAT-EXPORT-REQUEST-001', 'UAT-PUBLIC-DIRECTORY-RESULT-001'],
    actions: ['Request export as an in-scope officer and inspect generated fields.', 'Attempt cross-scope and public/private-field export as negative controls.', 'Verify export audit event contains metadata only, not excess PII or secret values.'],
    expected: ['Server rejects unauthorized/cross-scope export with 401/403.', 'Approved export uses the permitted projection and has a minimal audit event.'],
    evidence: ['export job/download audit ID', 'field-projection sample', '401/403 results'],
    recovery: 'Expire/revoke artifact access, invalidate download, investigate audit trail and issue corrected minimal export.', blockedBy: 'No export job/route implementation or staging evidence exists in this baseline.', ...shared,
  },
  {
    id: 'UAT-08', key: 'owner-sign-off', state: 'PENDING_OWNER_SIGNATURE', title: 'Owner UAT sign-off',
    actor: 'UAT_OWNER', checker: 'UAT_OWNER', scope: '/SYN-GLOBAL', fixture: ['UAT-RUN-ID', 'deployment build ID', 'evidence bundle'],
    actions: ['Review every scenario outcome, evidence link and open defect.', 'Record pass/fail/waiver per scenario.', 'Sign only after runnable scenarios are executed in staging and blocked scenarios are explicitly accepted or excluded.'],
    expected: ['Named owner, role, date/time, deployment build ID and decision are recorded.', 'Unsigned, blank or evidence-less sign-off is not an acceptance.'],
    evidence: ['signed approval record or approved e-signature reference'],
    recovery: 'Keep sign-off pending; remediate failed item, rerun its scenario, attach new evidence, and obtain a fresh owner decision.', ...shared,
  },
];

export const ownerSignOff = Object.freeze({
  status: 'PENDING_OWNER_SIGNATURE',
  ownerName: '', ownerRole: '', signedAt: '', deploymentBuildId: '', decision: '', evidenceBundleRef: '',
  attestation: 'I reviewed synthetic staging evidence, open exceptions and scope; I accept or reject the UAT decision recorded above.',
});
