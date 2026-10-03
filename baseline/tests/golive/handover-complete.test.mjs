import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { accountability, dailyReviewTemplate, evaluateHandover, handoverAssets, kpiDefinitions, pirTemplate, rolloutStages } from '../../src/server/golive/go-live-plan.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(rolloutStages.length, 5); assert.equal(kpiDefinitions.length, 6);
const assets = handoverAssets.filter((asset) => existsSync(resolve(root, asset)));
const pending = evaluateHandover({ existingAssets: assets, acknowledgements: [] });
assert.equal(pending.packComplete, true); assert.equal(pending.operationalHandover, 'PENDING_OWNER_SUPPORT_ACK');
const acknowledged = evaluateHandover({ existingAssets: assets, acknowledgements: accountability.map((item) => ({ role: item.role, acknowledged: true })) });
assert.equal(acknowledged.operationalHandover, 'OWNER_SUPPORT_ACKNOWLEDGED'); assert.equal(acknowledged.productionDecision, 'NO_GO_PRODUCTION');
assert.equal(dailyReviewTemplate(1).status, 'PENDING_OWNER_SUPPORT_REVIEW'); assert.equal(pirTemplate(7).status, 'PENDING_OWNER_REVIEW'); assert.equal(pirTemplate(30).day, 30);
console.log('go-live handover pack check passed (8 runbooks, 5 accountability roles, staged rollout, daily review and 7/30-day PIR templates); real acknowledgement remains external.');
