# Legacy migration runbook — synthetic baseline

## Controls and status labels

**Confirmed**

- The baseline has a pure synthetic dry-run service: it reports `dbWrites: 0`, inventories source records, maps/cleanses them, quarantines duplicates, reconciles counts and verifies samples.
- Approval requires an actor different from the submitting maker when the resource is marked `requiresIndependentApprover`.
- Cutover and rollback append migration/audit evidence in the synthetic model. Rollback never deletes source records, target history or audit evidence.

**Proposal**

- Use the stated thresholds for a migration run only after the data owner approves the entity/status/area definitions and the exception policy.
- Create immutable source snapshots/checksums, restrict source to read-only, and retain source until the owner-approved retention period expires.
- Perform production cutover only after a separately approved staging rehearsal, reconciliation report and explicit owner decision.

**Needs Legal Review**

- Source/target retention length, lawful authority to use legacy identifiers, data-subject handling, official form mapping, deletion approval, and signatory authority require DPO/legal/owner review. No law, person or policy period is inferred here.

## Migration path and gates

| Stage | Input / action | Required evidence | Block / recovery |
|---|---|---|---|
| 1. Inventory | Read-only synthetic source manifest with source ID, entity, status, area, version and synthetic flag. | Total plus counts by entity/status/area; source snapshot reference. | Invalid/missing fields: block mapping; correct source copy without changing the original. |
| 2. Field mapping | Versioned map `legacy entity → target table/entity`; map only confirmed fields. | Mapping version, owner reviewer, unmapped-field report. | Unknown field: quarantine as `UNMAPPED_ENTITY`; do not guess. |
| 3. Cleanse | Trim/canonicalize synthetic IDs/status/area, preserving source ID/version. | Cleanse log and exceptions. | Required value absent: row error; correct a new staging copy and rerun. |
| 4. Dedupe | Match synthetic entity + dedupe key; retain one canonical target candidate and quarantine the duplicate. | Canonical/duplicate source IDs and rationale. | Ambiguous match: quarantine; require owner review, never auto-merge history. |
| 5. Dry-run | Execute map/cleanse/dedupe/reconciliation with `dbWrites: 0`. | Zero-write result, row errors, accepted/quarantined counts. | Any write or parser error: invalidate run, preserve evidence, fix and rerun. |
| 6. Reconcile | Compare accepted target candidates to expected counts by entity/status/area; verify named samples. | Count report, variance, samples, exception register. | Threshold fail: block approval/cutover; resolve exception or obtain documented waiver. |
| 7. Approve | Independent server-authorized approver reviews threshold result and source retention confirmation. | Approval ID, actor role, scope, timestamp, evidence bundle. | Same maker/checker or expired scope: 403; assign a valid independent approver. |
| 8. Cutover | Activate the approved synthetic batch only. | Build/run ID, accepted count, audit/outbox records, post-cutover reconciliation. | Abort before activation if any gate fails; retain source untouched. |
| 9. Rollback | Disable/route away from cutover and append rollback/compensation evidence. | Reason, timestamp, preserved-record count, audit record. | Never delete source or historical target rows; forward-fix after investigation. |

## Synthetic mapping and threshold profile

| Item | Synthetic value |
|---|---|
| Source inventory | 10 source records; entities PERSON, ORGANIZATION, POSITION, EDUCATION_UNIT, APPLICATION |
| Dedupe scenario | 1 known PERSON duplicate is quarantined; 9 accepted target candidates remain |
| Count dimensions | `entity + status + area`; source totals remain visible, target totals count accepted candidates only |
| Sample verification | 3 named synthetic source→target mappings must all pass |
| Thresholds exercised | count variance = 0; invalid rows ≤ 0; quarantined duplicates ≤ 1; all samples pass; source retention confirmed before approval |
| Source retention | `RETAINED_PENDING_POLICY` during dry-run, then `RETAINED_CONFIRMED` before approval/cutover. No delete operation exists. |

## Current execution boundary

`npm run test:migration:legacy` executes an in-memory synthetic migration rehearsal. It is not a legacy-source inventory, production dry-run, PostgreSQL migration, data-owner approval, staging cutover or legal retention decision. Its synthetic `APPROVED_SYNTHETIC` record demonstrates server-side separation of maker/checker only; it is not a real authorization or sign-off.
