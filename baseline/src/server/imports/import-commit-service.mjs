import { authorize } from '../auth/authorize.mjs';

export class ImportCommitStore {
  constructor() {
    this.batches = [];
    this.importedRecords = [];
    this.batchEvents = [];
    this.idempotencyReceipts = [];
    this.compensationReceipts = [];
    this.audit = [];
    this.outbox = [];
  }

  async transaction(fn) {
    const snapshot = structuredClone({ batches: this.batches, importedRecords: this.importedRecords, batchEvents: this.batchEvents, idempotencyReceipts: this.idempotencyReceipts, compensationReceipts: this.compensationReceipts, audit: this.audit, outbox: this.outbox });
    try { return await fn(this); } catch (cause) { Object.assign(this, snapshot); throw cause; }
  }
}

function assertCommittable(preview) {
  if (!preview || preview.mode !== 'DRY_RUN' || preview.dbWrites !== 0 || !Array.isArray(preview.validRows)) throw new Error('INVALID_DRY_RUN_PREVIEW');
  if (preview.errors?.length) throw new Error('PREVIEW_HAS_ROW_ERRORS');
}

function resultFrom(receipt, replayed) { return { ...receipt.result, replayed }; }

/** Trusted server-only batch commit. It is intentionally separate from dry-run parsing. */
export async function commitImport({ store, actor, resource, preview, idempotencyKey, faultInjection, now = new Date() }) {
  authorize({ actor, action: 'import:commit:write', resource, now });
  assertCommittable(preview);
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 128) throw new Error('INVALID_IDEMPOTENCY_KEY');
  const fingerprint = `${preview.previewId}|${preview.createdAt}`;
  const prior = store.idempotencyReceipts.find((receipt) => receipt.key === idempotencyKey);
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_KEY_REUSED');
    return resultFrom(prior, true);
  }
  return store.transaction(async (tx) => {
    const raced = tx.idempotencyReceipts.find((receipt) => receipt.key === idempotencyKey);
    if (raced) {
      if (raced.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_KEY_REUSED');
      return resultFrom(raced, true);
    }
    const batchId = `batch-${preview.previewId}`;
    if (tx.batches.some((batch) => batch.id === batchId)) throw new Error('BATCH_ALREADY_COMMITTED');
    tx.batches.push(Object.freeze({ id: batchId, previewId: preview.previewId, committedAt: now.toISOString(), committedBy: actor.userId, recordCount: preview.validRows.length }));
    for (let index = 0; index < preview.validRows.length; index += 1) {
      const row = preview.validRows[index];
      tx.importedRecords.push(Object.freeze({ batchId, sourceSheet: row.sheet, sourceRow: row.row, values: structuredClone(row.values), importedAt: now.toISOString() }));
      if (faultInjection?.crashAfterRecord === index + 1) throw new Error('INJECTED_IMPORT_CRASH');
    }
    tx.batchEvents.push(Object.freeze({ batchId, type: 'IMPORT_COMMITTED', at: now.toISOString() }));
    tx.audit.push(Object.freeze({ action: 'import.commit', entityId: batchId, actorId: actor.userId, at: now.toISOString() }));
    tx.outbox.push(Object.freeze({ type: 'import.committed', aggregateId: batchId, at: now.toISOString() }));
    const result = Object.freeze({ batchId, previewId: preview.previewId, committedRecords: preview.validRows.length });
    tx.idempotencyReceipts.push(Object.freeze({ key: idempotencyKey, fingerprint, result, createdAt: now.toISOString() }));
    return resultFrom({ result }, false);
  });
}

/** A completed batch is never deleted; this creates a forward-only compensation instruction. */
export async function compensateImport({ store, actor, resource, batchId, compensationKey, reasonCode, now = new Date() }) {
  authorize({ actor, action: 'import:compensate', resource, now });
  if (!store.batches.some((batch) => batch.id === batchId) || !compensationKey || !reasonCode) throw new Error('INVALID_COMPENSATION_REQUEST');
  const prior = store.compensationReceipts.find((receipt) => receipt.key === compensationKey);
  if (prior) return { ...prior.result, replayed: true };
  return store.transaction(async (tx) => {
    const existing = tx.compensationReceipts.find((receipt) => receipt.key === compensationKey);
    if (existing) return { ...existing.result, replayed: true };
    const result = Object.freeze({ batchId, reasonCode, compensatedAt: now.toISOString() });
    tx.batchEvents.push(Object.freeze({ batchId, type: 'IMPORT_COMPENSATION_REQUESTED', reasonCode, at: now.toISOString() }));
    tx.audit.push(Object.freeze({ action: 'import.compensate', entityId: batchId, actorId: actor.userId, at: now.toISOString() }));
    tx.outbox.push(Object.freeze({ type: 'import.compensation.requested', aggregateId: batchId, at: now.toISOString() }));
    tx.compensationReceipts.push(Object.freeze({ key: compensationKey, result, createdAt: now.toISOString() }));
    return { ...result, replayed: false };
  });
}
