-- Proposal: execute after Prisma's generated baseline migration. PostgreSQL-only guards
-- that Prisma schema syntax cannot express. This file contains no personal or real data.

ALTER TABLE "UserGrant"
  ADD CONSTRAINT "user_grant_valid_window" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");
ALTER TABLE "PositionAssignment"
  ADD CONSTRAINT "position_assignment_valid_window" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");
ALTER TABLE "ExamCycle"
  ADD CONSTRAINT "exam_cycle_window" CHECK ("closesAt" > "opensAt");
ALTER TABLE "ExamSession"
  ADD CONSTRAINT "exam_session_window" CHECK ("endsAt" > "startsAt");
ALTER TABLE "ExamSite"
  ADD CONSTRAINT "exam_site_capacity_non_negative" CHECK ("capacity" >= 0);
ALTER TABLE "ExamResult"
  ADD CONSTRAINT "exam_result_maximum_positive" CHECK ("maximumScore" > 0),
  ADD CONSTRAINT "exam_result_score_range" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= "maximumScore"));
ALTER TABLE "StoredObject"
  ADD CONSTRAINT "stored_object_size_non_negative" CHECK ("byteSize" >= 0);

-- A position has at most one open holder. Historical rows remain untouched.
CREATE UNIQUE INDEX "position_assignment_one_open_holder"
  ON "PositionAssignment" ("positionId") WHERE "validUntil" IS NULL;

-- Immutable evidence: corrections are later events/versions. Allow administrative table ownership only outside application roles.
CREATE OR REPLACE FUNCTION reject_append_only_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only table % cannot be %; create a later event/version', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();
CREATE TRIGGER organisation_status_append_only BEFORE UPDATE OR DELETE ON "OrganisationStatusEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();
CREATE TRIGGER position_assignment_event_append_only BEFORE UPDATE OR DELETE ON "PositionAssignmentEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();
CREATE TRIGGER application_status_append_only BEFORE UPDATE OR DELETE ON "ApplicationStatusEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();
CREATE TRIGGER document_version_append_only BEFORE UPDATE OR DELETE ON "DocumentVersion"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();
CREATE TRIGGER outbox_event_append_only BEFORE UPDATE OR DELETE ON "OutboxEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_change();
