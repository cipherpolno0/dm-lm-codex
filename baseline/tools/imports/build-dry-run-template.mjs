import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';
import { SYNTHETIC_IMPORT_TEMPLATE_REGISTRY as registry } from '../../src/server/imports/template-registry.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.IMPORT_TEMPLATE_OUTPUT ?? path.resolve(here, '../../assets/imports');
const outputPath = path.join(outputDir, 'Dry_Run_Import_Templates_v0.1.0.xlsx');
const wb = Workbook.create();
const navy = '#17365D'; const blue = '#DCE6F1'; const amber = '#FFF2CC'; const border = '#D9E2F3';

function styleTitle(sheet, title, subtitle) {
  sheet.showGridLines = false;
  sheet.getRange('A2').values = [[title]];
  sheet.getRange('A2').format.font = { bold: true, size: 14, color: navy };
  sheet.getRange('A3').values = [[subtitle]];
  sheet.getRange('A3').format.font = { italic: true, color: '#595959' };
  sheet.getRange('A4:F4').format.borders = { bottom: { style: 'thin', color: navy } };
}

const readme = wb.worksheets.add('ReadMe');
styleTitle(readme, 'Dry-run import templates', 'Synthetic-only templates — preview pipeline performs zero database writes.');
readme.getRange('A6:B13').values = [
  ['Template ID', registry.templateId], ['Version', registry.version], ['Mode', 'DRY_RUN_ONLY'], ['Upload type', 'XLSX'],
  ['Required pipeline', 'upload → scan → parse → schema → normalize → reference → duplicate → row validation'],
  ['Result', 'Report: sheet, row, column, code, message, fix'], ['Do not add', 'Real persons, account-form fields, or unapproved columns'], ['Recovery', 'Correct source cell, re-upload, create a new preview'],
];
readme.getRange('A6:A13').format = { fill: navy, font: { bold: true, color: '#FFFFFF' }, verticalAlignment: 'center' };
readme.getRange('A6:B13').format.borders = { preset: 'all', style: 'thin', color: border };
readme.getRange('A6:B13').format.wrapText = true;
readme.getRange('A:A').format.columnWidth = 24; readme.getRange('B:B').format.columnWidth = 82;

for (const spec of registry.sheets) {
  const sheet = wb.worksheets.add(spec.name);
  styleTitle(sheet, `${spec.name} template`, `Registered schema: ${registry.templateId} v${registry.version}`);
  const headers = spec.columns.map((column) => column.key);
  sheet.getRangeByIndexes(5, 0, 1, headers.length).values = [headers];
  const headerRange = sheet.getRangeByIndexes(5, 0, 1, headers.length);
  headerRange.format = { fill: navy, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, borders: { preset: 'all', style: 'thin', color: '#FFFFFF' } };
  const blankRow = headers.map((column) => column === 'templateVersion' ? registry.version : '');
  const example = Object.fromEntries(headers.map((column) => [column, column === 'templateVersion' ? registry.version : column.includes('ExternalRef') ? `SYN-${column.toUpperCase()}` : column === 'personReference' ? 'SYN-PERSON-REFERENCE' : column === 'sessionReference' ? 'SYN-SESSION-REFERENCE' : 'true']));
  sheet.getRangeByIndexes(6, 0, 2, headers.length).values = [blankRow, headers.map((column) => example[column])];
  sheet.getRangeByIndexes(6, 0, 1, headers.length).format = { fill: amber, borders: { preset: 'all', style: 'thin', color: border } };
  sheet.getRangeByIndexes(7, 0, 1, headers.length).format = { fill: blue, font: { italic: true, color: '#595959' }, borders: { preset: 'all', style: 'thin', color: border } };
  sheet.getRange('A10').values = [['Entry guidance']];
  sheet.getRange('A10').format.font = { bold: true, color: navy };
  sheet.getRange('A11').values = [[`Use only the registered v${registry.version} columns. The blue row is synthetic guidance; remove it before upload.`]];
  sheet.getRange('A11').format.font = { italic: true, color: '#595959' };
  sheet.getRange(`A:${String.fromCharCode(64 + headers.length)}`).format.columnWidth = 26;
  sheet.freezePanes.freezeRows(6);
}

const dictionary = wb.worksheets.add('Data Dictionary');
styleTitle(dictionary, 'Template data dictionary', 'Core fields only; account-form fields remain PLACEHOLDER/TO MAP.');
const rows = registry.sheets.flatMap((spec) => spec.columns.map((column) => [spec.name, column.key, column.required ? 'Required' : 'Optional', column.referenceType ?? '', column.key === 'templateVersion' ? 'System template version' : 'PLACEHOLDER/TO MAP if account-form mapping is required']));
dictionary.getRange('A6:E6').values = [['Sheet', 'Column', 'Requirement', 'Reference set', 'Mapping state']];
dictionary.getRange('A6:E6').format = { fill: navy, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', borders: { preset: 'all', style: 'thin', color: '#FFFFFF' } };
dictionary.getRangeByIndexes(6, 0, rows.length, 5).values = rows;
dictionary.getRangeByIndexes(6, 0, rows.length, 5).format = { borders: { preset: 'all', style: 'thin', color: border }, wrapText: true, verticalAlignment: 'center' };
dictionary.getRange('A:E').format.columnWidth = 28;
dictionary.freezePanes.freezeRows(6);

wb.recalculate();
await wb.inspect({ kind: 'workbook,sheet', maxChars: 2000 });
await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
const preview = await wb.render({ sheetName: 'ReadMe', autoCrop: 'all', scale: 1, format: 'png' });
await fs.writeFile(path.join(outputDir, 'Dry_Run_Import_Templates_v0.1.0.preview.png'), new Uint8Array(await preview.arrayBuffer()));
console.log(outputPath);
