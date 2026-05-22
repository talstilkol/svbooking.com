import { buildProductionReadinessSummary } from '../lib/production-readiness.mjs';

const strict = process.env.PRODUCTION_READINESS_STRICT === '1';
const summary = buildProductionReadinessSummary({ env: process.env, strict });

console.log(JSON.stringify(summary, null, 2));

if (strict && !summary.productionReady) {
  process.exit(1);
}
