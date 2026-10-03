# Training and SOP — synthetic baseline

## Status labels

**Confirmed**

- Five role SOPs and seven `TRAIN-*` exercises are defined in the training registry.
- Every exercise requires server-side authorization, safe evidence and append-only correction/audit behavior.
- The exercise checker validates the pack and its related regression scripts; it never certifies a human trainee.

**Proposal**

- Assign a trainer, training environment, duration, assessment threshold and retraining cycle through the owner’s approved learning process.
- Store each trainee’s evidence by exercise ID and have a trainer sign the record only after observing the exercise in an approved environment.

**Needs Legal Review**

- Training-record retention, use of screenshots, access to protected training views, trainer authority and handling of suspected real data require owner/DPO/legal review. This SOP makes no compliance claim.

## Non-negotiable common rules

1. Use only `TRAIN-*` synthetic fixtures. If a real/suspected real record appears, stop, do not copy it, restrict/quarantine access and notify the owner/DPO/legal route.
2. UI visibility is not permission. Every protected read/write/approval/import/export is authorized by the server for actor, action, resource and scope.
3. Never put password, MFA code, token, authorization header, raw protected payload, contact value or document content in a training note, chat, log or screenshot.
4. Correct data by appending a dated event/version or approved change request. Never overwrite historical appointment, status, application, import or audit history.
5. Preserve safe evidence: exercise ID, fixture ID, date/environment, trainer, result/correlation ID and safe error code. Do not record excess personal data.

## Role SOPs

| Role | Standard workflow | Privacy / approval rule | Error recovery |
|---|---|---|---|
| Data Entry | Search duplicate; enter confirmed synthetic core fields; choose visibility; submit. | Minimum fields; reviewer approves change. | Validation/duplicate: correct staged input or canonical link; do not overwrite. |
| Registrar | Create candidate; submit core-only or approved-mapped application in window; check status event. | Restricted views only; mapping exception goes to reviewer. | Duplicate/window: retain snapshot and append permitted action/status later. |
| Reviewer | Inspect diff/effective date/evidence; approve or reject. | Independent from maker; no unnecessary export/payload access. | Reject safely and return to maker for append-only correction. |
| Admin | Manage synthetic scope/role grants; test session/MFA/deny behavior. | No self-elevation/direct untracked business change. | 401 reauthenticate; 403 request authorized scope—never bypass. |
| Auditor | Trace correlation across change/import/auth events; inspect audit completeness. | Minimal metadata only; read-only independent finding. | Suspected real/sensitive data: stop, restrict and report via approved route. |

## Import, error recovery and data correction SOP

| Situation | Required response |
|---|---|
| Import file error | Upload synthetic versioned template; dry-run first; read row/column/code/message/fix; confirm zero DB writes; correct source copy and rerun. |
| Approved import commit | Only independent authorized approver may release clean preview; use idempotency key; retain import/audit receipt. |
| Duplicate | Do not merge/delete on guess. Preserve candidate/history; submit canonical/exception review. |
| Validation error | Correct unsaved input; for saved business state append approved correction event. |
| Permission/session error | Stop. Reauthenticate for 401 or request scope for 403; no client/UI workaround. |
| Incorrect historical data | Record a new dated correction/change request with reason and approval; retain earlier entry/audit. |
| Job/scan/import failure | Quarantine unsafe item; preserve minimal evidence; use approved retry, idempotent replay or forward compensation only. |

## Role exercises and pass evidence

| Exercise | Role | Synthetic objective | Evidence trainer reviews |
|---|---|---|---|
| EX-DATA-01 | Data Entry | Core entry/visibility validation | Safe correlation/result and validation result |
| EX-REG-01 | Registrar | Application plus duplicate/window denial | Application/status ID and safe denial |
| EX-REV-01 | Reviewer | Independent review/self-approval denial | Decision ID and maker-checker denial |
| EX-ADM-01 | Admin | Server 401/403 scope denial | Safe authorization result and audit reference |
| EX-AUD-01 | Auditor | Append-only audit/redaction inspection | Correlation ID and redaction check |
| EX-IMPORT-01 | Data Entry | Bad-file dry-run and recovery | Report ID and zero-write result |
| EX-CORRECT-01 | Reviewer | Effective-date correction/overlap denial | New event ID, date query and safe error |

**Exercise pass definition:** the trainer confirms the stated objective and evidence for the named exercise in an approved synthetic environment. `npm run test:training:exercises` proves only that the exercise pack and related local scripts are valid; it is not a trainee pass.

## Trainer record (blank by design)

| Field | Value |
|---|---|
| Exercise ID / fixture | `________________` |
| Environment / build | `________________` |
| Trainee role and pseudonymous training ID | `________________` |
| Trainer role / name | `________________` |
| Evidence references | `________________` |
| Result | `PASS` / `RETRY` / `ESCALATE` |
| Trainer signature or approved e-signature reference | `________________` |
| Recorded at | `________________` |

An unsigned or evidence-less row is not an exercise pass or certification.
