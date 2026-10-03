const PUBLIC_CACHE_SECONDS = 60;
const PUBLIC_KEYS = ['publicEntryId', 'organizationName', 'organizationType', 'positionTitle', 'currentHolder'];

const atTime = (value) => new Date(value).getTime();
const clean = (value) => String(value ?? '').trim();

export class PublicDirectoryStore {
  constructor({ activeRelease = null, rateLimit = { limit: 30, windowMs: 60_000 } } = {}) {
    this.activeRelease = activeRelease;
    this.rateLimit = rateLimit;
    this.cache = new Map();
    this.requestBuckets = new Map();
  }

  /** Release versions switch atomically; an invalid candidate never replaces the live projection. */
  publishReleasedProjection(release) {
    if (!release?.version || !release?.released || !Array.isArray(release.entries)) throw new Error('INVALID_PUBLIC_PROJECTION_RELEASE');
    this.activeRelease = Object.freeze({ ...release, entries: structuredClone(release.entries) });
    this.cache.clear();
  }
}

export function currentHolderAt(assignments, asOf) {
  return (assignments ?? [])
    .filter((assignment) => atTime(assignment.effectiveFrom) <= atTime(asOf) && (!assignment.effectiveTo || atTime(asOf) < atTime(assignment.effectiveTo)))
    .sort((a, b) => atTime(b.effectiveFrom) - atTime(a.effectiveFrom))[0] ?? null;
}

function publicEntry(entry, asOf) {
  const holder = currentHolderAt(entry.releasedAssignments, asOf);
  return {
    publicEntryId: entry.publicEntryId,
    organizationName: entry.organizationName,
    organizationType: entry.organizationType,
    positionTitle: entry.positionTitle,
    currentHolder: holder ? holder.displayName : null,
  };
}

function takeRateLimit(store, clientKey, now) {
  const bucket = store.requestBuckets.get(clientKey);
  const withinWindow = bucket && now - bucket.startedAt < store.rateLimit.windowMs;
  const current = withinWindow ? bucket : { startedAt: now, count: 0 };
  current.count += 1;
  store.requestBuckets.set(clientKey, current);
  if (current.count > store.rateLimit.limit) return Math.ceil((current.startedAt + store.rateLimit.windowMs - now) / 1000);
  return 0;
}

function requestKey({ query, organizationType, page, pageSize, asOf }) { return [query, organizationType, page, pageSize, asOf].join('|'); }

/** Server-only public projection endpoint: no ORM source tables or private DTOs are read here. */
export function getPublicDirectoryResponse({ store, clientKey, query = '', organizationType = '', page = 1, pageSize = 20, asOf = new Date().toISOString(), now = Date.now() }) {
  const retryAfter = takeRateLimit(store, clientKey, now);
  if (retryAfter) return { status: 429, body: { error: 'Too many requests. Please retry shortly.' }, headers: { 'Retry-After': String(retryAfter) } };
  const release = store.activeRelease;
  if (!release?.released) return { status: 404, body: { error: 'Directory is not available.' }, headers: { 'Cache-Control': 'no-store' } };
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number.parseInt(pageSize, 10) || 20));
  const key = `${release.version}:${requestKey({ query: clean(query).toLowerCase(), organizationType: clean(organizationType), page: safePage, pageSize: safePageSize, asOf })}`;
  const cached = store.cache.get(key);
  if (cached && cached.expiresAt > now) return { status: 200, body: { ...cached.body, cache: 'HIT' }, headers: cached.headers };
  const projected = release.entries.map((entry) => publicEntry(entry, asOf));
  const search = clean(query).toLowerCase();
  const filtered = projected.filter((entry) => (!organizationType || entry.organizationType === organizationType) && (!search || [entry.organizationName, entry.positionTitle, entry.currentHolder].filter(Boolean).some((value) => value.toLowerCase().includes(search))));
  const total = filtered.length;
  const entries = filtered.slice((safePage - 1) * safePageSize, safePage * safePageSize).map((entry) => Object.fromEntries(PUBLIC_KEYS.map((keyName) => [keyName, entry[keyName]])));
  const body = Object.freeze({ entries, page: safePage, pageSize: safePageSize, total, asOf, releaseVersion: release.version, cache: 'MISS' });
  const headers = { 'Cache-Control': `public, s-maxage=${PUBLIC_CACHE_SECONDS}, stale-while-revalidate=300`, 'X-Projection-Version': release.version };
  store.cache.set(key, { body, headers, expiresAt: now + PUBLIC_CACHE_SECONDS * 1000 });
  return { status: 200, body, headers };
}

export const publicDirectoryStore = new PublicDirectoryStore();
