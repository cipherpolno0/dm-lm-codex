import { authorize } from '../auth/authorize.mjs';

const time = (value) => new Date(value).getTime();
const latest = (versions, documentId) => versions.filter((version) => version.documentId === documentId).sort((a, b) => b.version - a.version)[0];

export class PrivateDocumentStore {
  constructor({ policy }) {
    if (!policy || policy.bucketAccess !== 'PRIVATE') throw new Error('PUBLIC_BUCKET_FORBIDDEN');
    this.policy = policy;
    this.documents = [];
    this.versions = [];
    this.events = [];
    this.audit = [];
    this.outbox = [];
    this.signedUrls = [];
  }
  async transaction(fn) {
    const snapshot = structuredClone({ documents: this.documents, versions: this.versions, events: this.events, audit: this.audit, outbox: this.outbox, signedUrls: this.signedUrls });
    try { return await fn(this); } catch (cause) { Object.assign(this, snapshot); throw cause; }
  }
}

function validateUpload(policy, input, now) {
  if (!input.isSynthetic || !input.mimeType || !policy.allowedMimeTypes?.includes(input.mimeType) || !Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > policy.maxBytes || !/^[a-f0-9]{64}$/i.test(input.checksumSha256) || !input.retentionUntil || time(input.retentionUntil) <= time(now)) throw new Error('DOCUMENT_UPLOAD_POLICY_REJECTED');
}

export async function createDocumentVersion({ store, actor, resource, input, now = new Date() }) {
  authorize({ actor, action: 'document:upload', resource, now });
  validateUpload(store.policy, input, now);
  const documentId = input.documentId ?? input.id;
  if (!documentId) throw new Error('DOCUMENT_ID_REQUIRED');
  if (input.documentId && !store.documents.some((document) => document.id === documentId)) throw new Error('DOCUMENT_NOT_FOUND');
  return store.transaction(async (tx) => {
    if (!input.documentId) tx.documents.push(Object.freeze({ id: documentId, createdAt: now.toISOString(), createdBy: actor.userId, isSynthetic: true }));
    const version = (latest(tx.versions, documentId)?.version ?? 0) + 1;
    const objectKey = `private/${documentId}/v${version}`;
    const metadata = Object.freeze({ documentId, version, objectKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes, checksumSha256: input.checksumSha256.toLowerCase(), retentionUntil: input.retentionUntil, scanStatus: 'PENDING', storageClass: 'PRIVATE', createdAt: now.toISOString() });
    tx.versions.push(metadata);
    tx.events.push(Object.freeze({ documentId, version, type: 'DOCUMENT_VERSION_UPLOADED', at: now.toISOString() }));
    tx.audit.push(Object.freeze({ action: 'document.upload', entityId: documentId, actorId: actor.userId, at: now.toISOString() }));
    tx.outbox.push(Object.freeze({ type: 'document.scan.requested', aggregateId: documentId, version, at: now.toISOString() }));
    return metadata;
  });
}

export async function recordScanResult({ store, actor, resource, documentId, version, result, now = new Date() }) {
  authorize({ actor, action: 'document:scan:write', resource, now });
  const metadata = store.versions.find((item) => item.documentId === documentId && item.version === version);
  if (!metadata || !['CLEAN', 'MALWARE'].includes(result)) throw new Error('INVALID_SCAN_RESULT');
  return store.transaction(async (tx) => {
    const state = result === 'CLEAN' ? 'CLEAN' : 'QUARANTINED';
    const event = Object.freeze({ documentId, version, type: state === 'CLEAN' ? 'DOCUMENT_SCAN_CLEAN' : 'DOCUMENT_QUARANTINED', at: now.toISOString() });
    tx.events.push(event);
    tx.audit.push(Object.freeze({ action: 'document.scan.record', entityId: documentId, actorId: actor.userId, at: now.toISOString() }));
    tx.outbox.push(Object.freeze({ type: state === 'CLEAN' ? 'document.available' : 'document.quarantined', aggregateId: documentId, version, at: now.toISOString() }));
    // Metadata rows are immutable; the current scan state is reconstructed from events.
    return { ...metadata, scanStatus: state };
  });
}

export function versionState(store, documentId, version) {
  const event = store.events.filter((item) => item.documentId === documentId && item.version === version && ['DOCUMENT_SCAN_CLEAN', 'DOCUMENT_QUARANTINED'].includes(item.type)).at(-1);
  return event?.type === 'DOCUMENT_SCAN_CLEAN' ? 'CLEAN' : event?.type === 'DOCUMENT_QUARANTINED' ? 'QUARANTINED' : 'PENDING';
}

export async function issueSignedDownloadUrl({ store, actor, resource, documentId, now = new Date() }) {
  authorize({ actor, action: 'document:read', resource, now });
  const metadata = latest(store.versions, documentId);
  if (!metadata || versionState(store, documentId, metadata.version) !== 'CLEAN') throw new Error('DOCUMENT_NOT_DOWNLOADABLE');
  if (time(metadata.retentionUntil) <= time(now)) throw new Error('DOCUMENT_RETENTION_EXPIRED');
  const expiresAt = new Date(time(now) + store.policy.signedUrlTtlSeconds * 1000).toISOString();
  const token = `synthetic-${documentId}-${metadata.version}-${time(now)}`;
  const grant = Object.freeze({ token, documentId, version: metadata.version, expiresAt, objectKey: metadata.objectKey, bucketAccess: 'PRIVATE' });
  store.signedUrls.push(grant);
  store.audit.push(Object.freeze({ action: 'document.signed-url.issue', entityId: documentId, actorId: actor.userId, at: now.toISOString() }));
  return { url: `synthetic-private-storage://${metadata.objectKey}?token=${token}`, expiresAt };
}

export function verifySignedUrl({ store, token, now = new Date() }) {
  const grant = store.signedUrls.find((item) => item.token === token);
  if (!grant || grant.bucketAccess !== 'PRIVATE' || time(grant.expiresAt) <= time(now)) throw new Error('SIGNED_URL_EXPIRED_OR_INVALID');
  return { documentId: grant.documentId, version: grant.version, objectKey: grant.objectKey };
}
