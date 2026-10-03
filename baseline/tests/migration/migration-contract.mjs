import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const schema = readFileSync(resolve(root, 'prisma/schema.prisma'), 'utf8');
const guards = readFileSync(resolve(root, 'prisma/sql/integrity_guards.sql'), 'utf8');
const strategy = readFileSync(resolve(root, 'prisma/MIGRATION_STRATEGY.md'), 'utf8');

const schemaTerms = ['model AuditEvent', 'model OutboxEvent', 'model ApplicationStatusEvent', 'model PositionAssignmentEvent', 'model PersonPrivate', 'model UserGrant', '@@unique([candidateId, examSessionId])', '@@unique([personId, versionNo])', 'applicationEvents ApplicationStatusEvent[]'];
const guardTerms = ['position_assignment_one_open_holder', 'reject_append_only_change', 'exam_site_capacity_non_negative', 'exam_result_score_range'];
const strategyTerms = ['fresh', 'upgrade', 'forward-fix', 'expand → migrate/backfill → contract'];
for (const term of schemaTerms) if (!schema.includes(term)) throw new Error(`schema control missing: ${term}`);
for (const term of guardTerms) if (!guards.includes(term)) throw new Error(`SQL guard missing: ${term}`);
for (const term of strategyTerms) if (!strategy.includes(term)) throw new Error(`migration strategy missing: ${term}`);
if (!existsSync(resolve(root, 'tests/migration/run-migration-tests.sh'))) throw new Error('migration runner missing');
if (!existsSync(resolve(root, 'prisma/migrations/migration_lock.toml'))) throw new Error('Prisma migration lock missing');
console.log(`migration contract check passed (${schemaTerms.length + guardTerms.length + strategyTerms.length} controls)`);
