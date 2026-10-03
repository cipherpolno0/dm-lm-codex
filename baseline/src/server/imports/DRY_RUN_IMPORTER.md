# Dry-run importer

- **Confirmed:** Server authorization occurs before preview processing. The pipeline is upload → scan → parse → schema → normalize → reference → duplicate → row validation. A dry run has `dbWrites: 0` and returns errors with sheet, row, column, code, message and fix. Preview audit records are append-only in the non-database preview store.
- **Proposal:** The candidate/application XLSX template is version `0.1.0`; technical external references, limits and schema registry are configuration, not domain master data. A production scanner/parser adapter must be selected and operated by the approved platform.
- **Needs Legal Review:** Real source-file retention, operator access, malware-scan evidence, account-form mapping, export controls and disposal requirements need owner/DPO/legal review. No compliance determination is made.

Failure/recovery: invalid type/size/scan, parser failure, headers, unknown references and duplicates report errors without a commit path. Correct only the affected cell, re-upload and create a new preview; do not overwrite a previous preview report. This module deliberately contains no database write or Prisma call.
