import { authorize } from '../auth/authorize.mjs';

const asText = (value) => typeof value === 'string' ? value.trim() : value;
const error = (sheet, row, column, code, message, fix) => ({ sheet, row, column, code, message, fix });

export class DryRunStore {
  constructor() { this.previewHistory = []; this.dbWriteCount = 0; }
  appendPreviewAudit(event) { this.previewHistory.push(Object.freeze(event)); }
}

function scan(upload) {
  if (upload.mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return [error(null, null, null, 'FILE_TYPE_INVALID', 'Only XLSX uploads are accepted.', 'Export the source as .xlsx and upload again.')];
  if (!Number.isInteger(upload.sizeBytes) || upload.sizeBytes < 1 || upload.sizeBytes > 10_000_000) return [error(null, null, null, 'FILE_SIZE_INVALID', 'File size is missing or outside the dry-run limit.', 'Use a non-empty XLSX below 10 MB.')];
  if (upload.scanStatus !== 'CLEAN') return [error(null, null, null, 'FILE_SCAN_NOT_CLEAN', 'The upload did not pass the required file scan.', 'Resolve the scan result and upload a clean file.')];
  return [];
}

function parse(upload) {
  if (!Array.isArray(upload.parsedSheets)) return { sheets: [], errors: [error(null, null, null, 'PARSE_FAILED', 'No trusted parsed workbook payload was supplied.', 'Use the server XLSX parser after the file scan.')] };
  return { sheets: upload.parsedSheets, errors: [] };
}

function normalize(row) { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, asText(value)])); }

function validateSheet({ sheet, spec, registry, references, seen }) {
  const errors = [];
  const expected = spec.columns.map((column) => column.key);
  if (JSON.stringify(sheet.headers) !== JSON.stringify(expected)) {
    errors.push(error(sheet.name, 1, null, 'SCHEMA_HEADER_MISMATCH', 'Column headers do not match this template version.', `Use the ${registry.templateId} v${registry.version} headers without reordering.`));
    return { errors, validRows: [] };
  }
  const validRows = [];
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = normalize(sheet.rows[index]);
    const rowErrors = [];
    for (const column of spec.columns) {
      const value = row[column.key];
      if (column.required && (value === '' || value === undefined || value === null)) rowErrors.push(error(sheet.name, rowNumber, column.key, 'REQUIRED_VALUE_MISSING', 'A required value is missing.', 'Enter a value in this column.'));
      if (column.key === 'templateVersion' && value !== registry.version) rowErrors.push(error(sheet.name, rowNumber, column.key, 'TEMPLATE_VERSION_MISMATCH', 'The row template version does not match the registered schema.', `Set this value to ${registry.version}.`));
      if (column.referenceType && value && !references[column.referenceType]?.has(value)) rowErrors.push(error(sheet.name, rowNumber, column.key, 'REFERENCE_NOT_FOUND', 'The referenced synthetic record is not available.', 'Use a reference supplied by the approved synthetic reference set.'));
    }
    const duplicateKey = spec.duplicateKey.map((key) => row[key]).join('|');
    if (duplicateKey && seen[spec.name].has(duplicateKey)) rowErrors.push(error(sheet.name, rowNumber, spec.duplicateKey.join('+'), 'DUPLICATE_IN_FILE', 'This row duplicates an earlier import row.', 'Keep one row for this candidate/application key.'));
    seen[spec.name].add(duplicateKey);
    if (rowErrors.length) errors.push(...rowErrors); else validRows.push({ sheet: sheet.name, row: rowNumber, values: row });
  }
  return { errors, validRows };
}

/** Server-only preview. It does not call Prisma or write domain rows. */
export async function dryRunImport({ store, actor, resource, upload, registry, references, now = new Date() }) {
  authorize({ actor, action: 'import:preview:write', resource, now });
  const stages = ['upload', 'scan', 'parse', 'schema', 'normalize', 'reference', 'duplicate', 'row validation'];
  const errors = scan(upload);
  const parsed = errors.length ? { sheets: [], errors: [] } : parse(upload);
  errors.push(...parsed.errors);
  const seen = Object.fromEntries(registry.sheets.map((spec) => [spec.name, new Set()]));
  const validRows = [];
  if (!errors.length) {
    for (const spec of registry.sheets) {
      const sheet = parsed.sheets.find((item) => item.name === spec.name);
      if (!sheet) { errors.push(error(spec.name, null, null, 'REQUIRED_SHEET_MISSING', 'A required template sheet is missing.', `Add the ${spec.name} sheet from template v${registry.version}.`)); continue; }
      const result = validateSheet({ sheet, spec, registry, references, seen });
      errors.push(...result.errors); validRows.push(...result.validRows);
    }
  }
  const report = Object.freeze({ previewId: `preview-${now.getTime()}`, mode: 'DRY_RUN', dbWrites: 0, stages, validRows, errors, createdAt: now.toISOString() });
  store.appendPreviewAudit({ type: 'IMPORT_DRY_RUN_REPORTED', previewId: report.previewId, actorId: actor.userId, at: report.createdAt, errorCount: errors.length });
  return report;
}
