import { buildCatalogMediaActionLedger } from '../lib/catalog-media-quality.js';

const ledger = buildCatalogMediaActionLedger();

console.log(JSON.stringify(ledger, null, 2));
