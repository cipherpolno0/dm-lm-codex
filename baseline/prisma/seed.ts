import { createHash } from 'node:crypto';
import {
  ApplicationState,
  DocumentState,
  EventOutcome,
  LifecycleState,
  PositionState,
  PrismaClient,
  RoleCode,
} from '@prisma/client';
import { assertSyntheticTarget } from './seed-target.mjs';

const prisma = new PrismaClient();
const NAMESPACE = 'sangha-education-synthetic-v1';

/** Stable UUID-like values let reruns use primary-key conflict detection without real identities. */
function syntheticId(key: string): string {
  const hex = createHash('sha256').update(`${NAMESPACE}:${key}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const roleRows = Object.values(RoleCode).map((code) => ({
  id: syntheticId(`role:${code}`),
  code,
  displayName: `Synthetic ${code.replaceAll('_', ' ')}`,
}));

export async function seedSynthetic(): Promise<void> {
  assertSyntheticTarget();

  await prisma.$transaction(async (tx) => {
    // Reference/identity rows are created once. Empty update blocks deliberately preserve an existing fixture.
    for (const row of roleRows) {
      await tx.role.upsert({ where: { code: row.code }, create: row, update: {} });
    }
    const permissions = ['directory:read', 'application:write', 'application:review', 'audit:read'];
    for (const action of permissions) {
      await tx.permission.upsert({
        where: { action },
        create: { id: syntheticId(`permission:${action}`), action, description: `Synthetic-only permission ${action}` },
        update: {},
      });
    }
    await tx.rolePermission.createMany({
      data: [
        { roleId: syntheticId(`role:${RoleCode.SYSTEM_ADMINISTRATOR}`), permissionId: syntheticId('permission:directory:read') },
        { roleId: syntheticId(`role:${RoleCode.SYSTEM_ADMINISTRATOR}`), permissionId: syntheticId('permission:audit:read') },
        { roleId: syntheticId(`role:${RoleCode.APPLICANT_SERVICES_OFFICER}`), permissionId: syntheticId('permission:application:review') },
        { roleId: syntheticId(`role:${RoleCode.EXAM_OPERATIONS_OFFICER}`), permissionId: syntheticId('permission:application:review') },
      ],
      skipDuplicates: true,
    });

    const rootScopeId = syntheticId('scope:root');
    await tx.scope.upsert({
      where: { code: 'SYN-GLOBAL' },
      create: { id: rootScopeId, type: 'GLOBAL', code: 'SYN-GLOBAL', pathKey: '/SYN-GLOBAL' },
      update: {},
    });

    const centralOrgId = syntheticId('org:central');
    const educationOrgId = syntheticId('org:education');
    const examOrgId = syntheticId('org:exam-centre');
    await tx.organisation.upsert({
      where: { code: 'SYN-ORG-CENTRAL' },
      create: { id: centralOrgId, code: 'SYN-ORG-CENTRAL', type: 'SANGHA_UNIT', displayName: 'Synthetic Central Sangha Unit' },
      update: {},
    });
    await tx.organisation.upsert({
      where: { code: 'SYN-ORG-EDU-01' },
      create: { id: educationOrgId, code: 'SYN-ORG-EDU-01', type: 'EDUCATION_UNIT', displayName: 'Synthetic Education Unit 01', parentId: centralOrgId },
      update: {},
    });
    await tx.organisation.upsert({
      where: { code: 'SYN-ORG-EXAM-01' },
      create: { id: examOrgId, code: 'SYN-ORG-EXAM-01', type: 'EXAMINATION_UNIT', displayName: 'Synthetic Exam Centre Unit 01', parentId: educationOrgId },
      update: {},
    });

    for (const [id, code, pathKey, organisationId, parentId] of [
      [syntheticId('scope:central'), 'SYN-CENTRAL', '/SYN-GLOBAL/SYN-CENTRAL', centralOrgId, rootScopeId],
      [syntheticId('scope:education'), 'SYN-EDU-01', '/SYN-GLOBAL/SYN-CENTRAL/SYN-EDU-01', educationOrgId, syntheticId('scope:central')],
      [syntheticId('scope:exam-centre'), 'SYN-EXAM-01', '/SYN-GLOBAL/SYN-CENTRAL/SYN-EDU-01/SYN-EXAM-01', examOrgId, syntheticId('scope:education')],
    ] as const) {
      await tx.scope.upsert({ where: { code }, create: { id, type: 'ORGANISATION', code, pathKey, organisationId, parentId }, update: {} });
    }

    // Events use createMany+skipDuplicates. They are never updated/deleted by this seed.
    await tx.organisationStatusEvent.createMany({
      data: [
        { id: syntheticId('org-event:central-active'), organisationId: centralOrgId, state: LifecycleState.ACTIVE, effectiveAt: new Date('2026-01-01T00:00:00Z'), reason: 'Synthetic hierarchy baseline' },
        { id: syntheticId('org-event:education-active'), organisationId: educationOrgId, state: LifecycleState.ACTIVE, effectiveAt: new Date('2026-01-02T00:00:00Z'), reason: 'Synthetic hierarchy baseline' },
        { id: syntheticId('org-event:exam-active'), organisationId: examOrgId, state: LifecycleState.ACTIVE, effectiveAt: new Date('2026-01-03T00:00:00Z'), reason: 'Synthetic hierarchy baseline' },
      ],
      skipDuplicates: true,
    });

    const educationUnitId = syntheticId('education-unit:01');
    await tx.educationUnit.upsert({
      where: { code: 'SYN-EDU-UNIT-01' },
      create: { id: educationUnitId, organisationId: educationOrgId, code: 'SYN-EDU-UNIT-01', displayName: 'Synthetic Learning Unit 01' },
      update: {},
    });

    const actingUserId = syntheticId('user:acting');
    const appointedUserId = syntheticId('user:appointed');
    await tx.user.upsert({ where: { subjectRef: 'synthetic:acting' }, create: { id: actingUserId, subjectRef: 'synthetic:acting' }, update: {} });
    await tx.user.upsert({ where: { subjectRef: 'synthetic:appointed' }, create: { id: appointedUserId, subjectRef: 'synthetic:appointed' }, update: {} });
    const actingPersonId = syntheticId('person:acting');
    const appointedPersonId = syntheticId('person:appointed');
    await tx.person.upsert({ where: { userId: actingUserId }, create: { id: actingPersonId, userId: actingUserId, publicLabel: 'Synthetic Person Acting', isSynthetic: true }, update: {} });
    await tx.person.upsert({ where: { userId: appointedUserId }, create: { id: appointedPersonId, userId: appointedUserId, publicLabel: 'Synthetic Person Appointed', isSynthetic: true }, update: {} });
    await tx.userGrant.createMany({
      data: [
        { id: syntheticId('grant:acting'), userId: actingUserId, roleId: syntheticId(`role:${RoleCode.EDUCATION_DIRECTORY_MANAGER}`), scopeId: syntheticId('scope:education') },
        { id: syntheticId('grant:appointed'), userId: appointedUserId, roleId: syntheticId(`role:${RoleCode.EXAM_OPERATIONS_OFFICER}`), scopeId: syntheticId('scope:exam-centre') },
      ],
      skipDuplicates: true,
    });

    const positionId = syntheticId('position:education-lead');
    await tx.position.upsert({
      where: { organisationId_code: { organisationId: educationOrgId, code: 'SYN-POS-EDU-LEAD' } },
      create: { id: positionId, organisationId: educationOrgId, code: 'SYN-POS-EDU-LEAD', title: 'Synthetic Education Lead', positionClass: 'EDUCATION' },
      update: {},
    });
    const actingAssignmentId = syntheticId('assignment:acting');
    const appointedAssignmentId = syntheticId('assignment:appointed');
    await tx.positionAssignment.createMany({
      data: [
        { id: actingAssignmentId, positionId, personId: actingPersonId, validFrom: new Date('2026-02-01T00:00:00Z'), validUntil: new Date('2026-03-31T23:59:59Z'), appointmentRef: 'SYN-ACTING-01' },
        { id: appointedAssignmentId, positionId, personId: appointedPersonId, validFrom: new Date('2026-04-01T00:00:00Z'), validUntil: new Date('2026-06-30T23:59:59Z'), appointmentRef: 'SYN-APPOINTED-01' },
      ],
      skipDuplicates: true,
    });
    await tx.positionAssignmentEvent.createMany({
      data: [
        { id: syntheticId('assignment-event:acting-active'), assignmentId: actingAssignmentId, state: PositionState.ACTIVE, effectiveAt: new Date('2026-02-01T00:00:00Z'), reason: 'Synthetic acting assignment' },
        { id: syntheticId('assignment-event:acting-ended'), assignmentId: actingAssignmentId, state: PositionState.ENDED, effectiveAt: new Date('2026-03-31T23:59:59Z'), reason: 'Synthetic acting assignment ended' },
        { id: syntheticId('assignment-event:appointed-active'), assignmentId: appointedAssignmentId, state: PositionState.ACTIVE, effectiveAt: new Date('2026-04-01T00:00:00Z'), reason: 'Synthetic appointed assignment' },
        { id: syntheticId('assignment-event:appointed-ended'), assignmentId: appointedAssignmentId, state: PositionState.ENDED, effectiveAt: new Date('2026-06-30T23:59:59Z'), reason: 'Synthetic appointed assignment ended' },
      ],
      skipDuplicates: true,
    });

    const cycleId = syntheticId('exam-cycle:01');
    const sessionId = syntheticId('exam-session:01');
    const siteId = syntheticId('exam-site:01');
    await tx.examCycle.upsert({
      where: { code: 'SYN-CYCLE-2026-01' },
      create: { id: cycleId, code: 'SYN-CYCLE-2026-01', label: 'Synthetic Examination Cycle 2026', opensAt: new Date('2026-05-01T00:00:00Z'), closesAt: new Date('2026-05-31T23:59:59Z') },
      update: {},
    });
    await tx.examSession.upsert({
      where: { code: 'SYN-SESSION-2026-01' },
      create: { id: sessionId, examCycleId: cycleId, code: 'SYN-SESSION-2026-01', label: 'Synthetic Examination Session 01', startsAt: new Date('2026-07-01T09:00:00Z'), endsAt: new Date('2026-07-01T12:00:00Z') },
      update: {},
    });
    await tx.examSite.upsert({
      where: { examSessionId_code: { examSessionId: sessionId, code: 'SYN-SITE-01' } },
      create: { id: siteId, examSessionId: sessionId, organisationId: examOrgId, code: 'SYN-SITE-01', label: 'Synthetic Exam Centre 01', capacity: 120 },
      update: {},
    });

    const candidateId = syntheticId('candidate:01');
    const applicationId = syntheticId('application:01');
    await tx.candidate.upsert({
      where: { candidateNo: 'SYN-CAND-0001' },
      create: { id: candidateId, personId: appointedPersonId, educationUnitId, candidateNo: 'SYN-CAND-0001' },
      update: {},
    });
    await tx.application.upsert({
      where: { applicationNo: 'SYN-APP-2026-0001' },
      create: { id: applicationId, candidateId, examSessionId: sessionId, examSiteId: siteId, applicationNo: 'SYN-APP-2026-0001', submittedAt: new Date('2026-05-10T10:00:00Z') },
      update: {},
    });
    await tx.applicationStatusEvent.createMany({
      data: [
        { id: syntheticId('application-event:draft'), applicationId, state: ApplicationState.DRAFT, effectiveAt: new Date('2026-05-09T10:00:00Z'), reason: 'Synthetic application created' },
        { id: syntheticId('application-event:submitted'), applicationId, state: ApplicationState.SUBMITTED, effectiveAt: new Date('2026-05-10T10:00:00Z'), reason: 'Synthetic application submitted' },
        { id: syntheticId('application-event:review'), applicationId, state: ApplicationState.UNDER_REVIEW, effectiveAt: new Date('2026-05-11T10:00:00Z'), reason: 'Synthetic review started' },
        { id: syntheticId('application-event:approved'), applicationId, state: ApplicationState.APPROVED, effectiveAt: new Date('2026-05-12T10:00:00Z'), reason: 'Synthetic approval complete' },
      ],
      skipDuplicates: true,
    });

    const objectId = syntheticId('object:application-evidence');
    const documentId = syntheticId('document:application-evidence');
    await tx.storedObject.upsert({
      where: { storageKey: 'synthetic/v1/applications/SYN-APP-2026-0001-evidence.txt' },
      create: { id: objectId, storageKey: 'synthetic/v1/applications/SYN-APP-2026-0001-evidence.txt', checksumSha256: 'synthetic-only-sha256-no-real-document', contentType: 'text/plain', byteSize: BigInt(64) },
      update: {},
    });
    await tx.documentRecord.createMany({ data: [{ id: documentId, subjectType: 'Application', subjectId: applicationId, documentType: 'SYNTHETIC_EVIDENCE' }], skipDuplicates: true });
    await tx.documentVersion.createMany({
      data: [{ id: syntheticId('document-version:application-evidence:1'), documentRecordId: documentId, storedObjectId: objectId, versionNo: 1, state: DocumentState.VERIFIED, reason: 'Synthetic evidence only' }],
      skipDuplicates: true,
    });
    await tx.applicationDocument.createMany({ data: [{ id: syntheticId('application-document:evidence'), applicationId, documentRecordId: documentId, documentKind: 'SYNTHETIC_EVIDENCE' }], skipDuplicates: true });

    await tx.auditEvent.createMany({
      data: [
        { id: syntheticId('audit:seed:assignment'), actorUserId: actingUserId, action: 'synthetic.seed.position-history', outcome: EventOutcome.SUCCESS, entityType: 'PositionAssignment', entityId: appointedAssignmentId, requestId: 'synthetic-seed-v1', scopePath: '/SYN-GLOBAL/SYN-CENTRAL/SYN-EDU-01' },
        { id: syntheticId('audit:seed:application'), actorUserId: appointedUserId, action: 'synthetic.seed.application-history', outcome: EventOutcome.SUCCESS, entityType: 'Application', entityId: applicationId, requestId: 'synthetic-seed-v1', scopePath: '/SYN-GLOBAL/SYN-CENTRAL/SYN-EDU-01/SYN-EXAM-01' },
      ],
      skipDuplicates: true,
    });
    await tx.outboxEvent.createMany({
      data: [
        { id: syntheticId('outbox:seed:assignment'), aggregateType: 'PositionAssignment', aggregateId: appointedAssignmentId, eventType: 'synthetic.position.assignment.seeded', payload: { isSynthetic: true, namespace: NAMESPACE }, idempotencyKey: 'synthetic-seed-v1:position-assignment' },
        { id: syntheticId('outbox:seed:application'), aggregateType: 'Application', aggregateId: applicationId, eventType: 'synthetic.application.seeded', payload: { isSynthetic: true, namespace: NAMESPACE }, idempotencyKey: 'synthetic-seed-v1:application' },
      ],
      skipDuplicates: true,
    });
  });
}

export async function stableSeedCounts() {
  return {
    organisations: await prisma.organisation.count({ where: { code: { startsWith: 'SYN-' } } }),
    scopes: await prisma.scope.count({ where: { code: { startsWith: 'SYN-' } } }),
    educationUnits: await prisma.educationUnit.count({ where: { code: { startsWith: 'SYN-' } } }),
    examSites: await prisma.examSite.count({ where: { code: { startsWith: 'SYN-' } } }),
    assignments: await prisma.positionAssignment.count({ where: { appointmentRef: { startsWith: 'SYN-' } } }),
    assignmentEvents: await prisma.positionAssignmentEvent.count({ where: { reason: { startsWith: 'Synthetic' } } }),
    applications: await prisma.application.count({ where: { applicationNo: { startsWith: 'SYN-' } } }),
    applicationEvents: await prisma.applicationStatusEvent.count({ where: { reason: { startsWith: 'Synthetic' } } }),
    auditEvents: await prisma.auditEvent.count({ where: { requestId: 'synthetic-seed-v1' } }),
    outboxEvents: await prisma.outboxEvent.count({ where: { idempotencyKey: { startsWith: 'synthetic-seed-v1:' } } }),
  };
}

export async function disconnectSeedClient() {
  await prisma.$disconnect();
}

async function main() {
  await seedSynthetic();
  console.log(JSON.stringify({ synthetic: true, counts: await stableSeedCounts() }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => disconnectSeedClient());
}
