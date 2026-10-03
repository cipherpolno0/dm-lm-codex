# Deterministic synthetic seed

## Status labels

- **Confirmed** — the seed creates fictional `SYN-*` records only; it requires a local `*_dev`, `*_test`, or `*synthetic` PostgreSQL URL plus `ALLOW_SYNTHETIC_SEED=true`. It neither deletes data nor updates append-only events, audit records, document versions, or outbox rows.
- **Proposal** — CI provisions a disposable database, runs `tsx prisma/seed.ts` twice, and runs `tsx tests/seed/stable-rerun.ts`; counts after first and second run must match.
- **Needs Legal Review** — no real person, legal source, personal identifier, retention disposition, or production target may be introduced through this seed.

## Coverage

The deterministic namespace creates an organisation/scope hierarchy, education unit, examination centre, two fictional persons, acting → ended and appointed → ended position history, organisation/application status events, a candidate/application, a synthetic document reference, audit events, and outbox events.

## Failure and recovery

- Guard failure: the seed stops before any write when the target is not an approved local synthetic database. Correct the test environment; never bypass the guard for production.
- Transaction failure: PostgreSQL rolls back the seed transaction. Fix the failing synthetic fixture and rerun; deterministic primary keys and `skipDuplicates` make recovery safe.
- Count mismatch: stop CI, inspect only synthetic records under the fixed namespace, and add a forward correction. Do not delete or overwrite historical event/audit/outbox rows.
