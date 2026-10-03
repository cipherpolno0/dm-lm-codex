# Prisma migration strategy

## Status labels

- **Confirmed** — PostgreSQL + Prisma; production uses a direct migration connection distinct from the pooled runtime connection. Changes follow `expand → migrate/backfill → contract` and protected mutations write domain/event/audit/outbox atomically.
- **Proposal** — generate the baseline with `prisma migrate dev --create-only --schema prisma/schema.prisma --name init`, then append the reviewed contents of `prisma/sql/integrity_guards.sql` to that generated migration before review. Do not hand-run `db push` in production.
- **Needs Legal Review** — real-data import, retention disposition, public projection release, and legal evidence become executable only after DPO/nิติกร review and evidence approval. This repository carries no real legal source or personal data.

## Migration procedure

1. **Expand:** add nullable columns/new tables/new indexes only; generate migration from the canonical schema.
2. **Validate:** run fresh and upgrade tests against an isolated synthetic PostgreSQL database; inspect generated SQL and lock impact.
3. **Backfill:** run an idempotent, resumable job recorded in `ImportJob`/`OutboxEvent`; emit audit evidence. Do not overwrite historic events.
4. **Contract:** only after observability confirms no old reader/writer remains, remove obsolete paths in a later migration.

## Failure and recovery

- Migration failure: stop deployment, preserve logs/change record, roll back the compatible application release if required, then apply a reviewed **forward fix**. Do not issue destructive automatic down migrations.
- Lock/timeout: stop rollout, assess lock owner and retry window; split index creation or use PostgreSQL online-index approach when approved.
- Bad backfill: stop job, retain source and row errors, append compensating domain/status events and replay idempotently; restore from approved backup only under the change record.
- Secret exposure: revoke/rotate the credential, invalidate the run, and rerun on a clean synthetic environment.

## Required test modes

- `fresh`: empty database receives every migration and integrity guard.
- `upgrade`: fixture at the immediately previous released migration upgrades without data loss; append-only rows remain unchanged.
- `forward-fix`: a deliberately failed compatible migration is remediated by a new additive migration; no history is deleted or rewritten.

`tests/migration/run-migration-tests.sh` first derives an SQL plan with `prisma migrate diff`, then applies it to three separately provisioned isolated PostgreSQL databases. CI must provide the exact previous released datamodel plus synthetic upgrade/forward-fix assertion SQL; the runner refuses to invent history or create/drop a database. Run it only with `FRESH_DATABASE_URL`, `UPGRADE_DATABASE_URL`, `FORWARD_FIX_DATABASE_URL`, and `ALLOW_SYNTHETIC_MIGRATION_TESTS=true`.
