# Import commit reliability

- **Confirmed:** Commit is server-authorized before a batch transaction. The transaction writes the batch, imported staging records, batch event, audit, outbox and idempotency receipt together, or restores the full write set. A completed idempotency key returns its original result without duplicate records.
- **Proposal:** A commit promotes validated synthetic rows to an import staging record, not directly to production domain entities. The client must supply one idempotency key per logical delivery; production storage must enforce its uniqueness.
- **Needs Legal Review:** Authority to commit, retention of import/audit evidence, compensation approval, source-file retention and any promotion of real account-form data require owner/DPO/legal review. No compliance determination is made.

Failure/recovery: a crash inside the transaction rolls back batch, records, audit, outbox and receipt, so the same delivery can retry safely. A duplicate delivery returns the stored result. Row errors block the whole batch before a write. After a successful commit, use a forward-only compensation request; never delete or overwrite the original batch/history.
