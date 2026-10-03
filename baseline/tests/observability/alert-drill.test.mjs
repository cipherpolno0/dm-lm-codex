import assert from 'node:assert/strict';
import { IncidentStore, appendIncidentUpdate, evaluateAlertDrill, metricDefinitions, openIncident, postmortemTemplate, safeLog, safeTraceAttributes } from '../../src/server/observability/observability-service.mjs';

assert.equal(metricDefinitions.length, 8);
const log = safeLog({ timestamp: 'SYNTHETIC-TIME', level: 'error', event: 'request.failed', requestId: 'SYN-REQ-1', traceId: 'SYN-TRACE-1', routeTemplate: '/api/synthetic', statusCode: 500, durationMs: 1500, errorCode: 'SYN_ERROR', email: 'must-not-log@example.invalid', authorization: 'must-not-log', payload: { secret: 'must-not-log' } });
assert.deepEqual(Object.keys(log).sort(), ['durationMs', 'errorCode', 'event', 'level', 'requestId', 'routeTemplate', 'statusCode', 'timestamp', 'traceId']);
assert.equal('email' in safeTraceAttributes(log), false);
const drill = evaluateAlertDrill({ errorRate: 0.08, p95Ms: 1200, dbSaturation: 0.91, authDenied: 30, rateLimited: 70, dlqDepth: 2, scanFailures: 1, backupVerified: false });
assert.equal(drill.alerts.length, 8); assert.ok(drill.alerts.some((alert) => alert.ruleId === 'ALERT-BACKUP' && alert.severity === 'SEV1'));
const incidents = new IncidentStore(); const opened = openIncident({ store: incidents, incidentId: 'SYN-INC-001', severity: 'SEV1', alertIds: drill.alerts.map((alert) => alert.ruleId), correlationId: 'SYN-TRACE-1' });
appendIncidentUpdate({ store: incidents, incidentId: opened.incidentId, action: 'FEATURE_FLAGS_HELD_OFF', correlationId: 'SYN-TRACE-1' });
const postmortem = postmortemTemplate({ incidentId: opened.incidentId, severity: opened.severity, alertIds: opened.alertIds });
assert.equal(incidents.events.length, 2); assert.equal(postmortem.status, 'PENDING_OWNER_REVIEW');
console.log('synthetic alert drill passed (8 alert rules, safe log/trace allowlist, append-only incident events, pending postmortem)');
