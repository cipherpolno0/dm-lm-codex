const SAFE_LOG_FIELDS = new Set(['timestamp', 'level', 'event', 'requestId', 'traceId', 'routeTemplate', 'method', 'statusCode', 'durationMs', 'areaCode', 'actorPseudonym', 'errorCode', 'count', 'component']);
const FORBIDDEN_FIELD = /password|token|secret|authorization|cookie|email|phone|address|payload|body|document|contact/i;

export const metricDefinitions = Object.freeze([
  { name: 'http_request_error_ratio', signal: 'metric', unit: 'ratio', labels: ['routeTemplate', 'statusClass', 'areaCode'] },
  { name: 'http_request_duration_p95_ms', signal: 'metric', unit: 'ms', labels: ['routeTemplate', 'areaCode'] },
  { name: 'db_connection_saturation_ratio', signal: 'metric', unit: 'ratio', labels: ['databaseRole'] },
  { name: 'auth_denial_total', signal: 'metric', unit: 'count', labels: ['reasonCode', 'areaCode'] },
  { name: 'rate_limit_rejection_total', signal: 'metric', unit: 'count', labels: ['routeTemplate'] },
  { name: 'queue_dead_letter_depth', signal: 'metric', unit: 'count', labels: ['queueName'] },
  { name: 'document_scan_failure_total', signal: 'metric', unit: 'count', labels: ['reasonCode'] },
  { name: 'backup_verification_state', signal: 'metric', unit: 'state', labels: ['backupClass'] },
]);

/** Proposed synthetic thresholds only; production owners must approve real SLOs/alert routing. */
export const syntheticAlertRules = Object.freeze([
  { id: 'ALERT-ERROR-RATE', metric: 'errorRate', op: '>=', threshold: 0.05, severity: 'SEV2', response: 'Stop rollout and inspect traces/logs.' },
  { id: 'ALERT-P95', metric: 'p95Ms', op: '>=', threshold: 1000, severity: 'SEV3', response: 'Inspect dependency and query latency.' },
  { id: 'ALERT-DB', metric: 'dbSaturation', op: '>=', threshold: 0.85, severity: 'SEV2', response: 'Protect DB; pause non-critical jobs.' },
  { id: 'ALERT-AUTH', metric: 'authDenied', op: '>=', threshold: 20, severity: 'SEV2', response: 'Investigate abuse or policy regression; do not log credentials.' },
  { id: 'ALERT-RATE-LIMIT', metric: 'rateLimited', op: '>=', threshold: 50, severity: 'SEV3', response: 'Inspect traffic pattern and WAF/rate-limit policy.' },
  { id: 'ALERT-DLQ', metric: 'dlqDepth', op: '>=', threshold: 1, severity: 'SEV2', response: 'Pause unsafe consumer; diagnose and replay idempotently.' },
  { id: 'ALERT-SCAN', metric: 'scanFailures', op: '>=', threshold: 1, severity: 'SEV2', response: 'Quarantine object; keep downloads denied.' },
  { id: 'ALERT-BACKUP', metric: 'backupVerified', op: '===', threshold: false, severity: 'SEV1', response: 'Declare release no-go and investigate restore evidence.' },
]);

export function safeLog(input) {
  const result = {};
  for (const [key, value] of Object.entries(input ?? {})) if (SAFE_LOG_FIELDS.has(key) && !FORBIDDEN_FIELD.test(key) && (typeof value !== 'object' || value === null)) result[key] = value;
  return Object.freeze(result);
}

export function safeTraceAttributes(input) {
  return Object.freeze(Object.fromEntries(Object.entries(safeLog(input)).filter(([key]) => ['requestId', 'traceId', 'routeTemplate', 'method', 'statusCode', 'durationMs', 'areaCode', 'component', 'errorCode'].includes(key))));
}

const matches = (value, rule) => rule.op === '>=' ? value >= rule.threshold : value === rule.threshold;
export function evaluateAlertDrill(observations) {
  const alerts = syntheticAlertRules.filter((rule) => matches(observations[rule.metric], rule)).map((rule) => ({ ruleId: rule.id, severity: rule.severity, metric: rule.metric, response: rule.response }));
  return Object.freeze({ mode: 'SYNTHETIC_ALERT_DRILL', observations: { ...observations }, alerts, triggeredAt: 'SYNTHETIC-DRILL-TIME' });
}

export class IncidentStore { constructor() { this.events = []; } }
export function openIncident({ store, incidentId, severity, alertIds, correlationId }) {
  if (!store || !incidentId || !['SEV1', 'SEV2', 'SEV3', 'SEV4'].includes(severity) || !Array.isArray(alertIds) || !correlationId) throw Error('INVALID_INCIDENT');
  const event = Object.freeze({ type: 'INCIDENT_OPENED', incidentId, severity, alertIds: [...alertIds], correlationId, at: 'SYNTHETIC-DRILL-TIME' }); store.events.push(event); return event;
}
export function appendIncidentUpdate({ store, incidentId, action, correlationId }) {
  if (!store || !incidentId || !action || !correlationId) throw Error('INVALID_INCIDENT_UPDATE');
  const event = Object.freeze({ type: 'INCIDENT_UPDATE_APPENDED', incidentId, action, correlationId, at: 'SYNTHETIC-DRILL-TIME' }); store.events.push(event); return event;
}
export function postmortemTemplate({ incidentId, severity, alertIds }) {
  return Object.freeze({ incidentId, severity, alertIds: [...alertIds], status: 'PENDING_OWNER_REVIEW', sections: ['impact (no unnecessary personal data)', 'timeline with correlation IDs', 'root cause', 'contributing controls', 'recovery', 'follow-up owner and due date', 'evidence retention review'] });
}
