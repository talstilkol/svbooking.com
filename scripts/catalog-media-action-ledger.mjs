import { buildCatalogMediaActionLedger } from '../lib/catalog-media-quality.js';

const FORMAT_VALUES = new Set(['json', 'summary', 'csv']);

function argValue(name, fallback = null) {
  const exact = `--${name}`;
  const prefixed = `${exact}=`;
  const index = process.argv.indexOf(exact);
  if (index !== -1) return process.argv[index + 1] || fallback;
  const match = process.argv.find((arg) => arg.startsWith(prefixed));
  return match ? match.slice(prefixed.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseLimit() {
  const raw = argValue('limit');
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function printCsv(items) {
  const columns = [
    'sourceUrl',
    'sourceHost',
    'licenseStatus',
    'approvedLicense',
    'replacementRequired',
    'cityCount',
    'cities',
    'hotelCount',
    'reasons',
  ];
  console.log(columns.map(csvCell).join(','));
  for (const item of items) {
    console.log(columns.map((column) => csvCell(item[column])).join(','));
  }
}

function printSummary(ledger, items) {
  const priorityItems = ledger.items.filter((item) => item.reasons.includes('reused-across-cities'));
  console.log('Catalog media action ledger');
  console.log(`totalItems: ${ledger.summary.totalItems}`);
  console.log(`totalHotels: ${ledger.summary.totalHotels}`);
  console.log(`unapprovedImageSources: ${ledger.summary.unapprovedImageSources}`);
  console.log(`reusedImageSources: ${ledger.summary.reusedImageSources}`);
  console.log(`priorityReusedSources: ${priorityItems.length}`);
  console.log(`shownItems: ${items.length}`);
  for (const item of items) {
    console.log([
      `- ${item.sourceUrl || item.image || 'unknown/unavailable'}`,
      `cities=${item.cityCount}`,
      `hotels=${item.hotelCount}`,
      `reasons=${item.reasons.join('+')}`,
    ].join(' | '));
  }
}

const ledger = buildCatalogMediaActionLedger();
const format = argValue('format', 'json');
const limit = parseLimit();
const priorityOnly = hasFlag('priority-only');
const items = (priorityOnly
  ? ledger.items.filter((item) => item.reasons.includes('reused-across-cities'))
  : ledger.items).slice(0, limit || undefined);

if (!FORMAT_VALUES.has(format)) {
  console.error(`Unsupported format: ${format}. Use json, summary, or csv.`);
  process.exit(1);
}

if (format === 'summary') {
  printSummary(ledger, items);
} else if (format === 'csv') {
  printCsv(items);
} else {
  console.log(JSON.stringify({ ...ledger, items }, null, 2));
}
