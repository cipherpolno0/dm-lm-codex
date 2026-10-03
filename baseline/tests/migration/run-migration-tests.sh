#!/usr/bin/env bash
set -euo pipefail

# This runner intentionally refuses non-local/test targets. It runs only synthetic fixtures.
if [[ "${ALLOW_SYNTHETIC_MIGRATION_TESTS:-}" != "true" ]]; then
  echo "Set ALLOW_SYNTHETIC_MIGRATION_TESTS=true for isolated synthetic migration tests." >&2; exit 2
fi
for test_url_name in FRESH_DATABASE_URL UPGRADE_DATABASE_URL FORWARD_FIX_DATABASE_URL; do
  test_url="${!test_url_name:-}"
  if [[ ! "$test_url" =~ /(.*_test|migration_test)(\?|$) ]]; then
    echo "$test_url_name must target a provisioned isolated *_test or migration_test database." >&2; exit 2
  fi
  if [[ "$test_url" == *"prod"* || "$test_url" == *"production"* ]]; then
    echo "Refusing a production-looking $test_url_name." >&2; exit 2
  fi
done

SCHEMA="prisma/schema.prisma"
GUARDS="prisma/sql/integrity_guards.sql"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

echo "[fresh] create and apply an initial SQL plan to an empty synthetic database"
npx prisma migrate diff --from-empty --to-schema-datamodel "$SCHEMA" --script > "$WORKDIR/fresh.sql"
psql "$FRESH_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/fresh.sql"
psql "$FRESH_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$GUARDS"

echo "[fresh] verify schema and guards"
npx prisma generate --schema "$SCHEMA"
psql "$FRESH_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "AuditEvent" (id, action, outcome, "entityType", "entityId", "requestId")
VALUES ('00000000-0000-0000-0000-000000000001', 'synthetic.test', 'SUCCESS', 'SyntheticEntity', '00000000-0000-0000-0000-000000000002', 'synthetic-fresh');
DO $$ BEGIN
  UPDATE "AuditEvent" SET action = 'forbidden' WHERE id = '00000000-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'append-only trigger did not reject update';
EXCEPTION WHEN OTHERS THEN
  IF POSITION('append-only' IN SQLERRM) = 0 THEN RAISE; END IF;
END $$;
SQL

echo "[upgrade] apply previous released schema, then apply generated upgrade SQL"
# CI supplies the previous released datamodel and assertions: do not invent historical data/schema.
: "${PREVIOUS_SCHEMA:?PREVIOUS_SCHEMA is required for upgrade test}"
: "${UPGRADE_ASSERT_SQL:?UPGRADE_ASSERT_SQL is required for upgrade test}"
npx prisma migrate diff --from-empty --to-schema-datamodel "$PREVIOUS_SCHEMA" --script > "$WORKDIR/previous.sql"
psql "$UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/previous.sql"
psql "$UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$UPGRADE_ASSERT_SQL"
npx prisma migrate diff --from-schema-datamodel "$PREVIOUS_SCHEMA" --to-schema-datamodel "$SCHEMA" --script > "$WORKDIR/upgrade.sql"
psql "$UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/upgrade.sql"
psql "$UPGRADE_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$GUARDS"

echo "[forward-fix] apply a separate additive follow-up schema after an injected compatible failure"
: "${FORWARD_FIX_SCHEMA:?FORWARD_FIX_SCHEMA is required for forward-fix test}"
: "${FORWARD_FIX_ASSERT_SQL:?FORWARD_FIX_ASSERT_SQL is required for forward-fix test}"
npx prisma migrate diff --from-schema-datamodel "$SCHEMA" --to-schema-datamodel "$FORWARD_FIX_SCHEMA" --script > "$WORKDIR/forward-fix.sql"
psql "$FORWARD_FIX_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$WORKDIR/forward-fix.sql"
psql "$FORWARD_FIX_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$FORWARD_FIX_ASSERT_SQL"
echo "migration tests completed using synthetic target only"
